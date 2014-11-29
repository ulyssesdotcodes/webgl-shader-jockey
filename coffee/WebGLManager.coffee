class SJ.WebGLController
  constructor: (@canvas, @shaderLoader) ->
    @startTime = Date.now()
    @surface = {height: 1.0, width: 1.0}
    @gl = @canvas.getContext("experimental-webgl")
    @buffer = @gl.createBuffer()
    @gl.bindBuffer @gl.ARRAY_BUFFER, @buffer
    @gl.bufferData @gl.ARRAY_BUFFER
        , new Float32Array([ -1.0, -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0, -1.0,
        1.0, 1.0, - 1.0, 1.0])
        , @gl.STATIC_DRAW
    @surface.buffer = @gl.createBuffer()

    @gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)
    @gl.clearColor(0, 0, 0, 1)
    @gl.enable(@gl.DEPTH_TEST)

  loadShader: (name) ->
    Rx.Observable.start(() => @gl.createProgram())
      .doOnNext (program) =>
        @program = program
      .zip \
        @shaderLoader.getShader(name + ".vert") \
          .map((data) => @createShader(@gl.VERTEX_SHADER, data))
      , @shaderLoader.getShader(name + ".frag") \
          .map((data) => @createShader(@gl.FRAGMENT_SHADER, data))
      , (program, vs, fs) -> return { program: program, vs: vs, fs: fs }
      .subscribe ({program, vs, fs}) =>
        @gl.attachShader(program, vs)
        @gl.attachShader(program, fs)

        @gl.deleteShader(vs)
        @gl.deleteShader(fs)

        @gl.linkProgram(program)

        @gl.useProgram(program)

        @cacheUniformLocation program, 'time'
        
        #@surface.positionAttribute = @gl.getAttribLocation @program, "surfacePosAttrib"
        #@gl.enableVertexAttribArray @vertexPosition

        @vertexPosition = @gl.getAttribLocation @program, "position"
        @gl.enableVertexAttribArray @vertexPosition
  
  cacheUniformLocation: (program, label) ->
    if program.uniformsCache == undefined
      program.uniformsCache = {}

    program.uniformsCache[label] = @gl.getUniformLocation(program, label)
  
  createShader: (type, text) ->
    shader = @gl.createShader(type)
    @gl.shaderSource(shader, text)
    @gl.compileShader(shader)
    if (!@gl.getShaderParameter(shader, @gl.COMPILE_STATUS))
      throw @gl.getShaderInfoLog(shader)
    return shader

  render: () ->
    if !@program? then return

    @gl.useProgram @program
    
    @gl.uniform1f @program.uniformsCache['time'], (Date.now() - @startTime) / 1000.0
    
    @gl.bindBuffer @gl.ARRAY_BUFFER, @buffer
    @gl.vertexAttribPointer( @vertexPosition, 2, @gl.FLOAT, false, 0, 0 );


    @gl.clear(@gl.COLOR_BUFFER_BIT | @gl.DEPTH_BUFFER_BIT)
    @gl.drawArrays(@gl.TRIANGLES, 0, 6)

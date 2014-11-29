window.SJ = {}

require './Viewer.coffee'

class SJ.Main
  constructor: (isVisualizer) ->
    @startTime = Date.now()
    @surface = {height: 1.0, width: 1.0}
    canvas = document.createElement("canvas")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    document.body.appendChild canvas

    @gl = canvas.getContext("experimental-webgl")
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

    getShader = (name) ->
      return Rx.DOM.Request.get('./shaders/' + name)


    # shaders here
    
    Rx.Observable.start(() => @gl.createProgram())
      .doOnNext (program) =>
        @program = program
      .zip \
        getShader("simple.vert") \
          .map((data) => @createShader(@gl.VERTEX_SHADER, data.responseText))
      , getShader("simple.frag") \
          .map((data) => @createShader(@gl.FRAGMENT_SHADER, data.responseText))
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
        #@gl.vertexAttribPointer @vertexPosition, 2, @gl.FLOAT, false 

        @animate()


  cacheUniformLocation: (program, label) ->
    if program.uniformsCache == undefined
      program.uniformsCache = {}

    program.uniformsCache[label] = @gl.getUniformLocation(program, label)

  animate: () ->
    requestAnimationFrame(() => @animate())
    @render()

  createShader: (type, text) ->
    shader = @gl.createShader(type)
    @gl.shaderSource(shader, text)
    @gl.compileShader(shader)
    if (!@gl.getShaderParameter(shader, @gl.COMPILE_STATUS))
      throw @gl.getShaderInfoLog(shader)
    return shader

  createTarget: (@gl, width, height) ->
    target = {}

    target.framebuffer = @gl.createFramebuffer()
    target.renderbuffer = @gl.createRenderbuffer()
    target.texture = @gl.createTexture()

    @gl.bindTexture( @gl.TEXTURE_2D, target.texture )
    @gl.texImage2D( @gl.TEXTURE_2D, 0, @gl.RGBA, width, height, 0, @gl.RGBA, @gl.UNSIGNED_BYTE, null )

    @gl.texParameteri( @gl.TEXTURE_2D, @gl.TEXTURE_WRAP_S, @gl.CLAMP_TO_EDGE )
    @gl.texParameteri( @gl.TEXTURE_2D, @gl.TEXTURE_WRAP_T, @gl.CLAMP_TO_EDGE )

    @gl.texParameteri( @gl.TEXTURE_2D, @gl.TEXTURE_MAG_FILTER, @gl.NEAREST )
    @gl.texParameteri( @gl.TEXTURE_2D, @gl.TEXTURE_MIN_FILTER, @gl.NEAREST )

    @gl.bindFramebuffer( @gl.FRAMEBUFFER, target.framebuffer )
    @gl.framebufferTexture2D( @gl.FRAMEBUFFER, @gl.COLOR_ATTACHMENT0, @gl.TEXTURE_2D, target.texture, 0 )

    @gl.bindRenderbuffer( @gl.RENDERBUFFER, target.renderbuffer )

    @gl.renderbufferStorage( @gl.RENDERBUFFER, @gl.DEPTH_COMPONENT16, width, height )
    @gl.framebufferRenderbuffer( @gl.FRAMEBUFFER, @gl.DEPTH_ATTACHMENT, @gl.RENDERBUFFER, target.renderbuffer )


    @gl.bindTexture( @gl.TEXTURE_2D, null )
    @gl.bindRenderbuffer( @gl.RENDERBUFFER, null )
    @gl.bindFramebuffer( @gl.FRAMEBUFFER, null)

  render: () ->
    @gl.useProgram @program
    
    @gl.uniform1f @program.uniformsCache['time'], (Date.now() - @startTime) / 1000.0

    #@gl.bindBuffer @gl.ARRAY_BUFFER, @surface.buffer
    #@gl.vertexAttribPointer surface.positionAttribute, 2, gl.FLOAT, false, 0, 0
    
    @gl.bindBuffer @gl.ARRAY_BUFFER, @buffer
    @gl.vertexAttribPointer( @vertexPosition, 2, @gl.FLOAT, false, 0, 0 );


    @gl.clear(@gl.COLOR_BUFFER_BIT | @gl.DEPTH_BUFFER_BIT)
    @gl.drawArrays(@gl.TRIANGLES, 0, 6)







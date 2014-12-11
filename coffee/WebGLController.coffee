class SJ.WebGLController
  @touchEventCount: 10 # The number of touch events to remember. BE SURE TO SET THIS IN THE FRAGMENT SHADER

  constructor: (@canvas, @shaderLoader, @audioEventObservable) ->
    @touchEventIndex = 0;
    @startTime = Date.now()
    @texture = { arr: new Uint8Array(SJ.AudioProcessor.bufferSize * 4) }
    @gl = @canvas.getContext("experimental-webgl")
    @buffer = @gl.createBuffer()
    @gl.bindBuffer @gl.ARRAY_BUFFER, @buffer
    @gl.bufferData @gl.ARRAY_BUFFER
        , new Float32Array([ -1.0, -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0, -1.0,
        1.0, 1.0, - 1.0, 1.0])
        , @gl.STATIC_DRAW

    @texture.tex = @gl.createTexture()
    @createAudioTexture @texture.tex
    
    @gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)
    @gl.clearColor(0.0, 0.0, 0.0, 0.0)
    @gl.enable(@gl.DEPTH_TEST)
    @gl.clear(@gl.COLOR_BUFFER_BIT | @gl.DEPTH_BUFFER_BIT)

    @audioEventObservable.subscribe f(@, 'update')
    @touchEvents = new Array(SJ.WebGLController.touchEventCount * 3)
    @resetTouchEvents()

  loadShader: (name) ->
    if !name? then return

    console.log "Loading #{name}"
    Rx.Observable.start(() => @gl.createProgram())
      .zip \
        @shaderLoader.getShader(name + ".vert") \
          .map((data) => @createShader(@gl.VERTEX_SHADER, data))
      , @shaderLoader.getShader(name + ".frag") \
          .map((data) => @createShader(@gl.FRAGMENT_SHADER, data))
      , (program, vs, fs) =>
        @gl.attachShader(program, vs)
        @gl.attachShader(program, fs)

        @gl.deleteShader(vs)
        @gl.deleteShader(fs)

        @gl.linkProgram(program)

        @gl.useProgram(program)

        @cacheUniformLocation program, 'time'
        @cacheUniformLocation program, 'resolution'
        @cacheUniformLocation program, 'audioTexture'
        @cacheUniformLocation program, 'te'
        
        @vertexPosition = @gl.getAttribLocation program, "position"
        @gl.enableVertexAttribArray @vertexPosition
        return program
      .subscribe (program) => @program = program

  update: (audioEvent) ->
    if !@program? then return

    @gl.clear(@gl.COLOR_BUFFER_BIT | @gl.DEPTH_BUFFER_BIT)
    @gl.useProgram @program
    
    @gl.uniform2f @program.uniformsCache['resolution'], @canvas.clientWidth, @canvas.clientHeight
    @gl.uniform1f @program.uniformsCache['audioResolution'], SJ.AudioProcessor.bufferSize
    @gl.uniform1f @program.uniformsCache['time'], (audioEvent.time) / 1000.0
    @gl.uniform1i @program.uniformsCache['audioTexture'], 0
    @gl.uniform3fv @program.uniformsCache['te'], @touchEvents

    @mapAudioToArray audioEvent, @texture.arr

    @gl.activeTexture @gl.TEXTURE0
    @gl.bindTexture @gl.TEXTURE_2D, @texture.tex
    @gl.texImage2D @gl.TEXTURE_2D, 
      0, @gl.RGBA, SJ.AudioProcessor.bufferSize, 1, 
      0, @gl.RGBA, @gl.UNSIGNED_BYTE, @texture.arr
    
    @gl.bindBuffer @gl.ARRAY_BUFFER, @buffer
    @gl.vertexAttribPointer( @vertexPosition, 2, @gl.FLOAT, false, 0, 0 );

    @gl.drawArrays(@gl.TRIANGLES, 0, 6)
  
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

  createAudioTexture: (texture) ->
    @gl.bindTexture @gl.TEXTURE_2D, texture
    @gl.texParameteri(@gl.TEXTURE_2D, @gl.TEXTURE_MAG_FILTER, @gl.LINEAR);
    @gl.texParameteri(@gl.TEXTURE_2D, @gl.TEXTURE_MIN_FILTER, @gl.LINEAR);
    @gl.texParameteri( @gl.TEXTURE_2D, @gl.TEXTURE_WRAP_S, @gl.CLAMP_TO_EDGE );
    @gl.texParameteri( @gl.TEXTURE_2D, @gl.TEXTURE_WRAP_T, @gl.CLAMP_TO_EDGE) ;
    @gl.texImage2D @gl.TEXTURE_2D, 
      0, @gl.RGBA, SJ.AudioProcessor.bufferSize, 1, 
      0, @gl.RGBA, @gl.UNSIGNED_BYTE, null
    @gl.bindTexture(@gl.TEXTURE_2D, null);

  mapAudioToArray: (audioEvent, arr) ->
    @mapChannel audioEvent.frequencyBuffer, arr, 'r', 4
    @mapChannel audioEvent.dbBuffer, arr, 'g', 4
    @mapChannel audioEvent.smoothFrequencyBuffer, arr, 'b', 4
    @mapChannel audioEvent.smoothDbBuffer, arr, 'a', 4

  mapChannel: (buffer, out, channel, channels) ->
    cIndex = 
      switch channel
        when 'r','x' then 0
        when 'g','y' then 1
        when 'b','z' then 2
        when 'a' then 3
        else channel

    for i in [1..buffer.length]
      out[i * channels + cIndex] = buffer[i]

  resetTouchEvents: () =>
    for i in [0...@touchEvents.length]
      @touchEvents[i] = 0.0

  addTouchEvent: (e) =>
    
    # Map the canvas mouse coordinates to the gl viewport
    @audioEventObservable.take(1).zip \
      Rx.Observable.just(e.clientX).map(f.div(@canvas.clientWidth)),
      Rx.Observable.just(e.clientY).map(f.compose(((a) -> 1.0 - a), f.div(@canvas.clientHeight))),
        (ae, ex, ey) -> [ex, ey, ae.time / 1000.0]
      .subscribe (te) =>
        @touchEvents.splice(@touchEventIndex * 3, 3, te[0], te[1], te[2])

        @touchEventIndex = ++@touchEventIndex % SJ.WebGLController.touchEventCount

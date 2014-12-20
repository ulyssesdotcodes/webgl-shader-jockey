# Plays the audio and creates an analyser
class SJ.Player
  constructor: () ->
    @loadedAudio = new Array()
    @startOffset = 0
    @setupAnalyser()

  setupAnalyser: () ->
    window.AudioContext = window.AudioContext || window.webkitAudioContext
    @audioContext = new AudioContext()
    @analyser = @audioContext.createAnalyser()
    @analyser.fftSize = SJ.AudioProcessor.bufferSize
    @analyser.smoothingTimeConstant = 0

  pause: () ->
    if @player? && @playing
      @source.disconnect()
      @player[0].pause()
      @playing = false
      @startOffset += @audioContext.currentTime - @startTime
      @player.bind "play", () =>
        @source.connect @analyser
        @playing = true
        if @miked
          @pauseMic()

    else if @player?
      @source.connect @analyser
      @player[0].play()
      @playing = true

      if @miked
        @pauseMic()

  createLiveInput: () ->
    if @playing
      @pause()

    if @micSource?
      @micSource.connect @analyser
      @miked = true
      return

    gotStream = (stream) =>
      @miked = true
      @micSource = @audioContext.createMediaStreamSource stream
      @micSource.connect @analyser

    @dbSampleBuf = new Uint8Array(2048)

    if ( navigator.getUserMedia )
      navigator.getUserMedia({ audio: true }, gotStream, (err) ->
        console.log(err))
    else if (navigator.webkitGetUserMedia )
      navigator.webkitGetUserMedia({ audio: true }, gotStream, (err) ->
        console.log(err))
    else if (navigator.mozGetUserMedia )
      navigator.mozGetUserMedia({ audio: true }, gotStream, (err) ->
        console.log(err))
    else
      return(alert("Error: getUserMedia not supported!"));

  pauseMic: () ->
    if @miked
      @micSource.disconnect()
      @miked = false

  play: (url) ->
    @currentlyPlaying = url

    if @loadedAudio[url]?
      @loadFromBuffer(@loadedAudio[url])
      return

    request = new XMLHttpRequest()
    request.open("GET", url, true)
    request.responseType = 'arraybuffer'
    request.onload = () =>
      @audioContext.decodeAudioData request.response
      , (buffer) =>
        @loadedAudio[url] = buffer
        @loadFromBuffer(buffer)
      , (err) ->
        console.log(err)
      return

    request.send()
    return

  loadFromBuffer: (buffer) ->
    @startTime = @audioContext.currentTime
    @source = @audioContext.createBufferSource()
    @source.buffer = buffer
    @source.connect(@analyser)
    @source.connect(@audioContext.destination)
    @playing = true
    @source.start(0, @startOffset)

  setPlayer: (@player) ->
    @source = @audioContext.createMediaElementSource(@player[0])
    @source.connect(@analyser)
    @source.connect(@audioContext.destination)
    @playing = true
    @pauseMic()

  playPause: () ->
    if @miked then return
    if !@player? || !@playing then return

    if @player[0].paused then @player[0].play()
    else @player[0].pause()

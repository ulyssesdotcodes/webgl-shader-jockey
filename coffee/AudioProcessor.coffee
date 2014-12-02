class SJ.AudioProcessor
  @bufferSize: 1024

  constructor: () ->
    @responsiveness = 1
    @frequencyBuffer = new Uint8Array(@constructor.bufferSize)
    @frequencyBufferSubject = new Rx.BehaviorSubject(@frequencyBuffer)

    @dbBuffer = new Uint8Array(@constructor.bufferSize)
    @dbBufferSubject = new Rx.BehaviorSubject(@dbBuffer)

    @smoothFrequencyBuffer = new Uint8Array(@constructor.bufferSize)
    @smoothFrequencyBufferSubject = new Rx.BehaviorSubject(@smoothFrequencyBuffer)

    @smoothDbBuffer = new Uint8Array(@constructor.bufferSize)
    @smoothDbBufferSubject = new Rx.BehaviorSubject(@smoothDbBuffer)

    @fMax = new Uint8Array(@constructor.bufferSize)
    @dbMax = new Uint8Array(@constructor.bufferSize)
    @max = 0.0
    @current = 0.0

    @averageDbSubject = new Rx.BehaviorSubject(0.0)

    @time = 0
    @timeSubject = new Rx.BehaviorSubject(@time)
    @deltaTime = 0

  audioEventObservable: () ->
    Rx.Observable.zip @timeSubject, @frequencyBufferSubject, @dbBufferSubject, @smoothFrequencyBufferSubject, @smoothDbBufferSubject, @averageDbSubject
      , (time, frequency, db, smoothFrequency, smoothDb, averageDb) ->
        { time: time, frequencyBuffer: frequency, dbBuffer: db, smoothFrequencyBuffer: smoothFrequency, smoothDbBuffer: smoothDb, averageDb: averageDb }

  update: (analyser, time) ->
    if !analyser
      return

    # Keep track of the audioContext time in ms
    newTime = time * 1000
    @deltaTime = newTime - @time
    deltaTimeS = @deltaTime * 0.001
    @time = newTime
    @timeSubject.onNext @time

    analyser.getByteTimeDomainData(@dbBuffer)
    analyser.getByteFrequencyData(@frequencyBuffer)

    @dbBufferSubject.onNext @dbBuffer
    @frequencyBufferSubject.onNext @frequencyBuffer

    for key,value of @frequencyBuffer
      # First make buffer change with responsiveness
      @frequencyBuffer[key] = value * @responsiveness

      # Then deal with smoothing
      @fMax[key] = Math.max(@fMax[key], value)

      if @smoothFrequencyBuffer[key] > @fMax[key]
        @smoothFrequencyBuffer[key] = 
          Math.min(Math.max(@smoothFrequencyBuffer[key] - 
            256 * deltaTimeS * 0.6, @fMax[key]),
            @smoothFrequencyBuffer[key])
      else 
        @smoothFrequencyBuffer[key] = 
          Math.min(Math.max(@smoothFrequencyBuffer[key] + 
            256 * deltaTimeS * 1.0, @smoothFrequencyBuffer[key]), 
            @fMax[key])

      @fMax[key] = Math.max(@fMax[key] - deltaTimeS * 256.0 * 0.6, 0)

    @smoothFrequencyBufferSubject.onNext @smoothFrequencyBuffer

    for key,value of @dbBuffer
      # First make buffer change with responsivenes
      @dbBuffer[key] = value * @responsiveness
      
      # Then deal with smoothing
      @dbMax[key] = 
        if Math.abs(value - 128) > Math.abs(@dbMax[key] - 128)
          value
        else 
          @dbMax[key]
      
      sign = Math.sign(@smoothDbBuffer[key] - 128)
      if sign == 0 then sign = 1
      diff = Math.abs(@smoothDbBuffer[key] - 128)
      maxDiff = Math.abs(@dbMax[key] - 128)

      if diff > maxDiff
        diff = Math.min(Math.max(256 * deltaTimeS, maxDiff), diff)
        @smoothDbBuffer[key] -= sign * diff
      else
        diff = Math.min(Math.max(256 * deltaTimeS, diff), maxDiff)
        @smoothDbBuffer[key] += sign * diff

      @dbMax[key] -= sign * Math.min(Math.abs(@dbMax[key] - 128), deltaTimeS * 256.0 * 0.6)

    @smoothDbBufferSubject.onNext @smoothDbBuffer

    rms = 0
    for buf in @dbBuffer
        val = (buf - 128) / 128
        rms += val*val

    @averageDbSubject.onNext Math.sqrt(rms / @constructor.bufferSize) * @responsiveness

class SJ.AudioView
  @micUrl: "mic"
  
  constructor: (target, url) ->
    @audioPlayer = $ "<audio />",
      class: 'audio-player'
      controls: true
    
    @controls = $ "<div>",
      class: 'audio-controls'

    @mic = $ "<a>",
      href: '#'
      class: 'mic-icon'
    
    micIcon = $ "<img/>",
      class: "icon"
      src: "./resources/ic_mic_none_white_48dp.png"

    @mic.append micIcon
    @controls.append @mic

    startUrl = if !!url then "https://soundcloud.com/" + url else "https://soundcloud.com/redviolin/swing-tape-3";
    @mURLObservable = new Rx.BehaviorSubject(startUrl)
        
    @mic.click (e) =>
      e.preventDefault()
      @mURLObservable.onNext SJ.AudioView.micUrl

    soundcloudInput = $ "<div>",
      class: 'soundcloud'

    soundcloudInput.append 'Soundcloud URL:'

    input = $ "<input>",
      class: 'soundcloud-input'
      type: "text"

    input.change (e) =>
      @mURLObservable.onNext input.val()

    soundcloudInput.append input

    @controls.append soundcloudInput

    @controls.append @audioPlayer
    target.append @controls
  
  playStream: (url, onEnd) ->
    @audioPlayer.bind 'ended', onEnd
    @audioPlayer.attr 'src', url

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

    @input = $ "<input>",
      class: 'soundcloud-input'
      type: "text"
    @controls.append @input

    @input.change (e) =>
      @mURLObservable.onNext @input.val()

    @controls.append @audioPlayer
    target.append @controls
  
  playStream: (url, onEnd) ->
    @audioPlayer.bind 'ended', onEnd
    @audioPlayer.attr 'src', url

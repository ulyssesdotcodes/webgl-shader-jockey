class SJ.AudioView
  constructor: (target, onMic, onUrl) ->
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

    @mic.click (e) =>
      e.preventDefault()
      onMic()

    @input = $ "<input>",
      class: 'soundcloud-input'
      type: "text"
    @controls.append @input

    @input.change (e) =>
      onUrl(@input.val())

    @controls.append @audioPlayer
    target.append @controls
  
  playStream: (url, onEnd) ->
    @audioPlayer.bind 'ended', onEnd
    @audioPlayer.attr 'src', url

window.SJ = {}

window.f = require '../node_modules/effing/src/index.coffee'

require './Viewer.coffee'
require './WebGLController.coffee'
require './ShaderLoader.coffee'
require './AudioProcessor.coffee'
require './SoundCloudLoader.coffee'
require './Player.coffee'
require './interface/AudioView.coffee'
require './interface/LibraryView.coffee'
require './interface/QueueView.coffee'

class SJ.Main
  shortcuts:
    32: "playPause" # spacebar
    78: "nextShader" # n

  constructor: () ->
    canvas = $ "<canvas>",
      class: 'fullscreen'

    Rx.DOM.keyup ($('body')[0])
      .map f.get('keyCode')
      .map f.curried(f.swap(f.get))(@shortcuts)
      .filter (shortcut) -> shortcut?
      .subscribe (shortcut) => 
        f(@, shortcut)()

    $('body').append canvas

    @audioView = new SJ.AudioView($('body'), window.location.hash.substring(1))

    @queueView = new SJ.QueueView $('body')
    
    @player = new SJ.Player()
    @player.setPlayer @audioView.audioPlayer

    @webGLController = new SJ.WebGLController(canvas[0], new SJ.ShaderLoader())

    @libraryView = new SJ.LibraryView($('body'))
    @libraryView.shaderSelectionSubject.subscribe f(@queueView, "addShader")

    @popupMessageSubject = new Rx.BehaviorSubject({type: 'shader', data: "simple"})

    @queueView.mShaderNextSubject.subscribe (shader) => 
      @webGLController.loadShader(shader)
      @popupMessageSubject.onNext({type: 'shader', data: shader})

    @audioProcessor = new SJ.AudioProcessor()

    @audioProcessor.mAudioEventObservable
      .subscribe f(@webGLController, "update")

    @audioProcessor.mAudioEventObservable.subscribe (ae) => 
      @popupMessageSubject.onNext({type: 'audioEvent', data: ae})

    @soundCloudLoader = new SJ.SoundCloudLoader(@audioView)

    @audioView.mURLObservable.subscribe (url) =>
      if url == SJ.AudioView.micUrl
        @player.createLiveInput()
        return
      @soundCloudLoader.loadStream url
      
    @animate()

    @viewerButton = $ "<a></a>",
      class: 'viewer-button'
      href: '#'
      text: 'viewer'

    Rx.DOM.click @viewerButton[0]
      .subscribe (e) =>
        e.preventDefault()
        @domain = window.location.protocol + '//' + window.location.host
        popupUrl = location.pathname + 'viewer.html'
        @popup = window.open(popupUrl, 'viewerWindow')
        @popupMessageSubject.subscribe (e) =>
          @popup.postMessage e, @domain
          #TODO: Figure out why not f.curried(f.swap(@popup.postMessage))(domain)
        return

    $('body').append @viewerButton

  animate: () ->
    requestAnimationFrame(() => @animate())
    @render()

  render: () ->
    @audioProcessor.update @player.analyser, @player.audioContext.currentTime

  playPause: () ->
    @player.playPause()

  nextShader: () ->
    @queueView.next()

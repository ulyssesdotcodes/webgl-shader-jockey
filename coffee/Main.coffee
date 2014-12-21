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
    @canvas = $ "<canvas>",
      class: 'fullscreen'
      width: window.innerWidth
      height: window.innerHeight

    @onResize()
    
    Rx.DOM.resize window
      .subscribe f(@, 'onResize')

    Rx.DOM.keyup ($('body')[0])
      .map f.get('keyCode')
      .map f.curried(f.swap(f.get))(@shortcuts)
      .filter f.neq(undefined)
      .subscribe (shortcut) => 
        f(@, shortcut)()

    $('body').append @canvas

    @audioView = new SJ.AudioView($('body'), window.location.hash.substring(1))

    @queueView = new SJ.QueueView $('body')
    
    @player = new SJ.Player()
    @player.setPlayer @audioView.audioPlayer

    @audioProcessor = new SJ.AudioProcessor()

    @webGLController = 
      new SJ.WebGLController(@canvas[0], new SJ.ShaderLoader(), 
        @audioProcessor.mAudioEventObservable)

    canvasClickObservable = 
      Rx.DOM.click @canvas[0]
        .map (e) => { x: e.clientX / @canvas[0].clientWidth, y: 1.0 - (e.clientY / @canvas[0].clientHeight) }

    canvasClickObservable.subscribe f(@webGLController.addTouchEvent)

    @libraryView = new SJ.LibraryView($('body'))
    @libraryView.shaderSelectionSubject.subscribe f(@queueView, "addShader")

    @popupMessageSubject = new Rx.BehaviorSubject({type: 'shader', data: "simple"})
    
    canvasClickObservable
      .map (me) -> { type: 'touchEvent', data: me }
      .subscribe f(@popupMessageSubject, 'onNext')

    @queueView.mShaderNextSubject.subscribe f(@webGLController, 'loadShader')
    @queueView.mShaderNextSubject.map (shader) -> { type: 'shader', data: shader }
      .subscribe f(@popupMessageSubject, 'onNext')

    @audioProcessor.mAudioEventObservable
      .map (ae) -> { type: 'audioEvent', data: ae }
      .subscribe f(@popupMessageSubject, "onNext")

    @soundCloudLoader = new SJ.SoundCloudLoader(@audioView)

    @audioView.mURLObservable.filter f.eq(SJ.AudioView.micUrl)
      .subscribe f(@player, 'createLiveInput')

    @audioView.mURLObservable.filter f.neq(SJ.AudioView.micUrl)
      .subscribe f(@soundCloudLoader, 'loadStream')

    viewerButton = $ "<a></a>",
      class: 'viewer-button'
      href: '#'

    viewerButtonIcon = $ "<img />",
      src: "./resources/ic_fullscreen_white_48dp.png"

    viewerButton.append viewerButtonIcon

    Rx.DOM.click viewerButton[0]
      .subscribe (e) =>
        e.preventDefault()
        @domain = window.location.protocol + '//' + window.location.host
        popupUrl = location.pathname + 'viewer.html'
        @popup = window.open(popupUrl, 'viewerWindow', "height=#{window.innerHeight},width=#{window.innerWidth}")
        @popupMessageSubject.subscribe (e) =>
          @popup.postMessage e, @domain
        return

    $('body').append viewerButton
    
    @animate()

  animate: () ->
    requestAnimationFrame(f(@, 'animate'))
    @render()

  render: () ->
    @audioProcessor.update @player.analyser, @player.audioContext.currentTime

  playPause: () ->
    @player.playPause()

  nextShader: () ->
    @queueView.next()

  onResize: () ->
    @canvas.width window.innerWidth
    @canvas.height window.innerHeight
    @canvas[0].width = window.innerWidth
    @canvas[0].height = window.innerHeight


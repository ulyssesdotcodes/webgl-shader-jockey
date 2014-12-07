window.SJ = {}

window.Effing = require '../node_modules/effing/src/index.coffee'

require './WebGLManager.coffee'
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

  constructor: (isVisualizer) ->

    canvas = $ "<canvas>",
      class: 'fullscreen'

    Rx.DOM.keyup ($('body')[0])
      .map (e) -> e.keyCode
      .map (keyCode) => @shortcuts[keyCode]
      .filter (shortcut) -> shortcut?
      .subscribe (shortcut) => 
        Effing(@, shortcut)()

    $('body').append canvas

    @audioView = new SJ.AudioView($('body'), window.location.hash.substring(1))

    @queueView = new SJ.QueueView $('body')
    
    @player = new SJ.Player()
    @player.setPlayer @audioView.audioPlayer

    @webGLController = new SJ.WebGLController(canvas[0], new SJ.ShaderLoader())

    @libraryView = new SJ.LibraryView($('body'))
    @libraryView.shaderSelectionSubject.subscribe Effing(@queueView, "addShader")

    @queueView.mShaderNextSubject.subscribe (shader) => 
      @webGLController.loadShader(shader)

    @audioProcessor = new SJ.AudioProcessor()

    @audioProcessor.audioEventObservable()
      .subscribe (audioEvent) =>
        @webGLController.update audioEvent

    @soundCloudLoader = new SJ.SoundCloudLoader(@audioView)

    @audioView.mURLObservable.subscribe (url) =>
      if url == SJ.AudioView.micUrl
        @player.createLiveInput()
        return
      @soundCloudLoader.loadStream url
      
    @animate()

  animate: () ->
    requestAnimationFrame(() => @animate())
    @render()

  render: () ->
    @audioProcessor.update @player.analyser, @player.audioContext.currentTime


  playPause: () ->
    @player.playPause()

  nextShader: () ->
    @queueView.next()

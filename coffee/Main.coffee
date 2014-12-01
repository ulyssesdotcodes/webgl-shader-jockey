window.SJ = {}

_ = require 'underscore'

require './WebGLManager.coffee'
require './ShaderLoader.coffee'
require './AudioProcessor.coffee'
require './SoundCloudLoader.coffee'
require './Player.coffee'
require './interface/AudioView.coffee'
require './interface/LibraryView.coffee'

class SJ.Main
  constructor: (isVisualizer) ->

    canvas = $ "<canvas>",
      class: 'fullscreen'

    $('body').append canvas

    @audioView = new SJ.AudioView($('body'))
    
    @player = new SJ.Player()
    @player.setPlayer @audioView.audioPlayer

    @webGLController = new SJ.WebGLController(canvas[0], new SJ.ShaderLoader())
    @webGLController.loadShader "simple"

    @libraryView = new SJ.LibraryView($('body'))
    @libraryView.shaderSelectionSubject.subscribe (name) =>
      @webGLController.loadShader name

    @audioProcessor = new SJ.AudioProcessor()

    @audioProcessor.audioEventObservable()
      .subscribe (audioEvent) =>
        @webGLController.update audioEvent
    
    url = 
      if window.location.hash != ""
        "https://soundcloud.com/" + window.location.hash.substring(1)
      else
        "https://soundcloud.com/redviolin/swing-tape-3"

    @soundCloudLoader = new SJ.SoundCloudLoader(@audioView)
    @soundCloudLoader.loadStream url

    @animate()

  animate: () ->
    requestAnimationFrame(() => @animate())
    @render()

  render: () ->
    @audioProcessor.update @player.analyser, @player.audioContext.currentTime

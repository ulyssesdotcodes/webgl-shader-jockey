window.SJ = {}

require './WebGLManager.coffee'
require './ShaderLoader.coffee'
require './AudioProcessor.coffee'
require './SoundCloudLoader.coffee'
require './Player.coffee'
require './interface/AudioView.coffee'

class SJ.Main
  constructor: (isVisualizer) ->
    canvas = $ "<canvas>",
      class: 'fullscreen'

    $('body').append canvas


    @audioView = new SJ.AudioView()
    @audioView.createView $('body')
    @player = new SJ.Player()
    @player.setPlayer @audioView.audioPlayer

    @shaderLoader = new SJ.ShaderLoader()

    @webGLController = new SJ.WebGLController(canvas[0], @shaderLoader)
    @webGLController.loadShader "simple"

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

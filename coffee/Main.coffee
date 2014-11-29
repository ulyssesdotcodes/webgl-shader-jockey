window.SJ = {}

require './WebGLManager.coffee'
require './ShaderLoader.coffee'

class SJ.Main
  constructor: (isVisualizer) ->
    canvas = document.createElement("canvas")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    document.body.appendChild canvas

    @shaderLoader = new SJ.ShaderLoader()

    @webGLController = new SJ.WebGLController(canvas, @shaderLoader)
    @webGLController.loadShader "simple"
    
    @animate()

  animate: () ->
    requestAnimationFrame(() => @animate())
    @render()

  render: () ->
    @webGLController.render()






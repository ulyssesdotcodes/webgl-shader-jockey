require './ShaderLoader.coffee'
class SJ.Viewer
  constructor: () ->
    canvas = $ "<canvas>",
      class: 'fullscreen'

    $('body').append canvas

    @webGLController = new SJ.WebGLController(canvas[0], new SJ.ShaderLoader())

    @domain = window.location.protocol + '//' + window.location.host
    messageObservable =  Rx.DOM.fromEvent(window, 'message')
      .filter (e) => e.origin == @domain
      .map f.get('data')

    messageObservable.filter (m) -> m.type == "shader"
      .map f.get('data')
      .subscribe f(@, 'updateShader')

    messageObservable.filter (m) -> m.type == "audioEvent"
      .map f.get('data')
      .subscribe f(@, 'update')

    return

  update: (audioEvent) ->
    @webGLController.update audioEvent

  updateShader: (shader) ->
    @webGLController.loadShader shader

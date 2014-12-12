require './ShaderLoader.coffee'

class SJ.Viewer
  constructor: () ->
    @canvas = $ "<canvas>",
      class: 'fullscreen'
      width: window.innerWidth
      height: window.innerHeight

    @canvas[0].width = window.innerWidth
    @canvas[0].height = window.innerHeight

    Rx.DOM.resize window
      .subscribe (e) =>
        @canvas.width window.innerWidth
        @canvas.height window.innerHeight
        @canvas[0].width = window.innerWidth
        @canvas[0].height = window.innerHeight

    $('body').append @canvas

    audioEventObeservable = new Rx.BehaviorSubject();

    @webGLController = new SJ.WebGLController(@canvas[0], new SJ.ShaderLoader(), audioEventObeservable)

    @domain = window.location.protocol + '//' + window.location.host
    messageObservable =  Rx.DOM.fromEvent(window, 'message')
      .filter (e) => e.origin == @domain
      .map f.get('data')

    messageObservable.filter (m) -> m.type == "shader"
      .map f.get('data')
      .subscribe f(@, 'updateShader')

    messageObservable.filter (m) -> m.type == "audioEvent"
      .map f.get('data')
      .subscribe f(audioEventObeservable, 'onNext')

    return

  update: (audioEvent) ->
    @webGLController.update audioEvent

  updateShader: (shader) ->
    @webGLController.loadShader shader

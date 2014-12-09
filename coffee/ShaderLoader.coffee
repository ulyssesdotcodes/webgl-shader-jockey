class SJ.ShaderLoader
  constructor: () ->
    @shaders = {}

  getShader: (name) ->
    if @shaders[name]
      return Rx.Observable.just @shaders[name]

    return Rx.DOM.get('./shaders/' + name)
      .map f.get('responseText')
      .doOnNext((response) => @shaders[name] = response);

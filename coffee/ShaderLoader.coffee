class SJ.ShaderLoader
  constructor: () ->
    @shaders = {}

  getShader: (name) ->
    if @shaders[name]
      return Rx.just @shaders[name]

    return Rx.DOM.Request.get('./shaders/' + name)
      .map((data) -> data.responseText)
      .doOnNext((response) => @shaders[name] = response);

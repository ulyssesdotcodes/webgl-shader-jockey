class SJ.LibraryView
  @shaders: ["simple", "fft_matrix_product", "circular_fft", "vertical_wav"]

  constructor: (target) ->
    @container = $ "<div></div>",
      class: 'library'

    @select = $ "<select />"

    for shader in LibraryView.shaders
      @select.append "<option value='#{ shader }'>#{ shader }</option>"

    @shaderSelectionSubject = new Rx.BehaviorSubject()

    @select.change () =>
      @shaderSelectionSubject.onNext @select.find('option:selected').val()

    @container.append @select
    target.append @container

  shaderSelectionObservable: () ->
    @shaderSelectionSubject

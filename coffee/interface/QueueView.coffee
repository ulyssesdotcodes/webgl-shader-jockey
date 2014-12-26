class SJ.QueueView
  constructor: (target) ->
    @queue = []

    queueContainer = $ "<div>",
      class: "queue-container"

    queueContainer.append "Shader queue:"

    @queueList = $ "<div>",
      class: "queue-list"

    queueContainer.append @queueList

    target.append queueContainer

    nextButton = $ "<a />",
      href: '#'
      class: "next-button"

    nextButtonIcon = $ "<img />",
      src: "./resources/ic_fast_forward_white_48dp.png"
      class: 'icon'

    nextButton.append nextButtonIcon
    
    nextButton.click (e) =>
      e.preventDefault()
      @next()

    target.append nextButton

    @mShaderNextSubject = new Rx.BehaviorSubject("circular_fft")

  addShader: (shader) ->
    if !shader then return

    @queue.push shader
    @updateList()

  updateList: () ->
    newList = $ "<div>"
    for shader in @queue
      newList.append $ "<div>#{shader}</div>"

    @queueList.html newList

  next: () ->
    @mShaderNextSubject.onNext @queue.shift()
    @updateList()

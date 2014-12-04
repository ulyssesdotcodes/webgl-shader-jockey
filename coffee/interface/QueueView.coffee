class SJ.QueueView
  constructor: (target) ->
    @queue = []

    @queueList = $ "<div>",
      class: "queue-list"

    target.append @queueList

    @nextButton = $ "<a />",
      href: '#'
      class: "next-button"
      text: ">>>>>>"
    @nextButton.click () => @next()

    target.append @nextButton

    @mShaderNextSubject = new Rx.BehaviorSubject("simple")

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

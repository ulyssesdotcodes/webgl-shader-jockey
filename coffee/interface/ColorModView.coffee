class SJ.ColorModView
  constructor: (target, onChange) ->
    @colorMod = 
      red: 1.0
      green: 1.0
      blue: 1.0

    gui = new dat.GUI()
    rC = gui.add @colorMod, "red", 0, 2
    gC = gui.add @colorMod, "green", 0, 2
    bC = gui.add @colorMod, "blue", 0, 2

    rC.onChange onChange
    gC.onChange onChange
    bC.onChange onChange

  getColorModArray: () ->
    arr = new Array()
    arr.push @colorMod.red
    arr.push @colorMod.green
    arr.push @colorMod.blue
    arr

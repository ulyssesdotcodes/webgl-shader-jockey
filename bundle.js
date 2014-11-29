(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.SJ = {};

require('./WebGLManager.coffee');

require('./ShaderLoader.coffee');

SJ.Main = (function() {
  function Main(isVisualizer) {
    var canvas;
    canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    this.shaderLoader = new SJ.ShaderLoader();
    this.webGLController = new SJ.WebGLController(canvas, this.shaderLoader);
    this.webGLController.loadShader("simple");
    this.animate();
  }

  Main.prototype.animate = function() {
    requestAnimationFrame((function(_this) {
      return function() {
        return _this.animate();
      };
    })(this));
    return this.render();
  };

  Main.prototype.render = function() {
    return this.webGLController.render();
  };

  return Main;

})();



},{"./ShaderLoader.coffee":2,"./WebGLManager.coffee":3}],2:[function(require,module,exports){
SJ.ShaderLoader = (function() {
  function ShaderLoader() {
    this.shaders = {};
  }

  ShaderLoader.prototype.getShader = function(name) {
    if (this.shaders[name]) {
      return Rx.just(this.shaders[name]);
    }
    return Rx.DOM.Request.get('./shaders/' + name).map(function(data) {
      return data.responseText;
    }).doOnNext((function(_this) {
      return function(response) {
        return _this.shaders[name] = response;
      };
    })(this));
  };

  return ShaderLoader;

})();



},{}],3:[function(require,module,exports){
SJ.WebGLController = (function() {
  function WebGLController(canvas, shaderLoader) {
    this.canvas = canvas;
    this.shaderLoader = shaderLoader;
    this.startTime = Date.now();
    this.surface = {
      height: 1.0,
      width: 1.0
    };
    this.gl = this.canvas.getContext("experimental-webgl");
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]), this.gl.STATIC_DRAW);
    this.surface.buffer = this.gl.createBuffer();
    this.gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  WebGLController.prototype.loadShader = function(name) {
    return Rx.Observable.start((function(_this) {
      return function() {
        return _this.gl.createProgram();
      };
    })(this)).doOnNext((function(_this) {
      return function(program) {
        return _this.program = program;
      };
    })(this)).zip(this.shaderLoader.getShader(name + ".vert").map((function(_this) {
      return function(data) {
        return _this.createShader(_this.gl.VERTEX_SHADER, data);
      };
    })(this)), this.shaderLoader.getShader(name + ".frag").map((function(_this) {
      return function(data) {
        return _this.createShader(_this.gl.FRAGMENT_SHADER, data);
      };
    })(this)), function(program, vs, fs) {
      return {
        program: program,
        vs: vs,
        fs: fs
      };
    }).subscribe((function(_this) {
      return function(_arg) {
        var fs, program, vs;
        program = _arg.program, vs = _arg.vs, fs = _arg.fs;
        _this.gl.attachShader(program, vs);
        _this.gl.attachShader(program, fs);
        _this.gl.deleteShader(vs);
        _this.gl.deleteShader(fs);
        _this.gl.linkProgram(program);
        _this.gl.useProgram(program);
        _this.cacheUniformLocation(program, 'time');
        _this.vertexPosition = _this.gl.getAttribLocation(_this.program, "position");
        return _this.gl.enableVertexAttribArray(_this.vertexPosition);
      };
    })(this));
  };

  WebGLController.prototype.cacheUniformLocation = function(program, label) {
    if (program.uniformsCache === void 0) {
      program.uniformsCache = {};
    }
    return program.uniformsCache[label] = this.gl.getUniformLocation(program, label);
  };

  WebGLController.prototype.createShader = function(type, text) {
    var shader;
    shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, text);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw this.gl.getShaderInfoLog(shader);
    }
    return shader;
  };

  WebGLController.prototype.render = function() {
    if (this.program == null) {
      return;
    }
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.program.uniformsCache['time'], (Date.now() - this.startTime) / 1000.0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.vertexAttribPointer(this.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    return this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  };

  return WebGLController;

})();



},{}]},{},[1]);

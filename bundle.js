(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
SJ.AudioProcessor = (function() {
  AudioProcessor.bufferSize = 1024;

  function AudioProcessor() {
    this.responsiveness = 1;
    this.frequencyBuffer = new Uint8Array(this.constructor.bufferSize);
    this.frequencyBufferSubject = new Rx.BehaviorSubject(this.frequencyBuffer);
    this.dbBuffer = new Uint8Array(this.constructor.bufferSize);
    this.dbBufferSubject = new Rx.BehaviorSubject(this.dbBuffer);
    this.smoothFrequencyBuffer = new Uint8Array(this.constructor.bufferSize);
    this.smoothFrequencyBufferSubject = new Rx.BehaviorSubject(this.smoothFrequencyBuffer);
    this.smoothDbBuffer = new Uint8Array(this.constructor.bufferSize);
    this.smoothDbBufferSubject = new Rx.BehaviorSubject(this.smoothDbBuffer);
    this.fMax = new Uint8Array(this.constructor.bufferSize);
    this.dbMax = new Uint8Array(this.constructor.bufferSize);
    this.max = 0.0;
    this.current = 0.0;
    this.averageDbSubject = new Rx.BehaviorSubject(0.0);
    this.time = 0;
    this.timeSubject = new Rx.BehaviorSubject(this.time);
    this.deltaTime = 0;
    this.mAudioEventObservable = Rx.Observable.zip(this.timeSubject, this.frequencyBufferSubject, this.dbBufferSubject, this.smoothFrequencyBufferSubject, this.smoothDbBufferSubject, this.averageDbSubject, function(time, frequency, db, smoothFrequency, smoothDb, averageDb) {
      return {
        time: time,
        frequencyBuffer: frequency,
        dbBuffer: db,
        smoothFrequencyBuffer: smoothFrequency,
        smoothDbBuffer: smoothDb,
        averageDb: averageDb
      };
    });
  }

  AudioProcessor.prototype.update = function(analyser, time) {
    var buf, deltaTimeS, diff, key, maxDiff, newTime, rms, sign, val, value, _i, _len, _ref, _ref1, _ref2;
    if (!analyser) {
      return;
    }
    newTime = time * 1000;
    this.deltaTime = newTime - this.time;
    deltaTimeS = this.deltaTime * 0.001;
    this.time = newTime;
    this.timeSubject.onNext(this.time);
    analyser.getByteTimeDomainData(this.dbBuffer);
    analyser.getByteFrequencyData(this.frequencyBuffer);
    this.dbBufferSubject.onNext(this.dbBuffer);
    this.frequencyBufferSubject.onNext(this.frequencyBuffer);
    _ref = this.frequencyBuffer;
    for (key in _ref) {
      value = _ref[key];
      this.frequencyBuffer[key] = value * this.responsiveness;
      this.fMax[key] = Math.max(this.fMax[key], value);
      if (this.smoothFrequencyBuffer[key] > this.fMax[key]) {
        this.smoothFrequencyBuffer[key] = Math.min(Math.max(this.smoothFrequencyBuffer[key] - 256 * deltaTimeS * 0.6, this.fMax[key]), this.smoothFrequencyBuffer[key]);
      } else {
        this.smoothFrequencyBuffer[key] = Math.min(Math.max(this.smoothFrequencyBuffer[key] + 256 * deltaTimeS * 1.0, this.smoothFrequencyBuffer[key]), this.fMax[key]);
      }
      this.fMax[key] = Math.max(this.fMax[key] - deltaTimeS * 256.0 * 0.6, 0);
    }
    this.smoothFrequencyBufferSubject.onNext(this.smoothFrequencyBuffer);
    _ref1 = this.dbBuffer;
    for (key in _ref1) {
      value = _ref1[key];
      this.dbBuffer[key] = value * this.responsiveness;
      this.dbMax[key] = Math.abs(value - 128) > Math.abs(this.dbMax[key] - 128) ? value : this.dbMax[key];
      sign = Math.sign(this.smoothDbBuffer[key] - 128);
      if (sign === 0) {
        sign = 1;
      }
      diff = Math.abs(this.smoothDbBuffer[key] - 128);
      maxDiff = Math.abs(this.dbMax[key] - 128);
      if (diff > maxDiff) {
        diff = Math.min(Math.max(256 * deltaTimeS, maxDiff), diff);
        this.smoothDbBuffer[key] -= sign * diff;
      } else {
        diff = Math.min(Math.max(256 * deltaTimeS, diff), maxDiff);
        this.smoothDbBuffer[key] += sign * diff;
      }
      this.dbMax[key] -= sign * Math.min(Math.abs(this.dbMax[key] - 128), deltaTimeS * 256.0 * 0.6);
    }
    this.smoothDbBufferSubject.onNext(this.smoothDbBuffer);
    rms = 0;
    _ref2 = this.dbBuffer;
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      buf = _ref2[_i];
      val = (buf - 128) / 128;
      rms += val * val;
    }
    return this.averageDbSubject.onNext(Math.sqrt(rms / this.constructor.bufferSize) * this.responsiveness);
  };

  return AudioProcessor;

})();



},{}],2:[function(require,module,exports){
window.SJ = {};

window.f = require('../node_modules/effing/src/index.coffee');

require('./Viewer.coffee');

require('./WebGLController.coffee');

require('./ShaderLoader.coffee');

require('./AudioProcessor.coffee');

require('./SoundCloudLoader.coffee');

require('./Player.coffee');

require('./interface/AudioView.coffee');

require('./interface/LibraryView.coffee');

require('./interface/QueueView.coffee');

SJ.Main = (function() {
  Main.prototype.shortcuts = {
    32: "playPause",
    78: "nextShader"
  };

  function Main() {
    var canvasClickObservable;
    this.canvas = $("<canvas>", {
      "class": 'fullscreen',
      width: window.innerWidth,
      height: window.innerHeight
    });
    this.onResize();
    Rx.DOM.resize(window).subscribe(f(this, 'onResize'));
    Rx.DOM.keyup(($('body')[0])).map(f.get('keyCode')).map(f.curried(f.swap(f.get))(this.shortcuts)).filter(f.neq(void 0)).subscribe((function(_this) {
      return function(shortcut) {
        return f(_this, shortcut)();
      };
    })(this));
    $('body').append(this.canvas);
    this.audioView = new SJ.AudioView($('body'), window.location.hash.substring(1));
    this.queueView = new SJ.QueueView($('body'));
    this.player = new SJ.Player();
    this.player.setPlayer(this.audioView.audioPlayer);
    this.audioProcessor = new SJ.AudioProcessor();
    this.webGLController = new SJ.WebGLController(this.canvas[0], new SJ.ShaderLoader(), this.audioProcessor.mAudioEventObservable);
    canvasClickObservable = Rx.DOM.click(this.canvas[0]).map((function(_this) {
      return function(e) {
        return {
          x: e.clientX / _this.canvas[0].clientWidth,
          y: 1.0 - (e.clientY / _this.canvas[0].clientHeight)
        };
      };
    })(this));
    canvasClickObservable.subscribe(f(this.webGLController.addTouchEvent));
    this.libraryView = new SJ.LibraryView($('body'));
    this.libraryView.shaderSelectionSubject.subscribe(f(this.queueView, "addShader"));
    this.popupMessageSubject = new Rx.BehaviorSubject({
      type: 'shader',
      data: "simple"
    });
    canvasClickObservable.map(function(me) {
      return {
        type: 'touchEvent',
        data: me
      };
    }).subscribe(f(this.popupMessageSubject, 'onNext'));
    this.queueView.mShaderNextSubject.subscribe(f(this.webGLController, 'loadShader'));
    this.queueView.mShaderNextSubject.map(function(shader) {
      return {
        type: 'shader',
        data: shader
      };
    }).subscribe(f(this.popupMessageSubject, 'onNext'));
    this.audioProcessor.mAudioEventObservable.map(function(ae) {
      return {
        type: 'audioEvent',
        data: ae
      };
    }).subscribe(f(this.popupMessageSubject, "onNext"));
    this.soundCloudLoader = new SJ.SoundCloudLoader(this.audioView);
    this.audioView.mURLObservable.filter(f.eq(SJ.AudioView.micUrl)).subscribe(f(this.player, 'createLiveInput'));
    this.audioView.mURLObservable.filter(f.neq(SJ.AudioView.micUrl)).subscribe(f(this.soundCloudLoader, 'loadStream'));
    this.viewerButton = $("<a></a>", {
      "class": 'viewer-button',
      href: '#',
      text: 'viewer'
    });
    Rx.DOM.click(this.viewerButton[0]).subscribe((function(_this) {
      return function(e) {
        var popupUrl;
        e.preventDefault();
        _this.domain = window.location.protocol + '//' + window.location.host;
        popupUrl = location.pathname + 'viewer.html';
        _this.popup = window.open(popupUrl, 'viewerWindow');
        _this.popupMessageSubject.subscribe(function(e) {
          return _this.popup.postMessage(e, _this.domain);
        });
      };
    })(this));
    $('body').append(this.viewerButton);
    this.animate();
  }

  Main.prototype.animate = function() {
    requestAnimationFrame(f(this, 'animate'));
    return this.render();
  };

  Main.prototype.render = function() {
    return this.audioProcessor.update(this.player.analyser, this.player.audioContext.currentTime);
  };

  Main.prototype.playPause = function() {
    return this.player.playPause();
  };

  Main.prototype.nextShader = function() {
    return this.queueView.next();
  };

  Main.prototype.onResize = function() {
    this.canvas.width(window.innerWidth);
    this.canvas.height(window.innerHeight);
    this.canvas[0].width = window.innerWidth;
    return this.canvas[0].height = window.innerHeight;
  };

  return Main;

})();



},{"../node_modules/effing/src/index.coffee":14,"./AudioProcessor.coffee":1,"./Player.coffee":3,"./ShaderLoader.coffee":4,"./SoundCloudLoader.coffee":5,"./Viewer.coffee":6,"./WebGLController.coffee":7,"./interface/AudioView.coffee":8,"./interface/LibraryView.coffee":9,"./interface/QueueView.coffee":10}],3:[function(require,module,exports){
SJ.Player = (function() {
  function Player() {
    this.loadedAudio = new Array();
    this.startOffset = 0;
    this.setupAnalyser();
  }

  Player.prototype.setupAnalyser = function() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = SJ.AudioProcessor.bufferSize;
    return this.analyser.smoothingTimeConstant = 0;
  };

  Player.prototype.pause = function() {
    if ((this.player != null) && this.playing) {
      this.source.disconnect();
      this.player[0].pause();
      this.playing = false;
      this.startOffset += this.audioContext.currentTime - this.startTime;
      return this.player.bind("play", (function(_this) {
        return function() {
          _this.source.connect(_this.analyser);
          _this.playing = true;
          if (_this.miked) {
            return _this.pauseMic();
          }
        };
      })(this));
    } else if (this.player != null) {
      this.source.connect(this.analyser);
      this.player[0].play();
      this.playing = true;
      if (this.miked) {
        return this.pauseMic();
      }
    }
  };

  Player.prototype.createLiveInput = function() {
    var gotStream;
    if (this.playing) {
      this.pause();
    }
    if (this.micSource != null) {
      this.micSource.connect(this.analyser);
      this.miked = true;
      return;
    }
    gotStream = (function(_this) {
      return function(stream) {
        _this.miked = true;
        _this.micSource = _this.audioContext.createMediaStreamSource(stream);
        return _this.micSource.connect(_this.analyser);
      };
    })(this);
    this.dbSampleBuf = new Uint8Array(2048);
    if (navigator.getUserMedia) {
      return navigator.getUserMedia({
        audio: true
      }, gotStream, function(err) {
        return console.log(err);
      });
    } else if (navigator.webkitGetUserMedia) {
      return navigator.webkitGetUserMedia({
        audio: true
      }, gotStream, function(err) {
        return console.log(err);
      });
    } else if (navigator.mozGetUserMedia) {
      return navigator.mozGetUserMedia({
        audio: true
      }, gotStream, function(err) {
        return console.log(err);
      });
    } else {
      return alert("Error: getUserMedia not supported!");
    }
  };

  Player.prototype.pauseMic = function() {
    if (this.miked) {
      this.micSource.disconnect();
      return this.miked = false;
    }
  };

  Player.prototype.play = function(url) {
    var request;
    this.currentlyPlaying = url;
    if (this.loadedAudio[url] != null) {
      this.loadFromBuffer(this.loadedAudio[url]);
      return;
    }
    request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = 'arraybuffer';
    request.onload = (function(_this) {
      return function() {
        _this.audioContext.decodeAudioData(request.response, function(buffer) {
          _this.loadedAudio[url] = buffer;
          return _this.loadFromBuffer(buffer);
        }, function(err) {
          return console.log(err);
        });
      };
    })(this);
    request.send();
  };

  Player.prototype.loadFromBuffer = function(buffer) {
    this.startTime = this.audioContext.currentTime;
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = buffer;
    this.source.connect(this.analyser);
    this.source.connect(this.audioContext.destination);
    this.playing = true;
    return this.source.start(0, this.startOffset);
  };

  Player.prototype.setPlayer = function(player) {
    this.player = player;
    this.source = this.audioContext.createMediaElementSource(this.player[0]);
    this.source.connect(this.analyser);
    this.source.connect(this.audioContext.destination);
    this.playing = true;
    return this.pauseMic();
  };

  Player.prototype.playPause = function() {
    if (this.miked) {
      return;
    }
    if ((this.player == null) || !this.playing) {
      return;
    }
    if (this.player[0].paused) {
      return this.player[0].play();
    } else {
      return this.player[0].pause();
    }
  };

  return Player;

})();



},{}],4:[function(require,module,exports){
SJ.ShaderLoader = (function() {
  function ShaderLoader() {
    this.shaders = {};
  }

  ShaderLoader.prototype.getShader = function(name) {
    if (this.shaders[name]) {
      return Rx.Observable.just(this.shaders[name]);
    }
    return Rx.DOM.get('./shaders/' + name).map(f.get('responseText')).doOnNext((function(_this) {
      return function(response) {
        return _this.shaders[name] = response;
      };
    })(this));
  };

  return ShaderLoader;

})();



},{}],5:[function(require,module,exports){
SJ.SoundCloudLoader = (function() {
  var directStream;

  SoundCloudLoader.client_id = "384835fc6e109a2533f83591ae3713e9";

  function SoundCloudLoader(audioView) {
    this.audioView = audioView;
    this.player = this.audioView.player;
    return;
  }

  SoundCloudLoader.prototype.loadStream = function(url, successCallback, errorCallback) {
    if (typeof SC === "undefined" || SC === null) {
      return;
    }
    SC.initialize({
      client_id: this.constructor.client_id
    });
    return SC.get('/resolve', {
      url: url
    }, (function(_this) {
      return function(sound) {
        if (sound.errors) {
          console.log("error: ", sound.errors);
          return errorCallback();
        } else {
          console.log(sound);
          if (sound.kind === 'playlist') {
            _this.sound = sound;
            _this.streamPlaylistIndex = 0;
            return _this.playStream();
          } else {
            _this.sound = sound;
            return _this.playStream();
          }
        }
      };
    })(this));
  };

  SoundCloudLoader.prototype.playStream = function() {
    return this.audioView.playStream(this.streamUrl(), (function(_this) {
      return function() {
        return _this.directStream('coasting');
      };
    })(this));
  };

  SoundCloudLoader.prototype.streamUrl = function() {
    if (this.sound.kind === 'playlist') {
      return this.sound.tracks[this.streamPlaylistIndex].stream_url + '?client_id=' + this.constructor.client_id;
    } else {
      return this.sound.stream_url + '?client_id=' + this.constructor.client_id;
    }
  };

  directStream = function(direction) {
    if (direction === 'toggle') {
      if (SoundCloudLoader.player.paused) {
        return SoundCloudLoader.player.play();
      } else {
        return SoundCloudLoader.player.pause();
      }
    } else if (SoundCloudLoader.sound.kind === 'playlist') {
      if (direction === 'coasting') {
        SoundCloudLoader.streamPlaylistIndex++;
      } else if (direction = 'forward') {
        if (SoundCloudLoader.streamPlaylistIndex >= SoundCloudLoader.sound.track_count - 1) {
          SoundCloudLoader.streamPlaylistIndex++;
        } else {
          SoundCloudLoader.streamPlaylistIndex--;
        }
      } else {
        if (SoundCloudLoader.streamPlaylistIndex <= 0) {
          SoundCloudLoader.streamPlaylistIndex = SoundCloudLoader.sound.track_count - 1;
        } else {
          SoundCloudLoader.streamPlaylistIndex--;
        }
      }
      if (SoundCloudLoader.streamPlaylistIndex >= 0 && SoundCloudLoader.streamPlaylistIndex <= SoundCloudLoader.sound.track_count - 1) {
        SoundCloudLoader.player.setAttribute(SoundCloudLoader.streamUrl());
        return SoundCloudLoader.player.play();
      }
    }
  };

  return SoundCloudLoader;

})();



},{}],6:[function(require,module,exports){
require('./ShaderLoader.coffee');

SJ.Viewer = (function() {
  function Viewer() {
    var audioEventObeservable, messageObservable;
    this.canvas = $("<canvas>", {
      "class": 'fullscreen',
      width: window.innerWidth,
      height: window.innerHeight
    });
    this.canvas[0].width = window.innerWidth;
    this.canvas[0].height = window.innerHeight;
    Rx.DOM.resize(window).subscribe((function(_this) {
      return function(e) {
        _this.canvas.width(window.innerWidth);
        _this.canvas.height(window.innerHeight);
        _this.canvas[0].width = window.innerWidth;
        return _this.canvas[0].height = window.innerHeight;
      };
    })(this));
    $('body').append(this.canvas);
    audioEventObeservable = new Rx.BehaviorSubject();
    this.webGLController = new SJ.WebGLController(this.canvas[0], new SJ.ShaderLoader(), audioEventObeservable);
    this.domain = window.location.protocol + '//' + window.location.host;
    messageObservable = Rx.DOM.fromEvent(window, 'message').filter((function(_this) {
      return function(e) {
        return e.origin === _this.domain;
      };
    })(this)).map(f.get('data'));
    messageObservable.filter(function(m) {
      return m.type === "shader";
    }).map(f.get('data')).subscribe(f(this, 'updateShader'));
    messageObservable.filter(function(m) {
      return m.type === "audioEvent";
    }).map(f.get('data')).subscribe(f(audioEventObeservable, 'onNext'));
    messageObservable.filter(function(m) {
      return m.type === "touchEvent";
    }).map(f.get('data')).subscribe(f(this.webGLController.addTouchEvent));
    return;
  }

  Viewer.prototype.update = function(audioEvent) {
    return this.webGLController.update(audioEvent);
  };

  Viewer.prototype.updateShader = function(shader) {
    return this.webGLController.loadShader(shader);
  };

  return Viewer;

})();



},{"./ShaderLoader.coffee":4}],7:[function(require,module,exports){
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

SJ.WebGLController = (function() {
  WebGLController.touchEventCount = 10;

  function WebGLController(canvas, shaderLoader, audioEventObservable) {
    this.canvas = canvas;
    this.shaderLoader = shaderLoader;
    this.audioEventObservable = audioEventObservable;
    this.addTouchEvent = __bind(this.addTouchEvent, this);
    this.resetTouchEvents = __bind(this.resetTouchEvents, this);
    this.touchEventIndex = 0;
    this.startTime = Date.now();
    this.texture = {
      arr: new Uint8Array(SJ.AudioProcessor.bufferSize * 4)
    };
    this.gl = this.canvas.getContext("experimental-webgl");
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]), this.gl.STATIC_DRAW);
    this.texture.tex = this.gl.createTexture();
    this.createAudioTexture(this.texture.tex);
    this.gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.audioEventObservable.subscribe(f(this, 'update'));
    this.touchEvents = new Array(SJ.WebGLController.touchEventCount * 3);
    this.resetTouchEvents();
  }

  WebGLController.prototype.loadShader = function(name) {
    if (name == null) {
      return;
    }
    console.log("Loading " + name);
    return Rx.Observable.start((function(_this) {
      return function() {
        return _this.gl.createProgram();
      };
    })(this)).zip(this.shaderLoader.getShader(name + ".vert").map((function(_this) {
      return function(data) {
        return _this.createShader(_this.gl.VERTEX_SHADER, data);
      };
    })(this)), this.shaderLoader.getShader(name + ".frag").map((function(_this) {
      return function(data) {
        return _this.createShader(_this.gl.FRAGMENT_SHADER, data);
      };
    })(this)), (function(_this) {
      return function(program, vs, fs) {
        _this.gl.attachShader(program, vs);
        _this.gl.attachShader(program, fs);
        _this.gl.deleteShader(vs);
        _this.gl.deleteShader(fs);
        _this.gl.linkProgram(program);
        _this.gl.useProgram(program);
        _this.cacheUniformLocation(program, 'time');
        _this.cacheUniformLocation(program, 'resolution');
        _this.cacheUniformLocation(program, 'audioTexture');
        _this.cacheUniformLocation(program, 'te');
        _this.vertexPosition = _this.gl.getAttribLocation(program, "position");
        _this.gl.enableVertexAttribArray(_this.vertexPosition);
        return program;
      };
    })(this)).subscribe((function(_this) {
      return function(program) {
        return _this.program = program;
      };
    })(this));
  };

  WebGLController.prototype.update = function(audioEvent) {
    if (this.program == null) {
      return;
    }
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.program.uniformsCache['resolution'], this.canvas.clientWidth, this.canvas.clientHeight);
    this.gl.uniform1f(this.program.uniformsCache['audioResolution'], SJ.AudioProcessor.bufferSize);
    this.gl.uniform1f(this.program.uniformsCache['time'], audioEvent.time / 1000.0);
    this.gl.uniform1i(this.program.uniformsCache['audioTexture'], 0);
    this.gl.uniform3fv(this.program.uniformsCache['te'], this.touchEvents);
    this.mapAudioToArray(audioEvent, this.texture.arr);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture.tex);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, SJ.AudioProcessor.bufferSize, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.texture.arr);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.vertexAttribPointer(this.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
    return this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
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

  WebGLController.prototype.createAudioTexture = function(texture) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, SJ.AudioProcessor.bufferSize, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    return this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  };

  WebGLController.prototype.mapAudioToArray = function(audioEvent, arr) {
    this.mapChannel(audioEvent.frequencyBuffer, arr, 'r', 4);
    this.mapChannel(audioEvent.dbBuffer, arr, 'g', 4);
    this.mapChannel(audioEvent.smoothFrequencyBuffer, arr, 'b', 4);
    return this.mapChannel(audioEvent.smoothDbBuffer, arr, 'a', 4);
  };

  WebGLController.prototype.mapChannel = function(buffer, out, channel, channels) {
    var cIndex, i, _i, _ref, _results;
    cIndex = (function() {
      switch (channel) {
        case 'r':
        case 'x':
          return 0;
        case 'g':
        case 'y':
          return 1;
        case 'b':
        case 'z':
          return 2;
        case 'a':
          return 3;
        default:
          return channel;
      }
    })();
    _results = [];
    for (i = _i = 1, _ref = buffer.length; 1 <= _ref ? _i <= _ref : _i >= _ref; i = 1 <= _ref ? ++_i : --_i) {
      _results.push(out[i * channels + cIndex] = buffer[i]);
    }
    return _results;
  };

  WebGLController.prototype.resetTouchEvents = function() {
    var i, _i, _ref, _results;
    _results = [];
    for (i = _i = 0, _ref = this.touchEvents.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      _results.push(this.touchEvents[i] = 0.0);
    }
    return _results;
  };

  WebGLController.prototype.addTouchEvent = function() {
    var x, y;
    if (arguments[0].x != null) {
      x = arguments[0].x;
      y = arguments[0].y;
    } else {
      x = arguments[0];
      y = arguments[1];
    }
    return this.audioEventObservable.take(1).zip(Rx.Observable.just(x), Rx.Observable.just(y), function(ae, ex, ey) {
      return [ex, ey, ae.time / 1000.0];
    }).subscribe((function(_this) {
      return function(te) {
        _this.touchEvents.splice(_this.touchEventIndex * 3, 3, te[0], te[1], te[2]);
        return _this.touchEventIndex = ++_this.touchEventIndex % SJ.WebGLController.touchEventCount;
      };
    })(this));
  };

  return WebGLController;

})();



},{}],8:[function(require,module,exports){
SJ.AudioView = (function() {
  AudioView.micUrl = "mic";

  function AudioView(target, url) {
    var micIcon, startUrl;
    this.audioPlayer = $("<audio />", {
      "class": 'audio-player',
      controls: true
    });
    this.controls = $("<div>", {
      "class": 'audio-controls'
    });
    this.mic = $("<a>", {
      href: '#'
    });
    micIcon = $("<img/>", {
      "class": "icon",
      src: "./resources/ic_mic_none_white_48dp.png"
    });
    this.mic.append(micIcon);
    this.controls.append(this.mic);
    startUrl = !!url ? "https://soundcloud.com/" + url : "https://soundcloud.com/redviolin/swing-tape-3";
    this.mURLObservable = new Rx.BehaviorSubject(startUrl);
    this.mic.click((function(_this) {
      return function(e) {
        e.preventDefault();
        return _this.mURLObservable.onNext(SJ.AudioView.micUrl);
      };
    })(this));
    this.input = $("<input>", {
      "class": 'soundcloud-input',
      type: "text"
    });
    this.controls.append(this.input);
    this.input.change((function(_this) {
      return function(e) {
        return _this.mURLObservable.onNext(_this.input.val());
      };
    })(this));
    this.controls.append(this.audioPlayer);
    target.append(this.controls);
  }

  AudioView.prototype.playStream = function(url, onEnd) {
    this.audioPlayer.bind('ended', onEnd);
    return this.audioPlayer.attr('src', url);
  };

  return AudioView;

})();



},{}],9:[function(require,module,exports){
SJ.LibraryView = (function() {
  LibraryView.shaders = ["simple", "fft_matrix_product", "circular_fft", "vertical_wav"];

  function LibraryView(target) {
    var shader, _i, _len, _ref;
    this.container = $("<div></div>", {
      "class": 'library'
    });
    this.select = $("<select />");
    _ref = LibraryView.shaders;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      shader = _ref[_i];
      this.select.append("<option value='" + shader + "'>" + shader + "</option>");
    }
    this.shaderSelectionSubject = new Rx.BehaviorSubject();
    this.select.change((function(_this) {
      return function() {
        return _this.shaderSelectionSubject.onNext(_this.select.find('option:selected').val());
      };
    })(this));
    this.container.append(this.select);
    target.append(this.container);
  }

  LibraryView.prototype.shaderSelectionObservable = function() {
    return this.shaderSelectionSubject;
  };

  return LibraryView;

})();



},{}],10:[function(require,module,exports){
SJ.QueueView = (function() {
  function QueueView(target) {
    this.queue = [];
    this.queueList = $("<div>", {
      "class": "queue-list"
    });
    target.append(this.queueList);
    this.nextButton = $("<a />", {
      href: '#',
      "class": "next-button",
      text: ">>>>>>"
    });
    this.nextButton.click((function(_this) {
      return function(e) {
        e.preventDefault();
        return _this.next();
      };
    })(this));
    target.append(this.nextButton);
    this.mShaderNextSubject = new Rx.BehaviorSubject("simple");
  }

  QueueView.prototype.addShader = function(shader) {
    if (!shader) {
      return;
    }
    this.queue.push(shader);
    return this.updateList();
  };

  QueueView.prototype.updateList = function() {
    var newList, shader, _i, _len, _ref;
    newList = $("<div>");
    _ref = this.queue;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      shader = _ref[_i];
      newList.append($("<div>" + shader + "</div>"));
    }
    return this.queueList.html(newList);
  };

  QueueView.prototype.next = function() {
    this.mShaderNextSubject.onNext(this.queue.shift());
    return this.updateList();
  };

  return QueueView;

})();



},{}],11:[function(require,module,exports){
var curry, overloaded,
  __hasProp = {}.hasOwnProperty;

overloaded = require('./overloaded');

curry = function(fn) {
  return overloaded({
    1: function(b) {
      return overloaded({
        1: function(a) {
          return fn.call(this, a, b);
        }
      });
    },
    2: fn
  });
};

module.exports = function(ops) {
  var key, result, val;
  result = {};
  for (key in ops) {
    if (!__hasProp.call(ops, key)) continue;
    val = ops[key];
    result[key] = curry(val);
  }
  return result;
};



},{"./overloaded":18}],12:[function(require,module,exports){
var curried, f,
  __slice = [].slice;

f = require('./to-function');

curried = function(fn, length) {
  if (length == null) {
    if (typeof fn === 'function') {
      length = fn.length;
    } else {
      throw new Error("You can't get a curried version of a functionoid without specifying an explicit number of expected parameters!");
    }
  }
  fn = f(fn);
  return function() {
    if (arguments.length < length) {
      return curried(f.apply(null, [fn].concat(__slice.call(arguments))), length - arguments.length);
    } else {
      return fn.apply(this, arguments);
    }
  };
};

module.exports = curried;



},{"./to-function":21}],13:[function(require,module,exports){
var f, prime,
  __slice = [].slice;

f = require('./to-function');

prime = require('./prime');

module.exports = {
  noop: f(),
  concat: function() {
    var fns;
    fns = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return function() {
      var fn, val, _i, _len;
      val = void 0;
      for (_i = 0, _len = fns.length; _i < _len; _i++) {
        fn = fns[_i];
        val = f(fn).apply(this, arguments);
      }
      return val;
    };
  },
  compose: function(a, b) {
    a = f(a);
    b = f(b);
    return function() {
      return a.call(this, b.apply(this, arguments));
    };
  },
  swap: function(fn) {
    fn = f(fn);
    return function(a, b) {
      return fn.call(this, b, a);
    };
  },
  unpack: function(fn) {
    fn = f(fn);
    return function(arg) {
      return fn.apply(this, arg);
    };
  },
  guard: function(fn, pred, elseValue) {
    fn = f(fn);
    pred = f(pred);
    return function() {
      if (pred.apply(this, arguments)) {
        return fn.apply(this, arguments);
      } else {
        return elseValue;
      }
    };
  },
  "const": function(val) {
    return function() {
      return val;
    };
  },
  once: function(fn, errorMessage) {
    if (errorMessage == null) {
      errorMessage = "Function called more than once!";
    }
    return prime({
      first: fn,
      after: function() {
        throw new Error(errorMessage);
      }
    });
  }
};



},{"./prime":19,"./to-function":21}],14:[function(require,module,exports){
var aliases, f, key, newName, obj, objRequires, oldName, value, _i, _len,
  __hasProp = {}.hasOwnProperty;

f = require('./to-function');

objRequires = [require('./math'), require('./logic'), require('./objects'), require('./relations'), require('./functions')];

f['overloaded'] = require('./overloaded');

f['curried'] = require('./curried');

f['prime'] = require('./prime');

for (_i = 0, _len = objRequires.length; _i < _len; _i++) {
  obj = objRequires[_i];
  for (key in obj) {
    if (!__hasProp.call(obj, key)) continue;
    value = obj[key];
    f[key] = value;
  }
}

aliases = {
  sub: 'subtract',
  mult: 'multiply',
  div: 'divide',
  idiv: 'divideInt',
  mod: 'modulo',
  neg: 'negate',
  rem: 'remainder',
  comp: 'compose',
  dot: 'get'
};

for (newName in aliases) {
  if (!__hasProp.call(aliases, newName)) continue;
  oldName = aliases[newName];
  f[newName] = f[oldName];
}

module.exports = f;



},{"./curried":12,"./functions":13,"./logic":15,"./math":16,"./objects":17,"./overloaded":18,"./prime":19,"./relations":20,"./to-function":21}],15:[function(require,module,exports){
var operators;

operators = require('./binary-operators');

module.exports = operators({
  and: function(a, b) {
    return a && b;
  },
  or: function(a, b) {
    return a || b;
  }
});

module.exports.not = function(a) {
  return !a;
};



},{"./binary-operators":11}],16:[function(require,module,exports){
var operators;

operators = require('./binary-operators');

module.exports = operators({
  add: function(a, b) {
    return a + b;
  },
  subtract: function(a, b) {
    return a - b;
  },
  multiply: function(a, b) {
    return a * b;
  },
  divide: function(a, b) {
    return a / b;
  },
  intDivide: function(a, b) {
    return Math.floor(a / b);
  },
  modulo: function(a, b) {
    return (a % b + b) % b;
  },
  remainder: function(a, b) {
    return a % b;
  }
});

module.exports.negate = function(a) {
  return -a;
};



},{"./binary-operators":11}],17:[function(require,module,exports){
var curried,
  __slice = [].slice;

curried = require('./curried');

module.exports = {
  get: curried(function(key, obj) {
    return obj[key];
  }),
  set: curried(function(key, obj, val) {
    return obj[key] = val;
  }),
  method: curried(function() {
    var args, methodName, obj;
    methodName = arguments[0], obj = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    return obj[methodName].apply(obj, args);
  }, 2)
};



},{"./curried":12}],18:[function(require,module,exports){
var biggestSmallerThanOrEqualTo, f,
  __hasProp = {}.hasOwnProperty;

f = require('./to-function');

biggestSmallerThanOrEqualTo = function(list, target) {
  var smaller;
  smaller = list.filter(function(x) {
    return x <= target;
  });
  if (smaller.length === 0) {
    return null;
  }
  return Math.max.apply(null, smaller);
};

module.exports = function(originalMap) {
  var key, map, num, nums, val;
  if (arguments.length !== 1) {
    throw new Error("overloaded is not overloaded!");
  }
  map = {};
  nums = (function() {
    var _results;
    _results = [];
    for (key in originalMap) {
      if (!__hasProp.call(originalMap, key)) continue;
      val = originalMap[key];
      num = Number(key);
      if (key === '' || isNaN(num)) {
        throw new Error("non-numeric key " + key);
      }
      map[num] = f(val);
      _results.push(num);
    }
    return _results;
  })();
  if (nums.length === 0) {
    throw new Error("you must pass at least one overload!");
  }
  return function() {
    var fn, len, _ref;
    len = arguments.length;
    fn = (_ref = map[len]) != null ? _ref : (function() {
      len = biggestSmallerThanOrEqualTo(nums, len);
      if (len === null) {
        throw new Error("function not overloaded to accept " + arguments.length + " arguments");
      }
      return map[len];
    })();
    return fn.apply(this, arguments);
  };
};



},{"./to-function":21}],19:[function(require,module,exports){
var f, seq,
  __slice = [].slice;

f = require('./to-function');

seq = function() {
  var args, context, fn, fns, val, _i, _len;
  context = arguments[0], args = arguments[1], fns = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
  val = void 0;
  for (_i = 0, _len = fns.length; _i < _len; _i++) {
    fn = fns[_i];
    if (fn != null) {
      val = fn.apply(context, args);
    }
  }
  return val;
};

module.exports = function(_arg) {
  var after, afterBoth, beforeBoth, both, first, isFirst;
  first = _arg.first, after = _arg.after, beforeBoth = _arg.beforeBoth, afterBoth = _arg.afterBoth, both = _arg.both;
  afterBoth = afterBoth != null ? afterBoth : both;
  if (first != null) {
    first = f(first);
  }
  if (after != null) {
    after = f(after);
  }
  if (beforeBoth != null) {
    beforeBoth = f(beforeBoth);
  }
  if (afterBoth != null) {
    afterBoth = f(afterBoth);
  }
  isFirst = true;
  return function() {
    return seq(this, arguments, beforeBoth, isFirst ? (isFirst = false, first) : after, afterBoth);
  };
};



},{"./to-function":21}],20:[function(require,module,exports){
var operators;

operators = require('./binary-operators');

module.exports = operators({
  gt: function(a, b) {
    return a > b;
  },
  gte: function(a, b) {
    return a >= b;
  },
  lt: function(a, b) {
    return a < b;
  },
  lte: function(a, b) {
    return a <= b;
  },
  eq: function(a, b) {
    return a === b;
  },
  neq: function(a, b) {
    return a !== b;
  }
});



},{"./binary-operators":11}],21:[function(require,module,exports){
var isArray, isFunction, isString, noop, toFunction, _ref,
  __slice = [].slice;

noop = function() {};

isArray = (_ref = Array.isArray) != null ? _ref : function(x) {
  return Object.prototype.toString.call(x) === '[object Array]';
};

isFunction = function(x) {
  return typeof x === 'function';
};

isString = function(x) {
  return typeof x === 'string';
};

toFunction = function(functionoid) {
  var args, fn, method, target;
  if (arguments.length > 1) {
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return toFunction(args);
  }
  if (functionoid == null) {
    return noop;
  }
  if (isFunction(functionoid)) {
    return functionoid;
  }
  if (!isArray(functionoid)) {
    throw new Error("Input is not convertible to a function");
  }
  if (functionoid.length === 0) {
    throw new Error("Empty arrays are not functionoids");
  }
  if (typeof functionoid[0] === 'function') {
    fn = functionoid[0], args = 2 <= functionoid.length ? __slice.call(functionoid, 1) : [];
    return function() {
      return fn.call.apply(fn, [this].concat(__slice.call(args), __slice.call(arguments)));
    };
  }
  target = functionoid[0], method = functionoid[1], args = 3 <= functionoid.length ? __slice.call(functionoid, 2) : [];
  fn = (function() {
    if (isString(method)) {
      return target[method];
    } else if (isFunction(method)) {
      return method;
    } else {
      throw new Error("The [target, method, args...] functionoid requires a string or a function as the method");
    }
  })();
  return function() {
    return fn.call.apply(fn, [target].concat(__slice.call(args), __slice.call(arguments)));
  };
};

module.exports = toFunction;



},{}]},{},[2]);

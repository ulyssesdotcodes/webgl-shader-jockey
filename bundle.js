(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
SJ.AudioProcessor = (function() {
  AudioProcessor.bufferSize = 512;

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
  }

  AudioProcessor.prototype.audioEventObservable = function() {
    return Rx.Observable.zip(this.timeSubject, this.frequencyBufferSubject, this.dbBufferSubject, this.smoothFrequencyBufferSubject, this.smoothDbBufferSubject, this.averageDbSubject, function(time, frequency, db, smoothFrequency, smoothDb, averageDb) {
      return {
        time: time,
        frequencyBuffer: frequency,
        dbBuffer: db,
        smoothFrequencyBuffer: smoothFrequency,
        smoothDbBuffer: smoothDb,
        averageDb: averageDb
      };
    });
  };

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

require('./WebGLManager.coffee');

require('./ShaderLoader.coffee');

require('./AudioProcessor.coffee');

require('./SoundCloudLoader.coffee');

require('./Player.coffee');

require('./interface/AudioView.coffee');

SJ.Main = (function() {
  function Main(isVisualizer) {
    var canvas, url;
    canvas = $("<canvas>", {
      "class": 'fullscreen'
    });
    $('body').append(canvas);
    this.audioView = new SJ.AudioView();
    this.audioView.createView($('body'));
    this.player = new SJ.Player();
    this.player.setPlayer(this.audioView.audioPlayer);
    this.shaderLoader = new SJ.ShaderLoader();
    this.webGLController = new SJ.WebGLController(canvas[0], this.shaderLoader);
    this.webGLController.loadShader("simple");
    this.audioProcessor = new SJ.AudioProcessor();
    this.audioProcessor.audioEventObservable().subscribe((function(_this) {
      return function(audioEvent) {
        return _this.webGLController.update(audioEvent);
      };
    })(this));
    url = window.location.hash !== "" ? "https://soundcloud.com/" + window.location.hash.substring(1) : "https://soundcloud.com/redviolin/swing-tape-3";
    this.soundCloudLoader = new SJ.SoundCloudLoader(this.audioView);
    this.soundCloudLoader.loadStream(url);
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
    return this.audioProcessor.update(this.player.analyser, this.player.audioContext.currentTime);
  };

  return Main;

})();



},{"./AudioProcessor.coffee":1,"./Player.coffee":3,"./ShaderLoader.coffee":4,"./SoundCloudLoader.coffee":5,"./WebGLManager.coffee":6,"./interface/AudioView.coffee":7}],3:[function(require,module,exports){
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
    this.analyser.connect(this.audioContext.destination);
    this.playing = true;
    return this.pauseMic();
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
SJ.WebGLController = (function() {
  function WebGLController(canvas, shaderLoader) {
    this.canvas = canvas;
    this.shaderLoader = shaderLoader;
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
        _this.cacheUniformLocation(program, 'resolution');
        _this.cacheUniformLocation(program, 'audioTexture');
        _this.vertexPosition = _this.gl.getAttribLocation(_this.program, "position");
        return _this.gl.enableVertexAttribArray(_this.vertexPosition);
      };
    })(this));
  };

  WebGLController.prototype.update = function(audioEvent) {
    if (this.program == null) {
      return;
    }
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.program.uniformsCache['resolution'], this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.program.uniformsCache['time'], audioEvent.time / 1000.0);
    this.gl.uniform1i(this.program.uniformsCache['audioTexture'], 0);
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

  return WebGLController;

})();



},{}],7:[function(require,module,exports){
SJ.AudioView = (function() {
  function AudioView() {}

  AudioView.prototype.createView = function(target, onMic, onUrl) {
    var micIcon;
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
    this.mic.click((function(_this) {
      return function(e) {
        e.preventDefault();
        return onMic();
      };
    })(this));
    this.input = $("<input>", {
      "class": 'soundcloud-input',
      type: "text"
    });
    this.controls.append(this.input);
    this.input.change((function(_this) {
      return function(e) {
        return onUrl(_this.input.val());
      };
    })(this));
    this.controls.append(this.audioPlayer);
    return target.append(this.controls);
  };

  AudioView.prototype.playStream = function(url, onEnd) {
    this.audioPlayer.bind('ended', onEnd);
    return this.audioPlayer.attr('src', url);
  };

  return AudioView;

})();



},{}]},{},[2]);

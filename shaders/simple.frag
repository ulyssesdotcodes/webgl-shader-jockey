precision highp float;
uniform sampler2D audioTexture;
uniform float time;
uniform vec2 resolution;

void main() {
  vec2 vUv = gl_FragCoord.xy / resolution.x;
	float fft = texture2D(audioTexture, vec2(vUv.x, 0.25)).r;
  float visibility = ceil(fft - vUv.y);
  vec4 freq = vec4(visibility, visibility, visibility,1.0);
	gl_FragColor = freq;
}

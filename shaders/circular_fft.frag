precision highp float;
uniform sampler2D audioTexture;
uniform vec2 resolution;
uniform float audioResolution;
uniform float time;

void main(void)
{
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    // Convert to polar
    vec2 cuv = abs(uv - 0.5);
    float a = atan(cuv.x, cuv.y);
    float r = length(cuv);
    
    // FFT
    float fft = texture2D(audioTexture, vec2(r, 0.25)).x;
    
    // Rotating colors
    vec4 base = vec4(uv,0.5+0.5*sin(time),1.0);
    float boost = 0.5;
    gl_FragColor = base * (sin(r * 64.0 * 3.1415 - time ) * fft);
}

#ifdef GL_ES
  precision mediump float;
#endif

uniform float time;
vec4 uFirstColor = vec4(1, 1, 1, 1);
vec4 uSecondColor= vec4(0, 0, 0, 1);
bool vertical2=true;
vec2 uGapSize = vec2(50.0, 50.0);
float uStripeWidth = 5.0;
void main( void ) {
  vec2 res = mod(gl_FragCoord.xy, uGapSize);
  
  float c = 1.0 - (mod(floor(gl_FragCoord.x / 50.0), 2.0) * 2.0);
  float d = 1.0 - (mod(floor(gl_FragCoord.y / 50.0), 2.0) * 2.0);
  
  float e = c * d;
  
  float t = 1.0 - (floor(mod(time, 2.0))* 2.0);
  e = e * -t;
  
  
  
  float a = floor(gl_FragCoord.x + gl_FragCoord.y);
  float b = mod(a, 100.0);
  
  if(vertical2){
    gl_FragColor = e == 1.0 ? uFirstColor : uSecondColor;
  }
  else{
    gl_FragColor = res.y < uStripeWidth ? uFirstColor : uSecondColor;
  }
}

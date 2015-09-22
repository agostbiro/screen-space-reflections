precision mediump float;

uniform sampler2D uTexture;

varying vec2 vTexCo;

varying vec3 vNormal;

void main() 
{
  gl_FragColor = texture2D(uTexture, vTexCo);
}
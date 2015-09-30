#extension GL_EXT_draw_buffers : require

precision highp float;

uniform float
  uUseDiffuseLightning,
  uShininess;

uniform sampler2D uTexture;

uniform vec3 uSpecularColor;

varying vec2 vTexCo;

varying vec3 
  vNormal,
  vViewPos;

vec3 textureColor;

void main()
{
  textureColor = texture2D(uTexture, vTexCo).rgb;

  gl_FragData[0] = vec4(vViewPos, 1.0);
  gl_FragData[1] = vec4(vNormal, 0.0);
  gl_FragData[2] = vec4(textureColor, uUseDiffuseLightning);
  //gl_FragData[2].rgb = vec3(1.0);
  gl_FragData[3] = vec4(uSpecularColor, uShininess);
}
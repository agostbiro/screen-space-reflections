#extension GL_EXT_draw_buffers : require

precision highp float;

uniform float
  uUseDiffuseLightning,
  uShininess;

uniform vec3 
  uDiffuseColor,
  uSpecularColor;

varying vec3 
  vNormal,
  vViewPos;

void main()
{
  gl_FragData[0] = vec4(vViewPos, 1.0);
  gl_FragData[1] = vec4(vNormal, 0.0);
  gl_FragData[2] = vec4(uDiffuseColor, uUseDiffuseLightning);
  gl_FragData[3] = vec4(uSpecularColor, uShininess);
}
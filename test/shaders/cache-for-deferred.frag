#extension GL_EXT_draw_buffers : require

precision highp float;

varying float vIsSpecular;

varying vec3
  vNormal,
  vViewPos;

varying vec4 vColor;

void main()
{
  gl_FragData[0] = vColor;
  gl_FragData[1] = vec4(vViewPos, 1.0);
  gl_FragData[2] = vec4(vNormal, 0.0);
  gl_FragData[3] = vec4(vIsSpecular);
}
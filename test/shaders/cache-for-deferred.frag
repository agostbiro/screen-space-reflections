#extension GL_EXT_draw_buffers : require

precision highp float;

varying float vIsSpecular;

varying vec3
  vNormal,
  vViewPos;

varying vec4 vColor;

float weight;

vec2 normPC;

void main()
{
  // Fade out colors towards the edges of the point to see where the ray hit
  // them.
  normPC = 2.0 * (gl_PointCoord - 0.5);
  weight = 1.0 - length(normPC);

  gl_FragData[0] = vColor * weight;
  gl_FragData[1] = vec4(vViewPos, 1.0);
  gl_FragData[2] = vec4(vNormal, 0.0);
  gl_FragData[3] = vec4(vIsSpecular);
}
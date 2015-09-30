precision highp float;

attribute float 
  aIsSpecular,
  aPointSize;
attribute vec3 
  aNormal, 
  aPos;
attribute vec4 aColor;

uniform mat4 uProjection;

varying float vIsSpecular;

varying vec3
  vNormal,
  vViewPos;

varying vec4 vColor;

void main() 
{
  vColor = aColor;

  vIsSpecular = aIsSpecular;

  vNormal = aNormal;

  vViewPos = aPos;

  gl_PointSize = aPointSize;
  //gl_PointSize = 4.0;

  gl_Position = uProjection * vec4(aPos, 1.0);
}
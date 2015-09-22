attribute vec3 
  aPos, 
  aNormal;

varying vec3 vNormal;

uniform mat4 
  uModel,
  uProjection,
  uView;

void main() 
{
  vNormal = aNormal;

  gl_Position = uProjection * uView * uModel * vec4(aPos, 1.0);
}
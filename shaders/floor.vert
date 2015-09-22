attribute vec2 aTexCo;

attribute vec3 
  aPos,
  aNormal;

varying vec2 vTexCo;

varying vec3 vNormal;

uniform mat4 
  uModel,
  uProjection,
  uView;

void main() 
{
  vNormal = aNormal;
  vTexCo = aTexCo;

  gl_Position = uProjection * uView * uModel * vec4(aPos, 1.0);
}
#pragma glslify: transpose = require('glsl-transpose')
#pragma glslify: inverse = require('glsl-inverse')

attribute vec2 aTexCo;

attribute vec3 
  aPos,
  aNormal;

varying vec2 vTexCo;

varying vec3
  vNormal,
  vViewPos;

uniform mat4 
  uModel,
  uProjection,
  uView;

mat3 normalMatrix;

mat4 modelViewMatrix;

vec4 viewPos;

void main() 
{
  vTexCo = aTexCo;

  modelViewMatrix = uView * uModel;

  normalMatrix = transpose(inverse(mat3(modelViewMatrix)));

  vNormal = normalize(normalMatrix * aNormal);
  
  viewPos = modelViewMatrix * vec4(aPos, 1.0);

  vViewPos = viewPos.xyz;

  gl_Position = uProjection * viewPos;
}
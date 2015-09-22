#pragma glslify: transpose = require('glsl-transpose')
#pragma glslify: inverse = require('glsl-inverse')

attribute vec3 
  aPos, 
  aNormal;

uniform mat4 
  uModel,
  uProjection,
  uView;

varying vec3 
  vNormal,
  vViewPos;

mat3 normalMatrix;

mat4 modelViewMatrix;

vec4 viewPos;

// TODO (abiro) move normal matrix computation to CPU
void main() 
{
  modelViewMatrix = uView * uModel;

  normalMatrix = transpose(inverse(mat3(modelViewMatrix)));

  vNormal = normalize(normalMatrix * aNormal);
  
  viewPos = modelViewMatrix * vec4(aPos, 1.0);

  vViewPos = viewPos.xyz;

  gl_Position = uProjection * viewPos;
}
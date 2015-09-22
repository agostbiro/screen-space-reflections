precision mediump float;

#pragma glslify: lambert = require('glsl-diffuse-lambert')

uniform vec3 
  uAmbientLightColor,
  uDiffuseColor,
  uLightPosition;

varying vec3 
  vNormal,
  vViewPos;

float power;

vec3
  lightDirection,
  normal;

void main() 
{
  lightDirection = normalize(uLightPosition - vViewPos);
  normal = normalize(vNormal);

  power = lambert(lightDirection, normal);

  gl_FragColor = vec4(uDiffuseColor * power + uAmbientLightColor, 1.0);
}
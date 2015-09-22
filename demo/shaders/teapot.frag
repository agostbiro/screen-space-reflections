precision mediump float;

#pragma glslify: blinnPhongSpec = require(glsl-specular-blinn-phong)

uniform float uShininess;

uniform vec3 
  uAmbientLightColor,
  uSpecularColor,
  uLightPosition;

varying vec3 
  vNormal,
  vViewPos;

float power;

vec3
  eyeDirection,
  lightDirection,
  normal;

void main()
{
  eyeDirection = normalize(-1.0 * vViewPos);

  lightDirection = normalize(uLightPosition - vViewPos);

  normal = normalize(vNormal);

  power = blinnPhongSpec(lightDirection, eyeDirection, normal, uShininess);

  gl_FragColor = vec4(uSpecularColor * power + uAmbientLightColor, 1.0);
}
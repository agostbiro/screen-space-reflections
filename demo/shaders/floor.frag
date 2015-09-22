precision mediump float;

#pragma glslify: blinnPhongSpec = require(glsl-specular-blinn-phong)

uniform float uShininess;

uniform sampler2D uTexture;

uniform vec3 
  uAmbientLightColor,
  uSpecularColor,
  uLightPosition;

varying vec2 vTexCo;

varying vec3 
  vNormal,
  vViewPos;

float power;

vec3
  eyeDirection,
  lightDirection,
  normal,
  textureColor;

void main() 
{
  textureColor = texture2D(uTexture, vTexCo).rgb;

  eyeDirection = normalize(-1.0 * vViewPos);

  lightDirection = normalize(uLightPosition - vViewPos);

  normal = normalize(vNormal);

  power = blinnPhongSpec(lightDirection, eyeDirection, normal, uShininess);

  gl_FragColor = vec4(textureColor + uSpecularColor * power, 1.0);
}
precision highp float;

#pragma glslify: blinnPhongSpec = require('glsl-specular-blinn-phong')
#pragma glslify: lambert = require('glsl-diffuse-lambert')

const vec3
  RED = vec3(1.0, 0.0, 0.0),
  GREEN = vec3(0.0, 1.0, 0.0);

uniform sampler2D
  uDiffuseColorSampler,
  uNormalSampler,
  uSpecularColorSampler,
  uViewPosSampler;

uniform vec3 
  uAmbientLightColor,
  uLightPosition;

varying vec2 vTexCo;

float
  diffusePower,
  specularPower,
  isValidFragment;

vec3
  lightDirection,
  normal,
  viewDirection,
  viewPos;

vec4
  diffuseColor,
  pos,
  specularColor;

void main() 
{
  diffuseColor = texture2D(uDiffuseColorSampler, vTexCo);
  normal = texture2D(uNormalSampler, vTexCo).xyz;
  pos = texture2D(uViewPosSampler, vTexCo);
  specularColor = texture2D(uSpecularColorSampler, vTexCo);

  viewPos = pos.xyz;
  isValidFragment = pos.w;
  viewDirection = -1.0 * normalize(viewPos);
  lightDirection = normalize(uLightPosition - viewPos);
  normal = normalize(normal);  

  if (0.0 < diffuseColor.a)
  {
    diffusePower = lambert(lightDirection, normal);
  }
  else
  {
    diffusePower = 0.0;
  }

  if (0.0 < specularColor.a)
  {
    specularPower = blinnPhongSpec(lightDirection, viewDirection, 
                                   normal, specularColor.a);
  }
  else
  {
    specularPower = 0.0;
  }

  gl_FragColor.rgb = uAmbientLightColor + 
                     diffuseColor.rgb * diffusePower + 
                     specularColor.rgb * specularPower;
  gl_FragColor.a = 1.0;

  if (isValidFragment != 1.0)
    discard;
}
precision highp float;

#pragma glslify: import('./lib/fbo.glsl')
#pragma glslify: import('./lib/fragment.glsl')

#pragma glslify: import('./lib/coord-transforms.glsl')
#pragma glslify: import('./lib/get-fragment.glsl')
#pragma glslify: import('./lib/march-ray.glsl')

// TODO (abiro) make this configurable
const int MAX_BOUNCES = 1;

uniform mat4 uProjection;

uniform FBO uFbo;

varying vec2 vTexCo;

bool currentFragmentIsValid;

float 
  cumulativeDistance,
  weight;

Fragment
  fragment,
  nextFragment;

vec3
  prevViewPosition,
  reflectionsColor; 

void main() 
{
  fragment = getFragment(uFbo, vTexCo);
  currentFragmentIsValid = fragment.isValid;

  gl_FragColor = fragment.color;
  //gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

  cumulativeDistance = 0.0;

  // The source of the incident ray is the origin at first.
  prevViewPosition = vec3(0.0);

  reflectionsColor = vec3(0.0);
  
  for (int i = 0; i < MAX_BOUNCES; i += 1)
  {
    if (!fragment.isSpecular)
    {
      break;
    }

    nextFragment = marchRay(uFbo, fragment, uProjection, prevViewPosition);

    if (!nextFragment.isValid)
    {
      //gl_FragColor.rgb += nextFragment.color.rgb;
      break;
    }

    cumulativeDistance += distance(fragment.viewPos, nextFragment.viewPos);

    // The intensity of light is inversely proportional to the square of the
    // of the distance from its source.
    // TODO (abiro) Need more realistic model for attenuation, factoring in
    // reflections and materials.
    //weight = 1.0 / pow(cumulativeDistance, 2.0);
    weight = 1.0 / cumulativeDistance;
    //weight = 1.0;

    // TODO (abiro) alpha?
    //reflectionsColor += nextFragment.color.rgb * weight;
    gl_FragColor.rgb += nextFragment.color.rgb * weight;
    //gl_FragColor.a = 1.0;

    prevViewPosition = fragment.viewPos;
    fragment = nextFragment;
  }

  //gl_FragColor += vec4(reflectionsColor, 0.0);
  //gl_FragColor = fragment.color;
  //gl_FragColor.a = 1.0;

  /*if (dot(fragment.normal, vec3(0.0, 1.0, 0.0)) > 0.0)
    gl_FragColor.g = 1.0;
  else
    gl_FragColor.r = 1.0;*/

  // All code is exectued regardless whether it's in a branch or not.
  if (!currentFragmentIsValid)
    discard;
}
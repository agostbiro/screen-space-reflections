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

  // All code is exectued regardless whether it's in a branch or not, so the
  // rest of the code will still execute.
  if (!fragment.isValid)
    discard;

  gl_FragColor = fragment.color;

  // The source of the incident ray is the origin at first.
  prevViewPosition = vec3(0.0);
  reflectionsColor = vec3(0.0);
  cumulativeDistance = 0.0;
  
  for (int i = 0; i < MAX_BOUNCES; i += 1)
  {
    if (!fragment.isSpecular)
    {
      break;
    }

    nextFragment = marchRay(uFbo, fragment, uProjection, prevViewPosition);

    if (!nextFragment.isValid)
    {
      //gl_FragColor = nextFragment.color;
      break;
    }

    cumulativeDistance += distance(fragment.viewPos, nextFragment.viewPos);

    // The intensity of light is inversely proportional to the square of the
    // of the distance from its source.
    // TODO (abiro) Need more realistic model for the reflection of different 
    // materials.
    weight = (cumulativeDistance == 0.0) ? 0.0 : 1.0 / cumulativeDistance;

    // TODO (abiro) alpha?
    gl_FragColor.rgb += nextFragment.color.rgb * weight;

    prevViewPosition = fragment.viewPos;
    fragment = nextFragment;
  }
}
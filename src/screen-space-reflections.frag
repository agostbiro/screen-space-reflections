// TODO (abiro) glslify can't seem to handle functions with user-defined return
// types / arguments. Find a solution so that the code can be modularized.

precision highp float;

// TODO (abiro) make this configurable
const int MAX_BOUNCES = 1;

// Debugging colors
const vec4 RED = vec4(1.0, 0.0, 0.0, 1.0);
const vec4 GREEN = vec4(0.0, 1.0, 0.0, 1.0);

struct FBO {
  sampler2D colorSampler;
  sampler2D isSpecularSampler;
  sampler2D normalSampler;
  sampler2D viewPosSampler;
};

struct Fragment {
  vec4 color;
  bool isSpecular;
  bool isValid;
  vec3 normal;
  vec3 viewPos;
};

bool isClose(float a, float b)
{
  if (abs(a - b) < 0.01)
    return true;
  else
    return false;
}

vec2 toTexCo(in vec2 normalizedDeviceCoord)
{
  return (normalizedDeviceCoord + 1.0) / 2.0;
}

Fragment getFragment(in FBO fbo, in vec2 texCo)
{
  bool
    isSpecular,
    isValid;

  vec3
    normal,
    viewPos;

  vec4
    color,
    pos;

  color = texture2D(fbo.colorSampler, texCo);
  isSpecular = texture2D(fbo.isSpecularSampler, texCo).a > 0.0 ? true : false;
  normal = texture2D(fbo.normalSampler, texCo).xyz;
  pos = texture2D(fbo.viewPosSampler, texCo);

  viewPos = pos.xyz;
  isValid = pos.w == 1.0 ? true : false;

  return Fragment(color, isSpecular, isValid, normal, viewPos);
}

// TODO (abiro) test if hit faces the reflected ray
Fragment findNextHit(in FBO fbo,
                     in Fragment fragment, 
                     in mat4 projectionMatrix,
                     in vec3 prevViewPosition)
{
  // TODO (abiro) Make these configurable.
  const int MAX_ITERATIONS = 20;
  const float STEP_SIZE = 0.5;

  Fragment 
    invalidFragment, 
    nextFragment;

  vec2 nextTexCo;

  vec3
    incidentRay,
    nextNormDevCoord,
    nextViewSpacePos,
    reflectedRay;

  vec4 nextClipCoord;

  // Returned to indicate no hit.
  invalidFragment = Fragment(vec4(0.0), false, false, vec3(0.0), vec3(0.0));

  incidentRay = normalize(fragment.viewPos - prevViewPosition);
  reflectedRay = reflect(incidentRay, normalize(fragment.normal));

  for (int i = 1; i <= MAX_ITERATIONS; i += 1)
  {
    // Find the next position to test for a hit along the reflected ray.
    nextViewSpacePos = fragment.viewPos + float(i) * STEP_SIZE * reflectedRay;

    nextClipCoord = projectionMatrix * vec4(nextViewSpacePos, 1.0);

    nextTexCo = toTexCo(vec2(nextClipCoord.x / nextClipCoord.w, 
                             nextClipCoord.y / nextClipCoord.w));

    // Get the fragment from the framebuffer to which a point from
    // 'nextViewSpacePos' would be reflected to, and then see if such a point
    // actually exists.
    nextFragment = getFragment(fbo, nextTexCo);

    if (!nextFragment.isValid)
    {
      continue;
    }
    // TODO (abiro) rethink this
    // Z values are negative in view space, so 'nextViewSpacePos.z' is farther
    // away from the origin than 'nextFragment.viewPos.z'.
    if (nextViewSpacePos.z <= nextFragment.viewPos.z)
    {
      return nextFragment;
    }
    // In this case, a closer object is blocking a possible hit from view.
    // TODO (abiro) What if there is a visible object along the reflected ray
    // farther away? 
    else if (abs(nextFragment.viewPos.z) < abs(nextViewSpacePos.z))
    {
      return invalidFragment;
    }
  }

  /*if (isClose(nextFragment.viewPos.z - nextViewSpacePos.z, 0.0))
  //if (nextViewSpacePos.z > -4.12 )
    invalidFragment.color = GREEN;
  else
    invalidFragment.color = RED;*/

  return invalidFragment;
}

uniform mat4 uProjection;

uniform FBO uFbo;

//uniform sampler2D uFirstPassColorSampler;

varying vec2 vTexCo;

bool flag;
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

  cumulativeDistance = 0.0;

  // The source of the incident ray is the origin at first.
  prevViewPosition = vec3(0.0);

  reflectionsColor = vec3(0.0);
  
  flag = false;

  for (int i = 0; i < MAX_BOUNCES; i += 1)
  {
    if (!fragment.isSpecular)
    {
      break;
    }

    nextFragment = findNextHit(uFbo, fragment, uProjection, prevViewPosition);

    if (!nextFragment.isValid)
    {
      break;
    }

    cumulativeDistance += distance(fragment.viewPos, nextFragment.viewPos);

    // The intensity of light is inversely proportional to the square of the
    // of the distance from its source.
    // TODO (abiro) Need more realistic model for attenuation, factoring in
    // reflections and materials.
    //weight = 1.0 / pow(cumulativeDistance, 2.0);
    weight = 1.0 / cumulativeDistance;
    //if (cumulativeDistance == 0.0)
      //flag = true;

    // TODO (abiro) alpha?
    reflectionsColor += nextFragment.color.rgb * weight;

    prevViewPosition = fragment.viewPos;
    fragment = nextFragment;
  }

  gl_FragColor += vec4(reflectionsColor, 0.0);

  /*if (flag)
    gl_FragColor = RED;
  else
    gl_FragColor = GREEN;*/

  // All code is exectued regardless whether it's in a branch or not.
  if (!currentFragmentIsValid)
    discard;
}
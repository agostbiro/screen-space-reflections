precision highp float;

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
  isSpecular = texture2D(fbo.isSpecularSampler, texCo).x == 1.0 ? true : false;
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
  const int MAX_ITERATIONS = 10;
  const float STEP_SIZE = 1.0;

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
    // Z values are negative in view space.
    else if (abs(nextViewSpacePos.z - nextFragment.viewPos.z) < STEP_SIZE)
    {
      //nextFragment.color = vec4(0.3);
      return nextFragment;
    }
    // In this case, a closer object is blocking a possible hit from view.
    // TODO (abiro) What if there is a visible object along the reflected ray
    // farther away? 
    else if (abs(nextFragment.viewPos.z) < abs(nextViewSpacePos.z))
    {
      invalidFragment.color = vec4(0.5);
      return invalidFragment;
    }
  }

  /*if (isClose(nextFragment.viewPos.z - nextViewSpacePos.z, 0.0))
  //if (nextViewSpacePos.z > -4.12 )
    invalidFragment.color = GREEN;
  else
    invalidFragment.color = RED;*/

  invalidFragment.color = vec4(0.75);

  return invalidFragment;
}

uniform mat4 uProjection;

varying vec2 vTexCo;

uniform FBO uFbo;

Fragment 
  fragment,
  nextFragment;

void main() 
{
  fragment = getFragment(uFbo, vTexCo);

  // 'prevViewPosition' is the origin in view space when finding the first hit.
  nextFragment = findNextHit(uFbo, fragment, uProjection, vec3(0.0));

  gl_FragColor = nextFragment.color;

  if (!fragment.isValid)
    discard;
}

precision highp float;

// Debugging colors
const vec4 RED = vec4(1.0, 0.0, 0.0, 1.0);
const vec4 GREEN = vec4(0.0, 1.0, 0.0, 1.0);

struct FBO {
  sampler2D colorSampler;
  sampler2D isSpecularSampler;
  sampler2D normalSampler;
  vec2 size;
  sampler2D viewPosSampler;
};

struct Fragment {
  vec4 color;
  bool isSpecular;
  bool isValid; 
  vec3 normal;
  float reciprocalZ;
  vec2 texCo;
  vec3 viewPos;
};

float lerp(in float x, in float y, in float a)
{
  return (1.0 - a) * x + a * y;
}

bool isClose(in float a, in float b)
{
  if (abs(a - b) < 0.01)
    return true;
  else
    return false;
}

vec2 screenSpaceToTexco(in vec2 screensPaceCoord, in vec2 bufferSize)
{
  return (screensPaceCoord + bufferSize * 0.5) / bufferSize;
}

// Screen space is a space here where integer coordinates correspond to pixels
// with origin in the middle.
// TODO (abiro) to which part of a pixel does the integer coordinate correspond
// to?
vec2 toScreenSpaceCoord(in vec2 normalizedDeviceCoord, in vec2 bufferSize)
{
  return bufferSize * 0.5 * normalizedDeviceCoord;
}

vec2 toNormalizedDeviceCoord(in vec2 texCo)
{
  return (texCo - 0.5) * 2.0;
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

  return Fragment(color, isSpecular, isValid, normal, 
                  1.0 / pos.z, texCo, viewPos);
}

// TODO (abiro) Test if hit faces the reflected ray
// TODO (abiro) Make sure textures are clamped to edge.
Fragment findNextHit(in FBO fbo,
                     in Fragment fragment, 
                     in mat4 projectionMatrix,
                     in vec3 prevViewPosition)
{
  // TODO (abiro) Make it configurable.
  const float MAX_ITERATIONS = 256.0;

  Fragment 
    invalidFragment, 
    nextFragment;

  float
    nextPosReciprocalZ,
    stepRatio,
    targetPosReciprocalZ,
    startingPosReciprocalZ;

  vec2
    nextPos,
    searchDirection,
    searchDirUnitLen,
    startingPos,
    targetPos;

  vec3
    incidentRay,
    reflectedRay;

  vec4 
    fragmentClipCoord,
    targetClipCoord;

  // Returned to indicate no hit.
  invalidFragment = Fragment(vec4(0.0), false, false, vec3(0.0), 
                             0.0, vec2(0.0), vec3(0.0));

  incidentRay = normalize(fragment.viewPos - prevViewPosition);
  reflectedRay = reflect(incidentRay, normalize(fragment.normal));
  targetClipCoord = projectionMatrix * vec4(fragment.viewPos + reflectedRay, 1.0);
  fragmentClipCoord = projectionMatrix * vec4(fragment.viewPos, 1.0);

  // Screen space is a space here where integer coordinates correspond to pixels
  // with origin in the middle.
  // TODO (abiro) to which part of a pixel does the integer coordinate 
  // correspond to?
  startingPos = toScreenSpaceCoord(fragmentClipCoord.xy / fragmentClipCoord.w,
                                   fbo.size);

  // Using reciprocals allows linear interpolation in screen space.
  // Making depth comparisons in clip space to avoid having to convert to
  // view space from clip.
  startingPosReciprocalZ = 1.0 / fragmentClipCoord.z;

  targetPos = toScreenSpaceCoord(targetClipCoord.xy / targetClipCoord.w, 
                                 fbo.size);

  targetPosReciprocalZ = 1.0 / targetClipCoord.z;

  searchDirection = targetPos - startingPos;

  // TODO (abiro) This doesn't guarantee that all pixels are visited along the
  // path. Use DDA.
  searchDirUnitLen = normalize(searchDirection);

  stepRatio = 1.0 / length(searchDirection);

  // Kill rays in the camera direction, because they are likely to be blocked
  // by closer objects or not hit anything yet fall victim to false positives.
  if (reflectedRay.z > 0.0)
  {
    invalidFragment.color = vec4(0.25);
    return invalidFragment;
  }

  // TODO (abiro) i = 4
  for (float i = 4.0; i <= MAX_ITERATIONS; i += 1.0)
  {
    // Find the next position in screen space to test for a hit along the 
    // reflected ray.
    nextPos = startingPos + i * searchDirUnitLen;

    // Find the z value at the next position to test in view space. 
    nextPosReciprocalZ = mix(startingPosReciprocalZ, 
                             targetPosReciprocalZ, 
                             i * stepRatio);

    // Get the fragment from the framebuffer that could be reflected to the 
    // current fragment and see if it is actually reflected there.
    nextFragment = getFragment(fbo, screenSpaceToTexco(nextPos, fbo.size));

    if (!nextFragment.isValid)
    {
      continue;
    }

    // Test if the ray is behind the object.
    // Z values are negative in clip space, but the reciprocal switches 
    // relations.
    if (nextPosReciprocalZ >= nextFragment.reciprocalZ)
    {
      // In this case, a closer object is blocking a possible hit from view.
      // TODO (abiro) What if there is a visible object along the reflected ray
      // farther away? 
      if (nextPosReciprocalZ / nextFragment.reciprocalZ > 0.75)
      {
        invalidFragment.color = vec4(0.5);
        return invalidFragment;
      }
      else
      {
        return nextFragment;
      }
    }
  }

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

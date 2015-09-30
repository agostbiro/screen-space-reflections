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
  vec2 size;
  sampler2D viewPosSampler;
};

struct Fragment {
  vec4 color;
  bool isSpecular;
  bool isValid;
  vec3 normal;
  float reciprocalZ;
  vec3 viewPos;
};

bool isClose(float a, float b)
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

vec2 toScreenSpaceCoord(in vec2 normalizedDeviceCoord, in vec2 bufferSize)
{
  return bufferSize * 0.5 * normalizedDeviceCoord;
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

  Fragment invalidFragment;

  vec3
    normal,
    viewPos;

  vec4
    color,
    pos;

  invalidFragment = Fragment(vec4(0.0), false, false, vec3(0.0), 0.0, vec3(0.0));

  if (any(lessThan(texCo, vec2(0.0))) || any(greaterThan(texCo, vec2(1.0))))
  {
    invalidFragment.color = vec4(0.0, 1.0, 0.0, 1.0);

    // Invalid fragment
    return invalidFragment;
  }

  color = texture2D(fbo.colorSampler, texCo);
  isSpecular = texture2D(fbo.isSpecularSampler, texCo).a > 0.0 ? true : false;
  normal = normalize(texture2D(fbo.normalSampler, texCo).xyz);
  pos = texture2D(fbo.viewPosSampler, texCo);

  viewPos = pos.xyz;
  isValid = pos.w == 1.0 ? true : false;

  color = isValid ? color : vec4(0.0, 1.0, 0.0, 1.0);

  return Fragment(color, isSpecular, isValid, normal, 
                  1.0 / pos.z, viewPos);
}

Fragment findNextHit(in FBO fbo,
                     in Fragment fragment, 
                     in mat4 projectionMatrix,
                     in vec3 prevViewPosition)
{
  // TODO (abiro) Make it configurable.
  const float 
    MAX_ITERATIONS = 20.0,
    MAX_STRIDE = 16.0,
    SEARCH_STEPS = 3.0;

  bool 
    canReflect,
    coarseHit,
    sameDir;

  float
    dotProductNormalReflRay,
    dotProductNormalNextReflRay,
    nextPosReciprocalZ,
    targetPosReciprocalZ,
    startingPosReciprocalZ,
    steps,
    stepRatio,
    stepsBack,
    stride;

  Fragment 
    invalidFragment, 
    nextFragment,
    prevFragment;

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
    colorFlag,
    fragmentClipCoord,
    targetClipCoord;

  colorFlag = vec4(0.0);

  // Returned to indicate no hit.
  invalidFragment = Fragment(vec4(0.0), false, false, vec3(0.0), 
                             0.0, vec3(0.0));

  incidentRay = normalize(fragment.viewPos - prevViewPosition);
  reflectedRay = reflect(incidentRay, fragment.normal);
  targetClipCoord = projectionMatrix * vec4(fragment.viewPos + reflectedRay, 1.0);
  fragmentClipCoord = projectionMatrix * vec4(fragment.viewPos, 1.0);

  dotProductNormalReflRay = dot(fragment.normal, reflectedRay);

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
  // by closer objects, or not hit anything, but signal false positives.
  /*if (reflectedRay.z > 0.0)
  {
    invalidFragment.color = vec4(0.25);
    return invalidFragment;
  }*/

  stride = 1.0;
  for (float i = 1.0; i <= MAX_ITERATIONS; i += 1.0)
  {
    stride = stride < MAX_STRIDE ? pow(2.0, i) : MAX_STRIDE;
    steps = i * stride;
    //steps = i * MAX_STRIDE;

    // Find the next position in screen space to test for a hit along the 
    // reflected ray.
    nextPos = startingPos + steps * searchDirUnitLen;

    // Find the z value at the next position to test in view space. 
    nextPosReciprocalZ = mix(startingPosReciprocalZ, 
                             targetPosReciprocalZ, 
                             steps * stepRatio);

    // Get the fragment from the framebuffer that could be reflected to the 
    // current fragment and see if it is actually reflected there.
    nextFragment = getFragment(fbo, screenSpaceToTexco(nextPos, fbo.size));
    /*vec2 texCo = screenSpaceToTexco(nextPos, fbo.size);
    Fragment testFrag = Fragment(
      texture2D(fbo.colorSampler, texCo),
      texture2D(fbo.isSpecularSampler, texCo).a > 0.0,
      texture2D(fbo.viewPosSampler, texCo).w == 1.0,
      normalize(texture2D(fbo.normalSampler, texCo).xyz),
      1.0 / texture2D(fbo.viewPosSampler, texCo).z,
      texture2D(fbo.viewPosSampler, texCo).xyz
    );*/

    // TODO (abiro) rethink this
    if (!nextFragment.isValid)
    {
      //if (testFrag.isValid != nextFragment.isValid)
        //invalidFragment.color = vec4(0.0, 1.0, 0.0, 1.0);
      return invalidFragment;
    }

    // If the dot product of two vectors is negative, they are facing entirely
    // different directions.
    canReflect = dot(reflectedRay, nextFragment.normal) < 0.0;

    // See if the point is along the ray.
    sameDir = abs(1.0 - dot(reflectedRay, 
                            normalize(nextFragment.viewPos - fragment.viewPos)))
              //< 1.0 / (1.0 + distance(nextFragment.viewPos, fragment.viewPos));
              < 0.01;

    // Test if the ray is behind the object.
    // Z values are negative in clip space, but the reciprocal switches 
    // relations.
    if (nextPosReciprocalZ >= nextFragment.reciprocalZ && canReflect && sameDir)
    {
      // In this case, a closer object is blocking a possible hit from view.
      // TODO (abiro) What if there is a visible object along the reflected ray
      // farther away? 
      if (nextPosReciprocalZ / nextFragment.reciprocalZ > 0.75)
      {
        invalidFragment.color = vec4(0.0, 0.0, 1.0, 1.0);
        return invalidFragment;
      }
      else
      {
        colorFlag = vec4(0.0, 1.0, 0.0, 1.0);
        coarseHit = true;
        break;
      }
    }
  }

  if (!coarseHit)
  {
    invalidFragment.color = vec4(1.0, 0.0, 0.0, 1.0);
    return invalidFragment;
  }

  if (!nextFragment.isValid)
  {
    invalidFragment.color = vec4(1.0, 1.0, 0.0, 1.0);
    return invalidFragment;
  }

  // Refine the match by binary search. If the ray is behind the current
  // fragment's position, take a half-stride long step back and reexamine
  // the depth buffer. Then, taking smaller and smaller steps recursively
  // find the closest hit for the ray.
  for (float j = SEARCH_STEPS; j >= 0.0; j -= 1.0)
  {
    dotProductNormalNextReflRay = dot(
      fragment.normal,
      normalize(nextFragment.viewPos - fragment.viewPos)
    );

    if (dotProductNormalReflRay < dotProductNormalNextReflRay)
    //if (nextPosReciprocalZ > nextFragment.reciprocalZ)
    {
      //colorFlag = vec4(1.0, 0.0, 0.0, 1.0);
      stepsBack = -pow(2.0, j);
    }
    else if (dotProductNormalReflRay > dotProductNormalNextReflRay)
    //else if (nextPosReciprocalZ < nextFragment.reciprocalZ)
    {
      //colorFlag = vec4(0.0, 1.0, 0.0, 1.0);
      stepsBack = pow(2.0, j);
    }
    else
    {
      //colorFlag = vec4(0.0, 0.0, 1.0, 1.0);
      break;
    }

    steps = steps + stepsBack;

    nextPos = startingPos + steps * searchDirUnitLen;

    nextPosReciprocalZ = mix(startingPosReciprocalZ, 
                         targetPosReciprocalZ, 
                         steps * stepRatio);

    prevFragment = nextFragment;
    nextFragment = getFragment(fbo, screenSpaceToTexco(nextPos, fbo.size));

    // TODO (abiro) rethink this;
    if (!nextFragment.isValid)
    {
      nextFragment = prevFragment;
      break;
    }
  }

  //nextFragment.color += colorFlag;

  return nextFragment;
}

uniform mat4 uProjection;

uniform FBO uFbo;

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
  //gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

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
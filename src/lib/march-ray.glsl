Fragment marchRay(in FBO fbo,
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
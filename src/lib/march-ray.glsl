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

  const vec3 
    CAMERA_DIR = vec3(0.0, 0.0, 1.0),
    DOWN_DIR = vec3(0.0, -1.0, 0.0);

  bool
    canReflect,
    coarseHit,
    isDownFacing,
    sameDir;

  float
    dotProductNormalReflRay,
    dotProductNormalNextReflRay,
    nextPosReciprocalZ,
    targetPosReciprocalZ,
    startingPosReciprocalZ,
    steps,
    stepRatio,
    stepsBack;

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
    fragmentClipCoord,
    targetClipCoord;

  // Returned to indicate no hit.
  invalidFragment = Fragment(vec4(0.0), false, false, vec3(0.0), 
                             0.0, vec3(0.0));

  incidentRay = normalize(fragment.viewPos - prevViewPosition);
  reflectedRay = reflect(incidentRay, fragment.normal);

  // Reflections toward the camera would fail on the depth test and cause other
  // complications (hit out of frame objects or encounter occluders).
  if (dot(reflectedRay, CAMERA_DIR) > 0.0)
  {
    invalidFragment.color = vec4(1.0, 0.0, 1.0, 1.0);
    return invalidFragment;
  }

  targetClipCoord = projectionMatrix * vec4(fragment.viewPos + reflectedRay, 1.0);
  fragmentClipCoord = projectionMatrix * vec4(fragment.viewPos, 1.0);
  
  dotProductNormalReflRay = dot(fragment.normal, reflectedRay);
  
  isDownFacing = dot(fragment.normal, DOWN_DIR) > 0.0;

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

  for (float i = 1.0; i <= MAX_ITERATIONS; i += 1.0)
  {
    steps = i * MAX_STRIDE;

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

    // TODO (abiro) rethink this
    if (!nextFragment.isValid)
    {
      return nextFragment;
    }

    // If the dot product of two vectors is negative, they are facing entirely
    // different directions.
    canReflect = dot(reflectedRay, nextFragment.normal) < 0.0;

    // See if the point is along the ray.
    // See commit message d2897ae on down-facing objects.
    sameDir = (isDownFacing ? 0.5 : 0.99) <
              dot(reflectedRay,
                  normalize(nextFragment.viewPos - fragment.viewPos));

    // TODO (abiro) Rethink this. 'nextPosReciprocalZ' is in clip space, while
    // 'nextFragment.reciprocalZ' is in view space. This should have not matter,
    // as long as ray is within the image.

    // Test if the ray is behind the object.
    // Z values are negative in clip space, but the reciprocal switches 
    // relations.
    if (nextPosReciprocalZ >= nextFragment.reciprocalZ && canReflect && sameDir)
    {
      coarseHit = true;
      break;
    }
    // In this case, a closer object is blocking a possible hit from view.
    else if (sameDir && canReflect)
    {
      invalidFragment.color = vec4(0.0, 0.0, 1.0, 1.0);
      return invalidFragment;
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
    {
      // Step back
      stepsBack = -pow(2.0, j);
    }
    else if (dotProductNormalReflRay > dotProductNormalNextReflRay)
    {
      // Step forward
      stepsBack = pow(2.0, j);
    }
    else
    {
      break;
    }

    steps = steps + stepsBack;

    nextPos = startingPos + steps * searchDirUnitLen;

    prevFragment = nextFragment;
    nextFragment = getFragment(fbo, screenSpaceToTexco(nextPos, fbo.size));

    // TODO (abiro) rethink this
    if (!nextFragment.isValid)
    {
      nextFragment = prevFragment;
      break;
    }
  }

  return nextFragment;
}
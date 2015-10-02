precision highp float;

#pragma glslify: import('../../src/lib/fbo.glsl')
#pragma glslify: import('../../src/lib/fragment.glsl')

#pragma glslify: import('../../src/lib/coord-transforms.glsl')
#pragma glslify: import('../../src/lib/get-fragment.glsl')
#pragma glslify: import('../../src/lib/march-ray.glsl')

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

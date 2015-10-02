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

  // returned to indicate an error.
  invalidFragment = Fragment(vec4(0.0), false, false,
                             vec3(0.0), 0.0, vec3(0.0));

  if (any(lessThan(texCo, vec2(0.0))) || any(greaterThan(texCo, vec2(1.0))))
  {
    invalidFragment.color = vec4(0.0, 1.0, 0.0, 1.0);

    return invalidFragment;
  }

  color = texture2D(fbo.colorSampler, texCo);
  isSpecular = texture2D(fbo.isSpecularSampler, texCo).a > 0.0 ? true : false;
  normal = normalize(texture2D(fbo.normalSampler, texCo).xyz);
  pos = texture2D(fbo.viewPosSampler, texCo);

  viewPos = pos.xyz;
  isValid = pos.w == 1.0 ? true : false;

  if (!isValid)
  {
    invalidFragment.color = vec4(0.0, 1.0, 1.0, 1.0);
    return invalidFragment;
  }

  return Fragment(color, isSpecular, isValid, normal, 1.0 / pos.z, viewPos);
}
struct Fragment {
  vec4 color;
  bool isSpecular;
  bool isValid;
  vec3 normal;
  float reciprocalZ;
  vec3 viewPos;
};
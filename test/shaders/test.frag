precision mediump float;

varying vec2 vTexCo;

struct FBO {
  sampler2D colorSampler;
  sampler2D isSpecularSampler;
  sampler2D normalSampler;
  sampler2D viewPosSampler;
};

uniform FBO uFbo;

void main(void)
{
  gl_FragColor = texture2D(uFbo.colorSampler, vTexCo);;
}
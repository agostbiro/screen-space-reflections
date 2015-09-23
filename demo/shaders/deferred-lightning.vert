precision highp float;

attribute vec4 aPos;
attribute vec2 aTexCo;

varying vec2 vTexCo;

void main(void)
{
  vTexCo = aTexCo;

  gl_Position = aPos;
}
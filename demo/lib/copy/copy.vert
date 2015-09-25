attribute vec4 aPos;
attribute vec2 aTexCoord;

varying vec2 vTexCo;

void main(void)
{
  vTexCo = aTexCoord;

  gl_Position = aPos;
}
attribute vec2 aTexCo;

attribute vec3 aPos;

varying vec2 vTexCo;

void main() 
{
  vTexCo = aTexCo;

  gl_Position = vec4(aPos, 1.0);
}
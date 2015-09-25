// Copies the contents of a texture to a framebuffer. The texture is assumed
// to be 'gl-texture2d' and the framebuffer 'gl-fbo'. If the latter isn't
// specified, the default framebuffer is used.


'use strict';


var createVAS = require('../../../lib/view-aligned-square.js');
var glslify = require('glslify');
var glShader = require('gl-shader');


module.exports = function initCopy(gl)
{
  var 
    geometry = createVAS(gl, 'aPos', 'aTexCoord'),
    shader = glShader(
      gl,
      glslify('./copy.vert'),
      glslify('./copy.frag')
    );

  return function copy(texture, x, y, w, h, fbo)
  {
    if (fbo)
      fbo.bind();
    else
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(x, y, w, h);

    geometry.bind(shader);

    shader.uniforms.uTexture = texture.bind();

    geometry.draw();

    geometry.unbind();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
};
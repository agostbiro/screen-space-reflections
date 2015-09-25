'use strict';

// Function statements are hoisted.
module.exports = {
  createFramebuffer: createFramebuffer,
  createTexture: createTexture,
  enableAttribute: enableAttribute,
  setUniform: setUniform,
  setUpShader: setUpShader,
  setUpAttribute: setUpAttribute
};

function createFramebuffer(gl, width, height, colorFilter)
{
  var 
    fbo = {},

    status;

  if (!gl.getExtension('OES_texture_float'))
    throw new Error('OES_texture_float is not supported.');

  if (!gl.getExtension('WEBGL_depth_texture'))
    throw new Error('WEBGL_depth_texture is not supported.');

  fbo.ref = gl.createFramebuffer();

  fbo.color = createTexture(
    gl, null, gl.FLOAT, gl.RGBA,
    colorFilter, gl.CLAMP_TO_EDGE, width, height
  );

  fbo.depth = createTexture(
    gl, null, gl.UNSIGNED_INT,
    gl.DEPTH_COMPONENT, gl.NEAREST, gl.CLAMP_TO_EDGE, width, height
  );

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.ref);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.TEXTURE_2D,
    fbo.depth,
    0
  );

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    fbo.color,
    0
  );

  // By Florian Boesch
  // http://codeflow.org/entries/2013/feb/22/how-to-write-portable-webgl/#how-to-test-if-a-framebuffer-object-is-valid
  status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  switch (status)
  {
    case gl.FRAMEBUFFER_UNSUPPORTED:
      throw new Error('Framebuffer is unsupported.');
    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
      throw new Error('Framebuffer incomplete attachment.');
    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
      throw new Error('Framebuffer incomplete dimensions.');
    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
      throw new Error('Framebuffer incomplete missing attachment.');
  }
  if (status !== gl.FRAMEBUFFER_COMPLETE)
    throw new Error(
      'Framebuffer incomplete for unknown reasons. Status: ' + 
      status.toString(16)
    );

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return fbo;
}

function createTexture(gl, pixels, type, format, filter, 
                                           wrap, width, height)
{
  var texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  gl.texImage2D(
    gl.TEXTURE_2D, 0, format, width, height, 0, format, type, pixels
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

function enableAttribute(gl, program, data)
{
  gl.useProgram(program);
  gl.bindBuffer(data.target, data.buffer);

  gl.vertexAttribPointer(
    data.index,
    data.itemSize,
    data.type,
    data.normalized ? true : false,
    data.stride ? data.stride : 0,
    data.offset ? data.offset : 0
  );

  gl.enableVertexAttribArray(data.index);

  gl.bindBuffer(data.target, null); 
  gl.useProgram(null);
}

function setUniform(gl, program, data, name)
{
  if (!data.location)
  {
    if (!name)
      throw new Error('Must provide name or location.');

    data.location = gl.getUniformLocation(program, name);      
  }

  gl.useProgram(program);

  // Matrix uniform setters have a different signature from the others.
  if (data.setter.indexOf('Matrix') < 0)
    gl[data.setter](data.location, data.value);
  else
    gl[data.setter](data.location, data.transpose, data.value);
  
  gl.useProgram(null);
}

function setUpShader(gl, program, shader, source)
{
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
  {
    console.log(gl.getShaderInfoLog(shader));
    throw new Error('Shader failed to compile.');
  }

  gl.attachShader(program, shader);
}

function setUpAttribute(gl, program, name, data)
{
  data.index = gl.getAttribLocation(program, name);
  data.buffer = gl.createBuffer();
  data.numItems = data.value.length / data.itemSize;

  gl.useProgram(program);
  gl.bindBuffer(data.target, data.buffer);
  gl.bufferData(data.target, data.value, data.usage);
  gl.useProgram(null);
}
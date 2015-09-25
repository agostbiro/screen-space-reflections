// TODO (abiro) standard style
// TODO (abiro) magic numbers

'use strict';

// Browserify can't handle comma-separated requires.
var _ = require('underscore');
var boundingBox = require('vertices-bounding-box');
var bunny = require('bunny');
var createCanvasOrbitCamera = require('canvas-orbit-camera');
var createFBO = require("gl-fbo");
var createTexture = require("gl-texture2d");
var createViewAlignedSquare = require('../lib/view-aligned-square.js');
var fitCanvas = require('canvas-fit');
var floor = require('./lib/floor.js');
var getContext = require('webgl-context');
var glGeometry = require('gl-geometry');
var glShader = require('gl-shader');
var glslify = require('glslify');
var initCopy = require('./lib/copy/copy.js');
var normals = require('normals');
var mat4 = require('gl-mat4');
var teapot = require('teapot');
var vec3 = require('gl-vec3');

window.onload = function onload()
{
  var
    canvas = document.getElementById('gl-canvas'),
    gl = getContext({canvas: canvas}),
    WEBGL_draw_buffers_extension = gl.getExtension('WEBGL_draw_buffers'),
    OES_texture_float_extension = gl.getExtension('OES_texture_float'),

    copy = initCopy(gl),

    // Color buffers are eye-space position, eye-space normal, diffuse color
    // and specular color, respectively. A value larger than 0 in the alpha
    // channels of the diffuse and specular colors means the appropriate
    // lightning model is used.
    deferredShadingFbo = createFBO(
      gl,
      [gl.drawingBufferWidth, gl.drawingBufferHeight],
      {
        float: true,
        color: 4
      }
    ),

    firstPassFbo = createFBO(
      gl, 
      [gl.drawingBufferWidth, gl.drawingBufferHeight]
    ),

    camera = createCanvasOrbitCamera(canvas),

    // A simple directional light.
    lightWorldPosition = [0, 100, 100],
    lightViewPosition = vec3.create(),

    bunnyGeo = glGeometry(gl),
    floorGeo = glGeometry(gl),
    teapotGeo = glGeometry(gl),
    viewAlignedSquareGeo = createViewAlignedSquare(gl, 'aPos', 'aTexCo'),

    ambientLightColor = [0.33, 0.33, 0.33],
    bunnyDiffuseColor = [0.78, 0.41, 0.29],
    floorTexture = createTexture(gl, document.getElementById('floor-texture')),
    
    // TODO (abiro) Floor is too shiny, use more advanced material model.
    floorShininess = 20,
    floorSpecularColor = [0.8, 0.8, 0.8],
    teaPotSpecularColor = [0.9, 0.9, 0.9],
    teaPotShininess = 1,
    
    bunnyShader = glShader(
      gl,
      glslify('./shaders/cache-for-deferred.vert'),
      glslify('./shaders/cache-for-deferred.frag')
    ),
    deferredLightningShader = glShader(
      gl,
      glslify('./shaders/deferred-lightning.vert'),
      glslify('./shaders/deferred-lightning.frag')
    ),
    floorShader = glShader(
      gl,
      glslify('./shaders/cache-for-deferred-w-tex.vert'),
      glslify('./shaders/cache-for-deferred-w-tex.frag')
    ),
    screenSpaceReflectionsShader = glShader(
      gl,
      glslify('../src/screen-space-reflections.vert'),
      glslify('../src/screen-space-reflections.frag')
    ),
    teapotShader = glShader(
      gl,
      glslify('./shaders/cache-for-deferred.vert'),
      glslify('./shaders/cache-for-deferred.frag')
    ),

    bunnyModelMatrix = mat4.create(),
    floorModelMatrix = mat4.create(),
    teapotModelMatrix = mat4.create(),

    eyePos = vec3.create(),
    projectionMatrix = mat4.create(),
    viewMatrix = mat4.create(),

    bunnyBoundingBox,
    teapotBoundingBox;

  function drawObjects()
  {
    var 
      dls,
      ssr;

    camera.view(viewMatrix);
    camera.tick();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // TODO (abiro) Will this rebuild the FBO on each frame or only
    // if the values actually changed?
    deferredShadingFbo.shape = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    firstPassFbo.shape = [gl.drawingBufferWidth, gl.drawingBufferHeight];

    mat4.perspective(
      projectionMatrix,
      Math.PI / 4,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      1,
      300
    );

    vec3.transformMat4(lightViewPosition, lightWorldPosition, viewMatrix);

    deferredShadingFbo.bind();

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    bunnyGeo.bind(bunnyShader);
    bunnyShader.uniforms.uDiffuseColor = bunnyDiffuseColor;
    bunnyShader.uniforms.uModel = bunnyModelMatrix;
    bunnyShader.uniforms.uView = viewMatrix;
    bunnyShader.uniforms.uProjection = projectionMatrix;
    bunnyShader.uniforms.uShininess = 0;
    bunnyShader.uniforms.uUseDiffuseLightning = 1;
    //bunnyGeo.draw();
    bunnyGeo.unbind();

    floorGeo.bind(floorShader);
    floorShader.uniforms.uModel = floorModelMatrix;
    floorShader.uniforms.uView = viewMatrix;
    floorShader.uniforms.uProjection = projectionMatrix;
    //floorShader.uniforms.uShininess = floorShininess;
    floorShader.uniforms.uShininess = 0;
    floorShader.uniforms.uSpecularColor = floorSpecularColor;
    floorShader.uniforms.uTexture = floorTexture.bind();
    floorShader.uniforms.uUseDiffuseLightning = 1;
    floorGeo.draw();
    floorGeo.unbind();

    teapotGeo.bind(teapotShader);
    teapotShader.uniforms.uModel = teapotModelMatrix;
    teapotShader.uniforms.uView = viewMatrix;
    teapotShader.uniforms.uProjection = projectionMatrix;
    teapotShader.uniforms.uShininess = teaPotShininess;
    teapotShader.uniforms.uSpecularColor = teaPotSpecularColor;
    teapotShader.uniforms.uUseDiffuseLightning = 0;
    teapotGeo.draw();
    teapotGeo.unbind();

    firstPassFbo.bind();
    gl.clearColor(0.9, 0.95, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // TODO (abiro) antialiasing
    dls = deferredLightningShader;
    viewAlignedSquareGeo.bind(dls);
    dls.uniforms.uAmbientLightColor = ambientLightColor;
    dls.uniforms.uLightPosition = lightViewPosition;
    dls.uniforms.uViewPosSampler = deferredShadingFbo.color[0].bind(0);
    dls.uniforms.uNormalSampler = deferredShadingFbo.color[1].bind(1);
    dls.uniforms.uDiffuseColorSampler = deferredShadingFbo.color[2].bind(2);
    dls.uniforms.uSpecularColorSampler = deferredShadingFbo.color[3].bind(3);
    viewAlignedSquareGeo.draw();
    viewAlignedSquareGeo.unbind();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    ssr = screenSpaceReflectionsShader;
    viewAlignedSquareGeo.bind(ssr);
    ssr.uniforms.uFbo = {
      viewPosSampler: deferredShadingFbo.color[0].bind(0),
      normalSampler: deferredShadingFbo.color[1].bind(1),
      colorSampler: deferredShadingFbo.color[2].bind(2),
      isSpecularSampler: deferredShadingFbo.color[3].bind(3)
    };
    ssr.uniforms.uFirstPassColorSampler = firstPassFbo.color[0].bind(4);
    ssr.uniforms.uProjection = projectionMatrix;
    viewAlignedSquareGeo.draw();
    viewAlignedSquareGeo.unbind();

    // Copy to window buffer.
    //copy(firstPassFbo.color[0], 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    window.requestAnimationFrame(drawObjects);
  }

  if (!WEBGL_draw_buffers_extension)
    throw new Error('The WEBGL_draw_buffers extension is unavailable.')
  
  if (!OES_texture_float_extension)
    throw new Error('The OES_texture_float extension is unavailable.')

  window.addEventListener('resize', fitCanvas(canvas), false);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  bunnyGeo.attr('aPos', bunny.positions);
  bunnyGeo.attr(
    'aNormal',
    normals.vertexNormals(
      bunny.cells,
      bunny.positions
    )
  );
  bunnyGeo.faces(bunny.cells);
  bunnyBoundingBox = boundingBox(bunny.positions);

  floorGeo.attr('aPos', floor.positions);
  
  floorGeo.attr(
    'aNormal',
    normals.vertexNormals(
      floor.cells,
      floor.positions
    )
  );
  floorGeo.attr('aTexCo', floor.texCos, {size: 2});
  floorGeo.faces(floor.cells);

  // TODO (abiro) Use anisotropic filtering.
  floorTexture.wrap = [gl.REPEAT, gl.REPEAT];
  floorTexture.magFilter = gl.LINEAR;
  floorTexture.minFilter = gl.LINEAR_MIPMAP_LINEAR;
  floorTexture.generateMipmap();

  teapotGeo.attr('aPos', teapot.positions);
  teapotGeo.attr(
    'aNormal',
    normals.vertexNormals(
      teapot.cells,
      teapot.positions
    )
  );
  teapotGeo.faces(teapot.cells);
  teapotBoundingBox = boundingBox(teapot.positions);

  mat4.scale(bunnyModelMatrix, bunnyModelMatrix, [2, 2, 2]);
  mat4.translate(
    bunnyModelMatrix, 
    bunnyModelMatrix, 
    [-10, Math.abs(bunnyBoundingBox[0][1]) * 2, 0]
  );
  mat4.rotateY(bunnyModelMatrix, bunnyModelMatrix, Math.PI / 2);

  mat4.translate(
    teapotModelMatrix, 
    teapotModelMatrix, 
    [0, Math.abs(teapotBoundingBox[0][1]), 0]
  );
  mat4.rotateY(teapotModelMatrix, teapotModelMatrix, Math.PI / 2);

  drawObjects();
}
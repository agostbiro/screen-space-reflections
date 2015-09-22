// TODO (abiro) standard style
// TODO (abiro) magic numbers

'use strict';

// Browserify can't handle comma-separated requires.
var _ = require('underscore');
var boundingBox = require('vertices-bounding-box');
var bunny = require('bunny');
var createCanvasOrbitCamera = require('canvas-orbit-camera');
var createTexture = require("gl-texture2d");
var fitCanvas = require('canvas-fit');
var floor = require('./lib/floor.js');
var getContext = require('webgl-context');
var glGeometry = require('gl-geometry');
var glShader = require('gl-shader');
var glslify = require('glslify');
var normals = require('normals');
var mat4 = require('gl-mat4');
var teapot = require('teapot');
var vec3 = require('gl-vec3');

window.onload = function onload()
{
  var
    canvas = document.getElementById('gl-canvas'),
    gl = getContext({canvas: canvas}),

    camera = createCanvasOrbitCamera(canvas),

    // A simple directional light
    lightWorldPosition = [0, 100, 100],
    lightViewPosition = vec3.create(),

    bunnyGeo = glGeometry(gl),
    floorGeo = glGeometry(gl),
    teapotGeo = glGeometry(gl),

    ambientLightColor = [0.33, 0.33, 0.33],
    bunnyDiffuseColor = [0.78, 0.41, 0.29],
    floorTexture = createTexture(gl, document.getElementById('floor-texture')),
    floorShininess = 20,
    floorSpecularColor = [0.8, 0.8, 0.8],
    teaPotSpecularColor = [0.9, 0.9, 0.9],
    teaPotShininess = 1,
    
    bunnyShader = glShader(
      gl,
      glslify('./shaders/generic.vert'),
      glslify('./shaders/bunny.frag')
    ),
    floorShader = glShader(
      gl,
      glslify('./shaders/floor.vert'),
      glslify('./shaders/floor.frag')
    ),
    teapotShader = glShader(
      gl,
      glslify('./shaders/generic.vert'),
      glslify('./shaders/teapot.frag')
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
    camera.view(viewMatrix);
    camera.tick();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(
      projectionMatrix,
      Math.PI / 4,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      1,
      300
    );

    vec3.transformMat4(lightViewPosition, lightWorldPosition, viewMatrix);

    bunnyGeo.bind(bunnyShader);
    bunnyShader.uniforms.uAmbientLightColor = ambientLightColor;
    bunnyShader.uniforms.uDiffuseColor = bunnyDiffuseColor;
    bunnyShader.uniforms.uLightPosition = lightViewPosition;
    bunnyShader.uniforms.uModel = bunnyModelMatrix;
    bunnyShader.uniforms.uView = viewMatrix;
    bunnyShader.uniforms.uProjection = projectionMatrix;
    bunnyGeo.draw();
    bunnyGeo.unbind();

    floorGeo.bind(floorShader);
    floorShader.uniforms.uAmbientLightColor = ambientLightColor;
    floorShader.uniforms.uLightPosition = lightViewPosition;
    floorShader.uniforms.uModel = floorModelMatrix;
    floorShader.uniforms.uView = viewMatrix;
    floorShader.uniforms.uProjection = projectionMatrix;
    floorShader.uniforms.uShininess = floorShininess;
    floorShader.uniforms.uSpecularColor = floorSpecularColor;
    floorShader.uniforms.uTexture = floorTexture.bind();
    floorGeo.draw();
    floorGeo.unbind();

    teapotGeo.bind(teapotShader);
    teapotShader.uniforms.uAmbientLightColor = ambientLightColor;
    teapotShader.uniforms.uLightPosition = lightViewPosition;
    teapotShader.uniforms.uModel = teapotModelMatrix;
    teapotShader.uniforms.uView = viewMatrix;
    teapotShader.uniforms.uProjection = projectionMatrix;
    teapotShader.uniforms.uShininess = teaPotShininess;
    teapotShader.uniforms.uSpecularColor = teaPotSpecularColor;
    teapotGeo.draw();
    teapotGeo.unbind();

    window.requestAnimationFrame(drawObjects);
  }

  window.addEventListener('resize', fitCanvas(canvas), false);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0.9, 0.95, 1, 1);

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
  
  // TODO (abiro) normals are wrong
  floorGeo.attr(
    'aNormal',
    normals.vertexNormals(
      floor.cells,
      floor.positions
    )
  );
  floorGeo.attr('aTexCo', floor.texCos, {size: 2});
  floorGeo.faces(floor.cells);

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
    [-20, Math.abs(bunnyBoundingBox[0][1]) * 2, 0]
  );
  mat4.rotateY(bunnyModelMatrix, bunnyModelMatrix, Math.PI / 2);

  mat4.translate(
    teapotModelMatrix, 
    teapotModelMatrix, 
    [0, Math.abs(teapotBoundingBox[0][1]), 0]
  );
  mat4.rotateY(teapotModelMatrix, teapotModelMatrix, Math.PI / 2);

  drawObjects();

  console.log(normals.vertexNormals(
      floor.cells,
      floor.positions
    ))
}
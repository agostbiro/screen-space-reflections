// TODO (abiro) standard style
// TODO (abiro) magic numbers

'use strict'

// Browserify can't handle comma-separated requires.
var boundingBox = require('vertices-bounding-box')
var bunny = require('bunny')
var createCanvasOrbitCamera = require('./lib/controls.js')
var createFBO = require('gl-fbo')
var createTexture = require('gl-texture2d')
var createViewAlignedSquare = require('../lib/view-aligned-square.js')
var datGui = require('dat-gui')
var fitCanvas = require('canvas-fit')
var floor = require('./lib/floor.js')
var getContext = require('webgl-context')
var glGeometry = require('gl-geometry')
var glShader = require('gl-shader')
var glslify = require('glslify')
var hexRgb = require('hex-rgb')
var normals = require('normals')
var opts = require('./options.js')
var mat4 = require('gl-mat4')
var teapot = require('teapot')
var vec3 = require('gl-vec3')

window.onload = function onload () {
  var canvas = document.getElementById('gl-canvas'),
    gl = getContext({canvas: canvas}),
    WEBGL_draw_buffers_extension = gl.getExtension('WEBGL_draw_buffers'),
    OES_texture_float_extension = gl.getExtension('OES_texture_float'),

    gui = new datGui.GUI(),
    guiFolders = {},

    devicePixelRatio = window.devicePixelRatio || 1,
    width = 512,
    height = 512,

    // Color buffers are eye-space position, eye-space normal, diffuse color
    // and specular color, respectively. A value larger than 0 in the alpha
    // channels of the diffuse and specular colors means the appropriate
    // lightning model is used.
    deferredShadingFbo = createFBO(
      gl,
      [width * devicePixelRatio, height * devicePixelRatio],
      {
        float: true,
        color: 4
      }
    ),

    firstPassFbo = createFBO(
      gl,
      [width * devicePixelRatio, height * devicePixelRatio]
    ),

    camera = createCanvasOrbitCamera(canvas, {pan: false}),

    // A simple directional light.
    lightViewPosition = vec3.create(),

    bunnyGeo = glGeometry(gl),
    floorGeo = glGeometry(gl),
    teapotGeo = glGeometry(gl),
    viewAlignedSquareGeo = createViewAlignedSquare(gl, 'aPos', 'aTexCo'),

    bunnyDiffuseColor = [0.78, 0.41, 0.29],
    floorTexture = createTexture(gl, document.getElementById('floor-texture')),

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

    modelMatrix = mat4.create(),
    bunnyModelMatrix = mat4.create(),
    floorModelMatrix = mat4.create(),
    teapotModelMatrix = mat4.create(),

    projectionMatrix = mat4.create(),
    viewMatrix = mat4.create(),

    bunnyPositions = [
      [-10, 0, 0],
      [10, 0, 0],
      [0, 0, -15]
    ],
    bunnyRotations = [Math.PI / 2, -Math.PI / 2, 0],

    bunnyBoundingBox,
    teapotBoundingBox

  function hexRGBNormalize(hex)
  {
    return hexRgb(hex).map(function iteratee(el)
    {
      return el / 255;
    })
  }

  function drawObjects () {
    var dls,
      ssr

    camera.view(viewMatrix)
    camera.tick()

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

    // TODO (abiro) Will this rebuild the FBO on each frame or only
    // if the values actually changed?
    deferredShadingFbo.shape = [gl.drawingBufferWidth, gl.drawingBufferHeight]
    firstPassFbo.shape = [gl.drawingBufferWidth, gl.drawingBufferHeight]

    mat4.perspective(
      projectionMatrix,
      Math.PI / 4,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      1,
      300
    )

    vec3.transformMat4(
      lightViewPosition, 
      [opts.lights.posX, opts.lights.posY, opts.lights.posZ],
      viewMatrix
    )

    deferredShadingFbo.bind()

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    bunnyGeo.bind(bunnyShader)
    bunnyShader.uniforms.uDiffuseColor = bunnyDiffuseColor
    bunnyShader.uniforms.uView = viewMatrix
    bunnyShader.uniforms.uProjection = projectionMatrix
    bunnyShader.uniforms.uShininess = 0
    bunnyShader.uniforms.uUseDiffuseLightning = 1

    mat4.identity(modelMatrix)
    bunnyPositions.forEach(function iteratee (pos, i)
    {
      mat4.translate(modelMatrix, bunnyModelMatrix, pos)

      mat4.rotateY(modelMatrix, modelMatrix, bunnyRotations[i])

      bunnyShader.uniforms.uModel = modelMatrix
      
      bunnyGeo.draw()
    })

    bunnyGeo.unbind()

    floorGeo.bind(floorShader)
    floorShader.uniforms.uModel = floorModelMatrix
    floorShader.uniforms.uView = viewMatrix
    floorShader.uniforms.uProjection = projectionMatrix
    floorShader.uniforms.uShininess = opts.floor.shininess,
    floorShader.uniforms.uSpecularColor = hexRGBNormalize(opts.floor.specularColor),
    floorShader.uniforms.uTexture = floorTexture.bind()
    floorShader.uniforms.uUseDiffuseLightning = 1
    floorGeo.draw()
    floorGeo.unbind()

    teapotGeo.bind(teapotShader)
    teapotShader.uniforms.uModel = teapotModelMatrix
    teapotShader.uniforms.uView = viewMatrix
    teapotShader.uniforms.uProjection = projectionMatrix
    teapotShader.uniforms.uShininess = opts.teapot.shininess,
    teapotShader.uniforms.uSpecularColor = hexRGBNormalize(opts.teapot.specularColor),
    teapotShader.uniforms.uUseDiffuseLightning = 0
    teapotGeo.draw()
    teapotGeo.unbind()

    if (opts.reflectionsOn)
    {
      firstPassFbo.bind()
    }
    else
    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    gl.clearColor(0.9, 0.95, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // TODO (abiro) antialiasing
    dls = deferredLightningShader
    viewAlignedSquareGeo.bind(dls)
    dls.uniforms.uAmbientLightColor = hexRGBNormalize(opts.lights.ambientColor)
    dls.uniforms.uLightPosition = lightViewPosition
    dls.uniforms.uViewPosSampler = deferredShadingFbo.color[0].bind(0)
    dls.uniforms.uNormalSampler = deferredShadingFbo.color[1].bind(1)
    dls.uniforms.uDiffuseColorSampler = deferredShadingFbo.color[2].bind(2)
    dls.uniforms.uSpecularColorSampler = deferredShadingFbo.color[3].bind(3)
    viewAlignedSquareGeo.draw()
    viewAlignedSquareGeo.unbind()

    if (opts.reflectionsOn)
    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      ssr = screenSpaceReflectionsShader
      viewAlignedSquareGeo.bind(ssr)
      ssr.uniforms.uEmphasizeReflections = opts.emphasizeReflections
      ssr.uniforms.uFbo = {
        size: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        viewPosSampler: deferredShadingFbo.color[0].bind(0),
        normalSampler: deferredShadingFbo.color[1].bind(1),
        colorSampler: firstPassFbo.color[0].bind(2),
        isSpecularSampler: deferredShadingFbo.color[3].bind(3)
      }
      ssr.uniforms.uProjection = projectionMatrix
      viewAlignedSquareGeo.draw()
      viewAlignedSquareGeo.unbind()
    }

    window.requestAnimationFrame(drawObjects)
  }

  if (!WEBGL_draw_buffers_extension) {
    throw new Error('The WEBGL_draw_buffers extension is unavailable.')
  }

  if (!OES_texture_float_extension) {
    throw new Error('The OES_texture_float extension is unavailable.')
  }

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;

  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.style.border = 'solid 1px';

  gui.add(opts, 'emphasizeReflections')
  gui.add(opts, 'reflectionsOn')

  guiFolders.floor = gui.addFolder('Floor')
  guiFolders.floor.add(opts.floor, 'shininess', 1, 50)
  guiFolders.floor.addColor(opts.floor, 'specularColor')
  
  guiFolders.lights = gui.addFolder('Lights')
  guiFolders.lights.add(opts.lights, 'posX', -100, 100)
  guiFolders.lights.add(opts.lights, 'posY', 0, 100)
  guiFolders.lights.add(opts.lights, 'posZ', -100, 100)
  guiFolders.lights.addColor(opts.lights, 'ambientColor')

  guiFolders.teapot = gui.addFolder('Teapot')
  guiFolders.teapot.add(opts.teapot, 'shininess', 1, 50)
  guiFolders.teapot.addColor(opts.teapot, 'specularColor')

  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  bunnyGeo.attr('aPos', bunny.positions)
  bunnyGeo.attr(
    'aNormal',
    normals.vertexNormals(
      bunny.cells,
      bunny.positions
    )
  )
  bunnyGeo.faces(bunny.cells)
  bunnyBoundingBox = boundingBox(bunny.positions)

  floorGeo.attr('aPos', floor.positions)

  floorGeo.attr(
    'aNormal',
    normals.vertexNormals(
      floor.cells,
      floor.positions
    )
  )
  floorGeo.attr('aTexCo', floor.texCos, {size: 2})
  floorGeo.faces(floor.cells)

  // TODO (abiro) Use anisotropic filtering.
  floorTexture.wrap = [gl.REPEAT, gl.REPEAT]
  floorTexture.magFilter = gl.LINEAR
  floorTexture.minFilter = gl.LINEAR_MIPMAP_LINEAR
  floorTexture.generateMipmap()

  teapotGeo.attr('aPos', teapot.positions)
  teapotGeo.attr(
    'aNormal',
    normals.vertexNormals(
      teapot.cells,
      teapot.positions
    )
  )
  teapotGeo.faces(teapot.cells)
  teapotBoundingBox = boundingBox(teapot.positions)

  mat4.scale(bunnyModelMatrix, bunnyModelMatrix, [2, 2, 2])
  mat4.translate(
    bunnyModelMatrix,
    bunnyModelMatrix,
    [0, Math.abs(bunnyBoundingBox[0][1]), 0]
  )

  mat4.translate(
    teapotModelMatrix,
    teapotModelMatrix,
    [0, Math.abs(teapotBoundingBox[0][1]), 0]
  )
  mat4.rotateY(teapotModelMatrix, teapotModelMatrix, Math.PI / 2)

  drawObjects()
}

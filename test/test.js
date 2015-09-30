'use strict'

var _ = require('underscore')
var config = require('./test-config.js')
var createBuffer = require('gl-buffer')
var createFbo = require('gl-fbo')
var createViewAlignedSquare = require('../lib/view-aligned-square.js')
var glShader = require('gl-shader')
var glslify = require('glslify')
var mat4 = require('gl-mat4')

function elementsEqual (array1, array2) {
  return array1.length === array2.length &&
  _.every(_.zip(array1, array2), function predicate (el) {
    
    // Avoid divison by 0.
    el[0] += 1;
    el[1] += 1;

    // Floating point numbers aren't precise.
    return Math.abs(el[0] / el[1] - 1) < 0.001;
  })
}

var canvas = document.createElement('canvas'),
  gl = canvas.getContext('webgl', {antialias: false}),

  deferredShadingFbo = createFbo(
    gl,
    [config.width, config.height],
    {
      float: true,
      color: 4
    }
  ),
  // fboOut = createFbo(gl, [config.width, config.height]),

  viewAlignedSquareGeo = createViewAlignedSquare(gl, 'aPos', 'aTexCo'),

  cacheForDeferredShader = glShader(
    gl,
    glslify('./shaders/cache-for-deferred.vert'),
    glslify('./shaders/cache-for-deferred.frag')
  ),
  testRayTraceShader = glShader(
    gl,
    glslify('./shaders/test-ray-trace.vert'),
    glslify('./shaders/test-ray-trace.frag')
  ),
  /*testShader = glShader(
    gl,
    glslify('./shaders/test.vert'),
    glslify('./shaders/test.frag')
  ),*/

  projectionMatrix = mat4.create(),

  pass = true

canvas.width = config.width
canvas.height = config.height

if (gl.drawingBufferWidth !== config.width ||
  gl.drawingBufferHeight !== config.height) {
  throw new Error('Drawing buffer size mismatch.')
}

mat4.perspective(
  projectionMatrix,
  config.fovY,
  config.width / config.height,
  config.near,
  config.far
)

gl.clearColor.apply(gl, config.clearColor)
gl.enable(gl.DEPTH_TEST)

// TODO (abiro) Figure out why 'gl-geometry' messes up attributes when it is
// used for rendering points. (Using buffers directly instead now as a
// workaround.)
// TODO (abiro) Fix 'readPixels' on Firefox.
config.testCases.forEach(function iteratee (testCase, i) {
  var pixel = new Uint8Array(4),

    colorBuffer,
    normalsBuffer,
    pointSizeBuffer,
    positionsBuffer,
    isSpecularBuffer,
    firstPoint,
    lastPoint,
    normalizedPixel

  colorBuffer = createBuffer(gl, testCase.attributes.color)
  normalsBuffer = createBuffer(gl, testCase.attributes.normal)
  pointSizeBuffer = createBuffer(gl, testCase.attributes.size)
  positionsBuffer = createBuffer(gl, testCase.attributes.pos)
  isSpecularBuffer = createBuffer(gl, testCase.attributes.isSpecular)

  deferredShadingFbo.bind()

  cacheForDeferredShader.bind()

  colorBuffer.bind()
  cacheForDeferredShader.attributes.aColor.pointer()

  normalsBuffer.bind()
  cacheForDeferredShader.attributes.aNormal.pointer()

  pointSizeBuffer.bind()
  cacheForDeferredShader.attributes.aPointSize.pointer()

  positionsBuffer.bind()
  cacheForDeferredShader.attributes.aPos.pointer()

  isSpecularBuffer.bind()
  cacheForDeferredShader.attributes.aIsSpecular.pointer()

  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  cacheForDeferredShader.uniforms.uProjection = projectionMatrix

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.POINTS, 0, testCase.attributesCount)

  // fboOut.bind()
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  viewAlignedSquareGeo.bind(testRayTraceShader)
  testRayTraceShader.uniforms.uProjection = projectionMatrix
  testRayTraceShader.uniforms.uFbo = {
    colorSampler: deferredShadingFbo.color[0].bind(0),
    viewPosSampler: deferredShadingFbo.color[1].bind(1),
    normalSampler: deferredShadingFbo.color[2].bind(2),
    size: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    isSpecularSampler: deferredShadingFbo.color[3].bind(3)
  }
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
  viewAlignedSquareGeo.draw()
  viewAlignedSquareGeo.unbind()

  /*gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  viewAlignedSquareGeo.bind(testShader)
  testShader.uniforms.uProjection = projectionMatrix
  testShader.uniforms.uFbo = {
    colorSampler: deferredShadingFbo.color[0].bind(0),
    viewPosSampler: deferredShadingFbo.color[1].bind(1),
    normalSampler: deferredShadingFbo.color[2].bind(2),
    isSpecularSampler: deferredShadingFbo.color[3].bind(3)
  }
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
  viewAlignedSquareGeo.draw()
  viewAlignedSquareGeo.unbind();*/

  firstPoint = _.first(testCase.points)
  lastPoint = _.last(testCase.points)

  gl.readPixels(
    firstPoint.windowCoord[0], firstPoint.windowCoord[1], 1, 1,
    gl.RGBA, gl.UNSIGNED_BYTE, pixel
  )

  normalizedPixel = _.map(pixel, function iteratee (el) {
    return el / 255
  })

  /*_.each(_.range(config.width), function iteratee(w)
  {
    _.each(_.range(config.height), function iteratee(h)
    {
      gl.readPixels(
        w, h, 1, 1,
        gl.RGBA, gl.UNSIGNED_BYTE, pixel
      )
      console.log(w, h, pixel)
    })
  });*/

  if (!elementsEqual(normalizedPixel, lastPoint.color)) {
    console.error('Test case ' + (i + 1) + ' has failed.')
    console.error(
      firstPoint.windowCoord[0], firstPoint.windowCoord[1],
      normalizedPixel, firstPoint.color, lastPoint.color
    )

    pass = false
  }
})

 canvas.style.border = "solid 1px"
 document.body.appendChild(canvas)
//document.body.style.background = pass ? 'green' : 'red'

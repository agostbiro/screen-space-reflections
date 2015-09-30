'use strict'

var _ = require('underscore')
var mat4 = require('gl-mat4')
var vec3 = require('gl-vec3')

// TODO (abiro) use check lib
function checkType(value, type)
{
  if (typeof value !== type)
    throw new Error('Expected ' + value + ' to be type ' + type);
}

function checkVal(value, expected)
{
  if (value !== expected)
    throw new Error('Expected ' + value + ' to be ' + expected);
}

module.exports = function initTestPoint (config) {
  var halfWidth = config.width / 2,
    halfHeight = config.height / 2,
    projectionMatrix = mat4.create()

  mat4.perspective(
    projectionMatrix,
    config.fovY,
    config.width / config.height,
    config.near,
    config.far
  )

  return function testPoint (position, size, normal, color, isSpecular) {
    var clipCoord = vec3.create(),

      ndc,
      xw,
      yw,
      w,
      windowCoord

    checkVal(position.length, 3);
    checkType(size, 'number');
    checkVal(normal.length, 3);
    checkVal(color.length, 4);
    checkType(isSpecular, 'boolean');

    vec3.transformMat4(clipCoord, position, projectionMatrix)

    w = Math.abs(clipCoord[2])

    ndc = _.map(clipCoord, function iteratee (el) {
      return el / w
    })

    xw = Math.floor(ndc[0] * halfWidth + halfWidth)
    yw = Math.floor(ndc[1] * halfHeight + halfHeight)

    // WebGL seems to map a fragment with NDC.y = 0 below the x axis, but maps
    // NDC.x = 0 right to the y axis.
    if (halfWidth < xw) {
      xw -= 1
    }
    if (halfHeight <= yw) {
      yw -= 1
    }

    windowCoord = [xw, yw]

    return {
      color: color,
      isSpecular: isSpecular ? 1 : 0,
      normal: normal,
      pos: position,
      size: size,
      windowCoord: windowCoord
    }
  }
}

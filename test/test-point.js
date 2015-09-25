'use strict'

var _ = require('underscore')
var mat4 = require('gl-mat4')
var vec3 = require('gl-vec3')

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

  return function testPoint (position, normal, color, isSpecular) {
    var clipCoord = vec3.create(),

      ndc,
      xw,
      yw,
      w,
      windowCoord

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
      windowCoord: windowCoord
    }
  }
}

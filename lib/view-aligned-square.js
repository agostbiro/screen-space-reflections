// Sets up the geometry for a view-aligned square with texture coordinates.

'use strict'

var glGeometry = require('gl-geometry')

module.exports = function createVAS (gl, vertexAttrName, texCoordAttrName) {
  var geometry = glGeometry(gl),

    vertices = [
      -1, -1, 0,
      1, -1, 0,
      1, 1, 0,
      -1, 1, 0
    ],
    texCoords = [
      0, 0,
      1, 0,
      1, 1,
      0, 1
    ],
    indices = [
      0, 1, 2,
      2, 3, 0
    ]

  geometry.attr(vertexAttrName, vertices)
  geometry.attr(texCoordAttrName, texCoords, {size: 2})
  geometry.faces(indices)

  return geometry
}

'use strict'

var initTestPoint = require('./test-point.js')
var testCase = require('./test-case.js')

var config = {},

  point

module.exports = config

config.clearColor = [0, 0, 0, 0]
config.fovY = Math.PI / 2
config.height = 256
config.far = 100
config.near = 0.01
config.width = 256

config.rayTrace = {
  maxIterations: 3
}

point = initTestPoint(config)

config.testCases = [
  testCase(
    point([1, 0, -Math.sqrt(3)], [-1, 0, 0], [0, 0, 0, 1], true),
    point([0, 0, -2 * Math.sqrt(3)], [0, 0, -1], [0, 0, 1, 1], false)
  ),
  testCase(
    point([-1, 0, -Math.sqrt(3)], [1, 0, 0], [0, 0, 0, 1], true),
    point([0, 0, -2 * Math.sqrt(3)], [0, 0, -1], [0, 0, 1, 1], false)
  ),
  // Case where closer object blocks from view.
  testCase(
    point([-1, 0, -Math.sqrt(3)], [1, 0, 0], [0, 0, 0, 1], true),
    point([0, 0, -2], [0, 0, -1], [0, 0, 1, 0], false),
    point([0, 0, -2 * Math.sqrt(3)], [0, 0, -1], [0, 0, 1, 1], false),
    point([0, 0, 1], [0, 0, -1], [0, 0, 1, 0], false)
  ),
  testCase(
    point([-1, 0, -Math.sqrt(3)], [1, 0, 0], [0, 0, 0, 1], true),
    point([0, 0, -2 * Math.sqrt(3) + 0.01], [0, 0, -1], [0, 1, 1, 1], false)
  ),
  testCase(
    point([0, 0, -4], [-Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2], [0, 0, 0, 1], true),
    point([-1, 0, -4], [1, 0, 0], [0, 0, 1, 1], false)
  ),
  // Ray reflected towards camera
  testCase(
    point([0, 0, -4], [0, 0, -1], [0, 0, 0, 1], true),
    point([0, 0, 1], [1, 0, 0], [0.25, 0.25, 0.25, 0.25], false)
  )
]

console.log(config)

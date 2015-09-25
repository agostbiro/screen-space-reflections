'use strict';

var initTestPoint = require('./test-point.js');
var testCase = require('./test-case.js');

var 
  config = {},
  
  point;

module.exports = config;

config.clearColor = [0, 0, 0, 0];
config.fovY = Math.PI / 2;
config.height = 1024;
config.far = 100;
config.near = 0.01;
config.width = 1024;

config.rayTrace = {
  maxIterations: 3
};

point = initTestPoint(config);

config.testCases = [
  testCase(
    point([1, 0, -Math.sqrt(3)], [-1, 0, 0], [0, 0, 0, 1], true),
    point([0, 0, -2 * Math.sqrt(3)], [0, 0, -1], [0, 0, 1, 1], false)
  ),
  testCase(
    point([-1, 0, -Math.sqrt(3)], [1, 0, 0], [0, 0, 0, 1], true),
    point([0, 0, -2 * Math.sqrt(3)], [0, 0, -1], [0, 0, 1, 1], false)
  ),
  testCase(
    point([0, 0, -4], [-Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2], [0, 0, 0, 1], true),
    point([-1, 0, -4], [1, 0, 0], [0, 0, 1, 1], false)
  )
];

console.log(config);
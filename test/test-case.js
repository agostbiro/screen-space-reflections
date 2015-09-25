'use strict'

var _ = require('underscore')

module.exports = function testCase () {
  var attributes = {
    color: [],
    isSpecular: [],
    normal: [],
    pos: []
  }

  // Underscore treats 'arguments' internally as an array, so in order traversal
  // is guaranteed.
  _.each(arguments, function iteratee (point) {
    _.each(attributes, function iteratee (val, key) {
      if (point[key].length) {
        // flatten
        val.push.apply(val, point[key])
      } else {
        val.push(point[key])
      }
    })
  })

  return {
    attributes: attributes,
    attributesCount: attributes.isSpecular.length,
    points: _.map(arguments, _.identity)
  }
}

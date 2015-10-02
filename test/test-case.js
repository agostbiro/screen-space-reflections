'use strict'

var _ = require('underscore')

module.exports = function testCase () {
  var attributes = {}

  if (arguments.length === 0) {
    throw new Error('testCase was called without arguments')
  }

  _.each(arguments[0], function iteratee (val, key) {
    attributes[key] = []
  })

  // Underscore treats 'arguments' internally as an array, so in order traversal
  // is guaranteed.
  _.each(arguments, function iteratee (point) {
    _.each(attributes, function iteratee (val, key) {
      if (point[key] === undefined) {
        throw new Error('Missing key from point: ' + key)
      }

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

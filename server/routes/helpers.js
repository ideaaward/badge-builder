'use strict';

var uuid = require('node-uuid');

module.exports.generateIds = function (content) {
  if (content.length === 0) {
    return content;
  }
  content.elements.forEach(function (element) {
    element._id = uuid.v4();
  });
  return content;
};

module.exports.calculateResults = function (badge, answers) {
  var results = {};
  badge.content.elements.forEach(function (element) {
    var id = element._id;
    if (typeof element.answer !== 'undefined') {
      results[id] = answers[id] + '' === element.answer + '';
    } else {
      // TODO: Handle content elements without answers better.
      results[id] = true;
    }
  });
  return results;
};

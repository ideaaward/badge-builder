'use strict';

var uuid = require('node-uuid');

module.exports.generateIds = function (content) {
  if (content.length === 0) {
    return content;
  }
  content.sections.forEach(function (element) {
    element._id = uuid.v4();
  });
  return content;
};

module.exports.calculateResults = function (badge, answers) {
  var results = {};
  badge.content.sections.forEach(function (element) {
    var id = element._id;
    results[id] = answers[id] === element.answer;
  });
  return results;
};

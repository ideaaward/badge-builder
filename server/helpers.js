'use strict';

var uuid = require('node-uuid');
var _ = require('lodash/core');
var url = require('url');

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
      var result = false;
      var userAnswer = answers[id];
      switch(element.elementType){
        case "quiz-single":
        case "quiz-multiple":
        case "quiz-ordered-list":
            result = isAnswerCorrect(userAnswer, element.answer);
            break;
        case "quiz-short-input":
            result = isShortAnswerCorrect(userAnswer, element.answerKeywords);
            break;
        case "quiz-long-input":
            result = isLongAnswerCorrect(userAnswer, element.wordLimit);
            break;
        case "quiz-list-groups":
            result = isGroupedAnswerCorrect(userAnswer, element.answer);
            break;
        default:
            console.error("Unknown answer type", element.elementType);
            break;
      }
      results[id] = result;
    }
  });
  return results;
};

function isAnswerCorrect(userAnswer, answer) {
  return (userAnswer + '' === answer + '');
}

function isShortAnswerCorrect(userAnswer, answer) {
  var ans = userAnswer.toLowerCase();
  var score = 0;
  var keywordsArray = answer.toLowerCase().replace(" ", "").split(',');
  keywordsArray.forEach(function(word){
    if (ans.indexOf(word) > -1) {
      score++;
    }
  });
  if (score == keywordsArray.length) {
    return true;
  }
  return false;
}

function isLongAnswerCorrect(userAnswer, minNumberOfAnswers) {
  var ans = userAnswer.toLowerCase();
  var words = countWords(ans);
  if (words >= minNumberOfAnswers) {
    return true;
  }
  return false;
}

function isGroupedAnswerCorrect(userAnswers, answers){
  //console.log('\nuserAnswers:\n', userAnswers, '\nanswers:\n', answers);
  var result = true;
  answers.forEach(function(answer){
    var group = answer.group;
    var userAnswer = _.find(userAnswers, function(o) { return o.group === group; });
    var isCorrect = _.isEqual(_.sortBy(answer.items), _.sortBy(userAnswer.items));
    if ( !isCorrect ) {
      console.log('- check "', group, '" answers:', userAnswer, isCorrect);
      result = false;
    }
  });
  return result;
}

function countWords(s){
    if(!s){
      return 0;
    }
    s = s.replace(/(^\s*)|(\s*$)/gi,"");//exclude  start and end white-space
    s = s.replace(/[ ]{2,}/gi," ");//2 or more space to 1
    s = s.replace(/\n /,"\n"); // exclude newline with a start spacing
    return s.split(' ').length;
}

module.exports.replacePathEnding = function (path, ending) {
  var pathname = url.parse(path).pathname;
  var split = pathname.split('/');
  split.pop();
  if (ending) {
    split.push(ending);
  }
  return split.length > 1 ? split.join('/') : '/';
};

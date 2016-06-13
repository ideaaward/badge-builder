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

module.exports.calculatePageResults = function (badge, answers) {
  var results = {};
  console.log("\nuser answers:", answers);
  Object.keys(answers).forEach(function(id){
    var userAnswer = answers[id];
    var element = _.find(badge.content.elements, function(o) {
        return o._id === id;
      });
    console.log("id:", id, "\nuser answer:", userAnswer, "\nelement data:\n", element);

    var result = false;
    switch (element.elementType) {
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
      default:
        // console.log("Pass", element.elementType); // NB: no content elements will be submitted
        // result = true;
        break;
    }
    results[id] = result;
  });
  console.log("page results:", results);
  return results;
};

module.exports.calculateResults = function (badge, answers) {
  var results = {};
  console.log('\nelements:\n', badge.content.elements, '\n=> user answers\n', answers );
  badge.content.elements.forEach(function (element) {
    var id = element._id;
    console.log(id, element.elementType, 'answers:', element.answer);
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
        default:
            console.error("Unknown type");
            break;
      }
      results[id] = result;
    } else {
      // TODO: Handle content elements without answers better.
      results[id] = true;
    }

  });
  console.log("all results:", results);
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

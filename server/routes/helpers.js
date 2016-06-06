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
      switch(element.elementType){
        case "yes-no":
        case "multiple-choice":
            results[id] = answers[id] + '' === element.answer + '';
            break;
        case "quiz-short-input":
            var ans = element.answer;
            var score = 0;
            
            element.answerKeywords.forEach(function(word) {
              if(ans.indexOf(word) > -1){
                score++;
              }              
            }, this);
            
            if(score >= element.answerKeywords.length){
              results[id] = answers[id] + 'true';
            }else{
              esults[id] = answers[id] + 'false';
            }
            
            break;
        case "quiz-long-input":
            // TODO
            break;
        default:
            break;      
      }     
    } else {
      // TODO: Handle content elements without answers better.
      results[id] = true;
    }
        
  });    
  return results;
};

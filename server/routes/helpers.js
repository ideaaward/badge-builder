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
    var ans = answers[id].toLowerCase();
    
    if (typeof element.answer !== 'undefined') {         
      switch(element.elementType){
        case "yes-no":
        case "multiple-choice":
            results[id] = answers[id] + '' === element.answer + '';
            break;
        case "quiz-short-input":  
            var score = 0;   
            var keywordsString = element.answerKeywords.toLowerCase().replace(" ", "");
            var keywordsArray = keywordsString.split(',');
            answers[id] = "";
            
            //Code not tested yet, not sure if this works
            keywordsArray.forEach(function(word) {
              if(ans.indexOf(word) > -1){
                score++;
              }              
            }, this);
            
            if(score == keywordsArray.length){
               answers[id] = true;
            }else{
               answers[id] = false;
            }
            
            results[id] = answers[id];           
            break;
        case "quiz-long-input":           
            answers[id] = "";
            var words = countWords(ans);

            if(words >= element.wordLimit){
               answers[id] = true;
            }else{
               answers[id] = false;
            }
            
            results[id] = answers[id]; 
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

function countWords(s){
    s = s.replace(/(^\s*)|(\s*$)/gi,"");//exclude  start and end white-space
    s = s.replace(/[ ]{2,}/gi," ");//2 or more space to 1
    s = s.replace(/\n /,"\n"); // exclude newline with a start spacing
    return s.split(' ').length; 
}
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
  console.log('\nelements:\n', badge.content.elements, '\n=> user answers\n', answers );
  badge.content.elements.forEach(function (element) {
    var id = element._id;
    console.log(id, element.elementType, 'answers:', element.answer);
    if (typeof element.answer !== 'undefined') {
      switch(element.elementType){
        case "quiz-single":
        case "quiz-multiple":
            results[id] = answers[id] + '' === element.answer + '';
            break;
        case "quiz-short-input":
            var score = 0;
            var keywordsString = element.answerKeywords.toLowerCase().replace(" ", "");
            var keywordsArray = keywordsString.split(',');
            var ans = answers[id].toLowerCase();
            //console.log("short ans:", ans);
            answers[id] = "";

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
            var ans = answers[id].toLowerCase();
            var words = countWords(ans);
            answers[id] = "";
            //console.log("long ans:", ans, "words:", words, ">=", element.wordLimit);

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
    if(!s){
      return 0;
    }
    s = s.replace(/(^\s*)|(\s*$)/gi,"");//exclude  start and end white-space
    s = s.replace(/[ ]{2,}/gi," ");//2 or more space to 1
    s = s.replace(/\n /,"\n"); // exclude newline with a start spacing
    return s.split(' ').length;
}

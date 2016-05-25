'use strict';

var test = require('tape');
var helpers = require('../routes/helpers.js');

test('can pass empty list to id generator', function (t) {
  t.equals(helpers.generateIds([]).length, 0, 'empty list returned');
  t.end();
});

var testBadge = {
  content: {
    sections: [
      {
        _id: 'foo',
        answer: 'true'
      }
    ]
  }
};

test('test right answer', function (t) {
  var results = helpers.calculateResults(testBadge,
    {
      foo: 'true'
    }
  );
  t.equals(results.foo, true, 'true when answer right');
  t.end();
});

test('test with empty answers', function (t) {
  var results = helpers.calculateResults(testBadge, {});
  t.equals(results.foo, false, 'false when answers empty');
  t.end();
});

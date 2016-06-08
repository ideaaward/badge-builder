'use strict';

var test = require('tape');
var helpers = require('../helpers.js');

test('can pass empty list to id generator', function (t) {
  t.equals(helpers.generateIds([]).length, 0, 'empty list returned');
  t.end();
});

var testBadge = {
  content: {
    elements: [
      {
        _id: 'foo',
        answer: true
      },
      {
        _id: 'bar',
        answer: ['foo', 'bar']
      }
    ]
  }
};

test('test right answers', function (t) {
  var results = helpers.calculateResults(testBadge,
    {
      foo: true,
      bar: ['foo', 'bar']
    }
  );
  t.equals(results.foo, true, 'true when answer right boolean');
  t.equals(results.bar, true, 'true when answer right list');
  t.end();
});

test('test with empty answers', function (t) {
  var results = helpers.calculateResults(testBadge, {});
  t.equals(results.foo, false, 'false when answers empty');
  t.end();
});

test('test path ending replacement', function (t) {
  var newPath = helpers.replacePathEnding('/foo/bar', 'baz');
  t.equals(newPath, '/foo/baz');

  newPath = helpers.replacePathEnding('/foo/bar', '');
  t.equals(newPath, '/foo');

  newPath = helpers.replacePathEnding('/foo', '');
  t.equals(newPath, '/');

  t.end();
});

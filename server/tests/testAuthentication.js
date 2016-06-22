'use strict';

var test = require('tape');
var authentication = require('../authentication.js');

authentication._enabled = true;

var getDummyRequest = function (expirationTime) {
  return {
    isAuthenticated: function () {
      return true;
    },
    user: {
      jwtPayload: {
        exp: expirationTime || Date.now() / 1000
      }
    }
  };
};

test('expiration before and after minimum validity', function (t) {
  var oneHourFromNow = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
  t.equals(
    authentication.isAuthenticated(
      getDummyRequest(Math.round(oneHourFromNow.getTime() / 1000))
    ),
    false
  );

  var threeHoursFromNow = new Date();
  threeHoursFromNow.setHours(threeHoursFromNow.getHours() + 3);
  t.equals(
    authentication.isAuthenticated(
      getDummyRequest(Math.round(threeHoursFromNow.getTime() / 1000))
    ),
    true
  );
  t.end();
});

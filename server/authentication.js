'use strict';

var http = require('http');
var url = require('url');
var passport = require('passport');
var oauth2 = require('passport-oauth2');
var jwt = require('jsonwebtoken');

var models = require('./models/models.js');
var errors = require('./errors.js');

var enabled = !!process.env.AUTH0_DOMAIN;
var strategy = null;

module.exports.init = function (app) {
  strategy = new oauth2.Strategy({
    authorizationURL: 'https://' + process.env.AUTH0_DOMAIN + '/i/oauth2/authorize',
    tokenURL: 'https://' + process.env.AUTH0_DOMAIN + '/oauth/token',
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL,
    skipUserProfile: true
  }, function (accessToken, refreshToken, profile, done) {
    // Extract info from JWT
    var payload = jwt.decode(accessToken);

    done(null, {
      id: payload.sub,
      accessToken: accessToken
    });
  });
  passport.use(strategy);
  passport.serializeUser(function (auth0User, done) {
    done(null, auth0User);
  });
  passport.deserializeUser(function (auth0User, done) {
    models.User.findOne({ 'id': auth0User.id }, function (err, user) {
      if (err || user === null) {
        done(null, {
          id: auth0User.id
        });
      } else {
        done(null, user);
      }
    });
  });

  var ideaServer = url.parse(process.env.IDEA_API_URL);

  app.use(function (req, res, next) {
    // This is to test if we can dynamically inject right values
    // for authentication based on the route the request comes from.
    strategy._oauth2._clientSecret = process.env.AUTH0_CLIENT_SECRET;
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/login', passport.authenticate('oauth2'));

  app.get('/callback',
    passport.authenticate('oauth2',
      {
        failureRedirect: '/error?message=' + errors.AUTHENTICATION_FAILURE
      }
    ),
    function (req, res) {
      http.get({
        host: ideaServer.host,
        path: ideaServer.path + '/user',
        protocol: ideaServer.protocol,
        headers: {
          'Authorization': 'Bearer ' + req.user.accessToken
        }
      }, function (ideaResponse) {
        var body = '';
        ideaResponse.on('data', function (data) {
          body += data;
        });
        ideaResponse.on('end', function () {
          if (ideaResponse.statusCode === 401) {
            // Redirect to login endpoint in case access token
            // has expired.
            return res.redirect('/login');
          }
          if (ideaResponse.statusCode === 404) {
            return res.redirect('/error?message=' + errors.USER_NOT_IDEA_USER);
          }
          var parsedBody = JSON.parse(body);
          models.User.findOne({ 'id': req.user.id }, function (err, user) {
            if (err || user === null) {
              user = new models.User();
              user.id = req.user.id;
            }
            user.name = parsedBody.name;
            user.imageUrl = parsedBody.image_url;
            user.save(function (err, user) {
              if (err) {
                return res.redirect('/error?message=' + errors.DATABASE_ERROR_SAVE);
              }
              res.redirect('/');
            });
          });
        });
      });
    }
  );
};

module.exports.isEnabled = function () {
  return enabled;
};

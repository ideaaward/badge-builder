'use strict';

var url = require('url');
var passport = require('passport');
var oauth2 = require('passport-oauth2');
var jwt = require('jsonwebtoken');

var models = require('./models/models.js');
var errors = require('./errors.js');
var idea = require('./idea.js');
var helpers = require('./helpers');

var enabled = !!process.env.AUTH0_DOMAIN;

// TODO: Do not edit the global strategy since that may fail
// to a race condition when many concurrent requests come in.
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
  passport.serializeUser(function (req, auth0User, done) {
    done(null, {
      id: auth0User.id
    });
  });
  passport.deserializeUser(function (req, auth0User, done) {
    models.User.findOne({ 'id': auth0User.id }, function (err, user) {
      if (err || user === null) {
        done(null, false);
      } else {
        var accessToken = user.accessTokens && user.accessTokens[strategy._oauth2._clientId] || null;
        if (!accessToken) {
          // If no access token found for the key used for this URL
          // pass false to done, which means that user is not considered
          // to be authenticated and will get directed through the
          // authentication flow.
          // TODO: Check also access token expiration here.
          done(null, false);
        } else {
          done(null, {
            id: auth0User.id,
            accessToken: accessToken,
            role: user.role
          });
        }
      }
    });
  });

  var resetAuth0 = function () {
    strategy._oauth2._clientId = process.env.AUTH0_CLIENT_ID;
    strategy._oauth2._clientSecret = process.env.AUTH0_CLIENT_SECRET;
    strategy._callbackURL = process.env.AUTH0_CALLBACK_URL;
  };

  app.use('/', function (req, res, next) {
    resetAuth0();
    next();
  });

  app.use(['/badges/:id', '/api/badges/:id'], function (req, res, next) {
    models.Badge.findById(req.params.id, function (err, badge) {
      if (err || badge === null) {
        return res.redirect('/error?message=' + errors.BADGE_NOT_FOUND);
      }
      if (badge.consumerKey && badge.consumerSecret) {
        strategy._oauth2._clientId = badge.consumerKey;
        strategy._oauth2._clientSecret = badge.consumerSecret;
        var parsedUrl = url.parse(process.env.AUTH0_CALLBACK_URL);
        //parsedUrl.pathname = splitPath.slice(0, 3).concat('callback').join('/');
        // TODO: Use above line once using real badges.
        parsedUrl.pathname = '/badges/test/callback';
        strategy._callbackURL = url.format(parsedUrl);
      } else {
        resetAuth0();
      }
      next();
    });
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get(['/login', '/badges/:id/login'], passport.authenticate('oauth2'));

  app.get(['/callback', '/badges/:id/callback'],
    passport.authenticate('oauth2',
      {
        failureRedirect: '/error?message=' + errors.AUTHENTICATION_FAILURE
      }
    ),
    function (req, res) {
      idea.getUser(req.user.accessToken, function (ideaResponse, body) {
        if (ideaResponse.statusCode === 401) {
          // Redirect to login endpoint in case access token
          // is rejected.
          return res.redirect(helpers.replacePathEnding(req.url, 'login'));
        }
        if (ideaResponse.statusCode === 404) {
          return res.redirect('/error?message=' + errors.USER_NOT_IDEA_USER);
        }
        models.User.findOne({ 'id': req.user.id }, function (err, user) {
          if (err || user === null) {
            user = new models.User();
            user.id = req.user.id;
          }
          user.name = body.name;
          user.imageUrl = body.image_url;

          // Store access token so that it can be used in subsequent requests.
          if (!user.accessTokens) {
            user.accessTokens = {};
          }
          user.accessTokens[strategy._oauth2._clientId] = req.user.accessToken;
          user.markModified('accessTokens');

          user.save(function (err) {
            if (err) {
              return res.redirect('/error?message=' + errors.DATABASE_ERROR_SAVE);
            }
            var redirectUrl = helpers.replacePathEnding(req.url, '');
            res.redirect(redirectUrl);
          });
        });
      });
    }
  );
};

module.exports.isEnabled = function () {
  return enabled;
};

'use strict';

var url = require('url');
var passport = require('passport');
var oauth2 = require('passport-oauth2');
var jwt = require('jsonwebtoken');

var models = require('./models/models.js');
var errors = require('./errors.js');
var idea = require('./idea.js');
var helpers = require('./helpers');

// Export for testing purposes.
module.exports._enabled = !!process.env.AUTH0_DOMAIN;

module.exports.init = function (app) {
  var strategy = new oauth2.Strategy({
    authorizationURL: 'https://' + process.env.AUTH0_DOMAIN + '/authorize',
    tokenURL: 'https://' + process.env.AUTH0_DOMAIN + '/oauth/token',
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL,
    skipUserProfile: true,
    state: true
  }, function (accessToken, refreshToken, profile, done) {
    // Extract info from JWT
    var payload = jwt.decode(accessToken);
    done(null, {
      id: payload.sub,
      accessToken: accessToken
    });
  });
  strategy.authorizationParams = function (options) {
    return {
      prompt: 'none'
    };
  };
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
        var accessToken = user.accessTokens && user.accessTokens[req.oauth2.clientID] || null;
        if (!accessToken) {
          // If no access token found for the key used for this URL
          // pass false to done, which means that user is not considered
          // to be authenticated and will get directed through the
          // authentication flow.
          return done(null, false);
        }
        var jwtPayload = jwt.decode(accessToken);
        if (Date.now() > jwtPayload.exp * 1000) {
          // Access token is expired so authenticate again.
          return done(null, false);
        }
        done(null, {
          id: auth0User.id,
          accessToken: accessToken,
          jwtPayload: jwtPayload,
          role: user.role,
          imageUrl: user.imageUrl,
          name: user.name
        });
      }
    });
  });

  app.use('/', function (req, res, next) {
    // Set the values to the request object so that they can
    // be fetched by other middleware components later on.
    req.oauth2 = {};
    req.oauth2.clientID = process.env.AUTH0_CLIENT_ID;
    req.oauth2.clientSecret = process.env.AUTH0_CLIENT_SECRET;
    req.oauth2.callbackURL = process.env.AUTH0_CALLBACK_URL;
    next();
  });

  app.use(['/badges/:id', '/api/badges/:id'], function (req, res, next) {
    models.Badge.findById(req.params.id, function (err, badge) {
      if (err || badge === null) {
        return res.redirect('/error?message=' + errors.BADGE_NOT_FOUND);
      }
      if (badge.consumerKey && badge.consumerSecret) {
        // If badge has been setup with custom Auth0 consumer,
        // update the request with the right values.
        req.oauth2.clientID = badge.consumerKey;
        req.oauth2.clientSecret = badge.consumerSecret;
        // Construct the correct callback URL by taking the URL from the
        // environment variable as baseline and appending /callback to the
        // path this request was targeting.
        var parsedUrl = url.parse(process.env.AUTH0_CALLBACK_URL);
        var splitPath = req.baseUrl.split('?')[0].split('/');
        parsedUrl.pathname = splitPath.slice(0, 3).concat('callback').join('/');
        req.oauth2.callbackURL = url.format(parsedUrl);
      }
      next();
    });
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get(['/login', '/badges/:id/login'], function (req, res, next) {
    passport.authenticate('oauth2', req.oauth2 || {})(req, res, next);
  });

  app.get(['/callback', '/badges/:id/callback'],
    function (req, res, next) {
      var params = req.oauth2 || {};
      // Happens if user rejects authorization or if we redirect to Auth0 too
      // many times (Auth0 seems to have logic to cut too long redirect loops).
      params.failureRedirect = '/error?message=' + errors.AUTHENTICATION_FAILURE;
      passport.authenticate('oauth2', params)(req, res, next);
    },
    function (req, res) {
      idea.getUser(req.user.accessToken, function (ideaResponse, body) {
        if (ideaResponse.statusCode === 401) {
          console.log('Got 401 response from the iDEA API with content:');
          console.log(body);
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
          user.accessTokens[req.oauth2.clientID] = req.user.accessToken;
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

  app.get(['/logout', '/badges/:id/logout'], function (req, res) {
    req.logout();
    res.redirect(process.env.IDEA_SITE_URL || '/');
  });
};

module.exports.isEnabled = function () {
  return module.exports._enabled;
};

module.exports.isAuthenticated = function (req) {
  if (!module.exports._enabled) {
    return true;
  }
  if (req.isAuthenticated()) {
    // This is the minimum amount of time we require the JWT to be valid
    // and essentially means the time the user has to complete the badge.
    // If token expires during the badge completion, the results can't be
    // posted at the end since renewing the token requires a redirect that
    // would lose the progress made within the badge.
    var minimumValidityTime = 2 * 60 * 60; // 2 hours
    if (Date.now() > (req.user.jwtPayload.exp - minimumValidityTime) * 1000) {
      return false;
    }
    return true;
  }
  return false;
};

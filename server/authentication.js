'use strict';

var url = require('url');
var passport = require('passport');
var oauth2 = require('passport-oauth2');
var jwt = require('jsonwebtoken');

var models = require('./models/models.js');
var errors = require('./errors.js');
var idea = require('./idea.js');

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
        user.accessToken = auth0User.accessToken;
        done(null, user);
      }
    });
  });

  app.use(function (req, res, next) {
    var splitPath = req.url.split('?')[0].split('/');
    if (splitPath[1] === 'badges') {
      models.Badge.findById(splitPath[2], function (err, badge) {
        if (err || badge === null) {
          return res.redirect('/error?message=' + errors.BADGE_NOT_FOUND);
        }
        strategy._oauth2._clientId = badge.consumerKey;
        strategy._oauth2._clientSecret = badge.consumerSecret;
        var parsedUrl = url.parse(process.env.AUTH0_CALLBACK_URL);
        //parsedUrl.pathname = splitPath.slice(0, 3).concat('callback').join('/');
        // TODO: Use above line once using real badges.
        parsedUrl.pathname = '/badges/test/callback';
        strategy._callbackURL = url.format(parsedUrl);
        next();
      });
    } else {
      strategy._oauth2._clientId = process.env.AUTH0_CLIENT_ID;
      strategy._oauth2._clientSecret = process.env.AUTH0_CLIENT_SECRET;
      strategy._callbackURL = process.env.AUTH0_CALLBACK_URL;
      next();
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get(['/login', '/badges/*/login'], passport.authenticate('oauth2'));

  app.get(['/callback', '/badges/*/callback'],
    passport.authenticate('oauth2',
      {
        failureRedirect: '/error?message=' + errors.AUTHENTICATION_FAILURE
      }
    ),
    function (req, res) {
      idea.getUser(req.user.accessToken, function (ideaResponse, body) {
        if (ideaResponse.statusCode === 401) {
          // Redirect to login endpoint in case access token
          // has expired.
          // TODO: Redirect to correct endpoint if targeting independent badge.
          return res.redirect('/login');
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
          user.save(function (err, user) {
            if (err) {
              return res.redirect('/error?message=' + errors.DATABASE_ERROR_SAVE);
            }
            var splitUrl = req.url.split('/');
            splitUrl.pop();
            res.redirect(splitUrl.join('/'));
          });
        });
      });
    }
  );
};

module.exports.isEnabled = function () {
  return enabled;
};

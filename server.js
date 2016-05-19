'use strict';

var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');

var router = require('./routes/router.js');
var models = require('./models/models.js');

var Auth0Strategy = require('passport-auth0');
var passport = require('passport');

var app = express();

var startServer = function () {
  var port = process.env.port || 8000;
  app.listen(port, function () {
    console.log('Server listening on port %d...', port);
  });
};

mongoose.connect('mongodb://127.0.0.1/badge-builder');

mongoose.connection.on('connected', function () {
  models.init(mongoose.connection);
  startServer();
});

var authentication = !!process.env.AUTH0_DOMAIN;

if (authentication) {
  var strategy = new Auth0Strategy(
    {
      domain: process.env.AUTH0_DOMAIN,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      callbackURL: '/callback'
    },
    function (accessToken, refreshToken, extraParams, profile, done) {
      // profile has all the information from the user
      return done(null, profile);
    }
  );

  passport.use(strategy);

  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
}

// TODO: Switch to dist folder in production
var rootPath = path.join(__dirname, 'app');
app.use('/', express.static(rootPath));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.AUTH0_CLIENT_SECRET || 'no secret',
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  cookie: {
    // TODO: update when served over a secure connection
    secure: false
  },
  saveUninitialized: false,
  resave: false
}));

if (authentication) {
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/callback',
    passport.authenticate('auth0',
      {
        successRedirect: '/',
        failureRedirect: '/login'
      }
    )
  );

  app.get('/login',
    passport.authenticate('auth0', {}),
    function (req, res) {
      res.redirect('/');
    }
  );
}

app.use('/api', router);

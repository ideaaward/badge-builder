'use strict';

var path = require('path');
var http = require('http');
var url = require('url');

var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');

var apiRoute = require('./routes/api.js');
var models = require('./models/models.js');

var passport = require('passport');
var oauth2 = require('passport-oauth2');
var jwt = require('jsonwebtoken');

var app = express();

var startServer = function () {
  var port = process.env.port || 8000;
  app.listen(port, function () {
    console.log('Server listening on port %d...', port);
  });
};

var connectionString = process.env.MONGODB_CONNECTION_STRING || 'mongodb://127.0.0.1';
mongoose.connect(connectionString);

mongoose.connection.on('connected', function () {
  models.init(mongoose.connection);
  startServer();
});

var authentication = !!process.env.AUTH0_DOMAIN;
var strategy = null;

if (authentication) {
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
  passport.serializeUser(function (user, done) {
    // TODO: Potentionally serialize only user id
    // and store access token to database and fetch
    // it from there in deserialize phase.
    done(null, user);
  });
  passport.deserializeUser(function (user, done) {
    // TODO: Find user and append real role to
    // to the user object sent forward.
    user.role = 'admin';
    done(null, user);
  });
}

var appFolder = process.argv[2] === 'dist' ? 'dist' : 'app';
var rootPath = path.join(__dirname, '..', appFolder);
var staticFolder = '/static';

app.use(staticFolder, express.static(rootPath));

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
        failureRedirect: '/error' // TODO: Handle error case
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
            var userNotFoundMessage = 'You must first register in the iDEA hub.';
            return res.redirect('/error?message=' + userNotFoundMessage);
          }
          var parsedBody = JSON.parse(body);
          // TODO: Use the user info.
          console.log(parsedBody);
          res.redirect('/');
        });
      });
    }
  );
}

app.get('/badges/:id', function (req, res) {
  if (authentication && !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.sendFile('/badge.html', {
    root: appFolder
  });
});

app.use('/api', apiRoute);

app.get('/*/', function (req, res) {
  if (authentication && !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.sendFile('/index.html', {
    root: appFolder
  });
});
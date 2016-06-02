'use strict';

var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');

var authentication = require('./authentication.js');
var apiRoute = require('./routes/api.js');
var models = require('./models/models.js');
var errors = require('./errors.js');

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

if (authentication.isEnabled()) {
  authentication.init(app);
}

app.get('/badges/:id', function (req, res) {
  if (authentication.isEnabled() && !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.sendFile('/badge.html', {
    root: appFolder
  });
});

app.use('/api', apiRoute);

app.get('/error', function (req, res) {
  res.sendFile('/index.html', {
    root: appFolder
  });
});

app.get('/*/', function (req, res) {
  if (authentication.isEnabled() && !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  if (authentication.isEnabled() && !req.user.role) {
    return res.redirect('/error?message=' + errors.USER_NOT_IDEA_USER);
  }
  res.sendFile('/index.html', {
    root: appFolder
  });
});

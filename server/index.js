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

var connectionString = process.env.MONGODB_CONNECTION_STRING || 'mongodb://127.0.0.1';
mongoose.connect(connectionString);

mongoose.connection.once('connected', function () {
  models.init(mongoose.connection);
  var port = process.env.port || 8000;
  var listener = app.listen(port, function () {
    console.log('Server listening on port %d...', listener.address().port);
  });
});

// Log errors from connection events to help debugging potential database
// connectivity issues.
var logError = function (eventName) {
  return function () {
    console.error('Received database ' + eventName + ' at ' + new Date().toISOString());
  };
};
mongoose.connection.on('disconnected', logError('disconnected'));
mongoose.connection.on('reconnected', logError('reconnected'));

var appFolder = process.argv[2] === 'dist' ? '.' : 'app';
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  appFolder = '.';
}
console.log('Serving from ' + appFolder + ' folder...');

// A workaround to to be able to use secure cookies in Azure:
// http://scottksmith.com/blog/2014/08/22/using-secure-cookies-in-node-on-azure/
app.use(function (req, res, next) {
  if (req.headers['x-arr-ssl'] && !req.headers['x-forwarded-proto']) {
    req.headers['x-forwarded-proto'] = 'https';
  }
  return next();
});

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
    secure: process.env.NODE_ENV === 'production'
  },
  saveUninitialized: false,
  resave: false
}));

if (authentication.isEnabled()) {
  authentication.init(app);
} else {
  app.use(function (req, res, next) {
    // Add a dummy user to the requests so that
    // the rest of the system can be built around
    // assuming signed in user always exists.
    req.user = {
      id: 'dummy',
      name: 'Dummy User',
      imageUrl: 'dummy.jpg',
      role: 'admin'
    };
    next();
  });
}

app.get('/badges/:id', function (req, res) {
  if (!authentication.isAuthenticated(req)) {
    return res.redirect('/badges/' + req.params.id + '/login');
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
  if (!authentication.isAuthenticated(req)) {
    return res.redirect('/login');
  }
  if (!req.user.role) {
    return res.redirect('/error?message=' + errors.USER_NOT_IDEA_USER);
  }
  if (req.user.role === 'user') {
    return res.redirect('/error?message=' + errors.USER_UNAUTHORIZED);
  }
  res.sendFile('/index.html', {
    root: appFolder
  });
});

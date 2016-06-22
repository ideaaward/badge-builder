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

var appFolder = process.argv[2] === 'dist' ? '.' : 'app';
if (process.env.NODE_ENV === 'production') {
  appFolder = '.';
}
console.log('Serving from ' + appFolder + ' folder...');
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

// Temporary middleware to route URL with test badge
// to some badge that exists in the database.
app.use(function (req, res, next) {
  if (req.url.indexOf('test') > 0) {
    models.Badge.findOne(function (err, badge) {
      if (!err && badge) {
        req.url = req.url.replace('test', badge._id);
      }
      next();
    });
  } else {
    next();
  }
});

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
  if (!req.isAuthenticated()) {
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
  if (!req.isAuthenticated()) {
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

'use strict';

var path = require('path');
var express = require('express');
var router = require('./routes/router.js');

var app = express();
app.use('/api', router);

var rootPath = path.join(__dirname, 'app');
app.use('/', express.static(rootPath));

var port = process.env.port || 8000;
app.listen(port, function () {
  console.log('Server listening on port %d...', port);
});

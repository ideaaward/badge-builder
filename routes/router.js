'use strict';

var express = require('express');

var router = express.Router();

router.get('/my-list.json', function (request, response) {
  response.json({
    items: [
      'Responsive Web App boilerplate',
      'Iron Elements and Paper Elements',
      'End-to-end Build Tooling (including Vulcanize)',
      'Unit testing with Web Component Tester',
      'Routing with Page.js',
      'Offline support with the Platinum Service Worker Elements'
    ]
  });
});

module.exports = router;

'use strict';

var express = require('express');
var models = require('../models/models.js');

var router = express.Router();

router.get('/badges/:id', function (req, res) {
  models.Badge.findById(req.params.id, function (err, badge) {
    if (err) {
      res.send(err);
      return;
    }
    res.json(badge);
  });
});

router.delete('/badges/:id', function (req, res) {
  models.Badge.remove({
    _id: req.params.id
  }, function (err) {
    if (err) {
      res.send(err);
      return;
    }
    res.json({
      message: 'Deleted'
    });
  });
});

router.post('/badges', function (req, res) {
  var badge = new models.Badge();
  badge.author = req.user && req.user.id || '';
  badge.content = req.body.content;

  badge.save(function (err, badge) {
    if (err) {
      res.send(err);
      return;
    }

    res.statusCode = 201;
    res.json({
      _id: badge._id
    });
  });
});

router.get('/badges', function (req, res) {
  models.Badge.find(function(err, badges) {
    if (err) {
      res.send(err);
      return;
    }
    res.json(badges);
  });
});

module.exports = router;

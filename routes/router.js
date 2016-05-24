'use strict';

var express = require('express');
var models = require('../models/models.js');

var router = express.Router();

var sendError = function (res, err) {
  res.statusCode = 500;
  res.send(err);
};

router.get('/badges/:id', function (req, res) {
  models.Badge.findById(req.params.id, function (err, badge) {
    if (err) {
      return sendError(res, err);
    }
    res.json(badge);
  });
});

router.delete('/badges/:id', function (req, res) {
  models.Badge.remove({
    _id: req.params.id
  }, function (err) {
    if (err) {
      return sendError(res, err);
    }
    res.json({
      message: 'Deleted'
    });
  });
});

router.post('/badges', function (req, res) {
  var badge = new models.Badge();
  badge.author = req.user && req.user.id || '';
  badge.title = req.body.title;
  badge.content = req.body.content;

  badge.save(function (err, badge) {
    if (err) {
      return sendError(res, err);
    }

    res.statusCode = 201;
    res.json({
      _id: badge._id
    });
  });
});

router.put('/badges/:id', function (req, res) {
  models.Badge.findById(req.params.id, function (err, badge) {
    if (err) {
      return sendError(res, err);
    }

    badge.title = req.body.title;
    badge.content = req.body.content;

    badge.save(function (err) {
      if (err) {
        return sendError(res, err);
      }
      res.json({
        _id: badge._id
      });
    });
  });
});

router.get('/badges', function (req, res) {
  models.Badge.find(function(err, badges) {
    if (err) {
      return sendError(res, err);
    }
    // TODO: Return only _id and title
    res.json(badges);
  });
});

module.exports = router;

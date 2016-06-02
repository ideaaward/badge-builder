'use strict';

var express = require('express');
var models = require('../models/models.js');
var helpers = require('./helpers.js');

var router = express.Router();

var sendError = function (res, err) {
  res.statusCode = 500;
  res.send(err);
};

var sendUnauthorized = function (res) {
  res.statusCode = 401;
  res.json({
    message: 'Unauthorized'
  });
};

var sendBadRequest = function (res) {
  res.statusCode = 400;
  res.json({
    message: 'Bad Request'
  });
};

var requireAdmin = function (req, res, next) {
  if (req.user.role !== 'admin') {
    return sendUnauthorized(res);
  }
  next();
};

var requireAuthor = function (req, res, next) {
  if (!req.user.role || req.user.role === 'user') {
    return sendUnauthorized(res);
  }
  next();
};

router.get('/badges/:id', function (req, res) {
  models.Badge.findById(req.params.id, function (err, badge) {
    if (err) {
      return sendError(res, err);
    }
    // TODO: Do not include answers in response unless user
    // is the badge author or admin.
    res.json(badge);
  });
});

router.delete('/badges/:id', requireAdmin, function (req, res) {
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

router.post('/badges', requireAuthor, function (req, res) {
  var badge = new models.Badge();
  badge.author = req.user && req.user.id || '';
  badge.title = req.body.title;
  badge.content = helpers.generateIds(req.body.content);

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

router.put('/badges/:id', requireAuthor, function (req, res) {
  models.Badge.findById(req.params.id, function (err, badge) {
    if (err) {
      return sendError(res, err);
    }

    // TODO: Check that only admins and authors of this badge can update.

    badge.title = req.body.title;
    badge.content = helpers.generateIds(req.body.content);

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

router.get('/badges', requireAuthor, function (req, res) {
  models.Badge.find({}, 'title author', function (err, badges) {
    if (err) {
      return sendError(res, err);
    }
    var resultBadges = [];
    badges.forEach(function (badge) {
      resultBadges.push({
        title: badge.title,
        _id: badge.id,
        userCanDelete: req.user.role === 'admin' || req.user.id === badge.author
      });
    });
    res.json(resultBadges);
  });
});

router.put('/badges/:id/answers', function (req, res) {
  models.Badge.findById(req.params.id, function (err, badge) {
    if (err) {
      return sendError(res, err);
    }

    res.json(helpers.calculateResults(badge, req.body));
  });
});

var getUsers = function (role, req, res) {
  models.User.find({ role: role }, function (err, users) {
    if (err) {
      return sendError(res, err);
    }
    res.json(users);
  });
};

router.get('/admins', requireAdmin, function (req, res) {
  getUsers('admin', req, res);
});

router.get('/users', requireAdmin, function (req, res) {
  getUsers('user', req, res);
});

router.put('/admins', requireAdmin, function (req, res) {
  models.User.findOne({ id: req.body.id }, function (err, user) {
    if (err || user === null) {
      return sendBadRequest(res);
    }
    user.role = 'admin';
    user.save(function (err) {
      if (err) {
        return sendError(res, err);
      }
      res.json({
        id: user.id
      });
    });
  });
});

module.exports = router;

var mongoose = require('mongoose');

var badgeSchema = new mongoose.Schema({
  author: 'string',
  content: 'string',
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports.init = function (connection) {
  module.exports.Badge = connection.model('Badge', badgeSchema);
};

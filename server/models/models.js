var mongoose = require('mongoose');

var badgeSchema = new mongoose.Schema({
  author: 'string',
  title: 'string',
  content: Object,
  date: {
    type: Date,
    default: Date.now
  }
});

var userSchema = new mongoose.Schema({
  id: 'string',
  role: {
    type: 'string',
    default: 'user' // 'user', 'author' or 'admin'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports.init = function (connection) {
  module.exports.Badge = connection.model('Badge', badgeSchema);
  module.exports.User = connection.model('User', userSchema);
};

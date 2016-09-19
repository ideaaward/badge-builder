var request = require('request');

var ideaServer = process.env.IDEA_API_URL || 'https://idea.org.uk/api';

var ideaRequest = function (callback, accessToken, path, content) {
  var options = {
    url: ideaServer + path,
    headers: {
      'Authorization': 'Bearer ' + accessToken
    },
    json: true
  };
  if (content) {
    options.body = content;
    options.method = 'POST';
  }
  request(options, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      callback(response, body);
    } else {
      callback(response, null);
    }
  });
};

module.exports.getUser = function (accessToken, callback) {
 ideaRequest(callback, accessToken, '/user');
};

module.exports.postResult = function (accessToken, content, callback) {
  ideaRequest(callback, accessToken, '/result', content);
};

var url = require('url');
var http = require('http');

try {
  var ideaServer = url.parse(process.env.IDEA_API_URL);
} catch (err) {
  console.log('Set an environment variable named IDEA_API_URL and retry!');
  process.exit();
}

var ideaRequest = function (callback, accessToken, path, body) {
  var headers = {
    'Authorization': 'Bearer ' + accessToken
  };
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  var req = http.request({
    method: body ? 'POST' : 'GET',
    host: ideaServer.host,
    path: ideaServer.path + path,
    protocol: ideaServer.protocol,
    headers: headers
  }, function (ideaResponse) {
    var body = '';
    ideaResponse.on('data', function (data) {
      body += data;
    });
    ideaResponse.on('end', function () {
      try {
        callback(ideaResponse, JSON.parse(body));
      } catch (err) {
        console.log(body);
        callback(ideaResponse, null);
      }
    });
  });

  if (body) {
    req.write(JSON.stringify(body));
  }

  req.end();
};

module.exports.getUser = function (accessToken, callback) {
 ideaRequest(callback, accessToken, '/user');
};

module.exports.postResult = function (accessToken, body, callback) {
  ideaRequest(callback, accessToken, '/result', body);
};

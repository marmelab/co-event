"use strict";

var superagent = require('superagent');
var http = require('http');

var host = 'localhost:3001';

module.exports = function (app) {
    var server = http.createServer(app.callback()).listen(3001);
    var agent = superagent.agent();

    var close = function () {
        server.close();
    };

    var get = function (url) {
        return function (done) {
            var request = agent.get(host + url);
            request.on('error', function (error) {
              // throw error;
              done(error);
            });

            request.end(function (res) {
                // return res;
                done(null, res);
            });
        };
    };

    var post = function (url, data, files) {
        return function (done) {
            var request = agent.post(host + url);
            if (files) {
              request.set('Content-Type', 'multipart/form-data')
              .set('content-disposition', 'form-data; name=file; filename="path_to_file"');
              for ( var index = 0; index < files.length; index++) {
                  request.attach(files[index].name, files[index].filepath);
              }
            }
            request.send(data)
            .on('error', function (error) {
              // throw error;
              done(error);
            });

            request.end(function (res) {
                // return res;
                done(null, res);
            });
        };
    };

    var put = function (url, data, headers) {
        return function (done) {
            var request = agent.put(host + url);
            request.send(data)
            .on('error', function (error) {
              // throw error;
              done(error);
            });

            if (headers) {
                for (var attr in headers) {
                    if (!headers.hasOwnProperty(attr)) continue;
                    request.set(attr, headers[attr]);
                }
            }

            request.end(function (res) {
                // return res;
                done(null, res);
            });
        };
    };

    var del = function (url) {
        return function (done) {
            var request = agent.del(host + url);
            request.on('error', function (error) {
              // throw error;
              done(error);
            });

            request.end(function (res) {
                // return res;
                done(null, res);
            });
        };
    };

    return {
        close: close,
        get: get,
        post: post,
        put: put,
        del: del,
        host: host
    };
};

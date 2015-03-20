var koa = require('koa');
var co = require('co');
var assert = require('chai').assert;

var respond = require('../lib/respond');
var request = require('./utils/request');

describe('respond', function () {
    var app, server;
    beforeEach(function () {
        app = koa();
    });

    it('should respond before continuing', function (done) {
        var doSomethingelse = false;

        app.use(function* (next) {
            try {
                yield next;
            } catch(e) {
                done(e);
            }
        });

        app.use(function* (next) {
            this.status = 404;
            yield next;
            assert.isUndefined(this.respond);
            yield respond(this);
            assert.isFalse(this.respond);
            done();
        });

        server = request(app);
        co (function*  () {
            var response = yield server.get('/');
            assert.equal(response.status, 404);
        }).catch(done);
    });

    afterEach(function () {
        server.close();
    });
});

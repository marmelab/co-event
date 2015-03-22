// var koa = require('koa');
// var co = require('co');
// var assert = require('chai').assert;

// var koaEvent = require('../../lib');
// var request = require('../utils/request');

// describe('koa-event', function () {
//     var app, server;
//     beforeEach(function () {
//         app = koa();

//         app.use(koaEvent);
//     });

//     it('should add dispatcher method to the request context', function (done) {
//         app.use(function * () {
//             assert.isFunction(this.dispatcher.on);
//             assert.isFunction(this.dispatcher.emit);
//             assert.isFunction(this.dispatcher.emitLater);
//             assert.isFunction(this.dispatcher.emitBuffered);

//             done();
//         });

//         server = request(app);
//         co(function* () {
//             yield server.get('/');
//         });
//     });

//     it('should alow to buffer event to trigger them at a later time', function (done) {
//         var doSomethingCall = [];
//         app.use(function* (next) {
//             this.dispatcher.on('event', function* doSomething(data) {
//                 doSomethingCall.push(data);
//             });
//             try {
//                 yield next;
//             } catch(error) {
//                 done(error);
//             }
//         });

//         app.use(function* (next) {
//             this.dispatcher.emitLater('event', 19);
//             yield next;
//         });

//         app.use(function* (next) {
//             yield this.dispatcher.emitBuffered();
//             assert.deepEqual(doSomethingCall, [19]);
//             done();
//         });

//         server = request(app);
//         co(function* () {
//             yield server.get('/');
//         });
//     });

//     it('should respond before executing buffered event', function* () {
//         var doSomethingCall = [];
//         app.use(function* (next) {
//             this.dispatcher.on('event', function* doSomething(data) {
//                 doSomethingCall.push(data);
//             });
//             yield next;
//         });

//         app.use(function* (next) {
//             this.dispatcher.emitLater('event', 19);
//             this.body = 'OK';
//             this.status = 200;
//             yield next;
//         });

//         server = request(app);
//         yield server.get('/');

//         // assert.deepEqual(doSomethingCall, []);
//     });

//     afterEach(function () {
//         server.close();
//     });
// });

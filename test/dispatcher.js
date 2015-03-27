'use strict';

var assert = require('chai').assert;
var co = require('co');

var Dispatcher = require('../lib/dispatcher');

describe('dispatcher', function() {
    var dispatcher;

    beforeEach(function () {
        dispatcher = new Dispatcher(true);
    });

    describe('emit', function () {
        it('should add event to events array', function () {
            dispatcher.emit('my_event', {some: 'data'});

            assert.deepEqual(dispatcher.events, [{event: 'my_event', listeners: []}]);
        });

        it('should return before executing the event and wait for the next event loop', function* () {
            var listenerCall = [];
            dispatcher.on('my_event', function* (data) {
                listenerCall.push(data);
            });
            dispatcher.emit('my_event', {some: 'data'});

            assert.deepEqual(listenerCall, []);
            yield setImmediate;
            assert.deepEqual(listenerCall, [{some: 'data'}]);
        });

        it('should add one promise for each listener', function () {
            var co = require('co');
            var listener = function* () {};
            dispatcher.on('my_event', listener);
            var expectedEvent = {
                event: 'my_event',
                listeners: {}
            };
            expectedEvent.listeners = [co(listener())];

            dispatcher.emit('my_event', {some: 'data'});

            assert.deepEqual(dispatcher.events, [expectedEvent]);
            assert.equal(dispatcher.events[0].listeners[0].constructor.name, 'Promise');
        });

        it('should pass all emitted arguments', function* () {
            var listenerCall = [];
            dispatcher.on('my_event', function* () {
                listenerCall.push(arguments);
            });

            dispatcher.emit('my_event', 'some', 'data');

            yield setImmediate;
            let slice = Array.prototype.slice;

            assert.deepEqual(slice.call(listenerCall[0]), ['some', 'data']);
        });
    });

    describe('resolveAll', function () {

        it('should resolve all unfinished event in order, and return report of all event when done', function* () {
            var listenerCall = [];
            function* listener(data) {
                listenerCall.push(data);
            }
            dispatcher.on('my_event', listener);
            dispatcher.emit('my_event', {some: 'data'});
            dispatcher.emit('my_event', {someOther: 'data'});

            var report = yield dispatcher.resolveAll();

            var expectedEvent1 = {
                event: 'my_event',
                listeners: [{
                    listener: listener,
                    error: undefined
                }]
            };

            var expectedEvent2 = {
                event: 'my_event',
                listeners: [{
                    listener: listener,
                    error: undefined
                }]
            };

            assert.deepEqual(report, [expectedEvent1, expectedEvent2]);

            assert.deepEqual(listenerCall, [{some: 'data'}, {someOther: 'data'}]);
            assert.deepEqual(dispatcher.events, []);
        });

        it('should emit all buffered event in order, and return an array of event (with error if any)', function* () {
            var listenerCall = [];

            function* listener(data) {
                listenerCall.push(data);
                if (!data.some) {
                    throw new Error('missing some data');
                }
            }

            dispatcher.on('my_event', listener);
            dispatcher.emit('my_event', {some: 'data'});
            dispatcher.emit('my_event', {someOther: 'data'});

            var report = yield dispatcher.resolveAll();

            var expectedEvent1 = {
                event: 'my_event',
                listeners: [{
                    listener: listener,
                    error: undefined
                }]
            };
            var expectedEvent2 = {
                event: 'my_event',
                listeners: [{
                    listener: listener,
                    error: new Error('missing some data')
                }]
            };

            assert.deepEqual(report, [expectedEvent1, expectedEvent2]);
        });

    });

    describe('on', function () {

        it('should throw an error if passing a non generator function', function () {
            assert.throws(function () {
                dispatcher.on('my_event', function listener(data) {});
            }, 'listener must be a generator function');

        });

        it('should not trigger registered generator on other event', function* () {
            var myEventListenerCall = [];
            dispatcher.on('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            dispatcher.emit('other_event', 1);
            yield dispatcher.resolveAll();

            assert.deepEqual(myEventListenerCall, []);
        });

        it('should register generator to be executed each time on event', function* () {
            var myEventListenerCall = [];
            dispatcher.on('my_event', function* listener(data) {
                yield function (done) {
                    setTimeout(done, 1);
                };
                myEventListenerCall.push(data);
            });

            dispatcher.emit('my_event', 1);
            assert.deepEqual(myEventListenerCall, []);
            yield dispatcher.resolveAll();
            assert.deepEqual(myEventListenerCall, [1]);

            dispatcher.emit('my_event', 2);
            assert.deepEqual(myEventListenerCall, [1]);
            yield dispatcher.resolveAll();
            assert.deepEqual(myEventListenerCall, [1, 2]);
        });

        it('should allow to register several generator on one event', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            dispatcher.on('my_event', function* listener1(data) {
                myEventListener1Call.push(data);
            });

            dispatcher.on('my_event', function* listener2(data) {
                myEventListener2Call.push(data);
            });

            dispatcher.emit('my_event', 1);
            yield dispatcher.resolveAll();

            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
        });
    });

    describe('once', function () {

        it('should register generator to be executed only once on event', function* () {
            var myEventListenerCall = [];
            dispatcher.once('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            dispatcher.emit('my_event', 1);
            yield dispatcher.resolveAll();

            assert.deepEqual(myEventListenerCall, [1]);
            dispatcher.emit('my_event', 2);
            yield dispatcher.resolveAll();
            assert.deepEqual(myEventListenerCall, [1]);
        });

        it('should work with different once listener', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            dispatcher.once('my_event', function* listener1(data) {
                myEventListener1Call.push(data);
            });
            dispatcher.once('my_event', function* listener2(data) {
                myEventListener2Call.push(data);
            });

            dispatcher.emit('my_event', 1);
            yield dispatcher.resolveAll();

            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
            dispatcher.emit('my_event', 2);
            yield dispatcher.resolveAll();
            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
        });
    });

    describe('removeListener', function () {
        it('should throw an error if listener is not a generator', function () {
            assert.throws(function () {
                dispatcher.removeListener('my_event', function listener(data) {});
            }, 'listener must be a generator function');
        });

        it('should not remove specified listener it it is not on specified event', function () {
            var listener1 = function* listener1() {};
            var listener2 = function* listener2() {};

            dispatcher.on('my_event', listener1);
            dispatcher.on('other_event', listener2);

            dispatcher.removeListener('other_event', listener1);
            assert.deepEqual(dispatcher.listeners['my_event'], [listener1]);
            assert.deepEqual(dispatcher.listeners['other_event'], [listener2]);
        });

        it('should remove specified listener only on specified event', function () {
            var listener1 = function* listener1() {};
            var listener2 = function* listener2() {};

            dispatcher.on('my_event', listener1);
            dispatcher.on('my_event', listener2);
            dispatcher.on('other_event', listener1);

            dispatcher.removeListener('my_event', listener1);
            assert.deepEqual(dispatcher.listeners['my_event'], [listener2]);
            assert.deepEqual(dispatcher.listeners['other_event'], [listener1]);
        });
    });

});

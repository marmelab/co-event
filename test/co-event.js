'use strict';

var assert = require('chai').assert;
var co = require('co');

var CoEventEmitter = require('../');

describe('coEventEmitter', function() {
    var coEventEmitter;

    beforeEach(function () {
        coEventEmitter = new CoEventEmitter(true);
    });

    describe('emit', function () {
        it('should add event to events array', function () {
            coEventEmitter.emit('my_event', {some: 'data'});

            assert.deepEqual(coEventEmitter.events, [{event: 'my_event', listeners: []}]);
        });

        it('should return before executing the event and wait for the next event loop', function* () {
            var listenerCall = [];
            coEventEmitter.on('my_event', function* (data) {
                listenerCall.push(data);
            });
            coEventEmitter.emit('my_event', {some: 'data'});

            assert.deepEqual(listenerCall, []);
            yield setImmediate;
            assert.deepEqual(listenerCall, [{some: 'data'}]);
        });

        it('should add one promise for each listener', function () {
            var co = require('co');
            var listener = function* () {};
            coEventEmitter.on('my_event', listener);
            var expectedEvent = {
                event: 'my_event',
                listeners: {}
            };
            expectedEvent.listeners = [co(listener())];

            coEventEmitter.emit('my_event', {some: 'data'});

            assert.deepEqual(coEventEmitter.events, [expectedEvent]);
            assert.equal(coEventEmitter.events[0].listeners[0].constructor.name, 'Promise');
        });

        it('should pass all emitted arguments', function* () {
            var listenerCall = [];
            coEventEmitter.on('my_event', function* () {
                listenerCall.push(arguments);
            });

            coEventEmitter.emit('my_event', 'some', 'data');

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
            coEventEmitter.on('my_event', listener);
            coEventEmitter.emit('my_event', {some: 'data'});
            coEventEmitter.emit('my_event', {someOther: 'data'});

            var report = yield coEventEmitter.resolveAll();

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
            assert.deepEqual(coEventEmitter.events, []);
        });

        it('should emit all buffered event in order, and return an array of event (with error if any)', function* () {
            var listenerCall = [];

            function* listener(data) {
                listenerCall.push(data);
                if (!data.some) {
                    throw new Error('missing some data');
                }
            }

            coEventEmitter.on('my_event', listener);
            coEventEmitter.emit('my_event', {some: 'data'});
            coEventEmitter.emit('my_event', {someOther: 'data'});

            var report = yield coEventEmitter.resolveAll();

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
                coEventEmitter.on('my_event', function listener(data) {});
            }, 'listener must be a generator function');

        });

        it('should not trigger registered generator on other event', function* () {
            var myEventListenerCall = [];
            coEventEmitter.on('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            coEventEmitter.emit('other_event', 1);
            yield coEventEmitter.resolveAll();

            assert.deepEqual(myEventListenerCall, []);
        });

        it('should register generator to be executed each time on event', function* () {
            var myEventListenerCall = [];
            coEventEmitter.on('my_event', function* listener(data) {
                yield function (done) {
                    setTimeout(done, 1);
                };
                myEventListenerCall.push(data);
            });

            coEventEmitter.emit('my_event', 1);
            assert.deepEqual(myEventListenerCall, []);
            yield coEventEmitter.resolveAll();
            assert.deepEqual(myEventListenerCall, [1]);

            coEventEmitter.emit('my_event', 2);
            assert.deepEqual(myEventListenerCall, [1]);
            yield coEventEmitter.resolveAll();
            assert.deepEqual(myEventListenerCall, [1, 2]);
        });

        it('should allow to register several generator on one event', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            coEventEmitter.on('my_event', function* listener1(data) {
                myEventListener1Call.push(data);
            });

            coEventEmitter.on('my_event', function* listener2(data) {
                myEventListener2Call.push(data);
            });

            coEventEmitter.emit('my_event', 1);
            yield coEventEmitter.resolveAll();

            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
        });
    });

    describe('once', function () {

        it('should register a remove listener after the passed listener', function* () {
            function* listener(data) {}
            coEventEmitter.once('my_event', listener);
            var self = coEventEmitter;
            assert.equal(coEventEmitter.listeners.my_event.length, 2);
            assert.deepEqual(coEventEmitter.listeners.my_event[0], listener);
            assert.equal(coEventEmitter.listeners.my_event[1].toString(), 'function* () {\n        self.removeListener(eventName, listener);\n    }');
        });

        it('should register generator to be executed only once on event', function* () {
            var myEventListenerCall = [];
            coEventEmitter.once('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            coEventEmitter.emit('my_event', 1);
            yield coEventEmitter.resolveAll();

            assert.deepEqual(myEventListenerCall, [1]);
            coEventEmitter.emit('my_event', 2);
            yield coEventEmitter.resolveAll();
            assert.deepEqual(myEventListenerCall, [1]);
        });

        it('should work with different once listener', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            coEventEmitter.once('my_event', function* listener1(data) {
                myEventListener1Call.push(data);
            });
            coEventEmitter.once('my_event', function* listener2(data) {
                myEventListener2Call.push(data);
            });

            coEventEmitter.emit('my_event', 1);
            yield coEventEmitter.resolveAll();

            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
            coEventEmitter.emit('my_event', 2);
            yield coEventEmitter.resolveAll();
            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
        });
    });

    describe('removeListener', function () {
        it('should throw an error if listener is not a generator', function () {
            assert.throws(function () {
                coEventEmitter.removeListener('my_event', function listener(data) {});
            }, 'listener must be a generator function');
        });

        it('should not remove specified listener it it is not on specified event', function () {
            var listener1 = function* listener1() {};
            var listener2 = function* listener2() {};

            coEventEmitter.on('my_event', listener1);
            coEventEmitter.on('other_event', listener2);

            coEventEmitter.removeListener('other_event', listener1);
            assert.deepEqual(coEventEmitter.listeners['my_event'], [listener1]);
            assert.deepEqual(coEventEmitter.listeners['other_event'], [listener2]);
        });

        it('should remove specified listener only on specified event', function () {
            var listener1 = function* listener1() {};
            var listener2 = function* listener2() {};

            coEventEmitter.on('my_event', listener1);
            coEventEmitter.on('my_event', listener2);
            coEventEmitter.on('other_event', listener1);

            coEventEmitter.removeListener('my_event', listener1);
            assert.deepEqual(coEventEmitter.listeners['my_event'], [listener2]);
            assert.deepEqual(coEventEmitter.listeners['other_event'], [listener1]);
        });
    });

});

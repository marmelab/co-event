'use strict';

var assert = require('chai').assert;

var Dispatcher = require('../lib/dispatcher');

describe('dispatcher', function() {
    var dispatcher;

    beforeEach(function () {
        dispatcher = new Dispatcher();
    });

    describe('emitLater', function () {
        it('should add event to events array', function () {
            dispatcher.emitLater('my_event', {some: 'data'});

            assert.deepEqual(dispatcher.events, [{name: 'my_event', data: {some: 'data'}}]);
        });
    });

    describe('emitBuffered', function () {
        beforeEach(function () {
            dispatcher.emitLater('my_event', {some: 'data'});
            dispatcher.emitLater('my_event', {someOther: 'data'});
        });

        it('should emit all buffered event in order, and return when all are done', function* () {
            var listenerCall = [];
            dispatcher.on('my_event', function* listener(data) {
                listenerCall.push(data);
            });

            yield dispatcher.emitBuffered();

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

            var results = yield dispatcher.emitBuffered();

            var event1Result = {event: 'my_event', error: {}};

            event1Result.error[listener] = undefined;
            var event2Result = {event: 'my_event', error: {}};
            event2Result.error[listener] = new Error('missing some data');

            assert.deepEqual(results, [event1Result, event2Result]);
        });

    });

    describe('emit', function () {

        it('should return if no listener exist for emitted event', function* () {
            yield dispatcher.emit('some_event', 'data');
        });
    });

    describe('on', function () {

        it('should throw an error if passing a non generator function', function () {
            assert.throws(function () {
                dispatcher.on('my_event', function listener(data) {});
            }, 'Listener must be a generator function');

        });

        it('should throw an error if passing the same listener twice on an event', function () {
            function* listener(data) {};
            dispatcher.on('my_event', listener);
            assert.throws(function () {
                dispatcher.on('my_event', listener);
            }, 'This listener was already registered for the same event');

        });

        it ('should not trigger registered generator on other event', function* () {
            var myEventListenerCall = [];
            dispatcher.on('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            yield dispatcher.emit('other_event', 1);

            assert.deepEqual(myEventListenerCall, []);
        });

        it ('should register generator to be executed each time on event', function* () {
            var myEventListenerCall = [];
            dispatcher.on('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            yield dispatcher.emit('my_event', 1);

            assert.deepEqual(myEventListenerCall, [1]);
            yield dispatcher.emit('my_event', 2);
            assert.deepEqual(myEventListenerCall, [1, 2]);
        });

        it ('should allow to register several generator on one event', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            dispatcher.on('my_event', function* listener1(data) {
                myEventListener1Call.push(data);
            });

            dispatcher.on('my_event', function* listener2(data) {
                myEventListener2Call.push(data);
            });

            yield dispatcher.emit('my_event', 1);

            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
        });

        it ('should return error or undefined for every registered listener', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            function* listener(data) {
                myEventListener1Call.push(data);
            }

            function* failingListener(data) {
                throw new Error('second listener failed');
            }
            dispatcher.on('my_event', listener);

            dispatcher.on('my_event', failingListener);

            var result = yield dispatcher.emit('my_event', 1);

            var expectedResult = {};

            expectedResult[listener] = undefined;
            expectedResult[failingListener] = new Error('second listener failed');

            assert.deepEqual(result, expectedResult);
        });
    });

    describe('once', function () {

        it('should register generator to be executed only once on event', function* () {
            var myEventListenerCall = [];
            dispatcher.once('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            yield dispatcher.emit('my_event', 1);

            assert.deepEqual(myEventListenerCall, [1]);
            yield dispatcher.emit('my_event', 2);
            assert.deepEqual(myEventListenerCall, [1]);
        });
    });

});

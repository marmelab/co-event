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
            dispatcher.on_('my_event', function* listener(data) {
                listenerCall.push(data);
            });

            yield dispatcher.emitBuffered();

            assert.deepEqual(listenerCall, [{some: 'data'}, {someOther: 'data'}]);
            assert.deepEqual(dispatcher.events, []);
        });

        it('should emit all buffered event in order, and return an array of event (with error if any)', function* () {
            var listenerCall = [];
            dispatcher.on_('my_event', function* listener(data) {
                listenerCall.push(data);
                if (!data.some) {
                    throw new Error('missing some data');
                }
            });

            var results = yield dispatcher.emitBuffered();

            assert.deepEqual(results, [{event: 'my_event', error: {listener: undefined}}, {event: 'my_event', error: {listener: new Error('missing some data')}}]);
        });

    });

    describe('emit_', function () {

        it('should return if no listener exist for emitted event', function* () {
            yield dispatcher.emit_('some_envent', 'data');
        });
    });

    describe('on_', function () {

        it('should throw an error if passing a non generator function', function () {
            assert.throws(function () {
                dispatcher.on_('my_event', function listener(data) {});
            }, 'Listener must be a generator function');

        });

        it('should throw an error if passing a listener with no name', function () {
            assert.throws(function () {
                dispatcher.on_('my_event', function* (data) {});
            }, 'Listener must have a name');

        });

        it('should throw an error if passing a listener with a name already taken', function () {
            dispatcher.on_('my_event', function* listener(data) {});
            assert.throws(function () {
                dispatcher.on_('my_event', function* listener(data) {});
            }, 'A listener with the name "listener" was already registered');

        });

        it ('should not trigger registered generator on other event', function* () {
            var myEventListenerCall = [];
            dispatcher.on_('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            yield dispatcher.emit_('other_event', 1);

            assert.deepEqual(myEventListenerCall, []);
        });

        it ('should register generator to be executed each time on event', function* () {
            var myEventListenerCall = [];
            dispatcher.on_('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            yield dispatcher.emit_('my_event', 1);

            assert.deepEqual(myEventListenerCall, [1]);
            yield dispatcher.emit_('my_event', 2);
            assert.deepEqual(myEventListenerCall, [1, 2]);
        });

        it ('should allow to register several generator on one event', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            dispatcher.on_('my_event', function* listener1(data) {
                myEventListener1Call.push(data);
            });

            dispatcher.on_('my_event', function* listener2(data) {
                myEventListener2Call.push(data);
            });

            yield dispatcher.emit_('my_event', 1);

            assert.deepEqual(myEventListener1Call, [1]);
            assert.deepEqual(myEventListener2Call, [1]);
        });

        it ('should return error or undefined for every registered listener', function* () {
            var myEventListener1Call = [];
            var myEventListener2Call = [];
            dispatcher.on_('my_event', function* listener(data) {
                myEventListener1Call.push(data);
            });

            dispatcher.on_('my_event', function* failingListener(data) {
                throw new Error('second listener failed');
            });

            var result = yield dispatcher.emit_('my_event', 1);

            assert.deepEqual(result, { listener: undefined, failingListener: new Error('second listener failed')});
        });
    });

});

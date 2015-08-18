'use strict';

import {assert} from 'chai';

import CoEventEmitter from '../co-event';

describe('coEventEmitter', function () {
    let coEventEmitter;

    beforeEach(function () {
        coEventEmitter = new CoEventEmitter(true);
    });

    describe('emit', function () {
        it('should return false if there is no listener for event', function () {
            assert.isFalse(coEventEmitter.emit('my_event', { some: 'data' }));
        });

        it('should return true and add an event if there is listener for event the', function () {
            coEventEmitter.on('my_event', function* () {});
            assert.isTrue(coEventEmitter.emit('my_event', { some: 'data' }));

            assert.deepEqual(coEventEmitter.events, [ { event: 'my_event', listeners: [ new Promise(function () {}) ] } ]);
        });

        it('should return before executing the event and wait for the next event loop', function* () {
            let listenerCall = [];
            coEventEmitter.on('my_event', function* (data) {
                listenerCall.push(data);
            });
            coEventEmitter.emit('my_event', {some: 'data'});

            assert.deepEqual(listenerCall, []);
            yield coEventEmitter.resolveAll();
            assert.deepEqual(listenerCall, [{some: 'data'}]);
        });

        it('should add one promise for each listener', function () {
            let listener = function* () {};
            coEventEmitter.on('my_event', listener);
            coEventEmitter.emit('my_event', {some: 'data'});

            assert.equal(coEventEmitter.events.length, 1);
            assert.equal(coEventEmitter.events[0].event, 'my_event');
            assert.equal(coEventEmitter.events[0].listeners.length, 1);
            assert.equal(coEventEmitter.events[0].listeners[0].toString(), '[object Promise]');
        });

        it('should pass all emitted arguments', function* () {
            let listenerCall = [];
            coEventEmitter.on('my_event', function* (...parameters) {
                listenerCall.push(parameters);
            });

            coEventEmitter.emit('my_event', 'some', 'data');

            yield setImmediate;

            assert.deepEqual(listenerCall[0], ['some', 'data']);
        });
    });

    describe('resolveAll', function () {

        it('should resolve all unfinished event in order, and return report of all event when done', function* () {
            let listenerCall = [];
            function* listener(data) {
                listenerCall.push(data);
            }
            coEventEmitter.on('my_event', listener);
            coEventEmitter.emit('my_event', {some: 'data'});
            coEventEmitter.emit('my_event', {someOther: 'data'});

            let report = yield coEventEmitter.resolveAll();

            let expectedEvent1 = {
                event: 'my_event',
                listeners: [{
                    listener,
                    error: undefined
                }]
            };

            let expectedEvent2 = {
                event: 'my_event',
                listeners: [{
                    listener,
                    error: undefined
                }]
            };

            assert.deepEqual(report, [expectedEvent1, expectedEvent2]);

            assert.deepEqual(listenerCall, [{some: 'data'}, {someOther: 'data'}]);
            assert.deepEqual(coEventEmitter.events, []);
        });

        it('should emit all buffered event in order, and return an array of event (with error if any)', function* () {
            let listenerCall = [];

            function* listener(data) {
                listenerCall.push(data);
                if (!data.some) {
                    throw new Error('missing some data');
                }
            }

            coEventEmitter.on('my_event', listener);
            coEventEmitter.emit('my_event', {some: 'data'});
            coEventEmitter.emit('my_event', {someOther: 'data'});

            let report = yield coEventEmitter.resolveAll();

            let expectedEvent1 = {
                event: 'my_event',
                listeners: [{
                    listener,
                    error: undefined
                }]
            };
            let expectedEvent2 = {
                event: 'my_event',
                listeners: [{
                    listener,
                    error: new Error('missing some data')
                }]
            };

            assert.deepEqual(report, [expectedEvent1, expectedEvent2]);
        });

        it('should wait for event emitted by registered listener too', function* () {
            function* listener() {
                coEventEmitter.emit('nested_event');
            }
            function* nestedListener() {}
            coEventEmitter.on('my_event', listener);
            coEventEmitter.on('nested_event', nestedListener);

            coEventEmitter.emit('my_event');

            let report = yield coEventEmitter.resolveAll();

            let expectedEvent1 = {
                event: 'my_event',
                listeners: [{
                    listener,
                    error: undefined
                }]
            };

            let expectedEvent2 = {
                event: 'nested_event',
                listeners: [{
                    listener: nestedListener,
                    error: undefined
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
            let myEventListenerCall = [];
            coEventEmitter.on('my_event', function* listener(data) {
                myEventListenerCall.push(data);
            });

            coEventEmitter.emit('other_event', 1);
            yield coEventEmitter.resolveAll();

            assert.deepEqual(myEventListenerCall, []);
        });

        it('should register generator to be executed each time on event', function* () {
            let myEventListenerCall = [];
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
            let myEventListener1Call = [];
            let myEventListener2Call = [];
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

        it('should register generator to be executed only once on event', function* () {
            let myEventListenerCall = [];
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
            let myEventListener1Call = [];
            let myEventListener2Call = [];
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
            let listener1 = function* listener1() {};
            let listener2 = function* listener2() {};

            coEventEmitter.on('my_event', listener1);
            coEventEmitter.on('other_event', listener2);

            coEventEmitter.removeListener('other_event', listener1);
            assert.deepEqual(coEventEmitter.listeners('my_event'), [listener1]);
            assert.deepEqual(coEventEmitter.listeners('other_event'), [listener2]);
        });

        it('should remove specified listener only on specified event', function () {
            let listener2 = function* listener2() {};
            let listener1 = function* listener1() {};

            coEventEmitter.on('my_event', listener1);
            coEventEmitter.on('my_event', listener2);
            coEventEmitter.on('other_event', listener1);

            coEventEmitter.removeListener('my_event', listener1);
            assert.deepEqual(coEventEmitter.listeners('my_event'), [listener2]);
            assert.deepEqual(coEventEmitter.listeners('other_event'), [listener1]);
        });
    });

});

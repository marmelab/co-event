'use strict';

import {assert} from 'chai';

import CoEventEmitter from '../index';

describe('coEventEmitter', function () {
    let coEventEmitter;

    beforeEach(function () {
        coEventEmitter = new CoEventEmitter();
    });

    describe('emit', function () {
        it('should return a promise that resolve to false if there is no listener for event', function* () {
            const resolve = coEventEmitter.emit('my_event', { some: 'data' }).resolve;
            assert.deepEqual(typeof resolve, 'function');
            assert.isFalse(yield resolve());
        });

        it('should return a promise that resolve to true if there is listener for the event', function* () {
            const listener = function* () {};
            coEventEmitter.on('my_event', listener);

            const resolve = coEventEmitter.emit('my_event', { some: 'data' }).resolve;
            assert.deepEqual(typeof resolve, 'function');
            assert.isTrue(yield resolve());
        });

        it('should return resolve function that return a promise that reject with error thrown by listener', function* () {
            const listener = function* () {
                throw new Error('Boom');
            };
            coEventEmitter.on('my_event', listener);

            const resolve = coEventEmitter.emit('my_event', { some: 'data' }).resolve;
            assert.equal(typeof resolve, 'function');
            const promise = resolve();
            assert.equal(promise.toString(), '[object Promise]');
            let error;
            try {
                yield promise;
            } catch (e) {
                error = e;
            }
            assert.include(error.message, 'Boom');
        });

        it('should return a resolve function that reject with first error thrown by listener', function* () {
            const listener1 = function* () {
                throw new Error('Boom1');
            };
            coEventEmitter.on('my_event', listener1);
            const listener2 = function* () {
                throw new Error('Boom2');
            };
            coEventEmitter.on('my_event', listener2);

            const resolve = coEventEmitter.emit('my_event', { some: 'data' }).resolve;
            assert.deepEqual(typeof resolve, 'function');
            let error;
            try {
                assert.isTrue(yield resolve());
            } catch (e) {
                error = e;
            }

            assert.equal(error.message, 'Boom1');
        });

        it('should return before executing the event and wait for the next event loop', function* () {
            let listenerCall = [];
            coEventEmitter.on('my_event', function* (data) {
                listenerCall.push(data);
            });
            coEventEmitter.emit('my_event', {some: 'data'}).resolve;

            assert.deepEqual(listenerCall, []);
            yield setImmediate;
            assert.deepEqual(listenerCall, [{some: 'data'}]);
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

        it('resolved promise should remove themself from events', function* () {
            const events = Object.getOwnPropertySymbols(coEventEmitter)[0];
            coEventEmitter.on('my_event', function* (data) {});
            coEventEmitter.emit('my_event', {some: 'data'});
            assert.equal(coEventEmitter[events].size, 1);
            yield setImmediate;
            yield setImmediate;
            assert.equal(coEventEmitter[events].size, 0);
        });

        it('resolved promise should remove themself when emit promise is resolved', function* () {
            const events = Object.getOwnPropertySymbols(coEventEmitter)[0];
            coEventEmitter.on('my_event', function* (data) {});
            const resolve = coEventEmitter.emit('my_event', {some: 'data'}).resolve;
            assert.equal(coEventEmitter[events].size, 1);
            yield resolve();
            assert.equal(coEventEmitter[events].size, 0);
        });

        it('resolved promise should remove themself when resolveAll promise is resolved', function* () {
            const events = Object.getOwnPropertySymbols(coEventEmitter)[0];
            coEventEmitter.on('my_event', function* (data) {});
            coEventEmitter.emit('my_event', {some: 'data'});
            assert.equal(coEventEmitter[events].size, 1);
            yield coEventEmitter.resolveAll();
            assert.equal(coEventEmitter[events].size, 0);
        });

        it('rejected promise should stay in events unless specifically resolved', function* () {
            const events = Object.getOwnPropertySymbols(coEventEmitter)[0];
            coEventEmitter.on('my_event', function* (data) {
                throw new Error('Boom');
            });
            const resolve = coEventEmitter.emit('my_event', {some: 'data'}).resolve;
            assert.equal(coEventEmitter[events].size, 1);
            yield setImmediate;
            assert.equal(coEventEmitter[events].size, 1);
            try {
                yield resolve();
            } catch (e) {}
            assert.equal(coEventEmitter[events].size, 0);
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

            assert.equal(report, undefined);

            assert.deepEqual(listenerCall, [{some: 'data'}, {someOther: 'data'}]);
        });

        it('should emit all buffered event in order, throw error if any)', function* () {
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
            let error;
            try {
                yield coEventEmitter.resolveAll();
            } catch (e) {
                error = e;
            }

            assert.deepEqual(error, new Error('missing some data'));
        });

        it('should wait for event emitted by registered listener too', function* () {
            let listenerCall = 0;
            function* listener() {
                listenerCall++;
                coEventEmitter.emit('nested_event');
            }
            let nestedListenerCall = 0;
            function* nestedListener() {
                nestedListenerCall++;
            }
            coEventEmitter.on('my_event', listener);
            coEventEmitter.on('nested_event', nestedListener);

            coEventEmitter.emit('my_event');
            yield coEventEmitter.resolveAll();

            assert.equal(listenerCall, 1);
            assert.equal(nestedListenerCall, 1);
        });

    });

    describe('on', function () {

        it('should throw an error if passing a non function', function () {
            assert.throws(function () {
                coEventEmitter.on('my_event', new Promise(function () {}));
            }, 'listener must be a function');

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
        it('should throw an error if listener is not a function', function () {
            assert.throws(function () {
                coEventEmitter.removeListener('my_event', new Promise(function () {}));
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

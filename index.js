'use strict';
var co = require('co');
var slice = Array.prototype.slice;
var timers = require('timers');

module.exports = function (debug) {
    var events = [];
    var listeners = {};

    var executeListener = function* (listener, parameters) {
        yield timers.setImmediate; // wait for next event loop
        var error;

        try {
            yield listener.apply(null, parameters);
        } catch(e) {
            error = e;
        }

        if (debug) {
            return {
                listener: listener,
                error: error
            };
        }
    };

    var emit = function (event, data) {
        var parameters = slice.call(arguments, 1);
        var eventListeners = listeners[event] || [];

        var tasks = eventListeners.map(function (listener) {
            return co(executeListener(listener, parameters));
        });

        if (data !== 'done') {
            events.push({
                event: event,
                listeners: tasks
            });
            emit(event + '_done', 'done');
        }
    };

    var resolveAll = function* () {
        var loop = function* loop(nbEvents, results) {
            if (events.length === nbEvents) {
                return results;
            }
            return yield loop(events.length, yield events);
        };
        var results = yield loop(0, []);
        events = [];

        return results;
    };

    var on = function (eventName, listener) {
        if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
            throw new Error('listener must be a generator function');
        }

        listeners[eventName] = listeners[eventName] || [];

        listeners[eventName].push(listener);
    };

    var once = function (eventName, listener) {
        on(eventName, listener);
        on(eventName + '_done', function* () {
            removeListener(eventName, listener);
        });
    };

    var removeListener = function (eventName, listener) {
        if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
            throw new Error('listener must be a generator function');
        }
        var eventListeners = listeners[eventName];

        var index = eventListeners.indexOf(listener);

        if (index === -1) { return null; }

        eventListeners.splice(index, 1);

        return listener;
    };

    return {
        executeListener: executeListener,
        emit: emit,
        resolveAll: resolveAll,
        on: on,
        once: once,
        removeListener: removeListener,
        events: function () {
            return events;
        },
        listeners: function () {
            return listeners;
        }
    };
};

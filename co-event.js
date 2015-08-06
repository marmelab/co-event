'use strict';

import co from 'co';
import timers from 'timers';

export default function coEvent(debug) {
    let events = [];
    let listeners = {};

    const executeListener = function* (listener, parameters) {
        yield timers.setImmediate; // wait for next event loop
        let error;

        try {
            yield listener.apply(null, parameters);
        } catch(e) {
            error = e;
        }

        if (debug) {
            return { listener, error };
        }
    };

    const emit = function (event, ...parameters) {
        var eventListeners = listeners[event] || [];

        var tasks = eventListeners.map(listener => co(executeListener(listener, parameters)));

        if (parameters[0] !== 'done') {
            events.push({
                event,
                listeners: tasks
            });
            emit(`${event}_done`, 'done');
        }
    };

    const resolveAll = function* () {
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

    const on = function (eventName, listener) {
        if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
            throw new Error('listener must be a generator function');
        }

        listeners[eventName] = listeners[eventName] || [];

        listeners[eventName].push(listener);
    };

    const once = function (event, listener) {
        on(event, listener);
        on(`${event}_done`, function* () {
            removeListener(event, listener);
        });
    };

    const removeListener = function (eventName, listener) {
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
        executeListener,
        emit,
        resolveAll,
        on,
        once,
        removeListener,
        events: function () {
            return events;
        },
        listeners: function () {
            return listeners;
        }
    };
};

'use strict';

import co from 'co';
import timers from 'timers';

export default class coEvent {
    constructor(listeners = {}, events = [], debug) {
        this.events = events;
        this.listeners = listeners;
        this.debug = debug;
    }

    * executeListener(listener, parameters) {
        yield timers.setImmediate; // wait for next event loop
        let error;

        try {
            yield listener.apply(this, parameters);
        } catch(e) {
            error = e;
        }

        if (this.debug) {
            return { listener, error };
        }
    };

    emit(event, ...parameters) {
        const eventListeners = this.listeners[event] || [];

        const tasks = eventListeners.map(listener => co(this.executeListener(listener, parameters)));

        if (parameters[0] !== 'done') {
            this.events.push({
                event,
                listeners: tasks
            });
            this.emit(`${event}_done`, 'done');
        }
    };

    * resolveAll() {
        const loop = function* loop(e, results) {
            if (e.length === results.length) {
                return results;
            }
            return yield loop(e, yield e);
        };
        const results = yield loop(this.events, []);
        this.events = [];

        return results;
    };

    on(eventName, listener) {
        if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
            throw new Error('listener must be a generator function');
        }

        this.listeners[eventName] = this.listeners[eventName] || [];

        this.listeners[eventName].push(listener);
    };

    once(event, listener) {
        this.on(event, listener);
        this.on(`${event}_done`, function* () {
            this.removeListener(event, listener);
        });
    };

    removeListener(eventName, listener) {
        if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
            throw new Error('listener must be a generator function');
        }
        const eventListeners = this.listeners[eventName];

        const index = eventListeners.indexOf(listener);

        if (index === -1) { return null; }

        eventListeners.splice(index, 1);

        return listener;
    };
};

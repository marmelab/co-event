'use strict';

import timers from 'timers';
import co from 'co';

let defaultMaxListeners = 10;

const executeListener = function* executeListener(listener, parameters) {
    if (listener.constructor.name !== 'GeneratorFunction') {
        return yield executeListener(function* (params) {
            listener(...params);
        }, parameters);
    }
    yield timers.setImmediate; // wait for next event loop
    yield listener(...parameters);
};

const listeners = Symbol('listeners');

export default class coEvent {
    constructor(debug) {
        this.events = [];
        this[listeners] = {};
        this.debug = debug;
        this.maxListeners = defaultMaxListeners;
    }

    emit(event, ...parameters) {
        const eventListeners = this[listeners][event] || [];

        if (eventListeners.length === 0) {
            return new Promise(function (done) {
                done(false);
            });
        }

        const tasks = eventListeners.map(listener => co(executeListener(listener, parameters)));

        this.events = this.events.concat(tasks);

        return Promise.all(tasks).then(result => true);
    };

    * resolveAll() {
        let nbEvents;
        do {
            nbEvents = this.events.length;
            yield this.events;
        } while (this.events.length > nbEvents)
        this.events = [];
    };

    addListener(event, listener) {
        if (typeof listener !== 'function') {
            throw new Error('listener must be a function or a generator function');
        }

        this[listeners][event] = this[listeners][event] || [];

        this[listeners][event].push(listener);

        this.emit('newListener', listener);

        if (this[listeners][event].length > this.maxListeners) {
            console.warn('possible EventEmitter memory leak detected. ${this[listeners][event].length} listeners added. Use emitter.setMaxListeners() to increase limit.');
        }

        return this;
    };

    on(event, listener) {
        return this.addListener(event, listener);
    };

    setMaxListeners(n) {
        this.maxListeners = n;
    };

    static get defaultMaxListeners() {
        return defaultMaxListeners;
    };

    static set defaultMaxListeners(n) {
        defaultMaxListeners = n;
        this.maxListeners = n;
    };

    once(event, listener) {
        const removeListener = this.removeListener.bind(this);
        const debug = this.debug;
        const wrappedListener = function* wrappedListener(...parameters) {
            const result = yield executeListener(listener, parameters);
            removeListener(event, wrappedListener);

            if (debug) {
                return result;
            }
        };
        this.on(event, wrappedListener);

        return this;
    };

    removeListener(event, listener) {
        if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
            throw new Error('listener must be a generator function');
        }
        const eventListeners = this[listeners][event];

        const index = eventListeners.indexOf(listener);

        if (index === -1) { return null; }

        eventListeners.splice(index, 1);

        this.emit('removeListener', listener);

        return this;
    };

    removeAllListener(event = null) {
        if (!event) {
            this[listeners] = {};
            return this;
        }

        delete this[listeners][event];

        return this;
    };

    listeners(event) {
        return this[listeners][event];
    };

    static listenerCount(emitter, event) {
        return emitter.listeners(event).length;
    }
};

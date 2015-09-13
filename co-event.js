'use strict';

import co from 'co';
import executeListener from './executeListener';

let defaultMaxListeners = 10;

const listeners = Symbol('listeners');
const events = Symbol('events');

export default class coEvent {
    constructor() {
        this[events] = new Set();
        this[listeners] = {};
        this.maxListeners = defaultMaxListeners;
    }

    emit(event, ...parameters) {
        const eventListeners = this[listeners][event] || [];

        if (eventListeners.length === 0) {
            return {
                resolve: () => new Promise(done => done(false)),
                executedListeners: eventListeners.length
            };
        }

        const tasks = Promise.all(eventListeners.map(listener => co(executeListener(listener, parameters))))
        .then(() => {
            this[events].delete(tasks);
            return true;
        });

        this[events].add(tasks);

        return {
            resolve: () => co(tasks)
            .catch(error => {
                this[events].delete(tasks);
                return new Promise((_, reject) => reject(error));
            }),
            executedListeners: eventListeners.length
        };
    };

    resolveAll() {
        return co(function* () {
            if (this[events].size === 0) {
                this[events].clear();
                return;
            }
            yield Array.from(this[events].values());

            return yield this.resolveAll();
        }.bind(this));
    };

    addListener(event, listener) {
        if (typeof listener !== 'function') {
            throw new Error('listener must be a function or a generator function');
        }

        this[listeners][event] = this[listeners][event] || [];

        this[listeners][event].push(listener);

        this.emit('newListener', listener);

        if (this[listeners][event].length > this.maxListeners) {
            console.warn(`possible EventEmitter memory leak detected. ${this[listeners][event].length} listeners added. Use emitter.setMaxListeners() to increase limit.`);
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
        const wrappedListener = function* wrappedListener(...parameters) {
            yield executeListener(listener, parameters);
            removeListener(event, wrappedListener);
        };
        this.on(event, wrappedListener);

        return this;
    };

    removeListener(event, listener) {
        if (typeof listener !== 'function') {
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

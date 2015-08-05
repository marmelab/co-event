'use strict';
var co = require('co');
var slice = Array.prototype.slice;

function CoEventEmitter(debug) {
    this.debug = debug;
    this.events = [];
    this.listeners = {};
}

CoEventEmitter.prototype.executeListener = function* (listener, parameters) {
    yield setImmediate; // wait for next event loop
    var error;

    try {
        yield listener.apply(null, parameters);
    } catch(e) {
        error = e;
    }

    if (this.debug) {
        return {
            listener: listener,
            error: error
        };
    }
};

CoEventEmitter.prototype.emit = function (event, data) {
    var self = this;
    var parameters = slice.call(arguments, 1);
    var listeners = self.listeners[event] || [];

    var tasks = listeners.map(function (listener) {
        return co(self.executeListener(listener, parameters));
    });

    if (data !== 'done') {
        self.events.push({
            event: event,
            listeners: tasks
        });
        self.emit(event + '_done', 'done');
    }

    return self;
};

CoEventEmitter.prototype.resolveAll = function* () {
    var nbEvents, results;
    do { // yield events till no new one get added.
        nbEvents = this.events.length;
        results = yield this.events;
    } while (nbEvents !== this.events.length);
    this.events = [];

    return results;
};

CoEventEmitter.prototype.on = function (eventName, listener) {
    if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
        throw new Error('listener must be a generator function');
    }

    this.listeners[eventName] = this.listeners[eventName] || [];

    this.listeners[eventName].push(listener);
};

CoEventEmitter.prototype.once = function (eventName, listener) {
    var self = this;
    self.on(eventName, listener);
    self.on(eventName + '_done', function* () {
        self.removeListener(eventName, listener);
    });
};

CoEventEmitter.prototype.removeListener = function (eventName, listener) {
    if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction') {
        throw new Error('listener must be a generator function');
    }
    var listeners = this.listeners[eventName];

    var index = listeners.indexOf(listener);

    if (index === -1) { return this; }

    listeners.splice(index, 1);

    return this;
};

module.exports = CoEventEmitter;

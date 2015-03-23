'use strict';
var co = require('co');

function Dispatcher() {
    this.events = [];
    this.listeners = {};
}

Dispatcher.prototype.emit = function (event, data) {

    var listeners = this.listeners[event];
    var tasks = {};
    for (var attr in listeners) {
        if (!listeners.hasOwnProperty(attr)) { continue; }
        tasks[attr] = co(listeners[attr](data)); //added and triggered
    }

    this.events.push({
        event: event,
        listeners: tasks
    });
};

Dispatcher.prototype.resolveAll = function* () {
    var results = yield this.events.map(function (event) {
        return co(function* () {
            return yield event;
        });
    });

    this.events = [];

    return results;
};

function wrapListener(listener) {
    return function* (data) {
        yield setImmediate; // wait for next event loop

        try {
            yield listener(data);
        } catch(error) {
            return error;
        }
    };
}

Dispatcher.prototype.on = function (eventName, listener, listenerKey) {
    if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction')  {
        throw new Error('Listener must be a generator function');
    }

    listenerKey = listenerKey || listener;

    if (this.listeners[eventName]) {

        if (this.listeners[eventName][listenerKey]) {
            throw new Error('This listener was already registered for the same event');
        }

        this.listeners[eventName][listenerKey] = wrapListener(listener);

        return;
    }

    this.listeners[eventName] = {};
    this.listeners[eventName][listenerKey] = wrapListener(listener);
};

Dispatcher.prototype.once = function (eventName, listener) {
    var self = this;
    var wrappedListener = function* (data) {
        self.removeListener(eventName, listener);
        yield listener(data);
    };

    return this.on(eventName, wrappedListener, listener);
};

Dispatcher.prototype.removeListener = function(eventName, listener) {
    delete this.listeners[eventName][listener];
};

module.exports = Dispatcher;

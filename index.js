'use strict';
var co = require('co');
var slice = Array.prototype.slice;

function Dispatcher(debug) {
    this.debug = debug;
    this.events = [];
    this.listeners = {};
}


Dispatcher.prototype.executeListener = function* (listener, parameters) {
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

    return error;
};

Dispatcher.prototype.emit = function (event, data) {
    var self = this;
    var parameters = slice.call(arguments, 1);
    var listeners = self.listeners[event] || [];

    var tasks = listeners.map(function (listener) {
        var task = co(self.executeListener(listener, parameters));

        if (listener.once) {
            task.then(function (result) {
                self.removeListener(event, listener);
                return result;
            });
        }

        return task;
    });

    self.events.push({
        event: event,
        listeners: tasks
    });

    return self;
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

Dispatcher.prototype.on = function (eventName, listener) {
    if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction')  {
        throw new Error('listener must be a generator function');
    }

    this.listeners[eventName] = this.listeners[eventName] || [];

    this.listeners[eventName].push(listener);
};

Dispatcher.prototype.once = function (eventName, listener) {
    listener.once = true;

    return this.on(eventName, listener);
};

Dispatcher.prototype.removeListener = function(eventName, listener) {
    if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction')  {
        throw new Error('listener must be a generator function');
    }
    var listeners = this.listeners[eventName];

    var index = listeners.indexOf(listener);

    if (index === -1) { return this; }

    listeners.splice(index, 1);

    return this;
};

module.exports = Dispatcher;

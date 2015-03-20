'use strict';
var co = require('co');

function Dispatcher() {
    this.events = [];
    this.listeners = {};
}


Dispatcher.prototype.emitLater = function(event, data) {
    this.events.push({name: event, data: data});
};

Dispatcher.prototype.emitBuffered = function* () {
    var self = this;
    var event, i;
    var results = [];
    for (i = 0; i < this.events.length; i++) {
        event = this.events[i];
        results.push({
            event: event.name,
            error: yield self.emit(event.name, event.data)
        });
    }
    this.events = [];

    return results;
};

Dispatcher.prototype.on = function(eventName, listener, name) {
    if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction')  {
        throw new Error('Listener must be a generator function');
    }

    name = name || listener.name;

    if (!name) {
        throw new Error('Listener must have a name');
    }

    if (this.listeners[eventName]) {

        if (this.listeners[eventName][name]) {
            throw new Error('A listener with the name "' + name + '" was already registered');
        }

        this.listeners[eventName][name] = listener;

        return;
    }

    this.listeners[eventName] = {};
    this.listeners[eventName][name] = listener;
};

Dispatcher.prototype.once = function(eventName, listener) {
    var self = this;
    var wrappedListener = function* (data) {
        var p = co(function* () {
            yield listener(data);
        }).catch(function(err) {
            return err;
        })
        .then(function() {
            delete self.listeners[eventName][listener.name];
        });

        yield p;
    };

    return this.on(eventName, wrappedListener, listener.name);
};

Dispatcher.prototype.emit = function* (eventName, data) {

    if (!this.listeners[eventName]) {return;}
    var handler;

    var listeners = this.listeners[eventName];

    var tasks = {};
    var task;

    for (var attr in listeners) {
        if (!listeners.hasOwnProperty(attr)) {continue;}

        task = co(function * () {
            yield listeners[attr](data);
        })
        .catch(function (error) {
            return error;
        });

        this.promiseAccumulator.addPromise(task);
        tasks[attr] = task;
    }

    return yield tasks;
};

module.exports = Dispatcher;

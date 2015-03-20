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

/**
 * generator version of EventEmitter.on()
 * @param String eventName The even name, e.g. 'investor.join'
 * @param Function handler a generator returning an array of notifications
 */
Dispatcher.prototype.on = function(eventName, listener) {
    if (typeof listener !== 'function' || listener.constructor.name !== 'GeneratorFunction')  {
        throw new Error('Listener must be a generator function');
    }

    if (!listener.name) {
        throw new Error('Listener must have a name');
    }

    if (this.listeners[eventName]) {

        if (this.listeners[eventName][listener.name]) {
            throw new Error('A listener with the name "' + listener.name + '" was already registered');
        }

        this.listeners[eventName][listener.name] = listener;

        return;
    }

    this.listeners[eventName] = {};
    this.listeners[eventName][listener.name] = listener;
};


/**
 * yieldable version of EventEmitter.emit()
 * @param the event to emit
 */
Dispatcher.prototype.emit = function* (eventName, data) {

    if (!this.listeners[eventName]) {return;}
    var handler;

    var listeners = this.listeners[eventName];

    var tasks = {};

    for (var attr in listeners) {
        if (!listeners.hasOwnProperty(attr)) {continue; }

        tasks[attr] = co(function * () {
            yield listeners[attr](data);
        })
        .catch(function (error) {
            return error;
        });
    }

    return yield tasks;
};

module.exports = Dispatcher;

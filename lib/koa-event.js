'use strict';

var co = require('co');
var respond = require('respond');

module.exports = function (Dispatcher) {
    if(!Dispatcher || typeof Dispatcher.emitBuffered !== 'function') {

    }

    return function* (next) {
        this.dispatcher = new Dispatcher();

        yield next; // executing all following middleware
        respond(this); // send the response

        while (this.dispatcher.events.length > 0) {
            yield this.dispatcher.emitBuffered(); // execute all buffered event
        }
    };
};

'use strict';

import timers from 'timers';

export default function* executeListener(listener, parameters) {
    if (listener.constructor.name !== 'GeneratorFunction') {
        return yield executeListener(function* (...params) {
            listener(...params);
        }, parameters);
    }
    yield timers.setImmediate; // wait for next event loop
    yield listener(...parameters);
};

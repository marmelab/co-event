Event emitter returning promise and accepting generator.

This eventEmitter allow o use generator as listener.
Additionnally, The emit method now return a promise, that allow to know when a listener for a given event get executed.
The promise will also get rejected if one of the listener failed.

The resolveAll method will return a promise that will resolve when all queued event are done.
The promise will also fail if one listener triggered an error.

Event emitter returning promise and accepting generator.

This eventEmitter allow to use generator as listener.
Additionnally, The emit method now return a resolve function that if executed return a promise, that resolve when all listener have correctly executed, or get rejected with the error if one of them failed.
The promise will also get rejected if one of the listener failed.

The resolveAll method will return a promise that will resolve when all queued event are done.
The promise will also fail if one listener triggered an error.

emit  will return an object with a resolve method returning a promise that allow to know when the listener triggered by the event has been executed.

on add a listener 

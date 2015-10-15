# CO-EVENT
Event emitter returning promise and accepting generator.

This eventEmitter allow to use generator as listener.
Additionally, The emit method now return a resolve function that if executed return a promise, that resolve when all listener have correctly executed, or get rejected with the error if one of them failed.
The promise will also get rejected if one of the listener failed.

The resolveAll method will return a promise that will resolve when all queued event are done.
The promise will also fail if one listener triggered an error.

emit  will return an object with a resolve method returning a promise that allow to know when the listener triggered by the event has been executed.

on add a listener

## Class: CoEvent
An Event emitter implementation inspired from node EventEmitter returning promise and accepting generator.

All CoEvent emit the event `'newListener'` when new listeners are
added and `'removeListener'` when a listener is removed.

### emitter.addListener(event, listener)
### emitter.on(event, listener)

Adds a listener to the end of the listeners array for the specified `event`.
No checks are made to see if the `listener` has already been added. Multiple
calls passing the same combination of `event` and `listener` will result in the
`listener` being added multiple times.
The listener can be a function or a generator.

```js
server.on('connection', function (stream) {
  console.log('someone connected!');
});
```

Returns emitter, so calls can be chained.

### emitter.once(event, listener)

Adds a **one time** listener for the event. This listener is
invoked only the next time the event is fired, after which
it is removed.
```js
server.once('connection', function (stream) {
  console.log('Ah, we have our first user!');
});
```
Returns emitter, so calls can be chained.

### emitter.removeListener(event, listener)

Removes a listener from the listener array for the specified event.
**Caution**: changes array indices in the listener array behind the listener.

```js
var callback = function(stream) {
  console.log('someone connected!');
};
server.on('connection', callback);
// ...
server.removeListener('connection', callback);
```

`removeListener` will remove, at most, one instance of a listener from the
listener array. If any single listener has been added multiple times to the
listener array for the specified `event`, then `removeListener` must be called
multiple times to remove each instance.

Returns emitter, so calls can be chained.

### emitter.removeAllListeners([event])

Removes all listeners, or those of the specified event. It's not a good idea to
remove listeners that were added elsewhere in the code, especially when it's on
an emitter that you didn't create (e.g. sockets or file streams).

Returns emitter, so calls can be chained.

### emitter.setMaxListeners(n)

By default EventEmitters will print a warning if more than 10 listeners are
added for a particular event. This is a useful default which helps finding
memory leaks. Obviously not all Emitters should be limited to 10. This function
allows that to be increased. Set to zero for unlimited.

Returns emitter, so calls can be chained.

### emitter.getMaxListeners()

Returns the current max listener value for the emitter which is either set by
`emitter.setMaxListeners(n)` or defaults to `EventEmitter.defaultMaxListeners`.

This can be useful to increment/decrement max listeners to avoid the warning
while not being irresponsible and setting a too big number.
```js
emitter.setMaxListeners(emitter.getMaxListeners() + 1);
emitter.once('event', function () {
  // do stuff
  emitter.setMaxListeners(Math.max(emitter.getMaxListeners() - 1, 0));
});
```
### EventEmitter.defaultMaxListeners

`emitter.setMaxListeners(n)` sets the maximum on a per-instance basis.
This class property lets you set it for *all* `EventEmitter` instances,
current and future, effective immediately. Use with care.

Note that `emitter.setMaxListeners(n)` still has precedence over
`EventEmitter.defaultMaxListeners`.


### emitter.listeners(event)

Returns a copy of the array of listeners for the specified event.
```js
server.on('connection', function (stream) {
  console.log('someone connected!');
});
console.log(util.inspect(server.listeners('connection'))); // [ [Function] ]
```

### emitter.emit(event[, arg1][, arg2][, ...])

Calls each of the listeners in order with the supplied arguments.

Returns An object With
- executedListeners: The number of listeners triggered by the event.
- resolve: A method that return a promise which is fulfilled when all listeners triggered by the event have been successfully executed or rejected with the error thrown by the first failing listener.

### emitter.resolveAll()
Return a promise that is fulfilled when all event are resolved, or rejected if one of the event throwed an error.

### emitter.listenerCount(type)

* `type` {Value} The type of event

Returns the number of listeners listening to the `type` of event.

### Event: 'newListener'

* `event` {String} The event name
* `listener` {Function} The event handler function

This event is emitted *after* a listener is added.

### Event: 'removeListener'

* `event` {String} The event name
* `listener` {Function} The event handler function

This event is emitted *after* a listener is removed.  When this event is
triggered, the listener has been removed from the array of listeners for the
`event`.

### Inheriting from 'CoEvent'

Inheriting from `CoEvent` is no different from inheriting from any other
constructor function. For example:
```js
'use strict';
const util = require('util');
const EventEmitter = require('events').EventEmitter;

function MyEventEmitter() {
  // Initialize necessary properties from `EventEmitter` in this instance
  EventEmitter.call(this);
}

// Inherit functions from `EventEmitter`'s prototype
util.inherits(MyEventEmitter, EventEmitter);
```

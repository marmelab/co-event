This is a POC

Event emitter pattern using generator.

Keeping modularity of event emitter. We emit an event, we don't need to know who will listen to it.

Adding generator, we can know when all listener are done, and if some had error.
We can buffer event to be treated at a later time.

Integrating it to koa. Emitting event on the scope of a request.



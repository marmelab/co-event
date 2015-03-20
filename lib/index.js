'use strict';

var koaEvent = require('./koa-event');
var Dispatcher = require('./dispatcher');

module.exports = koaEvent(Dispatcher);

'use strict';

var koaEvent = require('./koa-event');
var Dispatcher = require('./Dispatcher');

module.exports = koaEvent(Dispatcher);

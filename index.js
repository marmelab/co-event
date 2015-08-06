'use strict';

require('babel').transform('code', { optional: ['runtime'] });
require('babel/register');

module.exports = require('./co-event');

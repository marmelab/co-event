'use strict';

var statuses = require('statuses');
var isJSON = require('koa-is-json');
var Stream = require('stream');

function done (cb) {
    cb();
}

function sendResponse(context) {

    context.respond = false; // bypass koa respond

    var res = context.res;

    var body = context.body;
    var code = context.status;


    // ignore body
    if (statuses.empty[code]) {
        // strip headers
        context.body = null;
        return res.end();
    }

    if ('HEAD' == context.method) {
        if (isJSON(body)) context.length = Buffer.byteLength(JSON.stringify(body));
        return res.end();
    }

    // status body
    if (null === body) {
        context.type = 'text';
        body = context.message || String(code);
        if (body) context.length = Buffer.byteLength(body);
        return res.end(body);
    }

    // responses
    if (Buffer.isBuffer(body)) return res.end(body);
    if ('string' == typeof body) return res.end(body);
    if (body instanceof Stream) return body.pipe(res);

    // body: json
    body = JSON.stringify(body);
    context.length = Buffer.byteLength(body);
    res.end(body);
}

/**
 * Respond to request using koa context
 * Adapted from Koa internal respond midleware
 */
function respond(context) {

    // allow bypassing respond
    if (false === context.respond) return done;

    context.respond = false; // bypass koa respond

    var res = context.res;
    if (res.headersSent || !context.writable) return done;
    sendResponse(context);

    return function (done) {
        res.once('finish', done);
    };
}

module.exports = respond;

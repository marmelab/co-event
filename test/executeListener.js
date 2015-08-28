'use strict';

import {assert} from 'chai';

import executeListener from '../executeListener';

describe('coEventEmitter', function () {

    it('should execute generator listener with given parameters', function* () {
        let receivedArgs = [];
        yield executeListener(function* () {
            receivedArgs.push(...arguments);
        }, ['arg1', 'arg2']);

        assert.deepEqual(receivedArgs, ['arg1', 'arg2']);
    });

    it('should throw error thrown by the given generator listener', function* () {
        let error;
        try {
            yield executeListener(function* () {
                throw new Error('Boom');
            }, ['arg1', 'arg2']);
        } catch (e) {
            error = e;
        }

        assert.equal(error.message, 'Boom');
    });

    it('should execute function listener with given parameters', function* () {
        let receivedArgs = [];
        yield executeListener(function () {
            receivedArgs.push(...arguments);
        }, ['arg1', 'arg2']);

        assert.deepEqual(receivedArgs, ['arg1', 'arg2']);
    });

    it('should throw error thrown by the given function listener', function* () {
        let error;
        try {
            yield executeListener(function () {
                throw new Error('Boom');
            }, ['arg1', 'arg2']);
        } catch (e) {
            error = e;
        }

        assert.equal(error.message, 'Boom');
    });

});

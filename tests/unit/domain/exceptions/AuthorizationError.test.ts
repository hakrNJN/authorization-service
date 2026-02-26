import 'reflect-metadata';
import {
    AuthorizationError,
    PolicyEvaluationError,
    PolicyLoadError,
} from 'domain/exceptions/AuthorizationError';
import { BaseError } from 'shared/errors/BaseError';

describe('AuthorizationError exceptions', () => {
    describe('AuthorizationError (base)', () => {
        it('should be an instance of BaseError and Error', () => {
            const err = new AuthorizationError();
            expect(err).toBeInstanceOf(BaseError);
            expect(err).toBeInstanceOf(Error);
        });

        it('should have default message and 500 status', () => {
            const err = new AuthorizationError();
            expect(err.message).toBe('Authorization process failed');
            expect(err.statusCode).toBe(500);
        });

        it('should accept custom message and status', () => {
            const err = new AuthorizationError('Custom error', 503);
            expect(err.message).toBe('Custom error');
            expect(err.statusCode).toBe(503);
        });

        it('isOperational should be false', () => {
            const err = new AuthorizationError();
            expect(err.isOperational).toBe(false);
        });
    });

    describe('PolicyEvaluationError', () => {
        it('should have name PolicyEvaluationError and 500 status', () => {
            const err = new PolicyEvaluationError();
            expect(err.name).toBe('PolicyEvaluationError');
            expect(err.statusCode).toBe(500);
            expect(err.message).toBe('Failed to evaluate authorization policies.');
        });

        it('should accept custom message', () => {
            const err = new PolicyEvaluationError('Custom evaluation error');
            expect(err.message).toBe('Custom evaluation error');
        });

        it('should store details when provided', () => {
            const details = { policy: 'read:resource', error: 'timeout' };
            const err = new PolicyEvaluationError('Eval error', details);
            expect((err as any).details).toEqual(details);
        });

        it('should work with undefined details', () => {
            const err = new PolicyEvaluationError('Eval error', undefined);
            expect((err as any).details).toBeUndefined();
        });
    });

    describe('PolicyLoadError', () => {
        it('should have name PolicyLoadError and 500 status', () => {
            const err = new PolicyLoadError();
            expect(err.name).toBe('PolicyLoadError');
            expect(err.statusCode).toBe(500);
            expect(err.message).toBe('Failed to load authorization policies.');
        });

        it('should accept custom message', () => {
            const err = new PolicyLoadError('Load error');
            expect(err.message).toBe('Load error');
        });

        it('should store details when provided', () => {
            const details = { source: 'opa', error: 'connection refused' };
            const err = new PolicyLoadError('Load error', details);
            expect((err as any).details).toEqual(details);
        });

        it('should work with undefined details', () => {
            const err = new PolicyLoadError('Load error', undefined);
            expect((err as any).details).toBeUndefined();
        });
    });
});

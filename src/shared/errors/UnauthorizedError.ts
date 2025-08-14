import { BaseError } from './BaseError';

export class UnauthorizedError extends BaseError {
    constructor(message = 'Unauthorized', details?: any) {
        super('UnauthorizedError', 401, message, true, details);
    }
}

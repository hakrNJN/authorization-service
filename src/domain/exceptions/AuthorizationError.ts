import { BaseError } from '../../shared/errors/BaseError'; // Adjust path if needed

/**
 * Base class for specific errors related to authorization processing.
 */
export class AuthorizationError extends BaseError {
    constructor(message = 'Authorization process failed', statusCode = 500) {
        // Default to 500 Internal Server Error for processing issues,
        // 403 Forbidden should typically be represented by an AuthorizationDecision { allowed: false }
        super('AuthorizationError', statusCode, message, false); // Often not operational errors
    }
}

// --- Specific Authorization Errors ---

export class PolicyEvaluationError extends AuthorizationError {
    constructor(message = 'Failed to evaluate authorization policies.', details?: any) {
        super(message, 500); // Internal error if policies can't be evaluated
        this.name = 'PolicyEvaluationError';
        (this as any).details = details; // Add specific evaluation details if available
    }
}

export class PolicyLoadError extends AuthorizationError {
    constructor(message = 'Failed to load authorization policies.', details?: any) {
        super(message, 500); // Internal error if policies can't be loaded
        this.name = 'PolicyLoadError';
        (this as any).details = details;
    }
}

// Add other specific errors as needed (e.g., InvalidInputContextError)

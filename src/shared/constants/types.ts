/**
 * Defines unique symbols used as injection tokens for dependency injection (tsyringe)
 * within the Authorization Service.
 */

export const TYPES = {
    Logger: Symbol.for('Logger'),
    ConfigService: Symbol.for('ConfigService'),
    AuthorizationService: Symbol.for('AuthorizationService'),
    PolicyRepository: Symbol.for('PolicyRepository'),
    PolicySourceAdapter: Symbol.for('PolicySourceAdapter'),
    PolicyService: Symbol.for('PolicyService'),
    RegoEngine: Symbol.for('RegoEngine'),
    CacheAdapter: Symbol.for('CacheAdapter'),
    EventBus: Symbol.for('EventBus'),

    // Middlewares
    ErrorMiddleware: Symbol.for('ErrorMiddleware'),
    ValidationMiddleware: Symbol.for('ValidationMiddleware'),
    RequestIdMiddleware: Symbol.for('RequestIdMiddleware'),
    RequestLoggerMiddleware: Symbol.for('RequestLoggerMiddleware'),

    // Controllers
    SystemController: Symbol.for('SystemController'),
    AuthorizationController: Symbol.for('AuthorizationController'),

    // Routes
    SystemRoutes: Symbol.for('SystemRoutes'),
    AuthorizationRoutes: Symbol.for('AuthorizationRoutes'),
};

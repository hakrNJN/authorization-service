/**
 * Defines unique symbols used as injection tokens for dependency injection (tsyringe)
 * within the Authorization Service.
 */
export const TYPES = {
    // Application Layer Interfaces / Ports
    Logger: Symbol.for('Logger'),
    ConfigService: Symbol.for('ConfigService'),
    AuthorizationService: Symbol.for('AuthorizationService'),
    PolicySourceAdapter: Symbol.for('PolicySourceAdapter'), // Optional

    // Infrastructure Layer Implementations (Usually not injected directly by type)
    // Example: OpaPolicyEngine: Symbol.for('OpaPolicyEngine'),
    // Example: CaslAbilityFactory: Symbol.for('CaslAbilityFactory'),

    // API Layer (Controllers - if needed)
    AuthorizationController: Symbol.for('AuthorizationController'), // If exposing an API
    SystemController: Symbol.for('SystemController'),

    // Add other tokens as needed
};

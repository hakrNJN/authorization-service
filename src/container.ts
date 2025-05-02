import { container } from 'tsyringe';
import { TYPES } from './shared/constants/types';

// --- Import Interfaces ---
import { IAuthorizationService } from './application/interfaces/IAuthorizationService';
import { IConfigService } from './application/interfaces/IConfigService';
import { ILogger } from './application/interfaces/ILogger';
import { IPolicySourceAdapter } from './application/interfaces/IPolicySourceAdapter'; // Import new interface

// --- Import Implementations ---
// Infrastructure
import { HttpPolicySourceAdapter } from './infrastructure/adapters/HttpPolicySourceAdapter'; // Import new adapter
import { EnvironmentConfigService } from './infrastructure/config/EnvironmentConfigService';
import { WinstonLogger } from './infrastructure/logging/WinstonLogger';
// Application Services
import { AuthorizationService } from './application/services/authorization.service';

// --- Register Infrastructure Services ---
container.registerSingleton<ILogger>(TYPES.Logger, WinstonLogger);
container.registerSingleton<IConfigService>(TYPES.ConfigService, EnvironmentConfigService);

// --- Register Adapters ---
// Register the implementation for fetching policy data
container.registerSingleton<IPolicySourceAdapter>(TYPES.PolicySourceAdapter, HttpPolicySourceAdapter);

// --- Register Application Services ---
container.registerSingleton<IAuthorizationService>(TYPES.AuthorizationService, AuthorizationService);

// --- Register Controllers (if needed) ---
// Ensure controllers are decorated with @injectable()
// import { AuthorizationController } from './api/controllers/authorization.controller';
// import { SystemController } from './api/controllers/system.controller';

// Export the configured container
export { container };

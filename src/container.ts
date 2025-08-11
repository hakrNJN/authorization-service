import { container } from 'tsyringe';
import { TYPES } from './shared/constants/types';

// --- Import Interfaces ---
import { IAuthorizationService } from './application/interfaces/IAuthorizationService';
import { IConfigService } from './application/interfaces/IConfigService';
import { ILogger } from './application/interfaces/ILogger';
import { IPolicySourceAdapter } from './application/interfaces/IPolicySourceAdapter'; // Import new interface
import { IRegoEngine } from './application/interfaces/IRegoEngine';

// --- Import Implementations ---
// Infrastructure
import { HttpPolicySourceAdapter } from './infrastructure/adapters/HttpPolicySourceAdapter'; // Import new adapter
import { EnvironmentConfigService } from './infrastructure/config/EnvironmentConfigService';
import { WinstonLogger } from './infrastructure/logging/WinstonLogger';
import { OpaWasmEngine } from './infrastructure/policy-engine/OpaWasmEngine';
import { OpaExternalEngine } from './infrastructure/policy-engine/OpaExternalEngine';
// Application Services
import { AuthorizationService } from './application/services/authorization.service';

// --- Register Infrastructure Services ---
container.registerSingleton<ILogger>(TYPES.Logger, WinstonLogger);
const configService = container.resolve<IConfigService>(TYPES.ConfigService);
container.registerSingleton<IConfigService>(TYPES.ConfigService, EnvironmentConfigService);

// --- Register Adapters ---
// Register the implementation for fetching policy data
container.registerSingleton<IPolicySourceAdapter>(TYPES.PolicySourceAdapter, HttpPolicySourceAdapter);

// --- Register Application Services ---
container.registerSingleton<IAuthorizationService>(TYPES.AuthorizationService, AuthorizationService);

// Conditional Rego Engine Registration
const regoEngineMode = configService.get<string>('REGO_ENGINE_MODE', 'wasm'); // Default to wasm

if (regoEngineMode === 'wasm') {
    container.registerSingleton<IRegoEngine>(TYPES.RegoEngine, OpaWasmEngine);
} else if (regoEngineMode === 'external') {
    container.registerSingleton<IRegoEngine>(TYPES.RegoEngine, OpaExternalEngine);
} else {
    throw new Error(`Invalid REGO_ENGINE_MODE: ${regoEngineMode}`);
}

// --- Register Controllers (if needed) ---
// Ensure controllers are decorated with @injectable()
// import { AuthorizationController } from './api/controllers/authorization.controller';
// import { SystemController } from './api/controllers/system.controller';

// Export the configured container
export { container };

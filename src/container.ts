import { container } from 'tsyringe';
import { TYPES } from './shared/constants/types';

// --- Import Interfaces ---
import { IAuthorizationService } from './application/interfaces/IAuthorizationService';
import { IConfigService } from './application/interfaces/IConfigService';
import { ILogger } from './application/interfaces/ILogger';
import { IPolicyRepository } from './application/interfaces/IPolicyRepository';
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
container.registerSingleton<IConfigService>(TYPES.ConfigService, EnvironmentConfigService);
const configService = container.resolve<IConfigService>(TYPES.ConfigService);

// --- Register Cache Adapter ---
import { ICacheAdapter } from './application/interfaces/ICacheAdapter';
import { createCacheAdapter } from './infrastructure/cache/CacheAdapterFactory';
import { EventBusFactory } from './infrastructure/events/EventBusFactory';
import { IEventBus } from './application/interfaces/IEventBus';
const logger = container.resolve<ILogger>(TYPES.Logger);
const cacheAdapter = createCacheAdapter(configService, logger);
container.registerInstance<ICacheAdapter>(TYPES.CacheAdapter, cacheAdapter);

// --- Register Event Bus ---
container.registerSingleton(EventBusFactory);
container.register<IEventBus>(TYPES.EventBus, {
    useFactory: () => {
        return EventBusFactory.createEventBus();
    }
});

// --- Register Adapters ---
// Register the implementation for fetching policy data - FIXED: Binding to PolicyRepository
container.registerSingleton<IPolicyRepository>(TYPES.PolicyRepository, HttpPolicySourceAdapter);

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

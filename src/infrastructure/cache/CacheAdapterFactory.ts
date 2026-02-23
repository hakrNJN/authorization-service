import { ICacheAdapter } from '../../application/interfaces/ICacheAdapter';
import { IConfigService } from '../../application/interfaces/IConfigService';
import { ILogger } from '../../application/interfaces/ILogger';
import { InMemoryCacheAdapter } from './InMemoryCacheAdapter';

/**
 * Supported cache provider types, selected via CACHE_PROVIDER env var.
 */
export type CacheProviderType = 'IN_MEMORY' | 'POSTGRES' | 'REDIS';

/**
 * Factory that creates the appropriate ICacheAdapter based on configuration.
 * Reads CACHE_PROVIDER and CACHE_DEFAULT_TTL_MS from the config service.
 *
 * Supported providers:
 * - IN_MEMORY (default): Standard Map-based cache for local dev / single instance.
 * - POSTGRES: Uses a PostgreSQL table for shared cache across instances.
 * - REDIS: Uses Redis for high-scale distributed caching.
 */
export function createCacheAdapter(
    configService: IConfigService,
    logger: ILogger
): ICacheAdapter {
    const provider = (configService.get<string>('CACHE_PROVIDER', 'IN_MEMORY') || 'IN_MEMORY').toUpperCase() as CacheProviderType;
    const defaultTtlMs = configService.getNumber('CACHE_DEFAULT_TTL_MS', 60_000) ?? 60_000;

    logger.info(`Initializing cache adapter: ${provider} (TTL: ${defaultTtlMs}ms)`);

    switch (provider) {
        case 'IN_MEMORY':
            return new InMemoryCacheAdapter(defaultTtlMs);

        case 'POSTGRES': {
            // Lazy-load to avoid requiring 'pg' when not using Postgres cache
            const { PostgresCacheAdapter } = require('./PostgresCacheAdapter');
            return new PostgresCacheAdapter(configService, logger, defaultTtlMs);
        }

        case 'REDIS': {
            // Lazy-load to avoid requiring 'ioredis' when not using Redis cache
            const { RedisCacheAdapter } = require('./RedisCacheAdapter');
            return new RedisCacheAdapter(configService, logger, defaultTtlMs);
        }

        default:
            logger.warn(`Unknown CACHE_PROVIDER "${provider}", falling back to IN_MEMORY`);
            return new InMemoryCacheAdapter(defaultTtlMs);
    }
}

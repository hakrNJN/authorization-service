import { ICacheAdapter } from '../../application/interfaces/ICacheAdapter';
import { IConfigService } from '../../application/interfaces/IConfigService';
import { ILogger } from '../../application/interfaces/ILogger';

/**
 * Redis-backed cache adapter for high-scale production deployments.
 * Uses ioredis with JSON serialization and millisecond-precision TTL.
 *
 * Required env vars: REDIS_CACHE_URL (or REDIS_CACHE_HOST + REDIS_CACHE_PORT)
 */
export class RedisCacheAdapter implements ICacheAdapter {
    private client: any; // Redis client - typed as any to keep ioredis as optional dep
    private readonly defaultTtlMs: number;

    constructor(
        private configService: IConfigService,
        private logger: ILogger,
        defaultTtlMs: number = 60_000
    ) {
        this.defaultTtlMs = defaultTtlMs;

        const Redis = require('ioredis');
        const redisUrl = this.configService.get<string>('REDIS_CACHE_URL', '');

        if (redisUrl) {
            this.client = new Redis(redisUrl);
        } else {
            this.client = new Redis({
                host: this.configService.get<string>('REDIS_CACHE_HOST', 'localhost'),
                port: this.configService.getNumber?.('REDIS_CACHE_PORT', 6379) ?? 6379,
                password: this.configService.get<string>('REDIS_CACHE_PASSWORD', '') || undefined,
                db: this.configService.getNumber?.('REDIS_CACHE_DB', 0) ?? 0,
                maxRetriesPerRequest: 3,
                retryStrategy: (times: number) => Math.min(times * 200, 2000),
            });
        }

        this.client.on('connect', () => this.logger.info('RedisCacheAdapter: Connected'));
        this.client.on('error', (err: Error) => this.logger.error('RedisCacheAdapter: Connection error', err));

        this.logger.info('RedisCacheAdapter initialized');
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const raw = await this.client.get(key);
            if (raw === null) return null;
            return JSON.parse(raw) as T;
        } catch (error: any) {
            this.logger.error(`RedisCacheAdapter: Error getting key "${key}"`, error);
            return null; // Degrade gracefully
        }
    }

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        const ttl = ttlMs ?? this.defaultTtlMs;
        try {
            const serialized = JSON.stringify(value);
            // PX = millisecond precision TTL
            await this.client.set(key, serialized, 'PX', ttl);
        } catch (error: any) {
            this.logger.error(`RedisCacheAdapter: Error setting key "${key}"`, error);
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(key);
            return result > 0;
        } catch (error: any) {
            this.logger.error(`RedisCacheAdapter: Error deleting key "${key}"`, error);
            return false;
        }
    }

    async clear(): Promise<void> {
        try {
            // Use FLUSHDB to clear all keys in the current database
            await this.client.flushdb();
            this.logger.info('RedisCacheAdapter: All cache entries cleared');
        } catch (error: any) {
            this.logger.error('RedisCacheAdapter: Error clearing cache', error);
        }
    }
}

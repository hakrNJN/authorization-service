import { ICacheAdapter } from '../../application/interfaces/ICacheAdapter';
import { IConfigService } from '../../application/interfaces/IConfigService';
import { ILogger } from '../../application/interfaces/ILogger';

/**
 * PostgreSQL-backed cache adapter for medium-scale deployments.
 * Uses a `policy_cache` table with JSONB values and timestamp-based expiration.
 * Auto-creates the table on first use if it doesn't exist.
 *
 * Required env vars: PG_CACHE_HOST, PG_CACHE_PORT, PG_CACHE_DB, PG_CACHE_USER, PG_CACHE_PASSWORD
 */
export class PostgresCacheAdapter implements ICacheAdapter {
    private pool: any; // pg.Pool - typed as any to keep pg as optional dep
    private readonly defaultTtlMs: number;
    private initialized = false;

    constructor(
        private configService: IConfigService,
        private logger: ILogger,
        defaultTtlMs: number = 60_000
    ) {
        this.defaultTtlMs = defaultTtlMs;

        // Lazy-initialize the pool
        const { Pool } = require('pg');
        this.pool = new Pool({
            host: this.configService.get<string>('PG_CACHE_HOST', 'localhost'),
            port: this.configService.getNumber?.('PG_CACHE_PORT', 5432) ?? 5432,
            database: this.configService.get<string>('PG_CACHE_DB', 'pbac_cache'),
            user: this.configService.get<string>('PG_CACHE_USER', 'postgres'),
            password: this.configService.get<string>('PG_CACHE_PASSWORD', ''),
            max: 5, // Small pool for cache operations
            idleTimeoutMillis: 30_000,
        });

        this.logger.info('PostgresCacheAdapter initialized');
    }

    private async ensureTable(): Promise<void> {
        if (this.initialized) return;
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS policy_cache (
                    key VARCHAR(255) PRIMARY KEY,
                    value JSONB NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_policy_cache_expires ON policy_cache (expires_at);
            `);
            this.initialized = true;
            this.logger.info('PostgresCacheAdapter: policy_cache table ensured');
        } catch (error: any) {
            this.logger.error('PostgresCacheAdapter: Failed to create policy_cache table', error);
            throw error;
        }
    }

    async get<T>(key: string): Promise<T | null> {
        await this.ensureTable();
        try {
            const result = await this.pool.query(
                'SELECT value FROM policy_cache WHERE key = $1 AND expires_at > NOW()',
                [key]
            );
            if (result.rows.length === 0) return null;
            return result.rows[0].value as T;
        } catch (error: any) {
            this.logger.error(`PostgresCacheAdapter: Error getting key "${key}"`, error);
            return null; // Degrade gracefully — treat cache miss as no data
        }
    }

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        await this.ensureTable();
        const ttl = ttlMs ?? this.defaultTtlMs;
        const expiresAt = new Date(Date.now() + ttl);

        try {
            await this.pool.query(
                `INSERT INTO policy_cache (key, value, expires_at)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3`,
                [key, JSON.stringify(value), expiresAt]
            );
        } catch (error: any) {
            this.logger.error(`PostgresCacheAdapter: Error setting key "${key}"`, error);
        }
    }

    async delete(key: string): Promise<boolean> {
        await this.ensureTable();
        try {
            const result = await this.pool.query(
                'DELETE FROM policy_cache WHERE key = $1',
                [key]
            );
            return result.rowCount > 0;
        } catch (error: any) {
            this.logger.error(`PostgresCacheAdapter: Error deleting key "${key}"`, error);
            return false;
        }
    }

    async clear(): Promise<void> {
        await this.ensureTable();
        try {
            await this.pool.query('DELETE FROM policy_cache');
            this.logger.info('PostgresCacheAdapter: All cache entries cleared');
        } catch (error: any) {
            this.logger.error('PostgresCacheAdapter: Error clearing cache', error);
        }
    }
}

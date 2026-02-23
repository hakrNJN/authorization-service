import { ICacheAdapter } from '../../application/interfaces/ICacheAdapter';

interface CacheEntry<T = any> {
    value: T;
    expiresAt: number; // Unix timestamp in ms
}

/**
 * In-memory cache adapter using a standard Map.
 * Suitable for local development and single-instance deployments.
 * Lazy-evicts expired entries on get().
 */
export class InMemoryCacheAdapter implements ICacheAdapter {
    private readonly store = new Map<string, CacheEntry>();
    private readonly defaultTtlMs: number;

    constructor(defaultTtlMs: number = 60_000) {
        this.defaultTtlMs = defaultTtlMs;
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.store.get(key);
        if (!entry) return null;

        // Lazy eviction: check if expired
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        const ttl = ttlMs ?? this.defaultTtlMs;
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttl,
        });
    }

    async delete(key: string): Promise<boolean> {
        return this.store.delete(key);
    }

    async clear(): Promise<void> {
        this.store.clear();
    }
}

/**
 * Defines the contract for a pluggable cache adapter.
 * Implementations can use In-Memory, PostgreSQL, Redis, or any other backing store.
 * All operations are async to support distributed cache backends.
 */
export interface ICacheAdapter {
    /**
     * Retrieve a cached value by key.
     * @returns The cached value, or null if not found or expired.
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Store a value in the cache.
     * @param key - Cache key.
     * @param value - Value to cache (must be JSON-serializable for distributed backends).
     * @param ttlMs - Time-to-live in milliseconds. If omitted, uses the adapter's default TTL.
     */
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

    /**
     * Delete a specific cache entry.
     * @returns true if the key existed and was deleted, false otherwise.
     */
    delete(key: string): Promise<boolean>;

    /**
     * Clear all entries managed by this adapter.
     */
    clear(): Promise<void>;
}

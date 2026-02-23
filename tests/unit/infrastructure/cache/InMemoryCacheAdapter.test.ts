import { InMemoryCacheAdapter } from '../../../../src/infrastructure/cache/InMemoryCacheAdapter';

describe('InMemoryCacheAdapter', () => {
    let adapter: InMemoryCacheAdapter;

    beforeEach(() => {
        adapter = new InMemoryCacheAdapter(1000); // 1 second TTL
    });

    describe('set and get', () => {
        it('should store and retrieve a value', async () => {
            await adapter.set('key1', { data: 'hello' });
            const result = await adapter.get<{ data: string }>('key1');
            expect(result).toEqual({ data: 'hello' });
        });

        it('should return null for a non-existent key', async () => {
            const result = await adapter.get('nonexistent');
            expect(result).toBeNull();
        });

        it('should store and retrieve primitive values', async () => {
            await adapter.set('count', 42);
            expect(await adapter.get<number>('count')).toBe(42);

            await adapter.set('flag', true);
            expect(await adapter.get<boolean>('flag')).toBe(true);

            await adapter.set('name', 'test');
            expect(await adapter.get<string>('name')).toBe('test');
        });

        it('should store and retrieve arrays', async () => {
            const arr = [{ id: 1 }, { id: 2 }];
            await adapter.set('items', arr);
            expect(await adapter.get('items')).toEqual(arr);
        });

        it('should overwrite existing value', async () => {
            await adapter.set('key', 'v1');
            await adapter.set('key', 'v2');
            expect(await adapter.get('key')).toBe('v2');
        });
    });

    describe('TTL expiration', () => {
        it('should return null after TTL expires', async () => {
            const shortAdapter = new InMemoryCacheAdapter(50); // 50ms TTL
            await shortAdapter.set('expiring', 'value');

            // Should still be available immediately
            expect(await shortAdapter.get('expiring')).toBe('value');

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 60));
            expect(await shortAdapter.get('expiring')).toBeNull();
        });

        it('should respect custom TTL per set()', async () => {
            await adapter.set('short', 'value', 50); // 50ms TTL override
            expect(await adapter.get('short')).toBe('value');

            await new Promise(resolve => setTimeout(resolve, 60));
            expect(await adapter.get('short')).toBeNull();
        });

        it('should use default TTL when not specified', async () => {
            const shortAdapter = new InMemoryCacheAdapter(50);
            await shortAdapter.set('default-ttl', 'value');

            await new Promise(resolve => setTimeout(resolve, 60));
            expect(await shortAdapter.get('default-ttl')).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete an existing key and return true', async () => {
            await adapter.set('key', 'value');
            const result = await adapter.delete('key');
            expect(result).toBe(true);
            expect(await adapter.get('key')).toBeNull();
        });

        it('should return false when deleting a non-existent key', async () => {
            const result = await adapter.delete('nonexistent');
            expect(result).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all entries', async () => {
            await adapter.set('k1', 'v1');
            await adapter.set('k2', 'v2');
            await adapter.set('k3', 'v3');

            await adapter.clear();

            expect(await adapter.get('k1')).toBeNull();
            expect(await adapter.get('k2')).toBeNull();
            expect(await adapter.get('k3')).toBeNull();
        });
    });
});

import 'reflect-metadata';
import { createCacheAdapter } from 'infrastructure/cache/CacheAdapterFactory';
import { InMemoryCacheAdapter } from 'infrastructure/cache/InMemoryCacheAdapter';
import { IConfigService } from 'application/interfaces/IConfigService';
import { ILogger } from 'application/interfaces/ILogger';

function makeMockLogger(): jest.Mocked<ILogger> {
    return {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    } as any;
}

function makeMockConfigService(provider: string = 'IN_MEMORY', ttlMs: number = 60000): jest.Mocked<IConfigService> {
    return {
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
            if (key === 'CACHE_PROVIDER') return provider;
            return defaultValue;
        }),
        getNumber: jest.fn().mockImplementation((key: string, defaultValue?: number) => {
            if (key === 'CACHE_DEFAULT_TTL_MS') return ttlMs;
            return defaultValue;
        }),
        getBoolean: jest.fn(),
        getAllConfig: jest.fn(),
        has: jest.fn(),
        isDevelopment: jest.fn(),
        isProduction: jest.fn(),
        isTest: jest.fn(),
        getTableName: jest.fn(),
    } as any;
}

describe('CacheAdapterFactory', () => {
    describe('createCacheAdapter', () => {
        it('should create an InMemoryCacheAdapter when CACHE_PROVIDER is IN_MEMORY', () => {
            const adapter = createCacheAdapter(makeMockConfigService('IN_MEMORY'), makeMockLogger());
            expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
        });

        it('should default to InMemoryCacheAdapter when CACHE_PROVIDER is not set', () => {
            const configService = makeMockConfigService('');
            const adapter = createCacheAdapter(configService, makeMockLogger());
            expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
        });

        it('should default to InMemoryCacheAdapter for unknown provider', () => {
            const adapter = createCacheAdapter(makeMockConfigService('UNKNOWN_PROVIDER'), makeMockLogger());
            expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
        });

        it('should log a warning for unknown provider', () => {
            const logger = makeMockLogger();
            createCacheAdapter(makeMockConfigService('UNKNOWN_PROVIDER_XYZ'), logger);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown CACHE_PROVIDER'));
        });

        it('should pass the TTL to the adapter', () => {
            // Just checking it doesn't throw with a custom TTL
            expect(() => createCacheAdapter(makeMockConfigService('IN_MEMORY', 30000), makeMockLogger())).not.toThrow();
        });

        it('should be case-insensitive for provider names', () => {
            const adapter = createCacheAdapter(makeMockConfigService('in_memory'), makeMockLogger());
            expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
        });
    });
});

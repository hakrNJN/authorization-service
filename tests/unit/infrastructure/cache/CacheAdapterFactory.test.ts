import { createCacheAdapter } from '../../../../src/infrastructure/cache/CacheAdapterFactory';
import { InMemoryCacheAdapter } from '../../../../src/infrastructure/cache/InMemoryCacheAdapter';
import { IConfigService } from '../../../../src/application/interfaces/IConfigService';
import { ILogger } from '../../../../src/application/interfaces/ILogger';

describe('CacheAdapterFactory', () => {
    let configServiceMock: jest.Mocked<IConfigService>;
    let loggerMock: jest.Mocked<ILogger>;

    beforeEach(() => {
        configServiceMock = {
            get: jest.fn(),
            getOrThrow: jest.fn(),
            getNumber: jest.fn(),
            getNumberOrThrow: jest.fn(),
            getBoolean: jest.fn(),
            getBooleanOrThrow: jest.fn(),
            isDevelopment: jest.fn(),
            isProduction: jest.fn(),
            isTest: jest.fn(),
            getAllConfig: jest.fn(),
            has: jest.fn(),
        } as any;

        loggerMock = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        };
    });

    it('should create InMemoryCacheAdapter by default', () => {
        configServiceMock.get.mockReturnValue('IN_MEMORY');
        configServiceMock.getNumber.mockReturnValue(60_000);

        const adapter = createCacheAdapter(configServiceMock, loggerMock);

        expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('IN_MEMORY'));
    });

    it('should create InMemoryCacheAdapter when CACHE_PROVIDER is undefined', () => {
        configServiceMock.get.mockReturnValue(undefined);
        configServiceMock.getNumber.mockReturnValue(60_000);

        const adapter = createCacheAdapter(configServiceMock, loggerMock);

        expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
    });

    it('should be case-insensitive for provider name', () => {
        configServiceMock.get.mockReturnValue('in_memory');
        configServiceMock.getNumber.mockReturnValue(60_000);

        const adapter = createCacheAdapter(configServiceMock, loggerMock);

        expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
    });

    it('should fall back to InMemory for unknown provider', () => {
        configServiceMock.get.mockReturnValue('unknown_provider');
        configServiceMock.getNumber.mockReturnValue(60_000);

        const adapter = createCacheAdapter(configServiceMock, loggerMock);

        expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown CACHE_PROVIDER'));
    });

    it('should use custom TTL from config', () => {
        configServiceMock.get.mockReturnValue('IN_MEMORY');
        configServiceMock.getNumber.mockReturnValue(120_000);

        const adapter = createCacheAdapter(configServiceMock, loggerMock);

        expect(adapter).toBeInstanceOf(InMemoryCacheAdapter);
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('120000ms'));
    });
});

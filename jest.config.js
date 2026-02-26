const dotenv = require('dotenv');
dotenv.config({ path: '.env.test', override: true });

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests/unit'],
    testMatch: [
        '**/tests/unit/**/*.test.ts',
        '**/tests/unit/**/*.spec.ts',
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        '!src/main.ts',
        '!src/container.ts',
        '!src/**/index.ts',
        '!src/**/*.d.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'lcov'],
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
    moduleNameMapper: {
        "^application/(.*)$": "<rootDir>/src/application/$1",
        "^domain/(.*)$": "<rootDir>/src/domain/$1",
        "^infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
        "^shared/(.*)$": "<rootDir>/src/shared/$1",
        "^api/(.*)$": "<rootDir>/src/api/$1"
    },
    clearMocks: true,
    resetMocks: false,
    restoreMocks: true,
    maxWorkers: 1,
};

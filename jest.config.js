/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: [
        '**/tests/**/*.test.ts',
        '**/tests/**/*.spec.ts',
        '**/?(*.)+(spec|test).ts',
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8', // Or 'babel' if you prefer
    coverageReporters: ['text', 'lcov', 'clover'],
    // Optional: Setup files to run before each test file
    // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    // Optional: Module name mapping for aliases in tsconfig.json
    // moduleNameMapper: {
    //   '^@/(.*)$': '<rootDir>/src/$1',
    // },
    verbose: true,
    clearMocks: true,
};

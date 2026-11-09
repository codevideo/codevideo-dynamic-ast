export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        // Serialized into a compiler worker: coverage instrumentation cannot travel across threads.
        // Its behavior is exercised through real compiler integration tests.
        '!src/utils/checkTypeScript.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
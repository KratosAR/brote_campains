/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/__tests__/**'],
  coverageThreshold: {
    global: { lines: 80 },
  },
}

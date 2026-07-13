/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/e2e'],
  testMatch: ['**/*.test.ts'],
  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.test.json' },
  },
  testTimeout: 30000,
  maxWorkers: 1,
}

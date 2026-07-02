/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.test.json' },
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/__tests__/**'],
  coverageThreshold: {
    global: { lines: 90 },
  },
}

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/game-core', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};

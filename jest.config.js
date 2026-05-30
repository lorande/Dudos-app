/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/game-core'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};

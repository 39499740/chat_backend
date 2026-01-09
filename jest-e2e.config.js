export default {
  displayName: 'e2e',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.e2e.ts'],
  roots: ['<rootDir>/test'],
  testTimeout: 60000,
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/mocks/uuid.mock.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid|minio|mysql2|redis|ioredis|@nestjs))'],
  coverageDirectory: '<rootDir>/coverage/e2e',
  coverageReporters: ['json', 'lcov', 'text', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts',
  ],
  verbose: true,
  testResultsProcessor: 'jest-junit',
};

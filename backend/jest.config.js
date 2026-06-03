/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir:              'src',
  testRegex:            '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        // Relaxed settings for tests — allow any, skip strict checks
        strict: false,
        esModuleInterop: true,
      },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory:   '../coverage',
  testEnvironment:     'node',
  // Don't fail CI if no tests found
  passWithNoTests:     true,
};

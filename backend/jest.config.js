/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir:              'src',
  testRegex:            '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      // Transpile only: type errors are caught by `tsc --noEmit` (CI build). Type-checking the huge generated
      // Prisma client in every test file made each suite take ~70 s and the run flaky on a busy machine.
      isolatedModules: true,
      diagnostics: false,
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
  testTimeout:         30000,
  // Leave CPU for the OS/IDE: running every core flat out is what made timing-sensitive tests flaky.
  maxWorkers:          '50%',
  // Don't fail CI if no tests found
  passWithNoTests:     true,
};

/**
 * Vitest configuration for integration tests.
 *
 * Separate from root vitest.config.ts — integration tests run via:
 *   pnpm test:integration
 *
 * NOT included in root projects array (they use Testcontainers which require
 * Docker and should not run alongside unit tests in CI).
 */
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 120000,
    globalSetup: ['tests/integration/globalSetup.ts'],
    sequence: {
      concurrent: false,
    },
    // No coverage thresholds — integration tests are about correctness, not coverage
  },
});

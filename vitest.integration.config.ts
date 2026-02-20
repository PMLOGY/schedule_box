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
import { resolve } from 'node:path';

// pnpm does not hoist drizzle-orm and postgres to root node_modules.
// They live in packages/database/node_modules/. Add explicit resolve.alias
// entries so Vite's module runner can find them at runtime (tsconfigPaths
// handles TypeScript type resolution but Vite still needs the runtime path).
const DB_MODULES = resolve(__dirname, 'packages/database/node_modules');

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.integration.json'] })],
  resolve: {
    alias: {
      'drizzle-orm': resolve(DB_MODULES, 'drizzle-orm'),
      postgres: resolve(DB_MODULES, 'postgres'),
    },
  },
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

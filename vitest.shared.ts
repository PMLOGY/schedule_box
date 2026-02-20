/**
 * Shared Vitest base configuration for all ScheduleBox workspace packages.
 * Each package imports and merges this with package-specific settings.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        '**/*.config.{js,ts,mjs}',
        '**/*.d.ts',
        '**/mocks/**',
        '**/__tests__/setup.*',
        // Barrel re-export files at package root src level only
        // Use package-specific coverage.exclude for finer control
        'src/index.ts',
      ],
    },
  },
});

import { defineProject, mergeConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import sharedConfig from '../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineProject({
    plugins: [tsconfigPaths()],
    test: {
      name: 'shared',
      include: ['src/**/*.test.ts'],
      environment: 'node',
      coverage: {
        // Instrument only the source files under test in this plan:
        // utils (pure functions) and schemas (Zod validation).
        // Type-only files, barrel re-exports, and test files are excluded.
        include: ['src/utils/**/*.ts', 'src/schemas/**/*.ts'],
        exclude: [
          'node_modules/**',
          '**/*.config.{js,ts,mjs}',
          '**/*.d.ts',
          '**/mocks/**',
          '**/__tests__/setup.*',
          'src/**/*.test.ts',
          // Barrel index files that only re-export (no runnable logic)
          'src/schemas/index.ts',
        ],
      },
    },
  }),
);

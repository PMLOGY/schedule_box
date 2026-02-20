import { defineProject, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import sharedConfig from '../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineProject({
    plugins: [react(), tsconfigPaths()],
    test: {
      name: 'web',
      environment: 'happy-dom',
      include: ['**/*.test.ts', '**/*.test.tsx'],
      exclude: ['node_modules', '.next', 'tests/e2e/**'],
    },
  }),
);

import { defineProject, mergeConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import sharedConfig from '../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineProject({
    plugins: [tsconfigPaths()],
    test: {
      name: 'notification-worker',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  }),
);

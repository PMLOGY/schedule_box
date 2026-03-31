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
      setupFiles: ['./vitest.setup.ts'],
      include: ['**/*.test.ts', '**/*.test.tsx'],
      exclude: ['node_modules', '.next', 'tests/e2e/**'],
      coverage: {
        exclude: [
          'node_modules/**',
          '**/*.config.{js,ts,mjs}',
          '**/*.d.ts',
          '**/mocks/**',
          '**/__tests__/setup.*',
          // Services pulled in transitively by tested modules but not directly under test
          'lib/waitlist/waitlist-service.ts',
          'lib/membership/membership-service.ts',
          'lib/push/push-service.ts',
          'lib/push/push-notifications.ts',
        ],
      },
    },
  }),
);

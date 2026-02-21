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
        // Instrument only the source files that have tests in this phase.
        // Other schema files (availability, loyalty, automation, etc.) will
        // be added to coverage incrementally as tests are written for them.
        include: [
          'src/utils/index.ts',
          'src/schemas/booking.ts',
          'src/schemas/payment.ts',
          'src/schemas/notification.ts',
        ],
        exclude: [
          'node_modules/**',
          '**/*.config.{js,ts,mjs}',
          '**/*.d.ts',
          '**/mocks/**',
          '**/__tests__/setup.*',
          'src/**/*.test.ts',
        ],
      },
    },
  }),
);

import { defineProject, mergeConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import sharedConfig from '../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineProject({
    plugins: [tsconfigPaths()],
    test: {
      name: 'events',
      include: ['src/**/*.test.ts'],
      environment: 'node',
      coverage: {
        // Instrument only event creator files that have unit tests.
        // publisher.ts contains RabbitMQ infrastructure (publishEvent, getChannel,
        // closeConnection) which require a live broker — integration test scope (Phase 17).
        // createCloudEvent and validateCloudEvent in publisher.ts are validated
        // indirectly via domain event creator tests (which call them internally).
        include: ['src/events/booking.ts', 'src/events/payment.ts'],
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

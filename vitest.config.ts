/**
 * Root Vitest configuration for ScheduleBox monorepo.
 * Uses projects array (Vitest 4.0 replacement for defineWorkspace).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/web',
      'packages/shared',
      'packages/events',
      'packages/database',
      'services/notification-worker',
    ],
  },
});

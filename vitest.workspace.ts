/**
 * Vitest workspace configuration for ScheduleBox monorepo.
 * Orchestrates test execution across all workspace packages.
 */
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace(['apps/*', 'packages/*', 'services/*']);

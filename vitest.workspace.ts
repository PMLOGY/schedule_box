/**
 * NOTE: In Vitest 4.0, defineWorkspace was removed in favor of the `projects` config
 * option in vitest.config.ts. This file is kept for reference; actual workspace
 * orchestration is configured in vitest.config.ts via the test.projects array.
 *
 * Migration reference:
 * - Old: defineWorkspace(['apps/*', 'packages/*', 'services/*']) in vitest.workspace.ts
 * - New: test.projects: [...] in vitest.config.ts
 *
 * See: https://vitest.dev/guide/projects
 */

// Re-export from vitest.config.ts for reference
export { default } from './vitest.config';

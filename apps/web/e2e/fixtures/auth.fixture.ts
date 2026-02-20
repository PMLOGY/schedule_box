import { test as base, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Custom test fixtures for authentication scenarios.
 *
 * Extends base Playwright test with:
 * - `authenticatedPage`: A page with pre-loaded auth storageState (for testing authenticated flows)
 * - `unauthenticatedPage`: A page with clean state (for testing login/register flows)
 *
 * @see https://playwright.dev/docs/test-fixtures
 */

type AuthFixtures = {
  /** Page with authenticated storageState loaded (test owner session) */
  authenticatedPage: Page;
  /** Page with clean browser state (no cookies/localStorage) */
  unauthenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  /**
   * Provides a page with the test owner's authenticated session.
   * Uses the storageState saved by auth.setup.ts.
   */
  authenticatedPage: async ({ browser }, use) => {
    const storageStatePath = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');

    const context: BrowserContext = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();

    await use(page);

    await context.close();
  },

  /**
   * Provides a page with no authentication state.
   * Useful for testing login, register, and unauthenticated flows.
   */
  unauthenticatedPage: async ({ browser }, use) => {
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();

    await use(page);

    await context.close();
  },
});

export { expect };

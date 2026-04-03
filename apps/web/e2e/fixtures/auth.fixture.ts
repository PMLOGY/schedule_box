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
   *
   * Works around Zustand persist hydration race: the useAuth hook may
   * redirect to /login before Zustand hydrates from localStorage. We
   * intercept this redirect and retry navigation after hydration.
   */
  authenticatedPage: async ({ browser }, use) => {
    const storageStatePath = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');

    const context: BrowserContext = await browser.newContext({
      storageState: storageStatePath,
    });

    const page = await context.newPage();

    // Monkey-patch page.goto to handle the auth redirect race condition.
    // The useAuth hook may redirect to /login before Zustand hydrates from localStorage.
    // We detect this and retry after giving time for hydration.
    const originalGoto = page.goto.bind(page);
    page.goto = async (url: string, options?: Parameters<Page['goto']>[1]) => {
      const response = await originalGoto(url, { waitUntil: 'networkidle', ...options });

      // Wait a moment for any client-side redirects to complete
      await page.waitForTimeout(1500);

      // If we got redirected to login due to hydration race, retry
      if (page.url().includes('/login') && !url.includes('/login')) {
        // localStorage data is already there from storageState — just wait for Zustand
        await page.waitForFunction(
          () => {
            try {
              const stored = localStorage.getItem('auth-storage');
              return !!JSON.parse(stored || '{}')?.state?.accessToken;
            } catch {
              return false;
            }
          },
          { timeout: 5000 },
        );

        // Second attempt: Zustand should hydrate faster since localStorage is warm
        const retryResponse = await originalGoto(url, { waitUntil: 'networkidle', ...options });
        await page.waitForTimeout(2000);

        // If still on login, try one more time
        if (page.url().includes('/login') && !url.includes('/login')) {
          return await originalGoto(url, { waitUntil: 'networkidle', ...options });
        }
        return retryResponse;
      }
      return response;
    };

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

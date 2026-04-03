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

    // Monkey-patch page.goto to handle:
    // 1. Zustand persist hydration race (redirect to /login before auth state loads)
    // 2. Onboarding popover dialog that overlays the page with its own "Další" button
    const originalGoto = page.goto.bind(page);
    page.goto = async (url: string, options?: Parameters<Page['goto']>[1]) => {
      const response = await originalGoto(url, { waitUntil: 'networkidle', ...options });

      // Wait a moment for any client-side redirects to complete
      await page.waitForTimeout(1500);

      // If we got redirected to login due to hydration race, retry
      if (page.url().includes('/login') && !url.includes('/login')) {
        await page.waitForFunction(
          () => {
            try {
              const stored = localStorage.getItem('schedulebox-auth');
              return !!JSON.parse(stored || '{}')?.state?.accessToken;
            } catch {
              return false;
            }
          },
          { timeout: 5000 },
        );

        const retryResponse = await originalGoto(url, { waitUntil: 'networkidle', ...options });
        await page.waitForTimeout(2000);

        if (page.url().includes('/login') && !url.includes('/login')) {
          return await originalGoto(url, { waitUntil: 'networkidle', ...options });
        }
        return retryResponse;
      }

      // Dismiss driver.js onboarding tour if present — its SVG overlay blocks all clicks
      const driverClose = page.locator('.driver-popover-close-btn');
      if (await driverClose.isVisible({ timeout: 1000 }).catch(() => false)) {
        await driverClose.first().click();
        await page.waitForTimeout(500);
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

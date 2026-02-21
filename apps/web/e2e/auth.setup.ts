import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

/**
 * Global auth setup: authenticate as test owner once, save storageState for reuse.
 *
 * All browser projects (chromium, firefox, webkit) depend on this setup project,
 * so login only runs once per test suite execution.
 *
 * The app uses next-intl with localePrefix: 'as-needed' and defaultLocale: 'cs',
 * so /login may or may not have a locale prefix. We use pattern matchers for URLs.
 *
 * @see https://playwright.dev/docs/auth
 */
setup('authenticate as test owner', async ({ page }) => {
  // Navigate to login page - handles locale redirect automatically
  await page.goto('/login');

  // Fill email using input type selector (reliable across locales)
  await page.locator('input[type="email"]').fill('test@example.com');

  // Fill password
  await page.locator('input[type="password"]').fill('password123');

  // Click submit button - matches Czech (Prihlasit), Slovak, and English (Sign in)
  await page.getByRole('button', { name: /prihlasit|sign in|submit/i }).click();

  // Wait for redirect away from login page
  await page.waitForURL('**/');

  // Verify we are no longer on the login page
  await expect(page.locator('body')).not.toContainText('login');

  // Persist authenticated state (cookies + localStorage + sessionStorage)
  await page.context().storageState({ path: authFile });
});

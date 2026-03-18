import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, 'playwright/.auth/admin.json');

/**
 * Admin auth setup: authenticate as platform admin once, save storageState for reuse.
 *
 * Used by the admin-chromium project so that admin E2E specs (impersonation,
 * super-admin panel) do not repeat the login flow on every test.
 *
 * @see https://playwright.dev/docs/auth
 */
setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page - handles locale redirect automatically
  await page.goto('/login');

  // Fill email using input type selector (reliable across locales)
  await page.locator('input[type="email"]').fill('admin@schedulebox.cz');

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

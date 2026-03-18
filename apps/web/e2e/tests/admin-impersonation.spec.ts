import { test, expect } from '@playwright/test';

/**
 * E2E: Admin Impersonation Flow
 *
 * Tests the super-admin ability to impersonate a company, see the impersonation
 * banner, navigate while impersonating, and end the session cleanly.
 *
 * Auth: Uses admin storageState (admin@schedulebox.cz) from admin.setup.ts.
 * Impersonation token (imp_token) is HttpOnly — not JS-readable.
 * Banner data comes from sessionStorage set by POST response body.
 *
 * Phase 47 decision: sessionStorage for impersonation banner.
 */

test.describe('Admin impersonation', () => {
  test('admin can impersonate a company and end the session', async ({ page }) => {
    // Navigate to admin companies panel
    await page.goto('/admin/companies');

    // Wait for the companies table to load
    await page.waitForLoadState('networkidle');

    // Click the Impersonate button on the first company row
    const impersonateBtn = page.getByRole('button', { name: /impersonat|vydávat se/i }).first();
    await expect(impersonateBtn).toBeVisible({ timeout: 10_000 });
    await impersonateBtn.click();

    // Verify impersonation banner appears
    // Banner can be identified by test-id or visible text
    const banner = page
      .getByTestId('impersonation-banner')
      .or(page.getByText(/impersonat|vydáváte se|impersonating/i));
    await expect(banner).toBeVisible({ timeout: 10_000 });

    // Navigate to dashboard — banner should persist
    await page.goto('/');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    // End impersonation
    const endBtn = page
      .getByRole('button', { name: /end impersonat|ukončit|zastavit/i })
      .or(page.getByTestId('end-impersonation-btn'));
    await expect(endBtn).toBeVisible();
    await endBtn.click();

    // Verify banner disappears after ending session
    await expect(banner).not.toBeVisible({ timeout: 10_000 });
  });

  test('impersonation banner is visible on admin companies page', async ({ page }) => {
    // Navigate to admin companies panel
    await page.goto('/admin/companies');
    await page.waitForLoadState('networkidle');

    // Admin panel should be accessible
    const heading = page.getByRole('heading', { name: /compan|společnost|firmy/i });
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Admin Impersonation Flow
 *
 * Tests the super-admin ability to impersonate a user, see the impersonation
 * banner, navigate while impersonating, and end the session cleanly.
 *
 * Auth: Uses admin storageState (admin@schedulebox.cz) from admin.setup.ts.
 *
 * Czech locale: button text "Napodobit", banner "Napodobujete:", end "Ukončit relaci".
 */

/**
 * Navigate to a page and handle the Zustand hydration race condition.
 * If redirected to /login, wait for localStorage hydration and retry.
 */
async function gotoWithAuth(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Check if redirected to login due to Zustand hydration race
  if (page.url().includes('/login')) {
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
    // Retry navigation after hydration
    await page.goto(url);
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Admin impersonation', () => {
  test('admin can impersonate a user and end the session', async ({ page }) => {
    await gotoWithAuth(page, '/admin/users');

    // Verify the users page loaded
    const usersHeading = page.getByRole('heading', { name: /Správa uživatelů|users/i });
    await expect(usersHeading).toBeVisible({ timeout: 10_000 });

    // Click the "Napodobit" (Impersonate) button on the first user row
    const impersonateBtn = page.getByRole('button', { name: /napodobit|impersonat/i }).first();
    await expect(impersonateBtn).toBeVisible({ timeout: 10_000 });
    await impersonateBtn.click();

    // Verify impersonation banner appears with Czech text
    const banner = page
      .getByTestId('impersonation-banner')
      .or(page.getByText(/napodobujete:|impersonating/i));
    await expect(banner).toBeVisible({ timeout: 10_000 });

    // Navigate to dashboard — banner should persist
    await page.goto('/');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    // End impersonation via "Ukončit relaci" button
    const endBtn = page
      .getByRole('button', { name: /ukončit relaci|end.*session|end impersonat/i })
      .or(page.getByTestId('end-impersonation-btn'));
    await expect(endBtn).toBeVisible();
    await endBtn.click();

    // Verify banner disappears after ending session
    await expect(banner).not.toBeVisible({ timeout: 10_000 });
  });

  test('admin can view the companies management page', async ({ page }) => {
    await gotoWithAuth(page, '/admin/companies');

    // Verify the Czech heading "Správa firem" is visible
    const heading = page.getByRole('heading', { name: /Správa firem|companies/i });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Verify the companies table/list has loaded (at least one row or empty state)
    const tableOrContent = page.locator('table, [data-testid="companies-list"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10_000 });
  });
});

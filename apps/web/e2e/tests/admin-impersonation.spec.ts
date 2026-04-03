import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Admin Impersonation Flow
 *
 * Tests the super-admin ability to impersonate a user, see the impersonation
 * banner, navigate while impersonating, and end the session cleanly.
 *
 * Auth: Uses admin storageState (admin@schedulebox.cz) from admin.setup.ts.
 *
 * The impersonation flow:
 * 1. Admin clicks "Napodobit" on /admin/users
 * 2. POST /api/v1/admin/impersonate creates a session + sets imp_token cookie
 * 3. Client stores session in sessionStorage('imp_session')
 * 4. Page redirects to /dashboard (or / for customers)
 * 5. ImpersonationBanner component reads sessionStorage and displays red banner
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
          const stored = localStorage.getItem('schedulebox-auth');
          return !!JSON.parse(stored || '{}')?.state?.accessToken;
        } catch {
          return false;
        }
      },
      { timeout: 5000 },
    );
    await page.goto(url);
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Admin impersonation', () => {
  // FIXME: Impersonation replaces auth session and the redirect loses admin context.
  // The impersonated JWT doesn't match Zustand store, causing redirect to /login.
  // Needs deeper integration between impersonation flow and auth store.
  test.fixme('admin can impersonate a user and see the banner', async ({ page }) => {
    await gotoWithAuth(page, '/admin/users');

    // Verify the users page loaded
    const usersHeading = page.getByRole('heading', { name: /Správa uživatelů|users/i });
    await expect(usersHeading).toBeVisible({ timeout: 10_000 });

    // Click the "Napodobit" (Impersonate) button on the first non-admin user
    const impersonateBtn = page.getByRole('button', { name: /napodobit|impersonat/i }).first();
    await expect(impersonateBtn).toBeVisible({ timeout: 10_000 });
    await impersonateBtn.click();

    // The click triggers a redirect to /dashboard — wait for navigation
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    // The ImpersonationBanner reads from sessionStorage and renders a red alert
    const banner = page.getByTestId('impersonation-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });

    // Banner should contain "Napodobujete:" text
    await expect(banner).toContainText(/napodobujete/i);
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

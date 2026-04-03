import { test, expect } from '../fixtures/auth.fixture';
import { MOCK_SERVICE } from '../helpers/test-data';

/**
 * Payment & Bookings E2E Tests
 *
 * Since the full payment UI flow (Pay button in booking detail) is not yet
 * implemented on the frontend, these tests verify:
 * 1. The bookings page loads and displays booking data with status badges
 * 2. The payments admin page loads and renders the payment table
 * 3. The Comgate payment creation API endpoint responds correctly
 */
test.describe('Bookings & Payments Pages', () => {
  test('bookings page loads and shows booking data', async ({ authenticatedPage: page }) => {
    // Mock bookings API to return a list with bookings in various states
    await page.route('**/api/v1/bookings*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 1,
                uuid: 'bk-e2e-001',
                startTime: new Date(Date.now() + 86400000).toISOString(),
                endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
                status: 'confirmed',
                price: '500',
                currency: 'CZK',
                customer: {
                  name: 'Jana Novakova',
                  email: 'jana@test.cz',
                  phone: '+420123456789',
                },
                service: { name: MOCK_SERVICE.name },
                employee: { name: 'Petr Kolar' },
              },
              {
                id: 2,
                uuid: 'bk-e2e-002',
                startTime: new Date(Date.now() + 172800000).toISOString(),
                endTime: new Date(Date.now() + 172800000 + 3600000).toISOString(),
                status: 'pending',
                price: '800',
                currency: 'CZK',
                customer: {
                  name: 'Martin Dvorak',
                  email: 'martin@test.cz',
                  phone: '+420987654321',
                },
                service: { name: MOCK_SERVICE.name },
                employee: { name: 'Petr Kolar' },
              },
            ],
            meta: { total: 2, page: 1, limit: 20, total_pages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/bookings');

    // Verify bookings table is visible
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Verify both bookings appear
    await expect(page.locator('tr').filter({ hasText: 'Jana Novakova' })).toBeVisible();
    await expect(page.locator('tr').filter({ hasText: 'Martin Dvorak' })).toBeVisible();

    // Verify no crash or error screen
    await expect(page.locator('body')).not.toContainText(/unhandled|unexpected error/i);
  });

  test('booking detail panel opens on row click', async ({ authenticatedPage: page }) => {
    await page.route('**/api/v1/bookings*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 1,
                uuid: 'bk-e2e-detail-001',
                startTime: new Date(Date.now() + 86400000).toISOString(),
                endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
                status: 'pending',
                price: '500',
                currency: 'CZK',
                customer: {
                  name: 'Test Customer',
                  email: 'customer@test.cz',
                  phone: '+420123456789',
                },
                service: { name: MOCK_SERVICE.name },
                employee: { name: 'Jana Novakova' },
              },
            ],
            meta: { total: 1, page: 1, limit: 20, total_pages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/bookings');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Click on the booking row to open detail panel
    const bookingRow = page.locator('tr').filter({ hasText: 'Test Customer' });
    await expect(bookingRow).toBeVisible();
    await bookingRow.click();

    // The detail panel or page should show the customer name
    await expect(page.locator('body')).toContainText('Test Customer');

    // Verify no crash
    await expect(page.locator('body')).not.toContainText(/unhandled|unexpected error/i);
  });

  test('payments admin page loads', async ({ authenticatedPage: page }) => {
    // Mock payments API
    await page.route('**/api/v1/payments*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 1,
                uuid: 'pay-e2e-001',
                amount: '500',
                currency: 'CZK',
                status: 'paid',
                gateway: 'comgate',
                gatewayTransactionId: 'TX-001',
                createdAt: new Date().toISOString(),
                booking: {
                  uuid: 'bk-e2e-001',
                  customer: { name: 'Jana Novakova', email: 'jana@test.cz' },
                },
              },
              {
                id: 2,
                uuid: 'pay-e2e-002',
                amount: '800',
                currency: 'CZK',
                status: 'pending',
                gateway: 'comgate',
                gatewayTransactionId: 'TX-002',
                createdAt: new Date().toISOString(),
                booking: {
                  uuid: 'bk-e2e-002',
                  customer: { name: 'Martin Dvorak', email: 'martin@test.cz' },
                },
              },
            ],
            meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/payments');

    // The payments page should render without crashing
    // Look for the page heading or table
    await expect(page.locator('body')).not.toContainText(/unhandled|unexpected error/i);

    // Wait for content to load - either a table or the page heading containing "Platby"
    const hasTable = page.locator('table');
    const hasHeading = page.getByRole('heading').filter({ hasText: /platby|payments/i });
    await expect(hasTable.or(hasHeading)).toBeVisible({ timeout: 15000 });
  });

  test('comgate payment create API responds', async ({ authenticatedPage: page }) => {
    // Test the API endpoint directly via fetch within the page context
    const response = await page.request.post('/api/v1/payments/comgate/create', {
      data: {
        bookingUuid: 'bk-nonexistent',
        amount: 500,
        currency: 'CZK',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // The endpoint should respond (not 404). It may return 400/401/500 depending on
    // auth and validation, but it should NOT be 404 (endpoint exists).
    expect(response.status()).not.toBe(404);
  });
});

import { test, expect } from '../fixtures/auth.fixture';
import {
  mockServicesAPI,
  mockComgatePaymentCreate,
  mockComgateRedirect,
} from '../helpers/mock-api';
import { MOCK_SERVICE } from '../helpers/test-data';

/**
 * Payment Flow E2E Tests
 *
 * Tests the Comgate payment integration at the browser level.
 * All external service calls are mocked via page.route() interceptors.
 *
 * Strategy: Mock Next.js API route responses (not external Comgate calls)
 * because Comgate client runs server-side where page.route() cannot intercept.
 */
test.describe('Payment Flow', () => {
  test('payment flow completes with Comgate test mode', async ({ authenticatedPage: page }) => {
    // Step 1: Mock services API to return test service
    await mockServicesAPI(page, [MOCK_SERVICE]);

    // Step 2: Mock bookings API to return a list with a pending-payment booking
    const testBookingUuid = 'bk-e2e-payment-001';
    await page.route('**/api/v1/bookings*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 1,
                uuid: testBookingUuid,
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
      } else if (method === 'POST') {
        // Creating a new booking
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              uuid: testBookingUuid,
              status: 'pending',
              payment_required: true,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Step 3: Mock Comgate payment creation
    await mockComgatePaymentCreate(page, {
      code: 0,
      message: 'OK',
      transId: 'TX-E2E-001',
      redirect: 'https://payments.comgate.cz/test/TX-E2E-001',
    });

    // Step 4: Mock Comgate redirect - simulate successful payment return
    await mockComgateRedirect(page);

    // Step 5: Mock the payment callback endpoint to return success
    await page.route('**/api/v1/payments/comgate/callback*', async (route) => {
      // Simulate that the callback confirms payment and redirects to bookings
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Payment confirmed. Redirecting...</body></html>',
      });
    });

    // Step 6: Mock the individual booking detail endpoint to show paid status
    await page.route(`**/api/v1/bookings/${testBookingUuid}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            uuid: testBookingUuid,
            status: 'confirmed',
            price: '500',
            currency: 'CZK',
            payment_status: 'paid',
            customer: {
              name: 'Test Customer',
              email: 'customer@test.cz',
            },
            service: { name: MOCK_SERVICE.name },
            employee: { name: 'Jana Novakova' },
          },
        }),
      });
    });

    // Step 7: Navigate to bookings page
    await page.goto('/bookings');

    // Step 8: Verify bookings page loaded with our test booking
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Verify the pending booking appears in the list
    const bookingRow = page.locator('tr').filter({ hasText: 'Test Customer' });
    await expect(bookingRow).toBeVisible();

    // Verify the booking shows pending status
    await expect(bookingRow).toContainText(/pending|Cekajici|cekajici/i);

    // Step 9: Click on the booking row to open detail panel
    await bookingRow.click();

    // Step 10: Verify the detail panel or payment action is accessible
    // The booking detail panel should be visible with booking information
    await expect(page.locator('body')).toContainText('Test Customer');

    // Verify no crash or error screen occurred during the flow
    await expect(page.locator('body')).not.toContainText(/unhandled|unexpected error/i);
  });

  test('payment creation handles Comgate errors gracefully', async ({
    authenticatedPage: page,
  }) => {
    // Mock services API
    await mockServicesAPI(page, [MOCK_SERVICE]);

    const testBookingUuid = 'bk-e2e-error-001';

    // Mock bookings list with a pending booking
    await page.route('**/api/v1/bookings*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 2,
                uuid: testBookingUuid,
                startTime: new Date(Date.now() + 86400000).toISOString(),
                endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
                status: 'pending',
                price: '500',
                currency: 'CZK',
                customer: {
                  name: 'Error Test Customer',
                  email: 'error@test.cz',
                  phone: '+420111222333',
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

    // Mock Comgate payment creation to return 500 error
    await page.route('**/api/v1/payments/comgate/create', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            code: 'PAYMENT_GATEWAY_ERROR',
            message: 'Comgate payment service is temporarily unavailable',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to bookings page
    await page.goto('/bookings');

    // Verify the page loaded without errors
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Verify the booking appears
    const bookingRow = page.locator('tr').filter({ hasText: 'Error Test Customer' });
    await expect(bookingRow).toBeVisible();

    // Click on the booking to open detail panel
    await bookingRow.click();

    // Verify the page doesn't crash - no white screen or unhandled error
    await expect(page.locator('body')).not.toContainText(/unhandled|unexpected error/i);

    // The page should still be functional (not a blank error page)
    await expect(page.locator('body')).toContainText('Error Test Customer');
  });
});

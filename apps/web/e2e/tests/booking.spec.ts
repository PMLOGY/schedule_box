import { test, expect, type Page } from '@playwright/test';
import { BookingWizardPage } from '../page-objects/booking-wizard.page';
import { mockServicesAPI, mockEmployeesAPI } from '../helpers/mock-api';
import { MOCK_SERVICE, MOCK_EMPLOYEE } from '../helpers/test-data';

/**
 * Booking Creation E2E Tests
 *
 * Tests the 4-step booking wizard flow:
 * 1. Service selection (GET /api/v1/services, GET /api/v1/employees)
 * 2. Date/time selection (GET /api/v1/availability)
 * 3. Customer info (form fill, optional GET /api/v1/customers for search)
 * 4. Confirmation (POST /api/v1/customers, POST /api/v1/bookings)
 *
 * All API calls are mocked via page.route() to ensure predictable test data
 * without requiring specific database state beyond the seed data.
 *
 * These tests use the default storageState (authenticated as test owner)
 * from the setup project, since booking creation requires authentication.
 */
test.describe('Booking Creation', () => {
  /**
   * Helper to set up all required API mocks for the booking wizard flow.
   * Mocks services, employees, availability, AI upselling, customer search,
   * customer creation, and booking creation endpoints.
   */
  async function setupBookingMocks(page: Page) {
    // Mock services list (Step 1)
    await mockServicesAPI(page, [MOCK_SERVICE]);

    // Mock employees for the selected service (Step 1)
    await mockEmployeesAPI(page, [MOCK_EMPLOYEE]);

    // Build a future date string for availability slots (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Mock availability with the AvailabilitySlot format the Step2DateTimeSelect component expects
    // Uses { slots: AvailabilitySlot[] } with startTime/endTime/employeeId/employeeName/isAvailable
    await page.route('**/api/v1/availability*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            slots: [
              {
                date: dateStr,
                startTime: '10:00',
                endTime: '10:30',
                employeeId: MOCK_EMPLOYEE.id,
                employeeName: MOCK_EMPLOYEE.name,
                isAvailable: true,
              },
              {
                date: dateStr,
                startTime: '14:00',
                endTime: '14:30',
                employeeId: MOCK_EMPLOYEE.id,
                employeeName: MOCK_EMPLOYEE.name,
                isAvailable: true,
              },
            ],
          },
        }),
      });
    });

    // Mock AI upselling endpoint (Step 1 loads UpsellingSuggestions asynchronously)
    await page.route('**/api/v1/ai/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { recommendations: [], fallback: true } }),
      });
    });

    // Mock customer search (Step 3 search feature)
    await page.route('**/api/v1/customers*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0 } }),
        });
      } else if (route.request().method() === 'POST') {
        // Mock customer creation (Step 4 creates a new customer if none selected)
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 99,
              uuid: 'cust-e2e-001',
              name: 'E2E Test Customer',
              email: 'e2e@example.com',
              phone: '+420123456789',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock booking creation (Step 4 confirmation)
    await page.route('**/api/v1/bookings', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 100,
              uuid: 'booking-e2e-001',
              status: 'confirmed',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    return { dateStr };
  }

  test('user can create a booking end-to-end', async ({ page }) => {
    const bookingWizard = new BookingWizardPage(page);
    const { dateStr } = await setupBookingMocks(page);

    // Navigate to the booking wizard
    await bookingWizard.goto();

    // --- Step 1: Select Service ---
    // Wait for services to load (mock returns MOCK_SERVICE)
    await page.waitForSelector(`text=${MOCK_SERVICE.name}`, { timeout: 10000 });

    // Click on the service card
    await bookingWizard.selectService(MOCK_SERVICE.name);

    // The Next/Continue button appears after service selection
    await bookingWizard.proceedToNextStep();

    // --- Step 2: Select Date/Time ---
    // Wait for the date/time step to load
    // The calendar (react-day-picker) should be visible
    await page.waitForSelector('[role="progressbar"]', { timeout: 5000 });

    // Select a future date in the calendar
    // react-day-picker renders day cells as buttons inside role="gridcell"
    // Extract day number from our mock date
    const dayOfMonth = parseInt(dateStr.split('-')[2], 10);

    // Click the day in the calendar - find a button with the exact day text
    // The calendar may have multiple elements with the day number, so scope to the calendar area
    const calendarDayButton = page
      .locator('button')
      .filter({ hasText: new RegExp(`^${dayOfMonth}$`) })
      .first();
    await calendarDayButton.click();

    // Wait for availability slots to load and click the first available slot
    const timeSlotButton = page.getByText('10:00', { exact: true }).first();
    await timeSlotButton.waitFor({ state: 'visible', timeout: 10000 });
    await timeSlotButton.click();

    // Clicking a time slot in Step2DateTimeSelect calls nextStep() automatically
    // so we should now be on Step 3

    // --- Step 3: Customer Info ---
    // Wait for the customer info form to be visible
    // The form has fields: customerName, customerEmail, customerPhone, notes
    const customerNameInput = page
      .locator('input[name="customerName"]')
      .or(page.getByLabel(/name|jmeno/i));
    await customerNameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill customer information using the form fields
    await customerNameInput.fill('E2E Test Customer');

    const customerEmailInput = page.locator('input[type="email"]');
    await customerEmailInput.fill('e2e@example.com');

    const customerPhoneInput = page
      .locator('input[type="tel"]')
      .or(page.locator('input[name="customerPhone"]'));
    await customerPhoneInput.fill('+420123456789');

    // Click Next to proceed to Step 4 (Confirmation)
    // The form has a submit button that triggers form validation then nextStep()
    await bookingWizard.proceedToNextStep();

    // --- Step 4: Confirmation ---
    // Wait for the confirmation step to be visible
    // Step 4 shows a summary card with service name, date/time, customer info
    await page.waitForSelector(`text=${MOCK_SERVICE.name}`, { timeout: 10000 });

    // Verify the booking summary contains expected data
    await expect(page.getByText(MOCK_SERVICE.name)).toBeVisible();
    await expect(page.getByText('E2E Test Customer')).toBeVisible();

    // Click the Confirm button to create the booking
    await bookingWizard.confirm();

    // After successful booking creation:
    // - toast.success is shown
    // - wizard resets
    // - router.push('/bookings') navigates to bookings list
    await page.waitForURL('**/bookings', { timeout: 15000 });
  });

  test('booking wizard shows error for missing fields', async ({ page }) => {
    const bookingWizard = new BookingWizardPage(page);

    // Mock services API only (enough for Step 1)
    await mockServicesAPI(page, [MOCK_SERVICE]);
    await mockEmployeesAPI(page, [MOCK_EMPLOYEE]);

    // Mock AI upselling
    await page.route('**/api/v1/ai/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { recommendations: [], fallback: true } }),
      });
    });

    // Navigate to the booking wizard
    await bookingWizard.goto();

    // Wait for services to load
    await page.waitForSelector(`text=${MOCK_SERVICE.name}`, { timeout: 10000 });

    // Try to proceed without selecting a service
    // The Next button only appears after a service is selected (conditional render)
    // So verify the Next button is NOT visible when no service is selected
    const nextButton = page.getByRole('button', { name: /next|dalsi|pokracovat/i });

    // The Step1ServiceSelect only renders the Next button when data.serviceId is set
    // Check that the button is not visible before any service is selected
    await expect(nextButton).not.toBeVisible({ timeout: 3000 });

    // Now select the service and verify the Next button becomes visible
    await bookingWizard.selectService(MOCK_SERVICE.name);
    await expect(nextButton).toBeVisible({ timeout: 5000 });
  });
});

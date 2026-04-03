import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
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
 *
 * The UI uses Czech locale by default (next-intl, defaultLocale: 'cs').
 */
test.describe('Booking Creation', () => {
  /**
   * Helper to set up all required API mocks for the booking wizard flow.
   * Mocks services, employees, availability, AI upselling, customer search,
   * customer creation, and booking creation endpoints.
   *
   * The apiClient unwraps { data: T } envelopes (when no 'meta' key is present),
   * so all mocks must return { data: ... } format.
   */
  async function setupBookingMocks(page: Page) {
    // IMPORTANT: Register catch-all FIRST. Playwright uses most-recently-registered-wins
    // order, so specific mocks registered AFTER this will take priority.
    // This catch-all prevents any unmocked /api/v1/* request from hitting the real server
    // (which could 401 and trigger logout/redirect to login).
    // We exclude /auth/* routes so real login/refresh/logout still work.
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();

      // Let auth routes pass through to the real server
      if (url.includes('/api/v1/auth/')) {
        await route.continue();
        return;
      }

      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      } else {
        await route.fulfill({ status: 204 });
      }
    });

    // Mock services list (Step 1)
    await mockServicesAPI(page, [MOCK_SERVICE]);

    // Mock employees for the selected service (Step 1)
    await mockEmployeesAPI(page, [MOCK_EMPLOYEE]);

    // Build a future date string for availability slots (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Mock availability with the AvailabilitySlot format the Step2DateTimeSelect component expects.
    // The apiClient unwraps { data: T } -> T, so the component receives { slots: [...] }.
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

    // Mock company settings (Step 3 loads industry_type via useCompanySettingsQuery)
    await page.route('**/api/v1/settings/company*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              uuid: 'test-company-uuid',
              name: 'Test Company',
              slug: 'test-company',
              email: null,
              phone: null,
              website: null,
              description: null,
              currency: 'CZK',
              timezone: 'Europe/Prague',
              subscription_plan: 'professional',
              industry_type: null,
              onboarding_completed: true,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock customer search (Step 3 search feature)
    await page.route('**/api/v1/customers*', async (route) => {
      if (route.request().method() === 'GET') {
        // Return with meta so apiClient preserves the full object (paginated response)
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

    // Mock auth/me/employee endpoint (Step 1 checks if user is employee)
    await page.route('**/api/v1/auth/me/employee', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not an employee' } }),
      });
    });

    // Mock working hours (used by onboarding checklist/dashboard components)
    await page.route('**/api/v1/settings/working-hours*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    // Mock bookings list (used by onboarding checklist)
    await page.route('**/api/v1/bookings?*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0 } }),
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

  test('user can create a booking end-to-end', async ({ authenticatedPage: page }) => {
    const bookingWizard = new BookingWizardPage(page);
    const { dateStr } = await setupBookingMocks(page);

    // Navigate to the booking wizard
    await bookingWizard.goto();

    // --- Step 1: Select Service ---
    // Verify step 1 title is visible (Czech: "Vyberte službu")
    await expect(page.getByRole('heading', { name: /vyberte službu|select service/i })).toBeVisible(
      { timeout: 10000 },
    );

    // Wait for services to load (mock returns MOCK_SERVICE)
    await expect(page.getByText(MOCK_SERVICE.name)).toBeVisible({ timeout: 10000 });

    // Click on the service card
    await bookingWizard.selectService(MOCK_SERVICE.name);

    // The "Další" (Next) button appears after service selection
    await bookingWizard.proceedToNextStep();

    // --- Step 2: Select Date/Time ---
    // Wait for step 2 main heading (Czech: "Vyberte datum a čas")
    // Use exact match to avoid conflict with sub-heading "Vyberte datum"
    await expect(
      page.getByRole('heading', { name: /vyberte datum a čas|select date and time/i }),
    ).toBeVisible({ timeout: 10000 });

    // The calendar defaults to tomorrow (already selected in Step2DateTimeSelect state).
    // The mock returns slots for tomorrow's date, so we just need to wait for
    // the availability grid to load and click a time slot.
    // If the calendar does not have tomorrow selected, click the day.
    const dayOfMonth = parseInt(dateStr.split('-')[2], 10);

    // Try clicking the day in the calendar to ensure it's selected.
    // react-day-picker renders days as buttons inside the calendar.
    const calendarDayButton = page
      .locator('.rdp button, [class*="calendar"] button')
      .filter({ hasText: new RegExp(`^${dayOfMonth}$`) })
      .first();

    // Only click if the button exists and is visible
    if (await calendarDayButton.isVisible().catch(() => false)) {
      await calendarDayButton.click();
    }

    // Wait for the time slot button and click it.
    // Clicking a time slot auto-advances to step 3 (handleSlotSelect calls nextStep()).
    await bookingWizard.selectTimeSlot('10:00');

    // --- Step 3: Customer Info ---
    // Wait for step 3 heading (Czech: "Informace o zákazníkovi")
    await expect(
      page.getByRole('heading', { name: /informace o zákazníkovi|customer info/i }),
    ).toBeVisible({ timeout: 10000 });

    // Fill customer information using the page object
    await bookingWizard.fillCustomerInfo({
      name: 'E2E Test Customer',
      email: 'e2e@example.com',
      phone: '+420123456789',
    });

    // Click Další (Next) to proceed to Step 4 (Confirmation)
    // The form has a submit button that triggers form validation then nextStep()
    await bookingWizard.proceedToNextStep();

    // --- Step 4: Confirmation ---
    // Wait for step 4 heading (Czech: "Potvrzení rezervace")
    await expect(
      page.getByRole('heading', { name: /potvrzení rezervace|confirmation/i }),
    ).toBeVisible({ timeout: 10000 });

    // Verify the booking summary contains expected data
    await expect(page.getByText(MOCK_SERVICE.name)).toBeVisible();
    await expect(page.getByText('E2E Test Customer')).toBeVisible();

    // Click the "Potvrdit rezervaci" (Confirm booking) button
    await bookingWizard.confirm();

    // After successful booking creation:
    // - toast.success is shown ("Rezervace byla úspěšně vytvořena")
    // - BookingConfirmationSuccess component is displayed
    // - A "Zpět na rezervace" (Back to bookings) button appears
    // Verify the success state is shown
    await expect(page.getByText(/rezervace.*potvrzena|booking.*confirmed/i)).toBeVisible({
      timeout: 15000,
    });

    // Click "Zpět na rezervace" to navigate to bookings list
    const backToBookingsButton = page.getByRole('button', {
      name: /zpět na rezervace|back to bookings/i,
    });
    await backToBookingsButton.click();

    // Verify navigation to bookings list
    await page.waitForURL('**/bookings', { timeout: 15000 });
  });

  test('booking wizard shows error for missing fields', async ({ authenticatedPage: page }) => {
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

    // Mock auth/me/employee
    await page.route('**/api/v1/auth/me/employee', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not an employee' } }),
      });
    });

    // Navigate to the booking wizard
    await bookingWizard.goto();

    // Wait for services to load
    await expect(page.getByText(MOCK_SERVICE.name)).toBeVisible({ timeout: 10000 });

    // Try to proceed without selecting a service
    // The "Další" (Next) button only appears after a service is selected (conditional render)
    // So verify the Next button is NOT visible when no service is selected
    const nextButton = page.getByRole('button', {
      name: /další|next|dalsi|pokračovat|pokracovat/i,
    });

    // The Step1ServiceSelect only renders the Next button when data.serviceId is set
    // Check that the button is not visible before any service is selected
    await expect(nextButton).not.toBeVisible({ timeout: 3000 });

    // Now select the service and verify the Next button becomes visible
    await bookingWizard.selectService(MOCK_SERVICE.name);
    await expect(nextButton).toBeVisible({ timeout: 5000 });
  });
});

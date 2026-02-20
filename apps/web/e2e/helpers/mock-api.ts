import { type Page } from '@playwright/test';

/**
 * Reusable page.route() interceptors for mocking external and internal API calls
 * at the browser network level.
 *
 * These helpers mock client-side fetch calls. For server-side API route calls
 * (e.g., Next.js API routes calling Comgate), use environment variables
 * (COMGATE_API_URL, AI_SERVICE_URL) in playwright.config.ts webServer.env.
 *
 * @see https://playwright.dev/docs/mock
 */

// ----- Services & Employees -----

/**
 * Mock the services API endpoint.
 * Intercepts GET requests to /api/v1/services and returns provided services.
 */
export async function mockServicesAPI(
  page: Page,
  services: Array<{
    id: number;
    uuid: string;
    name: string;
    duration_minutes: number;
    price: string;
    currency: string;
    category_id: number;
    is_active: boolean;
  }>,
): Promise<void> {
  await page.route('**/api/v1/services*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: services }),
    });
  });
}

/**
 * Mock the employees API endpoint.
 * Intercepts GET requests to /api/v1/employees and returns provided employees.
 */
export async function mockEmployeesAPI(
  page: Page,
  employees: Array<{
    id: number;
    uuid: string;
    name: string;
  }>,
): Promise<void> {
  await page.route('**/api/v1/employees*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: employees }),
    });
  });
}

/**
 * Mock the availability API endpoint.
 * Intercepts GET requests to /api/v1/availability and returns provided time slots.
 */
export async function mockAvailabilityAPI(
  page: Page,
  slots: Array<{
    date: string;
    time: string;
    available: boolean;
    employee_id?: number;
  }>,
): Promise<void> {
  await page.route('**/api/v1/availability*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: slots }),
    });
  });
}

// ----- Comgate Payment -----

/**
 * Mock the Comgate payment creation endpoint.
 * Intercepts POST to /api/v1/payments/comgate/create and returns a mock response
 * with a redirect URL.
 */
export async function mockComgatePaymentCreate(
  page: Page,
  response?: {
    code: number;
    message: string;
    transId: string;
    redirect: string;
  },
): Promise<void> {
  const defaultResponse = {
    code: 0,
    message: 'OK',
    transId: 'TEST-TRANS-001',
    redirect: 'https://payments.comgate.cz/client/instructions/index?id=TEST',
  };

  await page.route('**/api/v1/payments/comgate/create', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: response ?? defaultResponse }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock the Comgate payment page redirect.
 * Intercepts navigation to payments.comgate.cz and redirects back to the app
 * callback URL, simulating a successful payment.
 */
export async function mockComgateRedirect(page: Page, callbackUrl?: string): Promise<void> {
  await page.route('**/payments.comgate.cz/**', async (route) => {
    const url = new URL(route.request().url());
    const transId = url.searchParams.get('id') || 'TEST-TRANS-001';
    const callback =
      callbackUrl || `/api/v1/payments/comgate/callback?transId=${transId}&status=PAID`;

    await route.fulfill({
      status: 302,
      headers: {
        Location: callback,
      },
    });
  });
}

// ----- AI Service -----

/**
 * Mock AI service endpoints returning 503 to trigger circuit breaker fallback.
 * The Opossum circuit breaker in the app will detect failures and return
 * rule-based fallback predictions.
 */
export async function mockAIServiceDown(page: Page): Promise<void> {
  await page.route('**/api/v1/ai/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Service Unavailable',
        code: 'AI_SERVICE_DOWN',
        message: 'AI prediction service is not available',
      }),
    });
  });
}

/**
 * Mock AI service endpoints with healthy success responses.
 * Returns the provided predictions or sensible defaults.
 */
export async function mockAIServiceHealthy(
  page: Page,
  predictions?: {
    probability?: number;
    risk_level?: string;
    suggestions?: string[];
    fallback?: boolean;
  },
): Promise<void> {
  const defaultPredictions = {
    probability: 0.15,
    risk_level: 'low',
    suggestions: ['Consider morning slots for better attendance'],
    fallback: false,
  };

  await page.route('**/api/v1/ai/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: predictions ?? defaultPredictions,
      }),
    });
  });
}

/**
 * Test data constants for E2E tests.
 *
 * These values match the seed data created by `pnpm --filter @schedulebox/database db:setup`.
 * See dev-quickstart.md for full seed data reference.
 */

/** Test owner account - seeded in database */
export const TEST_OWNER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test Owner',
} as const;

/** Admin account - seeded in database */
export const ADMIN_USER = {
  email: 'admin@schedulebox.cz',
  password: 'password123',
} as const;

/**
 * Generate a unique new user for registration tests.
 * Each call produces a unique email using Date.now() to avoid conflicts.
 */
export function createNewUser() {
  return {
    name: 'E2E Test User',
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'E2eTest123!@#',
    companyName: 'E2E Test Company',
  };
}

/** Mock service data for booking wizard tests */
export const MOCK_SERVICE = {
  id: 1,
  uuid: 'svc-001',
  name: 'Strih damsky',
  duration_minutes: 30,
  price: '500',
  currency: 'CZK',
  category_id: 1,
  is_active: true,
} as const;

/** Mock employee data for booking wizard tests */
export const MOCK_EMPLOYEE = {
  id: 1,
  uuid: 'emp-001',
  name: 'Jana Novakova',
} as const;

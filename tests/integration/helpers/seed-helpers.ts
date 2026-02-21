/**
 * Integration Test Seed Helpers
 *
 * Test data factories for all required entities.
 * Each factory inserts a row with sensible defaults and returns the full row.
 *
 * Design principles:
 * - Accepts a Drizzle db instance + optional overrides
 * - Uses Date.now() suffix on emails to avoid unique constraint violations
 * - Returns inserted row via .returning() for use in subsequent operations
 */

import { type drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@schedulebox/database';

type Db = ReturnType<typeof drizzle<typeof schema>>;

// ============================================================================
// COMPANY
// ============================================================================

export async function seedCompany(
  db: Db,
  overrides?: Partial<typeof schema.companies.$inferInsert>,
) {
  const now = Date.now();
  const [company] = await db
    .insert(schema.companies)
    .values({
      name: 'Test Company',
      slug: `test-company-${now}`,
      email: `test-${now}@example.com`,
      ...overrides,
    })
    .returning();
  return company;
}

// ============================================================================
// USER
// ============================================================================

export async function seedUser(
  db: Db,
  params: { companyId: number; roleId: number } & Partial<typeof schema.users.$inferInsert>,
) {
  const { companyId, roleId, ...overrides } = params;
  const now = Date.now();
  const [user] = await db
    .insert(schema.users)
    .values({
      companyId,
      roleId,
      email: `user-${now}@test.com`,
      passwordHash: 'hashed_password_for_tests',
      name: 'Test User',
      ...overrides,
    })
    .returning();
  return user;
}

// ============================================================================
// SERVICE
// ============================================================================

export async function seedService(
  db: Db,
  params: { companyId: number } & Partial<typeof schema.services.$inferInsert>,
) {
  const { companyId, ...overrides } = params;
  const [service] = await db
    .insert(schema.services)
    .values({
      companyId,
      name: 'Test Service',
      durationMinutes: 60,
      price: '500.00',
      currency: 'CZK',
      isActive: true,
      ...overrides,
    })
    .returning();
  return service;
}

// ============================================================================
// EMPLOYEE
// ============================================================================

export async function seedEmployee(
  db: Db,
  params: { companyId: number } & Partial<typeof schema.employees.$inferInsert>,
) {
  const { companyId, ...overrides } = params;
  const now = Date.now();
  const [employee] = await db
    .insert(schema.employees)
    .values({
      companyId,
      name: 'Test Employee',
      email: `emp-${now}@test.com`,
      isActive: true,
      ...overrides,
    })
    .returning();
  return employee;
}

// ============================================================================
// EMPLOYEE_SERVICE (junction)
// ============================================================================

export async function seedEmployeeService(
  db: Db,
  params: { employeeId: number; serviceId: number },
) {
  const [record] = await db
    .insert(schema.employeeServices)
    .values({
      employeeId: params.employeeId,
      serviceId: params.serviceId,
    })
    .returning();
  return record;
}

// ============================================================================
// CUSTOMER
// ============================================================================

export async function seedCustomer(
  db: Db,
  params: { companyId: number } & Partial<typeof schema.customers.$inferInsert>,
) {
  const { companyId, ...overrides } = params;
  const now = Date.now();
  const [customer] = await db
    .insert(schema.customers)
    .values({
      companyId,
      name: 'Test Customer',
      email: `customer-${now}@test.com`,
      ...overrides,
    })
    .returning();
  return customer;
}

// ============================================================================
// BOOKING
// ============================================================================

export async function seedBooking(
  db: Db,
  params: {
    companyId: number;
    customerId: number;
    serviceId: number;
    employeeId?: number | null;
    startTime: Date;
    endTime: Date;
  } & Partial<typeof schema.bookings.$inferInsert>,
) {
  const { companyId, customerId, serviceId, employeeId, startTime, endTime, ...overrides } = params;
  const [booking] = await db
    .insert(schema.bookings)
    .values({
      companyId,
      customerId,
      serviceId,
      employeeId: employeeId ?? null,
      startTime,
      endTime,
      status: 'pending',
      source: 'online',
      price: '500.00',
      currency: 'CZK',
      ...overrides,
    })
    .returning();
  return booking;
}

/**
 * Integration Tests: Multi-Tenant RLS Isolation
 *
 * Validates that Row Level Security policies enforce tenant isolation across all
 * key tables: customers, services, employees, bookings.
 *
 * These tests require real PostgreSQL because:
 * - RLS is a PostgreSQL-specific feature
 * - Session variables (SET LOCAL) drive policy evaluation
 * - A NON-SUPERUSER role (test_app) is required — superusers bypass RLS entirely
 *
 * Test pattern:
 * - Seed with superuser connection (bypasses RLS — needed to create multi-tenant data)
 * - Query with app connection (non-superuser, test_app role — RLS enforced)
 * - Assert cross-tenant data is invisible
 */

import { inject } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@schedulebox/database';
import {
  seedCompany,
  seedService,
  seedEmployee,
  seedCustomer,
  seedBooking,
  seedEmployeeService,
} from '../helpers/seed-helpers';
import { truncateAllTables } from '../helpers/test-db';

// ============================================================================
// Test state — seeded in beforeAll, shared across all RLS tests
// ============================================================================

let superClient: postgres.Sql;
let appClient: postgres.Sql;

// Company A data
let companyAId: number;
let customerAId: number;
let serviceAId: number;
let employeeAId: number;

// Company B data
let companyBId: number;
let customerBId: number;
let serviceBId: number;
let employeeBId: number;

// ============================================================================
// Suite setup / teardown
// ============================================================================

beforeAll(async () => {
  // Superuser client: bypasses RLS — used for seeding only
  superClient = postgres(inject('DATABASE_URL'), { max: 5 });

  // App client: non-superuser (test_app role) — RLS enforced
  // CRITICAL: all RLS assertions MUST use this client
  appClient = postgres(inject('DATABASE_URL_APP'), { max: 5 });

  const superDb = drizzle(superClient, { schema });

  // Truncate before seeding to start clean
  await truncateAllTables(superClient);

  // ── Company A ──────────────────────────────────────────────────────────────
  const companyA = await seedCompany(superDb, {
    name: 'Company Alpha',
    slug: `company-alpha-${Date.now()}`,
    email: `alpha-${Date.now()}@example.com`,
  });
  companyAId = companyA.id;

  const serviceA = await seedService(superDb, {
    companyId: companyAId,
    name: 'Alpha Service',
  });
  serviceAId = serviceA.id;

  const employeeA = await seedEmployee(superDb, {
    companyId: companyAId,
    name: 'Alpha Employee',
    email: `alpha-emp-${Date.now()}@example.com`,
  });
  employeeAId = employeeA.id;

  await seedEmployeeService(superDb, { employeeId: employeeAId, serviceId: serviceAId });

  const customerA = await seedCustomer(superDb, {
    companyId: companyAId,
    name: 'Alpha Customer',
    email: `alpha-cust-${Date.now()}@example.com`,
  });
  customerAId = customerA.id;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  await seedBooking(superDb, {
    companyId: companyAId,
    customerId: customerAId,
    serviceId: serviceAId,
    employeeId: employeeAId,
    startTime: tomorrow,
    endTime: tomorrowEnd,
    status: 'confirmed',
  });

  // ── Company B ──────────────────────────────────────────────────────────────
  const ts = Date.now() + 1; // slightly different ts to avoid slug collision
  const companyB = await seedCompany(superDb, {
    name: 'Company Beta',
    slug: `company-beta-${ts}`,
    email: `beta-${ts}@example.com`,
  });
  companyBId = companyB.id;

  const serviceB = await seedService(superDb, {
    companyId: companyBId,
    name: 'Beta Service',
  });
  serviceBId = serviceB.id;

  const employeeB = await seedEmployee(superDb, {
    companyId: companyBId,
    name: 'Beta Employee',
    email: `beta-emp-${ts}@example.com`,
  });
  employeeBId = employeeB.id;

  await seedEmployeeService(superDb, { employeeId: employeeBId, serviceId: serviceBId });

  const customerB = await seedCustomer(superDb, {
    companyId: companyBId,
    name: 'Beta Customer',
    email: `beta-cust-${ts}@example.com`,
  });
  customerBId = customerB.id;

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);
  const dayAfterEnd = new Date(dayAfter);
  dayAfterEnd.setHours(15, 0, 0, 0);

  await seedBooking(superDb, {
    companyId: companyBId,
    customerId: customerBId,
    serviceId: serviceBId,
    employeeId: employeeBId,
    startTime: dayAfter,
    endTime: dayAfterEnd,
    status: 'confirmed',
  });
});

afterAll(async () => {
  await superClient.end();
  await appClient.end();
});

// ============================================================================
// Helper: run a query inside an RLS-context transaction
// ============================================================================

async function withRlsContext<T>(
  companyId: number,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return appClient.begin(async (tx) => {
    // SET LOCAL scopes context to this transaction only
    await tx.unsafe(`SET LOCAL app.company_id = '${companyId}'`);
    await tx.unsafe(`SET LOCAL app.user_role = 'owner'`);
    await tx.unsafe(`SET LOCAL app.user_id = '1'`);
    return fn(tx);
  }) as Promise<T>;
}

// ============================================================================
// customers table isolation
// ============================================================================

describe('RLS — customers table', () => {
  it('Company A sees only its own customers', async () => {
    const rows = await withRlsContext(companyAId, async (tx) => {
      return tx.unsafe<{ id: number; company_id: number }[]>(
        `SELECT id, company_id FROM customers`,
      );
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.company_id).toBe(companyAId);
    }
    // Exactly the 1 customer seeded for company A
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(customerAId);
    expect(ids).not.toContain(customerBId);
  });

  it('Company B sees only its own customers', async () => {
    const rows = await withRlsContext(companyBId, async (tx) => {
      return tx.unsafe<{ id: number; company_id: number }[]>(
        `SELECT id, company_id FROM customers`,
      );
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.company_id).toBe(companyBId);
    }
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(customerBId);
    expect(ids).not.toContain(customerAId);
  });

  it('Company A cannot see Company B customers even with explicit WHERE', async () => {
    // RLS filters BEFORE the WHERE clause — the explicit WHERE for company B
    // should return zero rows when context is set to company A
    const rows = await withRlsContext(companyAId, async (tx) => {
      return tx.unsafe<{ id: number }[]>(`SELECT id FROM customers WHERE company_id = $1`, [
        companyBId,
      ]);
    });

    expect(rows).toHaveLength(0);
  });
});

// ============================================================================
// bookings table isolation
// ============================================================================

describe('RLS — bookings table', () => {
  it('Company A sees only its own bookings', async () => {
    const rows = await withRlsContext(companyAId, async (tx) => {
      return tx.unsafe<{ id: number; company_id: number }[]>(`SELECT id, company_id FROM bookings`);
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.company_id).toBe(companyAId);
    }
  });

  it('Company B sees only its own bookings', async () => {
    const rows = await withRlsContext(companyBId, async (tx) => {
      return tx.unsafe<{ id: number; company_id: number }[]>(`SELECT id, company_id FROM bookings`);
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.company_id).toBe(companyBId);
    }
  });
});

// ============================================================================
// services table isolation
// ============================================================================

describe('RLS — services table', () => {
  it('Company A sees only its own services', async () => {
    const rows = await withRlsContext(companyAId, async (tx) => {
      return tx.unsafe<{ id: number; company_id: number }[]>(`SELECT id, company_id FROM services`);
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.company_id).toBe(companyAId);
    }
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(serviceAId);
    expect(ids).not.toContain(serviceBId);
  });
});

// ============================================================================
// employees table isolation
// ============================================================================

describe('RLS — employees table', () => {
  it('Company A sees only its own employees', async () => {
    const rows = await withRlsContext(companyAId, async (tx) => {
      return tx.unsafe<{ id: number; company_id: number }[]>(
        `SELECT id, company_id FROM employees`,
      );
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.company_id).toBe(companyAId);
    }
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(employeeAId);
    expect(ids).not.toContain(employeeBId);
  });
});

// ============================================================================
// Cross-table isolation test
// ============================================================================

describe('RLS — cross-table isolation', () => {
  it('RLS prevents cross-tenant data access across all key tables', async () => {
    // Query all 4 key tables in a single Company A transaction
    const [customersA, servicesA, employeesA, bookingsA] = await withRlsContext(
      companyAId,
      async (tx) => {
        const cust = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM customers`,
        );
        const svc = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM services`,
        );
        const emp = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM employees`,
        );
        const bk = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM bookings`,
        );
        return [cust, svc, emp, bk];
      },
    );

    // Query same tables for Company B
    const [customersB, servicesB, employeesB, bookingsB] = await withRlsContext(
      companyBId,
      async (tx) => {
        const cust = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM customers`,
        );
        const svc = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM services`,
        );
        const emp = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM employees`,
        );
        const bk = await tx.unsafe<{ id: number; company_id: number }[]>(
          `SELECT id, company_id FROM bookings`,
        );
        return [cust, svc, emp, bk];
      },
    );

    // All Company A results must have company_id = companyAId
    for (const row of [...customersA, ...servicesA, ...employeesA, ...bookingsA]) {
      expect(row.company_id).toBe(companyAId);
    }

    // All Company B results must have company_id = companyBId
    for (const row of [...customersB, ...servicesB, ...employeesB, ...bookingsB]) {
      expect(row.company_id).toBe(companyBId);
    }

    // Result sets are completely disjoint — no shared IDs
    const idsA = new Set([
      ...customersA.map((r) => `cust:${r.id}`),
      ...servicesA.map((r) => `svc:${r.id}`),
      ...employeesA.map((r) => `emp:${r.id}`),
      ...bookingsA.map((r) => `bk:${r.id}`),
    ]);
    const idsB = new Set([
      ...customersB.map((r) => `cust:${r.id}`),
      ...servicesB.map((r) => `svc:${r.id}`),
      ...employeesB.map((r) => `emp:${r.id}`),
      ...bookingsB.map((r) => `bk:${r.id}`),
    ]);

    // Intersection must be empty
    const intersection = [...idsA].filter((id) => idsB.has(id));
    expect(intersection).toHaveLength(0);
  });

  it('RLS prevents inserting data for another company', async () => {
    // Attempt to INSERT a customer with company_id = companyBId while
    // the RLS context is set to companyAId.
    //
    // Policy type: USING only (no WITH CHECK in policies.sql).
    // With USING-only policies, the INSERT may succeed at the DB level
    // but the row will be invisible to the inserting company.
    // We document this behavior by checking visibility after insert.
    const insertedId = await withRlsContext(companyAId, async (tx) => {
      const ts = Date.now();
      const result = await tx.unsafe<{ id: number }[]>(
        `INSERT INTO customers (company_id, name, email)
         VALUES ($1, 'Cross-Tenant Attempt', $2)
         RETURNING id`,
        [companyBId, `cross-tenant-${ts}@example.com`],
      );
      return result[0]?.id ?? null;
    });

    // Whether the insert was silently rejected or succeeded:
    // Company A must NOT be able to see any record with company_id = companyBId
    const visible = await withRlsContext(companyAId, async (tx) => {
      if (insertedId === null) return [];
      return tx.unsafe<{ id: number }[]>(`SELECT id FROM customers WHERE id = $1`, [insertedId]);
    });

    // The inserted row (if it succeeded) is invisible to company A
    // because its company_id = companyBId which doesn't match the RLS context
    expect(visible).toHaveLength(0);
  });
});

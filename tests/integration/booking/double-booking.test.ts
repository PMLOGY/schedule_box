/**
 * Integration Tests: Double-Booking Prevention
 *
 * Tests the two-layer defense against double-bookings:
 * 1. Application-level: SELECT FOR UPDATE locks prevent concurrent conflicts
 * 2. Database-level: btree_gist exclusion constraint rejects overlapping INSERTs
 *
 * These tests require real PostgreSQL because they depend on:
 * - SELECT FOR UPDATE transaction isolation
 * - btree_gist exclusion constraints on tstzrange
 * - Status-filtered exclusion (WHERE status <> 'cancelled')
 */

import { inject } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '@schedulebox/database';
import {
  seedCompany,
  seedService,
  seedEmployee,
  seedCustomer,
  seedEmployeeService,
} from '../helpers/seed-helpers';
import { truncateAllTables } from '../helpers/test-db';

// ============================================================================
// Test fixtures (populated in beforeEach, used across tests)
// ============================================================================

let superClient: postgres.Sql;
let db: ReturnType<typeof drizzle<typeof schema>>;

let companyId: number;
let serviceId: number;
let employeeId: number;
let customerId: number;

// ============================================================================
// Suite setup / teardown
// ============================================================================

beforeAll(() => {
  if (process.env.SKIP_DOCKER === 'true') return; // no containers — skip setup
  // Need max:10 connections for concurrent transaction tests
  superClient = postgres(inject('DATABASE_URL'), { max: 10 });
  db = drizzle(superClient, { schema });
});

beforeEach(async () => {
  if (process.env.SKIP_DOCKER === 'true') return; // no containers — skip setup
  // Clean state before every test
  await truncateAllTables(superClient);

  // Seed: one company, service (60 min), employee, customer, junction
  const company = await seedCompany(db);
  companyId = company.id;

  const service = await seedService(db, { companyId, durationMinutes: 60 });
  serviceId = service.id;

  const employee = await seedEmployee(db, { companyId });
  employeeId = employee.id;

  const customer = await seedCustomer(db, { companyId });
  customerId = customer.id;

  await seedEmployeeService(db, { employeeId, serviceId });
});

afterAll(async () => {
  await superClient?.end();
});

// ============================================================================
// Helper: build tomorrow's timeslot
// ============================================================================

function tomorrowSlot(startHour: number, endHour: number): { startTime: Date; endTime: Date } {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(startHour, 0, 0, 0);
  const endTime = new Date(tomorrow);
  endTime.setHours(endHour, 0, 0, 0);
  return { startTime: tomorrow, endTime };
}

// ============================================================================
// Tests
// ============================================================================

describe.skipIf(process.env.SKIP_DOCKER === 'true')('double-booking prevention', () => {
  it('concurrent bookings to same slot — exactly one succeeds', async () => {
    const { startTime, endTime } = tomorrowSlot(10, 11);
    const startIso = startTime.toISOString();
    const endIso = endTime.toISOString();

    // Create two INDEPENDENT postgres clients — same-pool connections may be
    // serialized by the pool manager; separate clients force truly parallel connections.
    const clientA = postgres(inject('DATABASE_URL'), { max: 2 });
    const clientB = postgres(inject('DATABASE_URL'), { max: 2 });

    try {
      // Both transactions run concurrently:
      // - Each SELECTs FOR UPDATE on the employee row (acquires row lock)
      // - Each checks for existing overlapping bookings
      // - Each attempts to INSERT a booking for the same slot
      // The second transaction to acquire the lock will wait for the first to
      // commit, then see the existing booking and fail the conflict check.
      const results = await Promise.allSettled([
        clientA.begin(async (txA) => {
          // Lock the employee row to prevent concurrent booking
          await txA.unsafe(`SELECT id FROM employees WHERE id = $1 FOR UPDATE`, [employeeId]);

          // Check for existing overlapping bookings
          const conflicts = await txA.unsafe(
            `SELECT id FROM bookings
             WHERE employee_id = $1
               AND status <> 'cancelled'
               AND tstzrange(start_time, end_time) && tstzrange($2::timestamptz, $3::timestamptz)`,
            [employeeId, startIso, endIso],
          );

          if (conflicts.length > 0) {
            throw new Error('BOOKING_CONFLICT: slot already taken');
          }

          // Insert the booking
          await txA.unsafe(
            `INSERT INTO bookings (company_id, customer_id, service_id, employee_id, start_time, end_time, status, price, currency, source)
             VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, 'confirmed', 500.00, 'CZK', 'online')`,
            [companyId, customerId, serviceId, employeeId, startIso, endIso],
          );
        }),
        clientB.begin(async (txB) => {
          // Same sequence for transaction B — will block until A commits
          await txB.unsafe(`SELECT id FROM employees WHERE id = $1 FOR UPDATE`, [employeeId]);

          const conflicts = await txB.unsafe(
            `SELECT id FROM bookings
             WHERE employee_id = $1
               AND status <> 'cancelled'
               AND tstzrange(start_time, end_time) && tstzrange($2::timestamptz, $3::timestamptz)`,
            [employeeId, startIso, endIso],
          );

          if (conflicts.length > 0) {
            throw new Error('BOOKING_CONFLICT: slot already taken');
          }

          await txB.unsafe(
            `INSERT INTO bookings (company_id, customer_id, service_id, employee_id, start_time, end_time, status, price, currency, source)
             VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, 'confirmed', 500.00, 'CZK', 'online')`,
            [companyId, customerId, serviceId, employeeId, startIso, endIso],
          );
        }),
      ]);

      // Exactly one transaction should succeed and one should fail
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Verify only 1 booking row was persisted in the database
      const bookingRows = await db
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.employeeId, employeeId));

      expect(bookingRows).toHaveLength(1);
      expect(new Date(bookingRows[0].startTime).toISOString()).toBe(startIso);
    } finally {
      await clientA.end();
      await clientB.end();
    }
  }, 30_000);

  it('btree_gist exclusion constraint rejects overlapping INSERT', async () => {
    const { startTime, endTime } = tomorrowSlot(10, 11);

    // First: insert a confirmed booking for 10:00–11:00
    await db.insert(schema.bookings).values({
      companyId,
      customerId,
      serviceId,
      employeeId,
      startTime,
      endTime,
      status: 'confirmed',
      price: '500.00',
      currency: 'CZK',
      source: 'online',
    });

    // Second: attempt to insert overlapping booking 10:30–11:30 (overlaps first)
    const overlapStart = new Date(startTime);
    overlapStart.setMinutes(30); // 10:30
    const overlapEnd = new Date(overlapStart);
    overlapEnd.setHours(overlapEnd.getHours() + 1); // 11:30

    await expect(
      db.insert(schema.bookings).values({
        companyId,
        customerId,
        serviceId,
        employeeId,
        startTime: overlapStart,
        endTime: overlapEnd,
        status: 'pending',
        price: '500.00',
        currency: 'CZK',
        source: 'online',
      }),
    ).rejects.toThrow(
      // Constraint name from double-booking.sql
      /no_overlapping_bookings|conflicting key value|exclusion constraint/i,
    );
  });

  it('non-overlapping bookings for same employee succeed', async () => {
    const { startTime: start1, endTime: end1 } = tomorrowSlot(10, 11); // 10:00–11:00
    const { startTime: start2, endTime: end2 } = tomorrowSlot(11, 12); // 11:00–12:00 (adjacent)

    // Both should insert without error
    await db.insert(schema.bookings).values({
      companyId,
      customerId,
      serviceId,
      employeeId,
      startTime: start1,
      endTime: end1,
      status: 'confirmed',
      price: '500.00',
      currency: 'CZK',
      source: 'online',
    });

    await db.insert(schema.bookings).values({
      companyId,
      customerId,
      serviceId,
      employeeId,
      startTime: start2,
      endTime: end2,
      status: 'confirmed',
      price: '500.00',
      currency: 'CZK',
      source: 'online',
    });

    // Both rows should exist
    const bookingRows = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.employeeId, employeeId));

    expect(bookingRows).toHaveLength(2);
  });

  it('cancelled booking does not block new booking for same slot', async () => {
    const { startTime, endTime } = tomorrowSlot(10, 11);

    // Insert cancelled booking — should be excluded from constraint (WHERE status <> 'cancelled')
    await db.insert(schema.bookings).values({
      companyId,
      customerId,
      serviceId,
      employeeId,
      startTime,
      endTime,
      status: 'cancelled',
      price: '500.00',
      currency: 'CZK',
      source: 'online',
    });

    // New pending booking for the SAME slot — should succeed because
    // the exclusion constraint has WHERE (status <> 'cancelled')
    await expect(
      db.insert(schema.bookings).values({
        companyId,
        customerId,
        serviceId,
        employeeId,
        startTime,
        endTime,
        status: 'pending',
        price: '500.00',
        currency: 'CZK',
        source: 'online',
      }),
    ).resolves.toBeDefined();

    // Both rows exist (1 cancelled + 1 pending)
    const bookingRows = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.employeeId, employeeId));

    expect(bookingRows).toHaveLength(2);

    const statuses = bookingRows.map((b) => b.status);
    expect(statuses).toContain('cancelled');
    expect(statuses).toContain('pending');
  });
});

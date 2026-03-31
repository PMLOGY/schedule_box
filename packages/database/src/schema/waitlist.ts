/**
 * Waitlist Schema
 *
 * Booking waitlist with position tracking:
 * - booking_waitlist: Queue entries for fully-booked slots with automatic promotion
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  timestamp,
  integer,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { customers } from './customers';
import { services } from './services';
import { employees } from './employees';
import { bookings } from './bookings';

// ============================================================================
// BOOKING_WAITLIST TABLE
// ============================================================================

export const bookingWaitlist = pgTable(
  'booking_waitlist',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    preferredTime: timestamp('preferred_time', { withTimezone: true }).notNull(),
    position: integer('position').notNull(),
    status: varchar('status', { length: 20 })
      .default('waiting')
      .$type<'waiting' | 'promoted' | 'expired' | 'cancelled'>(),
    promotedAt: timestamp('promoted_at', { withTimezone: true }),
    promotedBookingId: integer('promoted_booking_id').references(() => bookings.id, {
      onDelete: 'set null',
    }),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // CHECK constraints
    statusCheck: check(
      'booking_waitlist_status_check',
      sql`${table.status} IN ('waiting', 'promoted', 'expired', 'cancelled')`,
    ),
    positionCheck: check('booking_waitlist_position_check', sql`${table.position} > 0`),
    // UNIQUE partial index: prevent duplicate waiting entries
    waitingUniqueIdx: unique('booking_waitlist_waiting_unique').on(
      table.companyId,
      table.customerId,
      table.serviceId,
      table.preferredTime,
    ),
    // Indexes
    companyServiceTimeIdx: index('idx_booking_waitlist_company_service_time').on(
      table.companyId,
      table.serviceId,
      table.preferredTime,
    ),
    companyStatusIdx: index('idx_booking_waitlist_company_status').on(
      table.companyId,
      table.status,
    ),
  }),
);

/**
 * Booking Schema
 *
 * Core booking and scheduling tables:
 * - bookings: Main reservation records with pricing snapshots
 * - booking_resources: Junction table for resources assigned to bookings
 * - availability_slots: Precomputed availability slots for fast lookup
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  real,
  date,
  time,
  index,
  check,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { customers } from './customers';
import { services } from './services';
import { employees } from './employees';
import { resources } from './resources';
import { coupons } from './coupons';
import { giftCards } from './gift-cards';
import { videoMeetings } from './video';
// import { recurringSeries } from './recurring'; // unused — migration 0006 pending

// ============================================================================
// BOOKINGS TABLE
// ============================================================================

export const bookings = pgTable(
  'bookings',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 })
      .default('pending')
      .$type<'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'>(),
    source: varchar('source', { length: 30 })
      .default('online')
      .$type<
        'online' | 'admin' | 'phone' | 'walk_in' | 'voice_ai' | 'marketplace' | 'api' | 'widget'
      >(),
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    // Industry vertical metadata (validated at API layer via bookingMetadataSchema)
    bookingMetadata: jsonb('booking_metadata'),
    // Pricing (snapshot at booking time)
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0'),
    couponId: integer('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
    giftCardId: integer('gift_card_id').references(() => giftCards.id, { onDelete: 'set null' }),
    videoMeetingId: integer('video_meeting_id').references(() => videoMeetings.id, {
      onDelete: 'set null',
    }),
    // recurringSeriesId: column removed from schema — not in production DB (migration 0006 pending)
    // Re-add after running: pnpm --filter @schedulebox/database db:migrate
    // AI
    noShowProbability: real('no_show_probability'),
    // Cancellation
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    cancelledBy: varchar('cancelled_by', { length: 20 }).$type<
      'customer' | 'employee' | 'admin' | 'system' | null
    >(),
    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // CHECK constraints
    statusCheck: check(
      'bookings_status_check',
      sql`${table.status} IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired')`,
    ),
    sourceCheck: check(
      'bookings_source_check',
      sql`${table.source} IN ('online', 'admin', 'phone', 'walk_in', 'voice_ai', 'marketplace', 'api', 'widget')`,
    ),
    cancelledByCheck: check(
      'bookings_cancelled_by_check',
      sql`${table.cancelledBy} IN ('customer', 'employee', 'admin', 'system') OR ${table.cancelledBy} IS NULL`,
    ),
    endTimeCheck: check('bookings_end_time_check', sql`${table.endTime} > ${table.startTime}`),
    // Indexes
    companyIdx: index('idx_bookings_company').on(table.companyId),
    customerIdx: index('idx_bookings_customer').on(table.customerId),
    serviceIdx: index('idx_bookings_service').on(table.serviceId),
    employeeIdx: index('idx_bookings_employee').on(table.employeeId),
    startIdx: index('idx_bookings_start').on(table.companyId, table.startTime),
    statusIdx: index('idx_bookings_status').on(table.companyId, table.status),
    dateRangeIdx: index('idx_bookings_date_range').on(
      table.companyId,
      table.startTime,
      table.endTime,
    ),
    // recurringSeriesIdx: index('idx_bookings_recurring_series').on(table.recurringSeriesId),
  }),
);

// ============================================================================
// BOOKING_RESOURCES TABLE
// ============================================================================

export const bookingResources = pgTable(
  'booking_resources',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    resourceId: integer('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').default(1),
  },
  (table) => ({
    // UNIQUE constraint
    bookingResourceUnique: unique('booking_resources_booking_resource_unique').on(
      table.bookingId,
      table.resourceId,
    ),
    // Indexes
    bookingIdx: index('idx_booking_resources_booking').on(table.bookingId),
    resourceIdx: index('idx_booking_resources_resource').on(table.resourceId),
  }),
);

// ============================================================================
// AVAILABILITY_SLOTS TABLE
// ============================================================================

export const availabilitySlots = pgTable(
  'availability_slots',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    isAvailable: boolean('is_available').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Indexes
    companyDateIdx: index('idx_availability_company_date').on(table.companyId, table.date),
    employeeDateIdx: index('idx_availability_employee_date').on(table.employeeId, table.date),
  }),
);

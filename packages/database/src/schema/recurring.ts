/**
 * Recurring Series Schema
 *
 * Recurring booking patterns:
 * - recurring_series: Template for repeating bookings (weekly, biweekly, monthly)
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
  date,
  time,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { services } from './services';
import { employees } from './employees';
import { customers } from './customers';

// ============================================================================
// RECURRING_SERIES TABLE
// ============================================================================

export const recurringSeries = pgTable(
  'recurring_series',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    repeatPattern: varchar('repeat_pattern', { length: 20 })
      .notNull()
      .$type<'weekly' | 'biweekly' | 'monthly'>(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    startTime: time('start_time').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    maxOccurrences: integer('max_occurrences'),
    notes: text('notes'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // CHECK constraints
    repeatPatternCheck: check(
      'recurring_series_repeat_pattern_check',
      sql`${table.repeatPattern} IN ('weekly', 'biweekly', 'monthly')`,
    ),
    durationCheck: check('recurring_series_duration_check', sql`${table.durationMinutes} > 0`),
    // Indexes
    companyIdx: index('idx_recurring_series_company').on(table.companyId),
    companyActiveIdx: index('idx_recurring_series_company_active').on(
      table.companyId,
      table.isActive,
    ),
  }),
);

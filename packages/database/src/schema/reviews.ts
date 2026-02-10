/**
 * Reviews Schema
 *
 * Customer review and rating system with redirect routing:
 * - reviews: Customer reviews with optional redirect to external platforms
 */

import {
  pgTable,
  serial,
  uuid,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { customers } from './customers';
import { services } from './services';
import { employees } from './employees';

// Note: bookings table reference uses deferred FK pattern
// (parallel plan 02-04/02-05 may not be complete yet)

// ============================================================================
// REVIEWS TABLE
// ============================================================================

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    bookingId: integer('booking_id'), // Deferred FK - bookings table in parallel plan
    serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    rating: smallint('rating').notNull(),
    comment: text('comment'),
    redirectedTo: varchar('redirected_to', { length: 50 }),
    isPublished: boolean('is_published').default(true),
    reply: text('reply'),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ratingCheck: check('review_rating_check', sql`${table.rating} BETWEEN 1 AND 5`),
    redirectCheck: check(
      'review_redirect_check',
      sql`${table.redirectedTo} IN ('google', 'facebook', 'internal') OR ${table.redirectedTo} IS NULL`,
    ),
    companyIdx: index('idx_reviews_company').on(table.companyId),
    customerIdx: index('idx_reviews_customer').on(table.customerId),
    ratingIdx: index('idx_reviews_rating').on(table.companyId, table.rating),
  }),
);

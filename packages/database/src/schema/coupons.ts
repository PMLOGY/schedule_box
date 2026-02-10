/**
 * Coupon Schema
 *
 * Promotional discount coupons for bookings:
 * - coupons: Discount codes with percentage/fixed types, usage limits
 * - coupon_usage: Tracking of coupon redemptions per customer/booking
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  numeric,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth.js';
import { customers } from './customers.js';

// ============================================================================
// COUPONS TABLE
// ============================================================================

export const coupons = pgTable(
  'coupons',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull(),
    description: varchar('description', { length: 255 }),
    discountType: varchar('discount_type', { length: 20 }).notNull(),
    discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
    minBookingAmount: numeric('min_booking_amount', { precision: 10, scale: 2 }).default('0'),
    maxUses: integer('max_uses'), // NULL = unlimited
    currentUses: integer('current_uses').default(0),
    maxUsesPerCustomer: integer('max_uses_per_customer').default(1),
    applicableServiceIds: integer('applicable_service_ids').array(), // NULL = all services
    validFrom: timestamp('valid_from', { withTimezone: true }).defaultNow(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyCodeUnique: unique('coupons_company_id_code_unique').on(table.companyId, table.code),
    discountTypeCheck: check(
      'coupons_discount_type_check',
      sql`${table.discountType} IN ('percentage', 'fixed')`,
    ),
    discountValueCheck: check('coupons_discount_value_check', sql`${table.discountValue} > 0`),
    companyIdx: index('idx_coupons_company').on(table.companyId),
    companyCodeIdx: index('idx_coupons_code').on(table.companyId, table.code),
  }),
);

// ============================================================================
// COUPON_USAGE TABLE
// ============================================================================

export const couponUsage = pgTable(
  'coupon_usage',
  {
    id: serial('id').primaryKey(),
    couponId: integer('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    bookingId: integer('booking_id').notNull(), // FK will be added when bookings table exists
    discountApplied: numeric('discount_applied', { precision: 10, scale: 2 }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    couponIdx: index('idx_coupon_usage_coupon').on(table.couponId),
    customerIdx: index('idx_coupon_usage_customer').on(table.customerId),
  }),
);

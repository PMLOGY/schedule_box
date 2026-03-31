/**
 * Membership Schema
 *
 * Membership and punch card support:
 * - membership_types: Configurable membership plans (monthly, annual, punch card)
 * - customer_memberships: Customer membership instances with usage tracking
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
  date,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { customers } from './customers';

// ============================================================================
// MEMBERSHIP_TYPES TABLE
// ============================================================================

export const membershipTypes = pgTable(
  'membership_types',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 20 }).notNull().$type<'monthly' | 'annual' | 'punch_card'>(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    punchesIncluded: integer('punches_included'),
    durationDays: integer('duration_days'),
    serviceIds: jsonb('service_ids'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // CHECK constraints
    typeCheck: check(
      'membership_types_type_check',
      sql`${table.type} IN ('monthly', 'annual', 'punch_card')`,
    ),
    priceCheck: check('membership_types_price_check', sql`${table.price} >= 0`),
    // Indexes
    companyIdx: index('idx_membership_types_company').on(table.companyId),
  }),
);

// ============================================================================
// CUSTOMER_MEMBERSHIPS TABLE
// ============================================================================

export const customerMemberships = pgTable(
  'customer_memberships',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    membershipTypeId: integer('membership_type_id')
      .notNull()
      .references(() => membershipTypes.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 })
      .default('active')
      .$type<'active' | 'expired' | 'cancelled' | 'suspended'>(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    remainingUses: integer('remaining_uses'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // CHECK constraints
    statusCheck: check(
      'customer_memberships_status_check',
      sql`${table.status} IN ('active', 'expired', 'cancelled', 'suspended')`,
    ),
    // Indexes
    companyCustomerIdx: index('idx_customer_memberships_company_customer').on(
      table.companyId,
      table.customerId,
    ),
    companyStatusIdx: index('idx_customer_memberships_company_status').on(
      table.companyId,
      table.status,
    ),
  }),
);

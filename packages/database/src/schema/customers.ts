/**
 * Customer Schema
 *
 * Customer management with AI-computed fields:
 * - customers: Customer records with health score, CLV prediction, engagement metrics
 * - tags: Custom tags for customer segmentation
 * - customer_tags: Customer-tag junction table
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
  smallint,
  numeric,
  date,
  jsonb,
  primaryKey,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies, users } from './auth';

// ============================================================================
// CUSTOMERS TABLE
// ============================================================================

export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 10 }),
    notes: text('notes'),
    customerMetadata: jsonb('customer_metadata'),
    source: varchar('source', { length: 50 }).default('manual'),
    // AI-computed fields
    healthScore: smallint('health_score'),
    clvPredicted: numeric('clv_predicted', { precision: 10, scale: 2 }),
    noShowCount: integer('no_show_count').default(0),
    totalBookings: integer('total_bookings').default(0),
    totalSpent: numeric('total_spent', { precision: 12, scale: 2 }).default('0'),
    lastVisitAt: timestamp('last_visit_at', { withTimezone: true }),
    // Marketing
    marketingConsent: boolean('marketing_consent').default(false),
    preferredContact: varchar('preferred_contact', { length: 20 }).default('email'),
    preferredReminderMinutes: integer('preferred_reminder_minutes').default(1440),
    isActive: boolean('is_active').default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    // PII encryption columns (expand phase — old plaintext columns retained until back-fill verified)
    emailCiphertext: text('email_ciphertext'),
    phoneCiphertext: text('phone_ciphertext'),
    emailHmac: varchar('email_hmac', { length: 64 }),
  },
  (table) => ({
    emailCompanyUnique: unique('customers_email_company_id_unique').on(
      table.email,
      table.companyId,
    ),
    genderCheck: check(
      'customers_gender_check',
      sql`${table.gender} IN ('male', 'female', 'other', NULL)`,
    ),
    sourceCheck: check(
      'customers_source_check',
      sql`${table.source} IN ('manual', 'online', 'import', 'marketplace', 'api')`,
    ),
    healthScoreCheck: check(
      'customers_health_score_check',
      sql`${table.healthScore} BETWEEN 0 AND 100`,
    ),
    preferredContactCheck: check(
      'customers_preferred_contact_check',
      sql`${table.preferredContact} IN ('email', 'sms', 'phone')`,
    ),
    companyIdx: index('idx_customers_company').on(table.companyId),
    emailIdx: index('idx_customers_email').on(table.email),
    phoneIdx: index('idx_customers_phone').on(table.phone),
    userIdx: index('idx_customers_user').on(table.userId),
    healthIdx: index('idx_customers_health').on(table.companyId, table.healthScore),
    emailHmacIdx: index('idx_customers_email_hmac').on(table.emailHmac),
  }),
);

// ============================================================================
// TAGS TABLE
// ============================================================================

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }).default('#3B82F6'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyNameUnique: unique('tags_company_id_name_unique').on(table.companyId, table.name),
    companyIdx: index('idx_tags_company').on(table.companyId),
  }),
);

// ============================================================================
// CUSTOMER_TAGS JUNCTION TABLE
// ============================================================================

export const customerTags = pgTable(
  'customer_tags',
  {
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.customerId, table.tagId] }),
  }),
);

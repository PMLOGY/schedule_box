/**
 * Payment Providers Schema
 *
 * Provider-agnostic table for storing per-company payment gateway credentials.
 * Adding a new provider (e.g., Stripe, GoPay) requires only an INSERT — no DDL changes.
 * Credentials are stored as AES-256-GCM encrypted text (opaque blob, not JSONB).
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';

// ============================================================================
// PAYMENT PROVIDERS TABLE
// ============================================================================

export const paymentProviders = pgTable(
  'payment_providers',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull().$type<'comgate' | 'stripe' | 'gopay'>(),
    isActive: boolean('is_active').default(false).notNull(),
    credentials: text('credentials').notNull(), // AES-256-GCM encrypted JSON string
    testMode: boolean('test_mode').default(true).notNull(),
    metadata: jsonb('metadata').default({}), // Non-sensitive config (label, webhook preferences, etc.)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // CHECK constraint: only known providers
    providerCheck: check(
      'payment_providers_provider_check',
      sql`${table.provider} IN ('comgate', 'stripe', 'gopay')`,
    ),
    // UNIQUE constraint: one config per provider per company
    companyProviderUnique: unique('payment_providers_company_provider_unique').on(
      table.companyId,
      table.provider,
    ),
    // Indexes
    companyIdx: index('idx_payment_providers_company').on(table.companyId),
    companyProviderActiveIdx: index('idx_payment_providers_company_provider_active').on(
      table.companyId,
      table.provider,
      table.isActive,
    ),
  }),
);

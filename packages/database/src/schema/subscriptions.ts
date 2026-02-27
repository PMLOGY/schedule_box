/**
 * Subscription Billing Schema
 *
 * Subscription lifecycle and billing tables:
 * - subscriptions: Active subscription records per company
 * - subscription_invoices: Billing invoices (separate from booking invoices)
 * - subscription_events: Audit log for subscription state changes and webhook idempotency
 *
 * Note: These tables are intentionally separate from the payments/invoices tables
 * because those have NOT NULL FK constraints to bookings. Subscription charges
 * have no associated booking.
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  integer,
  numeric,
  timestamp,
  boolean,
  text,
  jsonb,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';

// ============================================================================
// SUBSCRIPTIONS TABLE
// ============================================================================

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    plan: varchar('plan', { length: 20 })
      .notNull()
      .$type<'free' | 'essential' | 'growth' | 'ai_powered'>(),
    status: varchar('status', { length: 20 })
      .notNull()
      .default('trialing')
      .$type<'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'>(),
    billingCycle: varchar('billing_cycle', { length: 10 })
      .notNull()
      .default('monthly')
      .$type<'monthly' | 'annual'>(),
    priceAmount: numeric('price_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    // Stores the transId from the initial payment for recurring charges
    comgateInitTransactionId: varchar('comgate_init_transaction_id', { length: 255 }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),
    dunningStartedAt: timestamp('dunning_started_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusCheck: check(
      'subscriptions_status_check',
      sql`${table.status} IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')`,
    ),
    planCheck: check(
      'subscriptions_plan_check',
      sql`${table.plan} IN ('free', 'essential', 'growth', 'ai_powered')`,
    ),
    companyIdx: index('idx_subscriptions_company').on(table.companyId),
    statusIdx: index('idx_subscriptions_status').on(table.status),
    periodEndIdx: index('idx_subscriptions_period_end').on(table.currentPeriodEnd),
  }),
);

// ============================================================================
// SUBSCRIPTION INVOICES TABLE
// ============================================================================

export const subscriptionInvoices = pgTable(
  'subscription_invoices',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    subscriptionId: integer('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'restrict' }),
    // Format: SB-YYYY-NNNNNN (globally unique via PostgreSQL SEQUENCE)
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0'),
    // NOT hardcoded 21% -- derived from company country (CZ: 21%, SK: 20%)
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('21.00'),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    status: varchar('status', { length: 20 })
      .default('draft')
      .$type<'draft' | 'issued' | 'paid' | 'failed'>(),
    period: varchar('period', { length: 20 }).notNull(), // e.g., '2026-03'
    comgateTransactionId: varchar('comgate_transaction_id', { length: 255 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    pdfUrl: varchar('pdf_url', { length: 500 }),
    // Company billing snapshot at time of invoice (Czech law: invoice must reflect
    // the seller's details at time of issue, not current details)
    sellerSnapshot: jsonb('seller_snapshot'), // { name, ico, dic, address, ... }
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusCheck: check(
      'sub_invoices_status_check',
      sql`${table.status} IN ('draft', 'issued', 'paid', 'failed')`,
    ),
    companyIdx: index('idx_sub_invoices_company').on(table.companyId),
    subscriptionIdx: index('idx_sub_invoices_subscription').on(table.subscriptionId),
    invoiceNumberUnique: unique('sub_invoices_number_unique').on(table.invoiceNumber),
  }),
);

// ============================================================================
// SUBSCRIPTION EVENTS TABLE
// ============================================================================

export const subscriptionEvents = pgTable(
  'subscription_events',
  {
    id: serial('id').primaryKey(),
    subscriptionId: integer('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    // e.g., 'payment.success', 'payment.failed', 'plan.upgraded', 'plan.downgraded',
    //       'subscription.cancelled', 'subscription.expired', 'dunning.started'
    eventType: varchar('event_type', { length: 50 }).notNull(),
    // For idempotency on webhook events
    comgateTransactionId: varchar('comgate_transaction_id', { length: 255 }),
    previousStatus: varchar('previous_status', { length: 20 }),
    newStatus: varchar('new_status', { length: 20 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionIdx: index('idx_sub_events_subscription').on(table.subscriptionId),
    eventTypeIdx: index('idx_sub_events_type').on(table.eventType),
    comgateIdx: index('idx_sub_events_comgate_tx').on(table.comgateTransactionId),
  }),
);

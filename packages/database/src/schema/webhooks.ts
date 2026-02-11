/**
 * Webhook Schema
 *
 * Webhook processing and idempotency tracking:
 * - processed_webhooks: Global idempotency table for webhook events (no company_id)
 */

import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { payments } from './payments';

// ============================================================================
// PROCESSED_WEBHOOKS TABLE
// ============================================================================

export const processedWebhooks = pgTable(
  'processed_webhooks',
  {
    eventId: text('event_id').primaryKey(), // Gateway's unique event/transaction ID
    gatewayName: varchar('gateway_name', { length: 20 }).notNull().$type<'comgate' | 'qrcomat'>(),
    paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'set null' }), // FK to payments (nullable, may not exist yet)
    status: varchar('status', { length: 20 })
      .notNull()
      .default('processing')
      .$type<'processing' | 'completed' | 'failed'>(),
    payload: jsonb('payload'), // Raw webhook payload for debugging
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    // CHECK constraints
    gatewayCheck: check(
      'processed_webhooks_gateway_check',
      sql`${table.gatewayName} IN ('comgate', 'qrcomat')`,
    ),
    statusCheck: check(
      'processed_webhooks_status_check',
      sql`${table.status} IN ('processing', 'completed', 'failed')`,
    ),
    // Indexes
    gatewayProcessedIdx: index('idx_processed_webhooks_gateway_processed').on(
      table.gatewayName,
      table.processedAt,
    ),
  }),
);

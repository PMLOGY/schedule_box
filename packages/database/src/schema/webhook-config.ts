/**
 * Webhook Configuration Schema
 *
 * Outbound webhook endpoints and delivery tracking:
 * - webhook_endpoints: Company-configured outbound webhook URLs with encrypted HMAC secrets
 * - webhook_deliveries: Delivery log with retry scheduling and response tracking
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
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';

// ============================================================================
// WEBHOOK_ENDPOINTS TABLE
// ============================================================================

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid')
      .default(sql`gen_random_uuid()`)
      .unique()
      .notNull(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 2048 }).notNull(),
    /** AES-256-GCM encrypted HMAC secret — never store plaintext */
    encryptedSecret: text('encrypted_secret').notNull(),
    events: text('events')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index('idx_webhook_endpoints_company_id').on(table.companyId),
  }),
);

// ============================================================================
// WEBHOOK_DELIVERIES TABLE
// ============================================================================

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid')
      .default(sql`gen_random_uuid()`)
      .unique()
      .notNull(),
    endpointId: integer('endpoint_id')
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload'),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    responseTimeMs: integer('response_time_ms'),
    attempt: integer('attempt').default(1).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    /** pending | delivered | failed */
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    /** Controls when this delivery should fire — used for retry scheduling */
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    endpointIdIdx: index('idx_webhook_deliveries_endpoint_id').on(table.endpointId),
    /** Composite index for the retry cron worker query */
    statusScheduledIdx: index('idx_webhook_deliveries_status_scheduled').on(
      table.status,
      table.scheduledAt,
    ),
  }),
);

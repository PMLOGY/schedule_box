/**
 * Analytics Schema
 *
 * Analytics, audit logging, and competitor intelligence:
 * - analytics_events: Behavioral event tracking
 * - audit_logs: System audit trail (survives company deletion)
 * - competitor_data: Competitor intelligence scraping results
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies, users } from './auth';

// ============================================================================
// ANALYTICS_EVENTS TABLE
// ============================================================================

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 30 }),
    entityId: integer('entity_id'),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    properties: jsonb('properties').default({}),
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 (max 15) + IPv6 (max 45)
    userAgent: text('user_agent'),
    sessionId: varchar('session_id', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_analytics_company').on(table.companyId),
    typeIdx: index('idx_analytics_type').on(table.eventType),
    createdIdx: index('idx_analytics_created').on(table.companyId, table.createdAt),
  }),
);

// ============================================================================
// AUDIT_LOGS TABLE
// ============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id, { onDelete: 'set null' }), // Nullable - survives company deletion
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: integer('entity_id'),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 (max 15) + IPv6 (max 45)
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_audit_company').on(table.companyId),
    userIdx: index('idx_audit_user').on(table.userId),
    actionIdx: index('idx_audit_action').on(table.action),
    entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
    createdIdx: index('idx_audit_created').on(table.createdAt),
  }),
);

// ============================================================================
// COMPETITOR_DATA TABLE
// ============================================================================

export const competitorData = pgTable(
  'competitor_data',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    competitorName: varchar('competitor_name', { length: 255 }).notNull(),
    competitorUrl: varchar('competitor_url', { length: 500 }),
    dataType: varchar('data_type', { length: 50 }).notNull(),
    data: jsonb('data').notNull(),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dataTypeCheck: check(
      'competitor_data_type_check',
      sql`${table.dataType} IN ('pricing', 'services', 'reviews', 'availability')`,
    ),
    companyIdx: index('idx_competitor_company').on(table.companyId),
    typeIdx: index('idx_competitor_type').on(table.dataType),
  }),
);

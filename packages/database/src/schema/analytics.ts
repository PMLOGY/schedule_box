/**
 * Analytics Schema
 *
 * Analytics, audit logging, and competitor intelligence:
 * - analytics_events: Behavioral event tracking
 * - audit_logs: System audit trail (survives company deletion)
 * - competitor_data: Competitor intelligence scraping results
 * - competitor_monitors: Admin-configurable competitor monitoring (Phase 14)
 * - analytics_snapshots: Pre-computed KPIs per company per date (Phase 31)
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
  check,
  date,
  numeric,
  unique,
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

// ============================================================================
// COMPETITOR_MONITORS TABLE (Phase 14)
// ============================================================================

export const competitorMonitors = pgTable(
  'competitor_monitors',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    competitorName: varchar('competitor_name', { length: 255 }).notNull(),
    competitorUrl: varchar('competitor_url', { length: 500 }).notNull(),
    scrapeFrequency: varchar('scrape_frequency', { length: 20 }).notNull().default('weekly'),
    isActive: boolean('is_active').notNull().default(true),
    lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    frequencyCheck: check(
      'competitor_monitors_frequency_check',
      sql`${table.scrapeFrequency} IN ('daily', 'weekly', 'monthly')`,
    ),
    companyIdx: index('idx_competitor_monitors_company').on(table.companyId),
  }),
);

// ============================================================================
// ANALYTICS_SNAPSHOTS TABLE (Phase 31)
// Pre-computed daily KPIs per company, refreshed hourly by BullMQ scheduler
// ============================================================================

export const analyticsSnapshots = pgTable(
  'analytics_snapshots',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    snapshotDate: date('snapshot_date').notNull(),
    totalBookings: integer('total_bookings').default(0),
    completedBookings: integer('completed_bookings').default(0),
    cancelledBookings: integer('cancelled_bookings').default(0),
    noShows: integer('no_shows').default(0),
    totalRevenue: numeric('total_revenue', { precision: 12, scale: 2 }).default('0'),
    uniqueCustomers: integer('unique_customers').default(0),
    newCustomers: integer('new_customers').default(0),
    avgBookingValue: numeric('avg_booking_value', { precision: 10, scale: 2 }).default('0'),
    topServiceId: integer('top_service_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyDateUnique: unique('analytics_snapshots_company_date_unique').on(
      table.companyId,
      table.snapshotDate,
    ),
    companyIdx: index('idx_analytics_snapshots_company').on(table.companyId),
    dateIdx: index('idx_analytics_snapshots_date').on(table.snapshotDate),
    companyDateIdx: index('idx_analytics_snapshots_company_date').on(
      table.companyId,
      table.snapshotDate,
    ),
  }),
);

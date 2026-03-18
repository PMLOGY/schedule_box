/**
 * Platform Schema
 *
 * Super-admin and platform-level tables for Phase 47:
 * - feature_flags: Global feature toggles
 * - feature_flag_overrides: Per-company feature flag overrides
 * - platform_broadcasts: Admin-to-user broadcast messages
 * - platform_daily_metrics: Daily aggregated platform metrics
 * - platform_audit_logs: Admin action audit trail
 * - impersonation_sessions: Admin impersonation session tracking
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies, users } from './auth';

// ============================================================================
// FEATURE_FLAGS TABLE
// ============================================================================

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: varchar('description', { length: 500 }),
    globalEnabled: boolean('global_enabled').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('idx_feature_flags_name').on(table.name),
  }),
);

// ============================================================================
// FEATURE_FLAG_OVERRIDES TABLE
// ============================================================================

export const featureFlagOverrides = pgTable(
  'feature_flag_overrides',
  {
    id: serial('id').primaryKey(),
    flagId: integer('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    flagCompanyUnique: unique('feature_flag_overrides_flag_company_unique').on(
      table.flagId,
      table.companyId,
    ),
    flagIdx: index('idx_feature_flag_overrides_flag').on(table.flagId),
    companyIdx: index('idx_feature_flag_overrides_company').on(table.companyId),
  }),
);

// ============================================================================
// PLATFORM_BROADCASTS TABLE
// ============================================================================

export const platformBroadcasts = pgTable(
  'platform_broadcasts',
  {
    id: serial('id').primaryKey(),
    message: text('message').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    audience: varchar('audience', { length: 50 })
      .notNull()
      .$type<'all' | 'free' | 'essential' | 'growth' | 'ai_powered'>(),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scheduledIdx: index('idx_platform_broadcasts_scheduled')
      .on(table.scheduledAt)
      .where(sql`sent_at IS NULL`),
  }),
);

// ============================================================================
// PLATFORM_DAILY_METRICS TABLE
// ============================================================================

export const platformDailyMetrics = pgTable(
  'platform_daily_metrics',
  {
    id: serial('id').primaryKey(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    metricName: varchar('metric_name', { length: 100 }).notNull(),
    metricValue: jsonb('metric_value').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dateMetricUnique: unique('platform_daily_metrics_date_metric_unique').on(
      table.date,
      table.metricName,
    ),
    dateIdx: index('idx_platform_daily_metrics_date').on(table.date),
  }),
);

// ============================================================================
// PLATFORM_AUDIT_LOGS TABLE
// ============================================================================

export const platformAuditLogs = pgTable(
  'platform_audit_logs',
  {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    adminId: integer('admin_id')
      .notNull()
      .references(() => users.id),
    adminUuid: uuid('admin_uuid').notNull(),
    actionType: varchar('action_type', { length: 100 }).notNull(),
    targetEntityType: varchar('target_entity_type', { length: 50 }),
    targetEntityId: varchar('target_entity_id', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    requestId: varchar('request_id', { length: 64 }).notNull(),
    beforeValue: jsonb('before_value'),
    afterValue: jsonb('after_value'),
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    adminIdx: index('idx_platform_audit_logs_admin').on(table.adminId),
    timestampIdx: index('idx_platform_audit_logs_timestamp').on(table.timestamp),
    actionIdx: index('idx_platform_audit_logs_action').on(table.actionType),
  }),
);

// ============================================================================
// IMPERSONATION_SESSIONS TABLE
// ============================================================================

export const impersonationSessions = pgTable(
  'impersonation_sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    adminId: integer('admin_id')
      .notNull()
      .references(() => users.id),
    targetUserId: integer('target_user_id')
      .notNull()
      .references(() => users.id),
    targetCompanyId: integer('target_company_id').references(() => companies.id),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  },
  (table) => ({
    adminIdx: index('idx_impersonation_sessions_admin').on(table.adminId),
    targetIdx: index('idx_impersonation_sessions_target').on(table.targetUserId),
    activeIdx: index('idx_impersonation_sessions_active')
      .on(table.adminId)
      .where(sql`revoked_at IS NULL`),
  }),
);

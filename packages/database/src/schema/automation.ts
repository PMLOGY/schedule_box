/**
 * Automation Schema
 *
 * Rule-based automation system:
 * - automation_rules: Trigger-action rules
 * - automation_logs: Execution history and results
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
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth.js';
import { customers } from './customers.js';

// Note: bookings table reference uses deferred FK pattern
// (parallel plan 02-04/02-05 may not be complete yet)

// ============================================================================
// AUTOMATION_RULES TABLE
// ============================================================================

export const automationRules = pgTable(
  'automation_rules',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    triggerType: varchar('trigger_type', { length: 50 }).notNull(),
    triggerConfig: jsonb('trigger_config').default({}),
    actionType: varchar('action_type', { length: 50 }).notNull(),
    actionConfig: jsonb('action_config').default({}),
    delayMinutes: integer('delay_minutes').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    triggerTypeCheck: check(
      'automation_trigger_type_check',
      sql`${table.triggerType} IN ('booking_created', 'booking_confirmed', 'booking_completed', 'booking_cancelled', 'booking_no_show', 'payment_received', 'customer_created', 'time_before_booking', 'time_after_booking', 'customer_inactive', 'review_received')`,
    ),
    actionTypeCheck: check(
      'automation_action_type_check',
      sql`${table.actionType} IN ('send_email', 'send_sms', 'send_push', 'update_booking_status', 'add_loyalty_points', 'create_task', 'webhook', 'ai_follow_up')`,
    ),
    companyIdx: index('idx_automation_rules_company').on(table.companyId),
    triggerIdx: index('idx_automation_rules_trigger').on(table.triggerType),
  }),
);

// ============================================================================
// AUTOMATION_LOGS TABLE
// ============================================================================

export const automationLogs = pgTable(
  'automation_logs',
  {
    id: serial('id').primaryKey(),
    ruleId: integer('rule_id')
      .notNull()
      .references(() => automationRules.id, { onDelete: 'cascade' }),
    bookingId: integer('booking_id'), // Deferred FK - bookings table in parallel plan
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).default('pending'),
    result: jsonb('result').default({}),
    errorMessage: text('error_message'),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusCheck: check(
      'automation_log_status_check',
      sql`${table.status} IN ('pending', 'executed', 'failed', 'skipped')`,
    ),
    ruleIdx: index('idx_automation_logs_rule').on(table.ruleId),
    statusIdx: index('idx_automation_logs_status').on(table.status),
  }),
);

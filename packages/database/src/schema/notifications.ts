/**
 * Notifications Schema
 *
 * Notification system with smart templating and delivery tracking:
 * - notification_templates: Reusable templates with variable interpolation
 * - notifications: Individual notification instances with lifecycle tracking
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { customers } from './customers';

// Note: bookings table reference uses deferred FK pattern
// (parallel plan 02-04/02-05 may not be complete yet)

// ============================================================================
// NOTIFICATION_TEMPLATES TABLE
// ============================================================================

export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    channel: varchar('channel', { length: 20 }).notNull(),
    subject: varchar('subject', { length: 255 }),
    bodyTemplate: text('body_template').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    typeCheck: check(
      'notification_template_type_check',
      sql`${table.type} IN ('booking_confirmation', 'booking_reminder', 'booking_cancellation', 'payment_confirmation', 'payment_reminder', 'review_request', 'welcome', 'loyalty_update', 'follow_up', 'custom')`,
    ),
    channelCheck: check(
      'notification_template_channel_check',
      sql`${table.channel} IN ('email', 'sms', 'push')`,
    ),
    companyTypeChannelUnique: unique('notification_templates_company_type_channel_unique').on(
      table.companyId,
      table.type,
      table.channel,
    ),
    companyIdx: index('idx_notification_templates_company').on(table.companyId),
  }),
);

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    bookingId: integer('booking_id'), // Deferred FK - bookings table in parallel plan
    templateId: integer('template_id').references(() => notificationTemplates.id, {
      onDelete: 'set null',
    }),
    channel: varchar('channel', { length: 20 }).notNull(),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }),
    body: text('body').notNull(),
    status: varchar('status', { length: 20 }).default('pending'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    channelCheck: check(
      'notification_channel_check',
      sql`${table.channel} IN ('email', 'sms', 'push')`,
    ),
    statusCheck: check(
      'notification_status_check',
      sql`${table.status} IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')`,
    ),
    companyIdx: index('idx_notifications_company').on(table.companyId),
    customerIdx: index('idx_notifications_customer').on(table.customerId),
    bookingIdx: index('idx_notifications_booking').on(table.bookingId),
    statusIdx: index('idx_notifications_status').on(table.status),
    scheduledIdx: index('idx_notifications_scheduled')
      .on(table.scheduledAt)
      .where(sql`status = 'pending'`),
  }),
);

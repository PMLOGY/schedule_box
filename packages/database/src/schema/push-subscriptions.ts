/**
 * Push Subscriptions Schema
 *
 * Stores browser push notification subscriptions per user.
 * Each row represents one browser/device subscription using the Web Push API.
 * A user may have multiple subscriptions (multiple devices/browsers).
 */

import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './auth';

// ============================================================================
// PUSH_SUBSCRIPTIONS TABLE
// ============================================================================

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    keysP256dh: text('keys_p256dh').notNull(),
    keysAuth: text('keys_auth').notNull(),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userEndpointUnique: unique('push_subscriptions_user_endpoint_unique').on(
      table.userId,
      table.endpoint,
    ),
    userIdx: index('idx_push_subscriptions_user').on(table.userId),
  }),
);

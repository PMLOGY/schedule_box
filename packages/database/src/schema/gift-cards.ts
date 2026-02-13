/**
 * Gift Card Schema
 *
 * Gift card management with balance tracking:
 * - gift_cards: Gift card codes with initial/current balance and validity
 * - gift_card_transactions: Purchase, redemption, and refund transaction log
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { customers } from './customers';

// ============================================================================
// GIFT_CARDS TABLE
// ============================================================================

export const giftCards = pgTable(
  'gift_cards',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull().unique(),
    initialBalance: numeric('initial_balance', { precision: 10, scale: 2 }).notNull(),
    currentBalance: numeric('current_balance', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    purchasedByCustomerId: integer('purchased_by_customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    recipientName: varchar('recipient_name', { length: 255 }),
    message: text('message'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    initialBalanceCheck: check(
      'gift_cards_initial_balance_check',
      sql`${table.initialBalance} > 0`,
    ),
    currentBalanceCheck: check(
      'gift_cards_current_balance_check',
      sql`${table.currentBalance} >= 0`,
    ),
    companyIdx: index('idx_gift_cards_company').on(table.companyId),
    // idx_gift_cards_code removed: covered by gift_cards_code_unique
  }),
);

// ============================================================================
// GIFT_CARD_TRANSACTIONS TABLE
// ============================================================================

export const giftCardTransactions = pgTable(
  'gift_card_transactions',
  {
    id: serial('id').primaryKey(),
    giftCardId: integer('gift_card_id')
      .notNull()
      .references(() => giftCards.id, { onDelete: 'cascade' }),
    bookingId: integer('booking_id'),
    type: varchar('type', { length: 20 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    typeCheck: check(
      'gift_card_transactions_type_check',
      sql`${table.type} IN ('purchase', 'redemption', 'refund')`,
    ),
    giftCardIdx: index('idx_gct_gift_card').on(table.giftCardId),
  }),
);

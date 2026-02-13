/**
 * Loyalty Schema
 *
 * Loyalty program management with points, stamps, and tiers:
 * - loyalty_programs: Program configuration (one per company)
 * - loyalty_tiers: Tier definitions with benefits and point thresholds
 * - loyalty_cards: Customer loyalty cards with points/stamps balance
 * - loyalty_transactions: Transaction log for points earned/redeemed
 * - rewards: Redeemable rewards catalog
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
  jsonb,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { customers } from './customers';
import { services } from './services';

// ============================================================================
// LOYALTY_PROGRAMS TABLE
// ============================================================================

export const loyaltyPrograms = pgTable(
  'loyalty_programs',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 20 }).notNull(),
    pointsPerCurrency: numeric('points_per_currency', { precision: 5, scale: 2 }).default('1'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyUnique: unique('loyalty_programs_company_id_unique').on(table.companyId),
    typeCheck: check(
      'loyalty_programs_type_check',
      sql`${table.type} IN ('points', 'stamps', 'tiers')`,
    ),
    // idx_loyalty_programs_company removed: covered by loyalty_programs_company_id_unique
  }),
);

// ============================================================================
// LOYALTY_TIERS TABLE
// ============================================================================

export const loyaltyTiers = pgTable(
  'loyalty_tiers',
  {
    id: serial('id').primaryKey(),
    programId: integer('program_id')
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    minPoints: integer('min_points').notNull().default(0),
    benefits: jsonb('benefits').default('{}'),
    color: varchar('color', { length: 7 }).default('#3B82F6'),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    programIdx: index('idx_loyalty_tiers_program').on(table.programId),
  }),
);

// ============================================================================
// LOYALTY_CARDS TABLE
// ============================================================================

export const loyaltyCards = pgTable(
  'loyalty_cards',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    programId: integer('program_id')
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    cardNumber: varchar('card_number', { length: 50 }).notNull().unique(),
    pointsBalance: integer('points_balance').default(0),
    stampsBalance: integer('stamps_balance').default(0),
    tierId: integer('tier_id').references(() => loyaltyTiers.id, { onDelete: 'set null' }),
    applePassUrl: varchar('apple_pass_url', { length: 500 }),
    googlePassUrl: varchar('google_pass_url', { length: 500 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    programCustomerUnique: unique('loyalty_cards_program_id_customer_id_unique').on(
      table.programId,
      table.customerId,
    ),
    programIdx: index('idx_loyalty_cards_program').on(table.programId),
    customerIdx: index('idx_loyalty_cards_customer').on(table.customerId),
  }),
);

// ============================================================================
// LOYALTY_TRANSACTIONS TABLE
// ============================================================================

export const loyaltyTransactions = pgTable(
  'loyalty_transactions',
  {
    id: serial('id').primaryKey(),
    cardId: integer('card_id')
      .notNull()
      .references(() => loyaltyCards.id, { onDelete: 'cascade' }),
    bookingId: integer('booking_id'),
    type: varchar('type', { length: 20 }).notNull(),
    points: integer('points').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    description: varchar('description', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    typeCheck: check(
      'loyalty_transactions_type_check',
      sql`${table.type} IN ('earn', 'redeem', 'expire', 'adjust', 'stamp')`,
    ),
    cardIdx: index('idx_loyalty_tx_card').on(table.cardId),
    bookingIdx: index('idx_loyalty_tx_booking').on(table.bookingId),
  }),
);

// ============================================================================
// REWARDS TABLE
// ============================================================================

export const rewards = pgTable(
  'rewards',
  {
    id: serial('id').primaryKey(),
    programId: integer('program_id')
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    pointsCost: integer('points_cost').notNull(),
    rewardType: varchar('reward_type', { length: 30 }).notNull(),
    rewardValue: numeric('reward_value', { precision: 10, scale: 2 }),
    applicableServiceId: integer('applicable_service_id').references(() => services.id, {
      onDelete: 'set null',
    }),
    maxRedemptions: integer('max_redemptions'), // NULL = unlimited
    currentRedemptions: integer('current_redemptions').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pointsCostCheck: check('rewards_points_cost_check', sql`${table.pointsCost} > 0`),
    rewardTypeCheck: check(
      'rewards_reward_type_check',
      sql`${table.rewardType} IN ('discount_percentage', 'discount_fixed', 'free_service', 'gift')`,
    ),
    programIdx: index('idx_rewards_program').on(table.programId),
  }),
);

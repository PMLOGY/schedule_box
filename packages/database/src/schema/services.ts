/**
 * Service Schema
 *
 * Service catalog with dynamic pricing:
 * - service_categories: Service category organization
 * - services: Service definitions with pricing, duration, capacity, and video settings
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
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth.js';

// ============================================================================
// SERVICE_CATEGORIES TABLE
// ============================================================================

export const serviceCategories = pgTable(
  'service_categories',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyNameUnique: unique('service_categories_company_id_name_unique').on(
      table.companyId,
      table.name,
    ),
    companyIdx: index('idx_service_categories_company').on(table.companyId),
  }),
);

// ============================================================================
// SERVICES TABLE
// ============================================================================

export const services = pgTable(
  'services',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id').references(() => serviceCategories.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(),
    bufferBeforeMinutes: integer('buffer_before_minutes').default(0),
    bufferAfterMinutes: integer('buffer_after_minutes').default(0),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    // AI dynamic pricing
    dynamicPricingEnabled: boolean('dynamic_pricing_enabled').default(false),
    priceMin: numeric('price_min', { precision: 10, scale: 2 }),
    priceMax: numeric('price_max', { precision: 10, scale: 2 }),
    // Capacity
    maxCapacity: integer('max_capacity').default(1),
    // Online booking settings
    onlineBookingEnabled: boolean('online_booking_enabled').default(true),
    requiresPayment: boolean('requires_payment').default(false),
    cancellationPolicyHours: integer('cancellation_policy_hours').default(24),
    // Video
    isOnline: boolean('is_online').default(false),
    videoProvider: varchar('video_provider', { length: 20 }),
    // Display
    color: varchar('color', { length: 7 }).default('#3B82F6'),
    imageUrl: varchar('image_url', { length: 500 }),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    durationCheck: check('services_duration_minutes_check', sql`${table.durationMinutes} > 0`),
    priceCheck: check('services_price_check', sql`${table.price} >= 0`),
    videoProviderCheck: check(
      'services_video_provider_check',
      sql`${table.videoProvider} IN ('zoom', 'google_meet', 'ms_teams', NULL)`,
    ),
    companyIdx: index('idx_services_company').on(table.companyId),
    categoryIdx: index('idx_services_category').on(table.categoryId),
    activeIdx: index('idx_services_active').on(table.companyId, table.isActive),
  }),
);

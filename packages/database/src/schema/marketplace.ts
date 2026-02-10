/**
 * Marketplace Schema
 *
 * Public marketplace for business discovery:
 * - marketplace_listings: Company listings with geolocation
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
  numeric,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth.js';

// ============================================================================
// MARKETPLACE_LISTINGS TABLE
// ============================================================================

export const marketplaceListings = pgTable(
  'marketplace_listings',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    subcategory: varchar('subcategory', { length: 100 }),
    addressStreet: varchar('address_street', { length: 255 }),
    addressCity: varchar('address_city', { length: 100 }),
    addressZip: varchar('address_zip', { length: 20 }),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    images: text('images')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    averageRating: numeric('average_rating', { precision: 3, scale: 2 }).default('0'),
    reviewCount: integer('review_count').default(0),
    priceRange: varchar('price_range', { length: 10 }),
    featured: boolean('featured').default(false),
    verified: boolean('verified').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    priceRangeCheck: check(
      'marketplace_price_range_check',
      sql`${table.priceRange} IN ('$', '$$', '$$$', '$$$$') OR ${table.priceRange} IS NULL`,
    ),
    companyUnique: unique('marketplace_listings_company_unique').on(table.companyId),
    categoryIdx: index('idx_marketplace_category').on(table.category),
    cityIdx: index('idx_marketplace_city').on(table.addressCity),
    ratingIdx: index('idx_marketplace_rating').on(table.averageRating.desc()),
    geoIdx: index('idx_marketplace_geo').on(table.latitude, table.longitude),
  }),
);

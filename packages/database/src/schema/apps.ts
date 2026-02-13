/**
 * Apps Schema
 *
 * White-label mobile app management:
 * - whitelabel_apps: Custom branded iOS/Android apps per company
 */

import {
  pgTable,
  serial,
  uuid,
  integer,
  varchar,
  timestamp,
  jsonb,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';

// ============================================================================
// WHITELABEL_APPS TABLE
// ============================================================================

export const whitelabelApps = pgTable(
  'whitelabel_apps',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    appName: varchar('app_name', { length: 100 }).notNull(),
    bundleId: varchar('bundle_id', { length: 255 }),
    logoUrl: varchar('logo_url', { length: 500 }),
    primaryColor: varchar('primary_color', { length: 7 }).default('#3B82F6'),
    secondaryColor: varchar('secondary_color', { length: 7 }).default('#1E40AF'),
    features: jsonb('features').default({ booking: true, loyalty: true, push: true }),
    iosStatus: varchar('ios_status', { length: 20 }).default('draft'),
    androidStatus: varchar('android_status', { length: 20 }).default('draft'),
    iosAppStoreUrl: varchar('ios_app_store_url', { length: 500 }),
    androidPlayStoreUrl: varchar('android_play_store_url', { length: 500 }),
    lastBuildAt: timestamp('last_build_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    iosStatusCheck: check(
      'whitelabel_ios_status_check',
      sql`${table.iosStatus} IN ('draft', 'building', 'submitted', 'published', 'rejected')`,
    ),
    androidStatusCheck: check(
      'whitelabel_android_status_check',
      sql`${table.androidStatus} IN ('draft', 'building', 'submitted', 'published', 'rejected')`,
    ),
    companyUnique: unique('whitelabel_apps_company_unique').on(table.companyId),
    // idx_whitelabel_company removed: covered by whitelabel_apps_company_unique
  }),
);

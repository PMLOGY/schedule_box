/**
 * Auth & Tenancy Schema
 *
 * Core authentication and multi-tenancy tables:
 * - companies: Root tenant entity
 * - users: User accounts with OAuth and MFA support
 * - roles: System roles (admin, owner, employee, customer)
 * - permissions: Granular permission definitions
 * - role_permissions: Role-permission junction table
 * - password_history: Password reuse prevention
 * - refresh_tokens: JWT refresh token storage
 * - api_keys: Company API key management
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
  smallint,
  integer,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// COMPANIES TABLE
// ============================================================================

export const companies = pgTable(
  'companies',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    website: varchar('website', { length: 500 }),
    logoUrl: varchar('logo_url', { length: 500 }),
    description: text('description'),
    addressStreet: varchar('address_street', { length: 255 }),
    addressCity: varchar('address_city', { length: 100 }),
    addressZip: varchar('address_zip', { length: 20 }),
    addressCountry: varchar('address_country', { length: 5 }).default('CZ'),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    timezone: varchar('timezone', { length: 50 }).default('Europe/Prague'),
    locale: varchar('locale', { length: 10 }).default('cs-CZ'),
    subscriptionPlan: varchar('subscription_plan', { length: 20 }).default('free'),
    subscriptionValidUntil: timestamp('subscription_valid_until', { withTimezone: true }),
    industryType: varchar('industry_type', { length: 50 }).default('general'),
    industryConfig: jsonb('industry_config').default({}),
    onboardingCompleted: boolean('onboarding_completed').default(false),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    featuresEnabled: jsonb('features_enabled').default({}),
    settings: jsonb('settings').default({}),
    busyAppearanceEnabled: boolean('busy_appearance_enabled').default(false),
    busyAppearancePercent: smallint('busy_appearance_percent').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionPlanCheck: check(
      'subscription_plan_check',
      sql`${table.subscriptionPlan} IN ('free', 'starter', 'professional', 'enterprise')`,
    ),
    industryTypeCheck: check(
      'industry_type_check',
      sql`${table.industryType} IN ('beauty_salon','barbershop','spa_wellness','fitness_gym','yoga_pilates','dance_studio','medical_clinic','veterinary','physiotherapy','psychology','auto_service','cleaning_service','tutoring','photography','consulting','coworking','pet_grooming','tattoo_piercing','escape_room','general')`,
    ),
    busyAppearancePercentCheck: check(
      'busy_appearance_percent_check',
      sql`${table.busyAppearancePercent} BETWEEN 0 AND 50`,
    ),
    slugIdx: index('idx_companies_slug').on(table.slug),
    subscriptionIdx: index('idx_companies_subscription').on(table.subscriptionPlan),
  }),
);

// ============================================================================
// ROLES TABLE
// ============================================================================

export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    description: varchar('description', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    nameCheck: check(
      'role_name_check',
      sql`${table.name} IN ('admin', 'owner', 'employee', 'customer')`,
    ),
  }),
);

// ============================================================================
// PERMISSIONS TABLE
// ============================================================================

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================================================
// ROLE_PERMISSIONS JUNCTION TABLE
// ============================================================================

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
);

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
  unique,
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
    subscriptionPlan: varchar('subscription_plan', { length: 20 })
      .default('free')
      .$type<'free' | 'essential' | 'growth' | 'ai_powered'>(),
    subscriptionValidUntil: timestamp('subscription_valid_until', { withTimezone: true }),
    industryType: varchar('industry_type', { length: 50 }).default('general'),
    industryConfig: jsonb('industry_config').default({}),
    onboardingCompleted: boolean('onboarding_completed').default(false),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedReason: text('suspended_reason'),
    featuresEnabled: jsonb('features_enabled').default({}),
    settings: jsonb('settings').default({}),
    organizationId: integer('organization_id'),
    busyAppearanceEnabled: boolean('busy_appearance_enabled').default(false),
    busyAppearancePercent: smallint('busy_appearance_percent').default(0),
    customMeetingUrl: varchar('custom_meeting_url', { length: 500 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionPlanCheck: check(
      'subscription_plan_check',
      sql`${table.subscriptionPlan} IN ('free', 'essential', 'growth', 'ai_powered')`,
    ),
    industryTypeCheck: check(
      'industry_type_check',
      sql`${table.industryType} IN ('beauty_salon','barbershop','spa_wellness','fitness_gym','yoga_pilates','dance_studio','medical_clinic','veterinary','physiotherapy','psychology','auto_service','cleaning_service','tutoring','photography','consulting','coworking','pet_grooming','tattoo_piercing','escape_room','general')`,
    ),
    busyAppearancePercentCheck: check(
      'busy_appearance_percent_check',
      sql`${table.busyAppearancePercent} BETWEEN 0 AND 50`,
    ),
    // idx_companies_slug removed: covered by companies_slug_unique
    subscriptionIdx: index('idx_companies_subscription').on(table.subscriptionPlan),
    organizationIdx: index('idx_companies_organization').on(table.organizationId),
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

// ============================================================================
// USERS TABLE
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id').references(() => companies.id, { onDelete: 'set null' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    isActive: boolean('is_active').default(true),
    emailVerified: boolean('email_verified').default(false),
    mfaEnabled: boolean('mfa_enabled').default(false),
    mfaSecret: varchar('mfa_secret', { length: 255 }),
    oauthProvider: varchar('oauth_provider', { length: 50 }),
    oauthProviderId: varchar('oauth_provider_id', { length: 255 }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }).defaultNow(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailCompanyUnique: unique('users_email_company_id_unique').on(table.email, table.companyId),
    emailIdx: index('idx_users_email').on(table.email),
    companyIdx: index('idx_users_company').on(table.companyId),
    roleIdx: index('idx_users_role').on(table.roleId),
    oauthIdx: index('idx_users_oauth').on(table.oauthProvider, table.oauthProviderId),
  }),
);

// ============================================================================
// PASSWORD_HISTORY TABLE
// ============================================================================

export const passwordHistory = pgTable(
  'password_history',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_password_history_user').on(table.userId),
  }),
);

// ============================================================================
// REFRESH_TOKENS TABLE
// ============================================================================

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked: boolean('revoked').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_refresh_tokens_user').on(table.userId),
    // idx_refresh_tokens_hash removed: covered by refresh_tokens_token_hash_unique
  }),
);

// ============================================================================
// API_KEYS TABLE
// ============================================================================

export const apiKeys = pgTable(
  'api_keys',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
    keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),
    scopes: text('scopes')
      .array()
      .default(sql`'{}'::text[]`),
    isActive: boolean('is_active').default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_api_keys_company').on(table.companyId),
    // idx_api_keys_hash removed: covered by api_keys_key_hash_unique
  }),
);

/**
 * Organizations Schema
 *
 * Multi-location organization management tables:
 * - organizations: Parent entity grouping multiple company locations
 * - organization_members: Junction table linking users to organizations with roles
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies, users } from './auth';

// ============================================================================
// ORGANIZATIONS TABLE
// ============================================================================

export const organizations = pgTable(
  'organizations',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    ownerUserId: integer('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    maxLocations: integer('max_locations').default(1),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('idx_organizations_slug').on(table.slug),
    ownerIdx: index('idx_organizations_owner').on(table.ownerUserId),
  }),
);

// ============================================================================
// ORGANIZATION_MEMBERS TABLE
// ============================================================================

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: integer('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    roleCheck: check(
      'org_member_role_check',
      sql`${table.role} IN ('franchise_owner', 'location_manager')`,
    ),
    orgUserCompanyUnique: unique('org_members_org_user_company_unique').on(
      table.organizationId,
      table.userId,
      table.companyId,
    ),
    orgIdx: index('idx_org_members_org').on(table.organizationId),
    userIdx: index('idx_org_members_user').on(table.userId),
    companyIdx: index('idx_org_members_company').on(table.companyId),
  }),
);

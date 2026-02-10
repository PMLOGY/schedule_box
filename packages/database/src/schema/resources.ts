/**
 * Resource Schema
 *
 * Resource management for bookings:
 * - resource_types: Resource type categorization (e.g., "Room", "Equipment")
 * - resources: Physical resources (rooms, equipment, etc.)
 * - service_resources: Service-resource assignments with quantity tracking
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
  primaryKey,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth.js';
import { services } from './services.js';

// ============================================================================
// RESOURCE_TYPES TABLE
// ============================================================================

export const resourceTypes = pgTable(
  'resource_types',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyNameUnique: unique('resource_types_company_id_name_unique').on(
      table.companyId,
      table.name,
    ),
  }),
);

// ============================================================================
// RESOURCES TABLE
// ============================================================================

export const resources = pgTable(
  'resources',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    resourceTypeId: integer('resource_type_id').references(() => resourceTypes.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    quantity: integer('quantity').default(1),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    quantityCheck: check('resources_quantity_check', sql`${table.quantity} > 0`),
    companyIdx: index('idx_resources_company').on(table.companyId),
    typeIdx: index('idx_resources_type').on(table.resourceTypeId),
  }),
);

// ============================================================================
// SERVICE_RESOURCES JUNCTION TABLE
// ============================================================================

export const serviceResources = pgTable(
  'service_resources',
  {
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    resourceId: integer('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    quantityNeeded: integer('quantity_needed').default(1),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.serviceId, table.resourceId] }),
  }),
);

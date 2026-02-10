/**
 * Employee Schema
 *
 * Employee/staff management with working hours:
 * - employees: Staff member records
 * - employee_services: Employee-service assignments (which employees can provide which services)
 * - working_hours: Default working hours (company-level or per-employee)
 * - working_hours_overrides: Exceptions and day-off entries
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
  smallint,
  date,
  time,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies, users } from './auth';
import { services } from './services';

// ============================================================================
// EMPLOYEES TABLE
// ============================================================================

export const employees = pgTable(
  'employees',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    title: varchar('title', { length: 100 }),
    bio: text('bio'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    color: varchar('color', { length: 7 }).default('#3B82F6'),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('idx_employees_company').on(table.companyId),
    userIdx: index('idx_employees_user').on(table.userId),
  }),
);

// ============================================================================
// EMPLOYEE_SERVICES JUNCTION TABLE
// ============================================================================

export const employeeServices = pgTable(
  'employee_services',
  {
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.employeeId, table.serviceId] }),
  }),
);

// ============================================================================
// WORKING_HOURS TABLE
// ============================================================================

export const workingHours = pgTable(
  'working_hours',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
    dayOfWeek: smallint('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dayOfWeekCheck: check(
      'working_hours_day_of_week_check',
      sql`${table.dayOfWeek} BETWEEN 0 AND 6`,
    ),
    timeCheck: check('working_hours_time_check', sql`${table.endTime} > ${table.startTime}`),
    companyIdx: index('idx_working_hours_company').on(table.companyId),
    employeeIdx: index('idx_working_hours_employee').on(table.employeeId),
  }),
);

// ============================================================================
// WORKING_HOURS_OVERRIDES TABLE
// ============================================================================

export const workingHoursOverrides = pgTable(
  'working_hours_overrides',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    startTime: time('start_time'),
    endTime: time('end_time'),
    isDayOff: boolean('is_day_off').default(false),
    reason: varchar('reason', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyDateIdx: index('idx_wh_overrides_company_date').on(table.companyId, table.date),
    employeeDateIdx: index('idx_wh_overrides_employee_date').on(table.employeeId, table.date),
  }),
);

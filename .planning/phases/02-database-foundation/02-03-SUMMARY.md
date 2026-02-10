---
phase: 02-database-foundation
plan: 03
subsystem: database
tags: [schema, drizzle-orm, core-entities, multi-tenancy]
dependency_graph:
  requires: [02-02-auth-schema]
  provides: [customers-schema, services-schema, employees-schema, resources-schema]
  affects: [bookings-schema, payments-schema, business-features]
tech_stack:
  added: [drizzle-orm-date-type, drizzle-orm-time-type]
  patterns: [soft-delete-pattern, junction-tables, working-hours-flexibility]
key_files:
  created:
    - packages/database/src/schema/customers.ts
    - packages/database/src/schema/services.ts
    - packages/database/src/schema/employees.ts
    - packages/database/src/schema/resources.ts
  modified:
    - packages/database/src/schema/index.ts
decisions:
  - Implemented soft delete via deletedAt column on customers, services, and employees tables
  - Working hours support both company-level defaults (employeeId NULL) and per-employee overrides
  - Working hours overrides support day-off entries with nullable start/end times
  - Resource quantity tracking supports fractional allocation via quantity_needed field
  - All entity tables include UUID for external API exposure (internal SERIAL IDs never exposed)
metrics:
  duration_seconds: 139
  tasks_completed: 2
  files_created: 4
  files_modified: 1
  commits: 2
  completed_at: 2026-02-10T18:33:07Z
---

# Phase 02 Plan 03: Core Entity Schemas Summary

**One-liner:** Defined 12 core business entity tables (customers, services, employees, resources) with AI fields, dynamic pricing, working hours flexibility, and soft delete support.

## Execution Report

### Tasks Completed

| Task | Name | Status | Commit | Duration |
|------|------|--------|--------|----------|
| 1 | Create customers.ts and services.ts schema files | ✅ Complete | 9ce82a1 | ~90s |
| 2 | Create employees.ts and resources.ts schema files, update barrel export | ✅ Complete | 3ed8d3f | ~49s |

### Verification Results

All verification steps passed:

- ✅ `pnpm --filter @schedulebox/database type-check` passes with zero errors
- ✅ customers.ts exports 3 tables (customers, tags, customerTags)
- ✅ services.ts exports 2 tables (serviceCategories, services)
- ✅ employees.ts exports 4 tables (employees, employeeServices, workingHours, workingHoursOverrides)
- ✅ resources.ts exports 3 tables (resourceTypes, resources, serviceResources)
- ✅ All CHECK constraints present (gender, source, video_provider, day_of_week range, quantity > 0, price >= 0)
- ✅ All unique constraints present (email+company, company+name combos)
- ✅ Cross-file FK references compile correctly (auth → customers, services → employees)

## Implementation Details

### Customers Schema (3 tables)

**customers table:**
- UUID + SERIAL ID pattern for external API security
- AI-computed fields: health_score (0-100), clv_predicted, no_show_count, total_bookings, total_spent
- Marketing fields: marketing_consent, preferred_contact (email/sms/phone), preferred_reminder_minutes
- Soft delete via deletedAt column
- Unique constraint on (email, company_id) for multi-tenancy
- Indexes on company_id, email, phone, user_id, and composite (company_id, health_score) for AI queries

**tags table:**
- Custom tags for customer segmentation
- Unique constraint on (company_id, name)

**customer_tags junction table:**
- Many-to-many relationship between customers and tags
- Composite primary key on (customer_id, tag_id)

### Services Schema (2 tables)

**service_categories table:**
- Service organization and grouping
- Unique constraint on (company_id, name)
- Sort order support for UI display

**services table:**
- Dynamic pricing with price_min, price_max, and dynamic_pricing_enabled flag
- Buffer time management: buffer_before_minutes, buffer_after_minutes
- Video provider support: zoom, google_meet, ms_teams (CHECK constraint)
- Capacity management: max_capacity for group bookings
- Online booking settings: online_booking_enabled, requires_payment, cancellation_policy_hours
- Soft delete via deletedAt column
- Indexes on company_id, category_id, and composite (company_id, is_active)

### Employees Schema (4 tables)

**employees table:**
- Staff member records with optional user account linkage (user_id)
- Display customization: color, avatar_url, sort_order
- Soft delete via deletedAt column

**employee_services junction table:**
- Tracks which employees can provide which services
- Composite primary key on (employee_id, service_id)

**working_hours table:**
- Supports both company-level defaults (employee_id NULL) and per-employee hours
- Day of week: 0-6 (0=Sunday) with CHECK constraint
- Time validation: CHECK (end_time > start_time)
- Uses drizzle-orm time type for start_time and end_time

**working_hours_overrides table:**
- Exceptions to regular working hours
- Supports day-off entries: is_day_off flag with nullable start_time/end_time
- Composite indexes on (company_id, date) and (employee_id, date) for fast lookups

### Resources Schema (3 tables)

**resource_types table:**
- Resource categorization (e.g., "Room", "Equipment", "Vehicle")
- Unique constraint on (company_id, name)

**resources table:**
- Physical resource tracking with quantity management
- CHECK constraint: quantity > 0
- UUID + SERIAL ID pattern for API exposure

**service_resources junction table:**
- Tracks which resources are needed for which services
- quantity_needed field for fractional allocation (e.g., 2 towels per massage service)
- Composite primary key on (service_id, resource_id)

## Schema Statistics

- **Total tables defined:** 12 (customers: 3, services: 2, employees: 4, resources: 3)
- **Total database tables:** 20 (8 auth + 12 core entities)
- **Total FK relationships:** 17 across all core entity tables
- **Total CHECK constraints:** 7 (gender, source, video_provider, health_score, day_of_week, time validation, quantity)
- **Total unique constraints:** 5 (email+company, various company+name combos)
- **Total indexes:** 18 (single-column and composite)
- **Soft delete columns:** 3 (customers, services, employees)

## Deviations from Plan

None - plan executed exactly as written. All 12 tables match the documentation SQL definitions precisely.

## Technical Notes

### Multi-tenancy Enforcement

All tables include `company_id` foreign key with CASCADE delete:
- When a company is deleted, all related records are automatically removed
- RLS policies (to be added in Phase 3) will enforce tenant isolation at the database level

### Drizzle ORM Type Mappings

| SQL Type | Drizzle Type | Usage |
|----------|--------------|-------|
| SERIAL | serial() | Internal IDs |
| UUID | uuid().defaultRandom() | External API IDs |
| TIMESTAMP WITH TIME ZONE | timestamp({ withTimezone: true }) | All timestamps |
| DATE | date() | date_of_birth, working_hours_overrides.date |
| TIME | time() | working hours start/end times |
| NUMERIC(10,2) | numeric({ precision: 10, scale: 2 }) | Prices, CLV |
| SMALLINT | smallint() | health_score, day_of_week |
| TEXT[] | text().array() | (Not used in this plan, auth only) |

### Cross-File Import Pattern

All schema files use `.js` extension in imports (ESM compatibility):
```typescript
import { companies, users } from './auth.js';
import { services } from './services.js';
```

This ensures proper module resolution in both TypeScript compilation and runtime.

## Next Steps

1. Define booking schema (bookings, booking_items, availability tables) - Plan 02-04
2. Define payment schema (invoices, payments, payment_methods) - Plan 02-05
3. Define business feature schemas (notifications, reviews, analytics) - Plan 02-06
4. Generate and apply Drizzle migrations - Plan 02-07
5. Implement RLS policies for tenant isolation - Plan 02-08

## Self-Check

### File Verification

```bash
✓ FOUND: packages/database/src/schema/customers.ts
✓ FOUND: packages/database/src/schema/services.ts
✓ FOUND: packages/database/src/schema/employees.ts
✓ FOUND: packages/database/src/schema/resources.ts
✓ FOUND: packages/database/src/schema/index.ts (modified)
```

### Commit Verification

```bash
✓ FOUND: 9ce82a1 - feat(database): define customers and services schemas
✓ FOUND: 3ed8d3f - feat(database): define employees and resources schemas, update barrel export
```

### Export Verification

```typescript
// packages/database/src/schema/index.ts exports:
export * from './auth.js';           // 8 tables
export * from './customers.js';      // 3 tables
export * from './services.js';       // 2 tables
export * from './employees.js';      // 4 tables
export * from './resources.js';      // 3 tables
// Total: 20 tables
```

## Self-Check: PASSED

All files created, all commits exist, all exports verified. TypeScript compilation successful.

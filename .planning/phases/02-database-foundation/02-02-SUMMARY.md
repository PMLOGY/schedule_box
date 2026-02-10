---
phase: 02-database-foundation
plan: 02
subsystem: database
tags: [auth, tenancy, schema, drizzle-orm]
dependency_graph:
  requires: [drizzle-orm, postgres]
  provides: [auth-schema, companies-table, users-table, roles-permissions]
  affects: [database-migrations, api-auth]
tech_stack:
  added: [drizzle-orm-check-constraints, drizzle-orm-unique-constraints]
  patterns: [multi-tenancy, rbac, oauth-support, mfa-support]
key_files:
  created:
    - packages/database/src/schema/auth.ts
    - packages/database/src/schema/index.ts
  modified: []
decisions:
  - title: "Use Drizzle unique() for composite UNIQUE constraint"
    rationale: "UNIQUE(email, company_id) requires unique() function instead of index()"
    impact: "Ensures proper multi-tenancy email uniqueness at database level"
  - title: "Use text().array() for PostgreSQL text arrays"
    rationale: "API keys scopes field requires PostgreSQL text[] type"
    impact: "Enables flexible scope management with native PostgreSQL array support"
metrics:
  duration: 240s
  completed: 2026-02-10T19:45:00Z
  tasks_completed: 2
  files_created: 2
  commits: 2
---

# Phase 02 Plan 02: Auth & Tenancy Schema Summary

**Complete Drizzle ORM schema definitions for authentication and multi-tenancy tables matching documentation SQL exactly.**

## Objective Achieved

Defined all 8 Auth & Tenancy tables in Drizzle ORM with complete type-safety, matching the documentation SQL schema (lines 954-1103) exactly. This forms the root of the FK dependency tree - all other tables will reference companies (via company_id) or users.

## Tasks Completed

### Task 1: Companies, Roles, Permissions, Role_Permissions Tables
**Commit:** ad21b38

Created `packages/database/src/schema/auth.ts` with the first 4 core tables:

- **companies** (27 columns): Root tenant entity with subscription management, industry configuration, busy appearance feature, and full address/locale support
  - CHECK constraints: subscription_plan, industry_type (20 verticals), busy_appearance_percent (0-50)
  - Indexes: slug, subscription_plan
  - Default values: CZ locale, Prague timezone, free plan

- **roles** (4 columns): System role definitions
  - CHECK constraint: name IN ('admin', 'owner', 'employee', 'customer')
  - Pre-seeded via INSERT statements (documented in SQL)

- **permissions** (4 columns): Granular permission definitions
  - 23 permissions documented (bookings, customers, services, etc.)

- **role_permissions**: Junction table with composite PK
  - FK cascade deletes to roles and permissions
  - Composite primary key on (role_id, permission_id)

### Task 2: Users, Password_History, Refresh_Tokens, API_Keys Tables
**Commit:** d133149

Added the remaining 4 authentication tables and schema barrel export:

- **users** (18 columns): User accounts with comprehensive auth support
  - OAuth integration: oauth_provider, oauth_provider_id
  - MFA support: mfa_enabled, mfa_secret
  - Password tracking: password_hash, password_changed_at
  - UNIQUE constraint: (email, company_id) for multi-tenancy
  - Indexes: email, company_id, role_id, oauth composite
  - FK to companies with SET NULL on delete (users can exist without company)

- **password_history** (4 columns): Password reuse prevention
  - FK to users with CASCADE delete
  - Stores historical password hashes
  - Index on user_id for fast lookup

- **refresh_tokens** (6 columns): JWT refresh token management
  - UNIQUE token_hash for quick validation
  - Revocation support with boolean flag
  - FK to users with CASCADE delete
  - Indexes: user_id, token_hash

- **api_keys** (10 columns): Company API key management
  - PostgreSQL text[] array for flexible scopes
  - Key prefix for identification (e.g., "sb_live_")
  - Last used tracking, expiration support
  - FK to companies with CASCADE delete
  - Indexes: company_id, key_hash

**Schema barrel file:** Created `packages/database/src/schema/index.ts` to re-export all auth tables.

## Verification Results

✅ TypeScript compilation: PASSED (0 errors)
✅ 8 tables exported: companies, roles, permissions, rolePermissions, users, passwordHistory, refreshTokens, apiKeys
✅ All CHECK constraints present: subscription_plan, industry_type, busy_appearance_percent, role name
✅ All indexes match documentation: 12 indexes across 8 tables
✅ FK relationships correct: 7 foreign key relationships with proper onDelete behaviors
✅ Column counts match: All 27 companies columns, 18 users columns, etc.

## Technical Implementation Details

**Drizzle ORM patterns used:**
- `pgTable()` for table definitions
- `serial()` for auto-increment SERIAL primary keys
- `uuid().defaultRandom()` for UUID columns with PostgreSQL uuid_generate_v4()
- `timestamp({ withTimezone: true })` for TIMESTAMPTZ
- `jsonb()` for JSON storage (industry_config, settings, features_enabled)
- `check()` with sql template for CHECK constraints
- `unique()` for multi-column UNIQUE constraints
- `index()` for performance indexes
- `references()` with onDelete for FK relationships
- `text().array()` for PostgreSQL text[] arrays
- `.default()` for column defaults including SQL expressions

**Naming conventions:**
- TypeScript properties: camelCase (e.g., `companyId`, `subscriptionPlan`)
- SQL columns: snake_case (e.g., `company_id`, `subscription_plan`)
- Indexes: `idx_tablename_column` for regular indexes
- Constraints: descriptive names (e.g., `subscription_plan_check`)

## Deviations from Plan

None - plan executed exactly as written. All 8 tables defined with complete columns, indexes, constraints, and defaults matching documentation SQL.

## Key Decisions

1. **UNIQUE constraint implementation**: Used Drizzle's `unique()` function instead of `index()` for the (email, company_id) constraint on users table, ensuring proper multi-tenancy email uniqueness at the database level.

2. **Text array type**: Used `text().array()` with `.default(sql`'{}'::text[]`)` for api_keys.scopes to match PostgreSQL text[] array type exactly as documented.

3. **Import organization**: Imported `unique` constraint function alongside other pg-core utilities for proper UNIQUE constraint support.

## Impact & Next Steps

**Enables:**
- Plan 02-03: Booking & Scheduling schema (depends on companies, users)
- Plan 02-04: Customer & Services schema (depends on companies)
- Plan 02-05: Payment & Loyalty schema (depends on companies)
- Migration generation via `drizzle-kit generate`

**Dependencies satisfied:**
- All auth tables now available for FK references
- companies.id is the root tenant identifier
- users.id available for created_by/updated_by tracking
- roles and permissions ready for RBAC implementation

**Database migration ready:** Next step is to generate Drizzle migration SQL from these schema definitions.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| packages/database/src/schema/auth.ts | 246 | Complete auth & tenancy table definitions |
| packages/database/src/schema/index.ts | 7 | Schema barrel re-export |

## Self-Check: PASSED

**Created files verified:**
- ✅ `packages/database/src/schema/auth.ts` exists
- ✅ `packages/database/src/schema/index.ts` exists

**Commits verified:**
- ✅ ad21b38: feat(database): define companies, roles, permissions, role_permissions tables
- ✅ d133149: feat(database): add users, password_history, refresh_tokens, api_keys tables

**Exports verified:**
- ✅ 8 tables exported: apiKeys, companies, passwordHistory, permissions, refreshTokens, rolePermissions, roles, users

All planned artifacts created and committed successfully.

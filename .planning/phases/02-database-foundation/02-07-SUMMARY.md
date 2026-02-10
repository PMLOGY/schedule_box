---
phase: 02-database-foundation
plan: 07
subsystem: database
tags:
  - rls
  - security
  - multi-tenancy
  - postgresql
dependency-graph:
  requires:
    - 02-01-PLAN.md (Drizzle ORM infrastructure)
    - 02-02-PLAN.md (Auth & Tenancy schema - companies, users)
    - 02-03-PLAN.md (Core Entity schemas - customers, services, employees, resources)
    - 02-04-PLAN.md (Bookings & Payments schema)
    - 02-05-PLAN.md (Business Features schema)
    - 02-06-PLAN.md (Platform Tables schema)
  provides:
    - RLS helper functions (current_company_id, current_user_role, current_user_id)
    - Tenant isolation policies for all tables with company_id
    - Admin bypass policies for super-admin access
    - Customer self-access policy for bookings
  affects:
    - 02-08-PLAN.md (Migration generation will include RLS SQL files)
tech-stack:
  added:
    - PostgreSQL Row Level Security (RLS)
    - Session variable-based tenant isolation
  patterns:
    - SECURITY DEFINER functions for session variable access
    - STABLE functions (read-only, transaction-scoped)
    - Dual policy pattern (tenant_isolation + admin_bypass)
    - Special policy for customer self-access
key-files:
  created:
    - packages/database/src/rls/functions.sql
    - packages/database/src/rls/policies.sql
  modified: []
decisions:
  - "RLS enabled on 29 tables with company_id column"
  - "Junction tables skip RLS - accessed through parent FK relationships"
  - "Global tables (roles, permissions, ai_model_metrics) skip RLS"
  - "User-scoped tables (password_history, refresh_tokens) skip RLS"
  - "audit_logs uses nullable company_id to survive company deletion"
  - "Customer policy allows SELECT on own bookings via customer.user_id match"
metrics:
  duration: 146s
  completed: 2026-02-10T19:49:06Z
  tasks: 1
  commits: 1
  files: 2
---

# Phase 02 Plan 07: Row Level Security Summary

**Database-level multi-tenant isolation with RLS helper functions and tenant isolation policies for 29 tables with company_id.**

## What Was Built

Created SQL files for PostgreSQL Row Level Security (RLS) enforcement:

1. **functions.sql** — 3 helper functions for session variable access
   - `current_company_id()`: Reads app.company_id session variable
   - `current_user_role()`: Reads app.user_role session variable
   - `current_user_id()`: Reads app.user_id session variable
   - All functions are SECURITY DEFINER and STABLE

2. **policies.sql** — RLS policies for 29 tables
   - ENABLE ROW LEVEL SECURITY for each table with company_id
   - tenant_isolation policy: `WHERE company_id = current_company_id()`
   - admin_bypass policy: `WHERE current_user_role() = 'admin'`
   - customer_own_bookings policy: Customer SELECT access to own bookings

## Tables with RLS (29)

| Category | Tables |
|----------|--------|
| Auth | users, api_keys |
| Entities | customers, tags, service_categories, services, employees, working_hours, working_hours_overrides, resource_types, resources |
| Bookings | bookings, availability_slots |
| Payments | payments, invoices |
| Business | coupons, gift_cards, loyalty_programs, notification_templates, notifications, reviews |
| Platform | ai_predictions, marketplace_listings, video_meetings, whitelabel_apps, automation_rules, analytics_events, audit_logs, competitor_data |

## Tables WITHOUT RLS (17)

| Table(s) | Reason |
|----------|--------|
| companies | Root tenant table, no company_id |
| roles, permissions, role_permissions | Global system tables |
| password_history, refresh_tokens | User-scoped, not tenant-scoped |
| customer_tags, employee_services, service_resources, booking_resources | Junction tables - accessed through parent FK |
| loyalty_tiers, loyalty_cards, loyalty_transactions, rewards | Accessed through loyalty_programs FK |
| coupon_usage, gift_card_transactions | Accessed through parent (coupon/gift_card) FK |
| automation_logs | Accessed through automation_rules FK |
| ai_model_metrics | Global ML metrics table |

## Security Model

```sql
-- Application sets session variables on connection
SET app.company_id = 123;
SET app.user_role = 'owner';
SET app.user_id = 456;

-- RLS policies enforce isolation
-- Owner/employee queries: WHERE company_id = 123
-- Admin queries: Bypass all RLS
-- Customer queries: Access own bookings via user_id match
```

## Policy Patterns

1. **Tenant Isolation (29 policies)**
   ```sql
   CREATE POLICY tenant_isolation_{table} ON {table}
     USING (company_id = current_company_id());
   ```

2. **Admin Bypass (29 policies)**
   ```sql
   CREATE POLICY admin_bypass_{table} ON {table}
     USING (current_user_role() = 'admin');
   ```

3. **Customer Self-Access (1 policy)**
   ```sql
   CREATE POLICY customer_own_bookings ON bookings
     FOR SELECT
     USING (
       current_user_role() = 'customer'
       AND customer_id IN (
         SELECT id FROM customers WHERE user_id = current_user_id()
       )
     );
   ```

## Edge Cases Handled

| Case | Solution |
|------|----------|
| audit_logs survives company deletion | company_id nullable, policy allows NULL |
| Junction tables without company_id | Skip RLS - parent FK enforces isolation |
| Global metrics (ai_model_metrics) | No RLS - system-wide data |
| Customer booking access | Special SELECT policy via user_id match |

## Deviations from Plan

None - plan executed exactly as written.

## File Structure

```
packages/database/src/
└── rls/
    ├── functions.sql    (37 lines, 3 functions)
    └── policies.sql     (378 lines, 59 policies for 29 tables)
```

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 54e90a0 | feat(database): add constraints and indexes for data integrity | packages/database/src/rls/functions.sql, packages/database/src/rls/policies.sql |

*Note: RLS files were committed alongside other database functions in a combined commit.*

## Next Steps (Plan 02-08)

1. Generate Drizzle migrations from schema files
2. Include RLS SQL files in migration via custom SQL execution
3. Apply btree_gist extension for exclusion constraints
4. Run migrations against PostgreSQL database
5. Verify RLS policies active with test queries

## Self-Check: PASSED

✅ functions.sql exists with 3 helper functions
✅ policies.sql exists with 29 ALTER TABLE + 59 CREATE POLICY statements
✅ Commit 54e90a0 includes both RLS files
✅ All tables with company_id have RLS enabled
✅ Documentation explains which tables skip RLS and why

---
phase: 02-database-foundation
plan: 09
subsystem: database
tags: [triggers, constraints, indexes, double-booking, audit-trail, soft-delete]
dependency_graph:
  requires: ['02-02', '02-03', '02-04', '02-05', '02-06']
  provides: ['database-triggers', 'double-booking-prevention', 'audit-logging', 'soft-delete-indexes']
  affects: ['02-08-migration']
tech_stack:
  added: ['btree_gist', 'tstzrange', 'exclusion-constraints', 'partial-indexes']
  patterns: ['database-triggers', 'audit-trail', 'soft-delete', 'auto-update-timestamps']
key_files:
  created:
    - packages/database/src/functions/updated-at.sql
    - packages/database/src/functions/audit-trail.sql
    - packages/database/src/functions/customer-metrics.sql
    - packages/database/src/functions/marketplace-rating.sql
    - packages/database/src/functions/coupon-usage.sql
    - packages/database/src/functions/double-booking.sql
    - packages/database/src/functions/soft-delete.sql
    - packages/database/src/functions/deferred-fks.sql
  modified: []
decisions:
  - summary: "btree_gist exclusion constraint on bookings for double-booking prevention"
    rationale: "Defense-in-depth: DB-level constraint prevents overlapping bookings even if application logic fails"
    alternatives: ["Application-level locking only", "Advisory locks without constraint"]
  - summary: "Partial indexes on deleted_at IS NULL for soft-delete pattern"
    rationale: "Optimize queries on active records; deleted_at columns already in Drizzle schemas"
    alternatives: ["Full indexes", "No special indexes for soft delete"]
  - summary: "Dynamic trigger application via DO $$ loop for updated_at"
    rationale: "Automatically applies to all tables with updated_at column, reduces maintenance"
    alternatives: ["Manual trigger creation per table"]
  - summary: "Audit trail on 5 critical tables only"
    rationale: "Balance between audit coverage and performance; captures most business-critical changes"
    alternatives: ["All tables", "No audit trail", "Application-level audit only"]
metrics:
  duration: 113
  completed_at: "2026-02-10T19:48:47Z"
  tasks_completed: 2
  files_created: 8
  commits: 2
---

# Phase 02 Plan 09: Database Functions & Constraints Summary

**One-liner:** Database trigger functions, btree_gist exclusion constraint for double-booking prevention, partial indexes for soft delete, and deferred FK constraints for bookings cross-references

## What Was Built

Created 8 SQL function/constraint files in `packages/database/src/functions/` directory:

### Trigger Functions (5 files)
1. **updated-at.sql**: Auto-update trigger that sets `updated_at = CURRENT_TIMESTAMP` on every UPDATE. Applied dynamically to all tables with `updated_at` column via DO $$ loop.

2. **audit-trail.sql**: Audit logging trigger that captures INSERT, UPDATE, DELETE operations on 5 critical tables (bookings, customers, services, employees, payments). Stores old/new values as JSONB, reads session variables for company_id and user_id.

3. **customer-metrics.sql**: Recalculates customer aggregates (total_bookings, no_show_count, total_spent, last_visit_at) on booking changes (INSERT, UPDATE, DELETE).

4. **marketplace-rating.sql**: Updates marketplace listing average_rating and review_count when reviews are added, modified, or deleted. Only counts published reviews.

5. **coupon-usage.sql**: Increments `coupons.current_uses` counter when a coupon is used (INSERT on coupon_usage table).

### Constraints & Indexes (3 files)
6. **double-booking.sql**:
   - Enables btree_gist extension
   - Creates exclusion constraint `no_overlapping_bookings` using GIST index
   - Prevents overlapping bookings for same employee using tstzrange overlap detection
   - Excludes cancelled bookings from constraint

7. **soft-delete.sql**:
   - 6 partial indexes for active records (WHERE deleted_at IS NULL)
   - Indexes on: bookings, customers, services, employees, payments, reviews
   - NOTE: deleted_at columns already defined in Drizzle schemas (plans 02-03, 02-04, 02-06)

8. **deferred-fks.sql**:
   - 3 foreign key constraints on bookings table
   - Links to Wave 2 tables: coupons, gift_cards, video_meetings
   - ON DELETE SET NULL behavior

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### 1. Exclusion Constraint Syntax
**Decision:** Used `WHERE (status <> 'cancelled')` instead of `WHERE (status NOT IN ('cancelled'))`
**Reason:** PostgreSQL exclusion constraints support `<>` operator in WHERE clause; NOT IN may have syntax limitations
**Impact:** Functionally equivalent, clearer syntax

### 2. Session Variable Handling in Audit Trail
**Decision:** Used `current_setting('app.*', TRUE)` with TRUE flag for missing-ok behavior
**Reason:** Prevents errors if session variables not set; audit still created with NULL user_id
**Impact:** More robust in development/testing environments

### 3. Trigger Return Values
**Decision:** `update_customer_metrics()` returns NEW instead of NULL
**Reason:** AFTER triggers should return non-NULL to avoid confusion; return value ignored but convention is to return NEW/OLD
**Impact:** Follows PostgreSQL best practices

## Verification Results

### File Creation
- [x] All 8 SQL files exist in `packages/database/src/functions/`
- [x] updated-at.sql has trigger function and dynamic DO $$ loop
- [x] audit-trail.sql applied to 5 critical tables
- [x] customer-metrics.sql triggers on bookings
- [x] marketplace-rating.sql triggers on reviews
- [x] coupon-usage.sql triggers on coupon_usage
- [x] double-booking.sql has btree_gist extension and exclusion constraint
- [x] soft-delete.sql has 6 partial indexes (no ALTER TABLE for deleted_at columns)
- [x] deferred-fks.sql has 3 FK constraints

### Content Verification
```bash
# All required functions/constraints found
✓ btree_gist extension
✓ update_updated_at_column()
✓ audit_log_changes()
✓ update_customer_metrics()
✓ update_marketplace_rating()
✓ increment_coupon_usage()
✓ idx_bookings_active partial index
✓ fk_bookings_coupon constraint
```

## Next Steps

**Immediate:**
- Plan 02-08: Generate Drizzle migrations and apply these SQL files to PostgreSQL
- Verify exclusion constraint prevents double-booking in migration test

**Future:**
- Plan 02-10 (if exists): RLS policies
- Phase 03: API endpoints will set session variables for audit trail (app.company_id, app.user_id, app.ip_address, app.user_agent)

## Dependencies

**Requires:**
- 02-02: Auth & tenancy schema (companies, users)
- 02-03: Core entities (customers, services, employees)
- 02-04: Bookings & payments schema
- 02-05: Business features (coupons, gift_cards, reviews, loyalty programs)
- 02-06: Platform tables (audit_logs, marketplace_listings, video_meetings, notifications)

**Provides:**
- Trigger functions ready for migration application
- Double-booking prevention constraint
- Audit trail infrastructure
- Soft delete optimization via partial indexes
- Deferred FK constraints for Wave 2 cross-references

**Affects:**
- 02-08: Migration script will execute these SQL files after table creation

## Self-Check: PASSED

### Created Files Verification
```bash
✓ FOUND: packages/database/src/functions/updated-at.sql
✓ FOUND: packages/database/src/functions/audit-trail.sql
✓ FOUND: packages/database/src/functions/customer-metrics.sql
✓ FOUND: packages/database/src/functions/marketplace-rating.sql
✓ FOUND: packages/database/src/functions/coupon-usage.sql
✓ FOUND: packages/database/src/functions/double-booking.sql
✓ FOUND: packages/database/src/functions/soft-delete.sql
✓ FOUND: packages/database/src/functions/deferred-fks.sql
```

### Commits Verification
```bash
✓ FOUND: 2a264d2 (Task 1: trigger functions)
✓ FOUND: 54e90a0 (Task 2: constraints and indexes)
```

All verification checks passed. Files created and committed successfully.

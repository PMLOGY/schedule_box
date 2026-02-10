---
phase: 02-database-foundation
plan: 04
subsystem: database
tags: [schema, bookings, payments, drizzle-orm]
dependency_graph:
  requires: [02-02-auth, 02-03-entities]
  provides: [bookings-schema, payments-schema]
  affects: [migrations, api-endpoints]
tech_stack:
  added: []
  patterns: [deferred-fk, composite-index, unique-constraint, soft-delete]
key_files:
  created:
    - packages/database/src/schema/bookings.ts
    - packages/database/src/schema/payments.ts
  modified:
    - packages/database/src/schema/index.ts
decisions: []
metrics:
  duration_seconds: 328
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 2
  completed_at: '2026-02-10T18:41:27Z'
---

# Phase 02 Plan 04: Bookings & Payments Schema Summary

**One-liner:** Core booking and payment schema with pricing snapshots, AI predictions, gateway integration, and company-scoped invoice numbering

## What Was Built

Created 5 critical tables for booking management and payment processing:

**Bookings Group (3 tables):**
- `bookings`: Main reservation table with pricing snapshots, AI no-show predictions, cancellation tracking, and soft delete support
- `booking_resources`: Junction table linking bookings to resources with quantity tracking
- `availability_slots`: Precomputed availability slots for fast date/employee lookup

**Payments Group (2 tables):**
- `payments`: Payment transactions with gateway integration (Comgate, QRComat, cash, bank transfer, gift card), idempotency tracking, and refund support
- `invoices`: Invoice records with company-scoped unique numbering and PDF URL storage

## Key Technical Details

**Deferred FK Pattern:**
- `bookings.coupon_id`, `bookings.gift_card_id`, and `bookings.video_meeting_id` columns created as plain integers WITHOUT FK constraints
- Actual FK constraints deferred to plan 02-09 (Wave 3) because referenced tables are defined in parallel Wave 2 plans (02-05, 02-06)
- This allows plans 02-04, 02-05, 02-06 to run concurrently without dependency issues

**Booking Features:**
- 8 booking sources: online, admin, phone, walk_in, voice_ai, marketplace, api, widget
- 5 booking statuses: pending, confirmed, cancelled, completed, no_show
- Pricing snapshot fields capture price, currency, discount, coupon, and gift card at booking time
- AI integration via `no_show_probability` field for predictive analytics
- Cancellation tracking with timestamp, reason, and cancelled_by (customer/employee/admin/system)
- 7 indexes for query optimization on company, customer, service, employee, start time, status, and date ranges

**Payment Features:**
- 5 payment statuses: pending, paid, failed, refunded, partially_refunded
- 5 gateway types: comgate, qrcomat, cash, bank_transfer, gift_card
- Gateway transaction ID + response JSONB for idempotency and debugging
- Composite index on (gateway, gateway_transaction_id) for fast duplicate detection
- Refund support with amount and reason tracking

**Invoice Features:**
- Unique constraint on (company_id, invoice_number) enforces per-company numbering
- Default `issued_at` to CURRENT_DATE for automatic timestamp
- Status tracking: draft, issued, paid, cancelled
- PDF URL storage for generated invoices

## Verification Results

- [x] TypeScript compilation passes (`pnpm --filter @schedulebox/database type-check`)
- [x] bookings.ts exports 3 tables (bookings, bookingResources, availabilitySlots)
- [x] payments.ts exports 2 tables (payments, invoices)
- [x] All CHECK constraints present (booking status/source, payment status/gateway, invoice status)
- [x] Booking table has 7 indexes matching documentation
- [x] Payment gateway_tx composite index exists
- [x] Invoice company+number unique constraint exists
- [x] Cross-schema FK imports compile correctly
- [x] Schema index updated to export bookings and payments modules

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed corrupted index.ts from previous run**
- **Found during:** Task 1 type-check
- **Issue:** index.ts contained exports for non-existent files (notifications, reviews, ai, marketplace, video, apps, automation, analytics) from a previous incomplete execution
- **Fix:** Removed invalid exports, restored to correct state (only auth, customers, services, employees, resources)
- **Files modified:** packages/database/src/schema/index.ts
- **Commit:** c6bf607 (Task 1)

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create bookings.ts with 3 tables | c6bf607 | bookings.ts |
| 2 | Create payments.ts, update index | 735371b | payments.ts, index.ts |

## Self-Check: PASSED

All created files verified:
- ✅ packages/database/src/schema/bookings.ts (exists)
- ✅ packages/database/src/schema/payments.ts (exists)

All commits verified:
- ✅ c6bf607 (Task 1: bookings schema)
- ✅ 735371b (Task 2: payments schema)

## Next Steps

Plan 02-04 complete. Ready to proceed with:
- Plan 02-05: Coupons & Gift Cards schema (Wave 2)
- Plan 02-06: Video Meetings schema (Wave 2)
- Plan 02-09: Deferred FK migration (Wave 3) - will add FK constraints for coupon_id, gift_card_id, video_meeting_id

## Stats

- Duration: 5m 28s
- Tasks: 2/2 (100%)
- Files: 2 created, 1 modified
- Commits: 2
- Tables: 5 (25 total in database)
- Indexes: 14 (bookings: 7, booking_resources: 2, availability_slots: 2, payments: 5, invoices: 2)
- CHECK constraints: 8
- Unique constraints: 3

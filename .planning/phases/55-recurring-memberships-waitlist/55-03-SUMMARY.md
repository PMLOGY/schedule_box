---
phase: "55"
plan: "03"
subsystem: memberships
tags: [memberships, api, crud, booking-validation, punch-card, customer-ui]
dependency_graph:
  requires: ["55-01"]
  provides: ["membership-types-api", "customer-memberships-api", "booking-membership-validation", "customer-membership-ui"]
  affects: ["booking-service", "customer-detail-page"]
tech_stack:
  added: []
  patterns: ["service-layer", "tenant-isolation", "uuid-resolution", "createRouteHandler"]
key_files:
  created:
    - apps/web/validations/membership.ts
    - apps/web/lib/membership/membership-service.ts
    - apps/web/app/api/v1/memberships/route.ts
    - apps/web/app/api/v1/memberships/[id]/route.ts
    - apps/web/app/api/v1/customers/[id]/memberships/route.ts
    - apps/web/components/customers/customer-memberships.tsx
  modified:
    - apps/web/lib/booking/booking-service.ts
    - apps/web/app/[locale]/(dashboard)/customers/[id]/page.tsx
decisions:
  - "Moved Zod .default() defaults to service layer to avoid ZodEffects type incompatibility with createRouteHandler generic"
  - "Punch card punchesIncluded validation enforced in service layer instead of Zod .refine()"
  - "Membership validation at booking time is non-blocking (fire-and-forget) - does not prevent booking if no membership"
  - "Used BOOKINGS_READ/CREATE permissions for membership routes since no dedicated MEMBERSHIPS permission exists"
metrics:
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 55 Plan 03: Memberships API + Booking Validation + Customer Detail UI Summary

Membership types CRUD, customer assignment, booking-time punch card decrement, and customer detail UI with status badges and progress bars.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create membership service layer and API routes | bc25de0 | membership-service.ts, validations/membership.ts, 3 API route files |
| 2 | Add membership display to customer detail page | bc25de0 | customer-memberships.tsx, customers/[id]/page.tsx |

## What Was Built

### Task 1: Membership Service Layer + API Routes

**Validation schemas** (`validations/membership.ts`):
- `membershipTypeCreateSchema` - name, type (monthly/annual/punch_card), price, currency, punchesIncluded, durationDays, serviceIds, isActive
- `membershipTypeUpdateSchema` - partial update
- `customerMembershipAssignSchema` - membershipTypeId, startDate, optional endDate

**Service layer** (`lib/membership/membership-service.ts`):
- `createMembershipType` - auto-calculates durationDays (30 for monthly, 365 for annual)
- `updateMembershipType` / `deleteMembershipType` (soft delete via isActive=false)
- `listMembershipTypes` / `getMembershipType` - tenant-scoped queries
- `assignMembership` - resolves UUIDs, calculates endDate, sets remainingUses for punch cards
- `listCustomerMemberships` - joins with membershipTypes for enriched response
- `validateMembershipForBooking` - checks active memberships, service coverage, punch card uses
- `decrementPunchCard` / `decrementPunchCardByUuid` - atomic decrement with auto-expire at 0

**API routes**:
- `GET/POST /api/v1/memberships` - list/create membership types
- `GET/PUT/DELETE /api/v1/memberships/[id]` - individual type CRUD
- `GET/POST /api/v1/customers/[id]/memberships` - list/assign customer memberships

**Booking integration** (`lib/booking/booking-service.ts`):
- After booking creation, validates membership and decrements punch card if applicable
- Non-blocking: failures logged but do not prevent booking

### Task 2: Customer Detail UI

**CustomerMemberships component** (`components/customers/customer-memberships.tsx`):
- Displays active memberships with status badges (green/red/gray/amber)
- Punch card progress bar showing remaining/total uses
- Monthly/annual memberships show days remaining with warning for < 7 days
- Empty state with CTA button to assign membership
- Assign dialog with membership type dropdown and start date picker
- Czech locale labels throughout

**Customer detail page** updated to include membership section below tabs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Zod .default() type incompatibility with createRouteHandler**
- **Found during:** Task 1
- **Issue:** `z.string().default('CZK')` creates ZodDefault which wraps as ZodEffects, causing input/output type mismatch with `createRouteHandler<TBody>` generic
- **Fix:** Removed `.default()` from Zod schema, moved default value handling to service layer
- **Files modified:** validations/membership.ts, lib/membership/membership-service.ts

**2. [Rule 1 - Bug] ESLint errors in component**
- **Found during:** Task 2 (commit hook)
- **Issue:** Unused variables, missing eslint-disable for exhaustive-deps
- **Fix:** Removed unused `punchUsed` variable, used bare `catch` block, added eslint-disable-line
- **Files modified:** components/customers/customer-memberships.tsx

## Verification

- TypeScript compiles with no membership-related errors (pre-existing errors in unrelated files only)
- All API routes follow createRouteHandler pattern with auth and tenant isolation
- Membership service exports: createMembershipType, assignMembership, validateMembershipForBooking, decrementPunchCard
- Booking integration non-blocking with try/catch
- Customer detail page renders CustomerMemberships component

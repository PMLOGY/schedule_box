---
phase: 08-crm-marketing
plan: 01
subsystem: CRM & Marketing
tags: [coupons, discounts, validation, crud, backend]
dependency_graph:
  requires:
    - "03-03: Auth middleware and RBAC"
    - "02-05: Coupons schema"
    - "03-01: Error handling and response utilities"
  provides:
    - "Coupon CRUD API (list, create, get, update, delete)"
    - "Coupon validation endpoint for booking flow"
  affects:
    - "Booking flow (coupon application)"
    - "Payment calculation (discount application)"
tech_stack:
  added: []
  patterns:
    - "Zod validation with .transform() for code normalization"
    - "Multi-condition validation (5 checks) in single endpoint"
    - "UUID to SERIAL ID resolution for usage tracking"
key_files:
  created:
    - "apps/web/validations/coupon.ts"
    - "apps/web/app/api/v1/coupons/route.ts"
    - "apps/web/app/api/v1/coupons/[id]/route.ts"
    - "apps/web/app/api/v1/coupons/validate/route.ts"
  modified: []
decisions:
  - "Coupon codes normalized to uppercase for case-insensitive matching via Zod .transform()"
  - "Validation endpoint returns {valid: false, message: string} for all failure cases (user-friendly)"
  - "Per-customer usage tracking requires UUID to SERIAL ID resolution (customer lookup)"
  - "Service applicability uses integer array (applicableServiceIds) - null means all services"
  - "Hard delete for coupons (CASCADE removes coupon_usage records automatically)"
metrics:
  duration: 352s
  tasks_completed: 2
  files_created: 4
  commits: 2
  lines_added: ~350
  completed_at: "2026-02-11T16:44:51Z"
---

# Phase 8 Plan 01: Coupon CRUD and Validation Summary

**Coupon management API with discount validation for booking flow**

## What Was Built

Implemented complete coupon CRUD API and validation endpoint enabling business owners to create promotional discount codes and validate them at booking time:

1. **Coupon CRUD Operations** (commit 10f5377)
   - GET /api/v1/coupons - List with pagination, search (code/description), is_active filter
   - POST /api/v1/coupons - Create with duplicate code check (unique per company)
   - GET /api/v1/coupons/[id] - Get coupon details by UUID
   - PUT /api/v1/coupons/[id] - Update with duplicate code check on code change
   - DELETE /api/v1/coupons/[id] - Hard delete with CASCADE (removes coupon_usage records)

2. **Coupon Validation Endpoint** (commit 70edf7d)
   - POST /api/v1/coupons/validate - Validates coupon for booking application
   - Checks 5 conditions: active status, expiration dates, global usage limit, per-customer usage limit, service applicability
   - Returns detailed validation result with discount info on success
   - User-friendly error messages for each failure condition

## Key Implementation Details

### Code Normalization
- Coupon codes transformed to uppercase in Zod validation schema
- Enables case-insensitive matching without database collation changes
- Applied in both create and validate schemas

### Validation Logic
The validation endpoint performs 5 checks in order:
1. **Active status** - Coupon must be active and exist
2. **Valid from** - Current time must be >= validFrom (if set)
3. **Valid until** - Current time must be <= validUntil (if set)
4. **Global usage** - currentUses must be < maxUses (if maxUses not null)
5. **Per-customer usage** - Customer usage count must be < maxUsesPerCustomer
6. **Service applicability** - Service ID must be in applicableServiceIds array (if not null)

### UUID to SERIAL Mapping
- Validation endpoint accepts customer UUID (public ID)
- Resolves to internal SERIAL ID via customers table lookup
- Required for coupon_usage table queries (uses SERIAL FKs internally)

### Service Applicability
- `applicableServiceIds` array stores integer service IDs
- NULL value means coupon applies to all services
- Empty array would mean coupon applies to no services (validated at create)

### Response Format
All validation failures return same structure:
```json
{
  "data": {
    "valid": false,
    "message": "User-friendly error message"
  }
}
```

Success returns discount details:
```json
{
  "data": {
    "valid": true,
    "discount_type": "percentage",
    "discount_value": 15,
    "min_booking_amount": 500,
    "message": "Coupon applied successfully"
  }
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Files Created

1. **apps/web/validations/coupon.ts** (104 lines)
   - `couponCreateSchema` - Create validation with code uppercase transform
   - `couponUpdateSchema` - Partial update validation
   - `couponQuerySchema` - List query params (pagination, search, is_active filter)
   - `couponValidateSchema` - Validation endpoint input (code, service_id, customer_id)
   - `couponIdParamSchema` - UUID param validation

2. **apps/web/app/api/v1/coupons/route.ts** (173 lines)
   - GET handler with search (ILIKE on code/description), is_active filter, pagination
   - POST handler with duplicate code check scoped to company
   - Uses PERMISSIONS.COUPONS_MANAGE for RBAC
   - Maps snake_case request to camelCase database columns

3. **apps/web/app/api/v1/coupons/[id]/route.ts** (167 lines)
   - GET handler for coupon detail by UUID
   - PUT handler with duplicate code check (excludes current coupon)
   - DELETE handler with hard delete (CASCADE removes coupon_usage records)
   - Partial update pattern (only updates provided fields)

4. **apps/web/app/api/v1/coupons/validate/route.ts** (131 lines)
   - POST handler for booking flow validation
   - 5-condition validation sequence with early returns
   - Customer UUID to SERIAL ID resolution
   - Returns discount info on success for price calculation

## Testing Notes

Manual testing required:
1. Create coupon with percentage discount (10%)
2. Create coupon with fixed discount (100 CZK)
3. Test duplicate code rejection (same company)
4. Test search filter (code and description ILIKE)
5. Test is_active filter
6. Update coupon code (duplicate check)
7. Validate expired coupon (validUntil in past)
8. Validate coupon with usage limit reached
9. Validate coupon with per-customer limit reached
10. Validate coupon not applicable to service

## Blockers Encountered

None.

## Next Steps

1. Implement gift card CRUD endpoints (08-02-PLAN.md)
2. Add loyalty program management (08-03-PLAN.md)
3. Consider adding coupon analytics endpoint (usage stats, revenue impact)
4. Add coupon expiration notification (Phase 7 notification system)

## Self-Check

Verifying all claims in this summary:

**Files exist:**
- apps/web/validations/coupon.ts: EXISTS
- apps/web/app/api/v1/coupons/route.ts: EXISTS
- apps/web/app/api/v1/coupons/[id]/route.ts: EXISTS
- apps/web/app/api/v1/coupons/validate/route.ts: EXISTS

**Commits exist:**
- 10f5377 (CRUD endpoints): EXISTS
- 70edf7d (validation endpoint): EXISTS

**TypeScript compilation:**
- No errors in coupon-related files: VERIFIED

## Self-Check: PASSED

All files created, commits exist, and TypeScript compiles without errors.

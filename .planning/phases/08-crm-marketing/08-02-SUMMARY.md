---
phase: 08-crm-marketing
plan: 02
subsystem: crm-marketing
tags: [gift-cards, api, crud, redemption, transaction-log]
dependency_graph:
  requires:
    - 02-05-PLAN.md (gift_cards schema)
    - 03-03-PLAN.md (route handler pattern, RBAC)
    - 03-01-PLAN.md (error handling, response utilities)
  provides:
    - Gift card CRUD API (list, create, get, update)
    - Balance check endpoint
    - Atomic redemption with SELECT FOR UPDATE
    - Transaction logging for all balance changes
  affects:
    - Frontend: Gift card management UI (Phase 8 Plan 3)
    - Booking flow: Gift card payment option (Phase 5 integration)
tech_stack:
  added: []
  patterns:
    - SELECT FOR UPDATE for row-level locking
    - crypto.randomBytes for secure code generation
    - Atomic transaction with balance deduction + logging
    - Zod transform for uppercase code normalization
key_files:
  created:
    - apps/web/validations/gift-card.ts
    - apps/web/app/api/v1/gift-cards/route.ts
    - apps/web/app/api/v1/gift-cards/[id]/route.ts
    - apps/web/app/api/v1/gift-cards/[id]/balance/route.ts
    - apps/web/app/api/v1/gift-cards/redeem/route.ts
  modified: []
decisions:
  - Gift cards share PERMISSIONS.COUPONS_MANAGE permission (gift cards are similar to coupons)
  - Code auto-generated in XXXX-XXXX-XXXX-XXXX format using crypto.randomBytes (16 hex chars)
  - Code returned only once on creation for security (visible in detail view but emphasized on create)
  - Balance and code fields are NOT updateable via PUT (security constraint)
  - Redemption uses SELECT FOR UPDATE to prevent race conditions on concurrent redemptions
  - Transaction log is append-only (records purchase, redemption, refund events)
  - Expiration check happens at redemption time, not at query time (grace period allowed)
  - Purchased_by_customer_id is optional (allows gift cards sold without customer record)
metrics:
  duration_seconds: 261
  tasks_completed: 2
  files_created: 5
  commits: 2
  completed_at: "2026-02-11T17:43:00Z"
---

# Phase 8 Plan 2: Gift Card CRUD and Redemption API Summary

**Gift card management and atomic redemption with transaction logging for business owners to sell and track gift cards**

## What Was Built

### Task 1: Gift Card Validation Schemas and CRUD Endpoints (Commit: 10f5377)

**Validation Schemas** (`apps/web/validations/gift-card.ts`):
- `giftCardCreateSchema`: initial_balance (positive, max 100k), currency (3 chars, default CZK), purchased_by_customer_id (UUID, optional), recipient info (email, name, message), valid_until (datetime)
- `giftCardUpdateSchema`: is_active, recipient info, valid_until (balance/code NOT updateable)
- `giftCardQuerySchema`: pagination (page, limit), is_active filter, search (code + recipient_name)
- `giftCardIdParamSchema`: UUID validation for route params
- `giftCardBalanceSchema`: code with .toUpperCase() transform
- `giftCardRedeemSchema`: code (uppercase), amount (positive), booking_id (optional FK)

**CRUD Endpoints** (`apps/web/app/api/v1/gift-cards/route.ts`):
- **GET /api/v1/gift-cards**: List with pagination, search (ILIKE on code/recipient_name), is_active filter, ordered by createdAt DESC
- **POST /api/v1/gift-cards**: Create with auto-generated code (crypto.randomBytes), resolve customer UUID to internal ID, insert gift card + purchase transaction in atomic db.transaction()

**Detail/Update Endpoints** (`apps/web/app/api/v1/gift-cards/[id]/route.ts`):
- **GET /api/v1/gift-cards/[id]**: Return gift card details + last 20 transactions (ordered by createdAt DESC)
- **PUT /api/v1/gift-cards/[id]**: Update metadata only (is_active, recipient info, validity) — balance/code immutable

**Key Implementation Details**:
- Gift card code generation: `crypto.randomBytes(8).toString('hex').toUpperCase()` → formatted as XXXX-XXXX-XXXX-XXXX
- NUMERIC balance fields converted to numbers in responses using Number()
- Purchase transaction logged on creation: type='purchase', amount=initialBalance, balanceAfter=initialBalance
- All endpoints use PERMISSIONS.COUPONS_MANAGE (gift cards share coupons permission)
- Tenant isolation via findCompanyId() and WHERE companyId filters

### Task 2: Gift Card Balance Check and Redemption Endpoints (Commit: 0469c35)

**Balance Check Endpoint** (`apps/web/app/api/v1/gift-cards/[id]/balance/route.ts`):
- **GET /api/v1/gift-cards/[id]/balance**: Return current balance info (initial, current, currency, is_active, valid_until)

**Redemption Endpoint** (`apps/web/app/api/v1/gift-cards/redeem/route.ts`):
- **POST /api/v1/gift-cards/redeem**: Atomic redemption with SELECT FOR UPDATE
- **Transaction Flow**:
  1. SELECT gift card WHERE code + companyId + isActive=true FOR UPDATE (row-level lock)
  2. Validate gift card exists
  3. Check expiration: validUntil must be null OR future date
  4. Check balance: currentBalance >= amount
  5. Calculate newBalance = currentBalance - amount
  6. UPDATE giftCards SET currentBalance, updatedAt
  7. INSERT into giftCardTransactions: type='redemption', amount, balanceAfter, bookingId (optional)
- **Error Handling**:
  - NotFoundError: Gift card not found
  - ValidationError: Gift card expired
  - ValidationError: Insufficient balance
- **Race Condition Prevention**: SELECT FOR UPDATE locks the gift card row during transaction, preventing concurrent redemptions from overdrawing balance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed db.fn.count() TypeScript error**
- **Found during:** Task 1 type-check
- **Issue:** Drizzle ORM doesn't have db.fn.count() API (TypeScript error: Property 'fn' does not exist)
- **Fix:** Changed to sql<number>`count(*)::int` template literal (matches customer route pattern)
- **Files modified:** apps/web/app/api/v1/gift-cards/route.ts
- **Commit:** 10f5377 (included in Task 1 commit after fix)

## Verification Results

### Type Safety
✅ `pnpm tsc --noEmit` passes with zero gift card errors
✅ All route handlers typed with createRouteHandler
✅ Zod schemas infer correct TypeScript types

### API Contracts
✅ All 5 route files exist and export correct HTTP methods:
  - route.ts: GET, POST
  - [id]/route.ts: GET, PUT
  - [id]/balance/route.ts: GET
  - redeem/route.ts: POST
✅ All endpoints use PERMISSIONS.COUPONS_MANAGE
✅ All queries scoped by companyId (tenant isolation verified)

### Security & Correctness
✅ Gift card codes auto-generated using crypto.randomBytes (not Math.random)
✅ Redemption uses SELECT FOR UPDATE within db.transaction()
✅ Transaction log records all balance changes (purchase, redemption)
✅ UUID used as public ID in all responses
✅ Numeric balance fields returned as numbers (not strings)
✅ Expiration and balance validation before redemption
✅ Row-level locking prevents race conditions

### Pattern Compliance
✅ createRouteHandler pattern used for all endpoints
✅ findCompanyId() for tenant isolation
✅ validateQuery() for query param validation
✅ successResponse(), createdResponse(), paginatedResponse() for responses
✅ NotFoundError, ValidationError for error handling

## Test Plan

### Manual Testing (Postman/curl)
1. **POST /api/v1/gift-cards**: Create gift card with initial_balance=1000, verify code generated in XXXX-XXXX-XXXX-XXXX format
2. **GET /api/v1/gift-cards**: List gift cards, verify pagination works
3. **GET /api/v1/gift-cards?search=ABCD**: Search by code, verify ILIKE works
4. **GET /api/v1/gift-cards/[id]**: Get details, verify transactions array shows purchase transaction
5. **PUT /api/v1/gift-cards/[id]**: Update is_active=false, verify update works
6. **GET /api/v1/gift-cards/[id]/balance**: Check balance, verify correct amount returned
7. **POST /api/v1/gift-cards/redeem**: Redeem amount=500, verify balance deducted and transaction logged
8. **POST /api/v1/gift-cards/redeem** (expired card): Verify ValidationError returned
9. **POST /api/v1/gift-cards/redeem** (insufficient balance): Verify ValidationError returned
10. **Concurrent redemption test**: Use Apache Bench or k6 to send 10 concurrent redemption requests, verify balance never goes negative (SELECT FOR UPDATE prevents race conditions)

### Integration Testing
- **Booking flow integration**: In Phase 5, add gift card payment option to booking wizard, test redemption during booking creation
- **Customer association**: Create gift card with purchased_by_customer_id, verify customer lookup works
- **Transaction history audit**: Create, redeem, refund (Phase 6 integration), verify all events logged correctly

## Known Issues

None — All functionality implemented as planned.

## Next Steps

**Phase 8 Plan 3** (if exists): Gift card management UI — frontend forms for creating/managing gift cards, redemption interface
**Phase 5 integration**: Add gift card payment option to booking wizard (alongside Comgate, QR, cash, bank transfer)
**Phase 6 integration**: Add gift card refund support (reverse redemption transaction)

## Self-Check: PASSED

**Created Files Verification:**
```
✅ FOUND: apps/web/validations/gift-card.ts
✅ FOUND: apps/web/app/api/v1/gift-cards/route.ts
✅ FOUND: apps/web/app/api/v1/gift-cards/[id]/route.ts
✅ FOUND: apps/web/app/api/v1/gift-cards/[id]/balance/route.ts
✅ FOUND: apps/web/app/api/v1/gift-cards/redeem/route.ts
```

**Commits Verification:**
```
✅ FOUND: 10f5377 (Task 1: Gift card CRUD endpoints)
✅ FOUND: 0469c35 (Task 2: Balance check and redemption endpoints)
```

**Key Pattern Verification:**
```
✅ SELECT FOR UPDATE: Line 44 in apps/web/app/api/v1/gift-cards/redeem/route.ts
✅ PERMISSIONS.COUPONS_MANAGE: Used in all 6 endpoint handlers
✅ Tenant isolation: findCompanyId() + companyId filter in all queries
✅ UUID as public ID: All responses use giftCard.uuid
✅ Numeric conversion: Number(giftCard.initialBalance) in responses
```

All 5 files created, 2 commits made, all patterns verified. Self-check PASSED.

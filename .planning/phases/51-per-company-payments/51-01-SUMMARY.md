---
phase: 51-per-company-payments
plan: 01
subsystem: payments
tags: [comgate, encryption, aes-256-gcm, drizzle, provider-agnostic]

# Dependency graph
requires:
  - phase: 28-payment-system
    provides: Comgate client, payments table, billing service
provides:
  - payment_providers table with provider-agnostic schema
  - GET/PUT /api/v1/settings/payment-provider API
  - resolveComgateCredentials() for per-company credential lookup
  - getPlatformComgateCredentials() for platform subscription billing
  - Comgate client with optional credential overrides
affects: [51-02, 52-e2e-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-company-credentials, credential-resolver-pattern, provider-agnostic-schema]

key-files:
  created:
    - packages/database/src/schema/payment-providers.ts
    - apps/web/app/api/v1/settings/payment-provider/route.ts
    - apps/web/lib/payment-provider/resolve.ts
  modified:
    - packages/database/src/schema/index.ts
    - apps/web/app/api/v1/payments/comgate/client.ts

key-decisions:
  - 'credentials stored as AES-256-GCM encrypted text (not JSONB) since encrypted blob is opaque'
  - 'chargeRecurringPayment intentionally unchanged — platform subscription billing always uses platform credentials (PAY-04)'
  - 'GET endpoint returns masked merchant_id (last 4 chars) — never exposes full secret'
  - 'Used direct SQL for db:push since drizzle-kit interactive prompts blocked on pre-existing unrelated constraint'

patterns-established:
  - 'Credential resolver pattern: resolveComgateCredentials(companyId) for per-company-first lookup with platform fallback'
  - 'Provider-agnostic schema: adding Stripe/GoPay requires only INSERT, no DDL changes'

requirements-completed: [PAY-03, PAY-04]

# Metrics
duration: 18min
completed: 2026-03-27
---

# Phase 51 Plan 01: Payment Provider Schema & Credential Resolver Summary

**Provider-agnostic payment_providers table with AES-256-GCM encrypted credentials, per-company Comgate resolver with platform fallback, and backward-compatible client overrides**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-27T14:39:31Z
- **Completed:** 2026-03-27T14:57:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created provider-agnostic payment_providers table supporting comgate/stripe/gopay without DDL changes (PAY-03)
- Built encrypted credential storage API with GET (masked) and PUT (encrypted upsert) endpoints
- Implemented credential resolver with company-first lookup and platform fallback
- Updated Comgate client with optional credential overrides while keeping chargeRecurringPayment platform-only (PAY-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create payment_providers schema and settings API** - `5b9496d` (feat)
2. **Task 2: Create credential resolver and update Comgate client** - `4daef32` (feat)

## Files Created/Modified

- `packages/database/src/schema/payment-providers.ts` - Provider-agnostic payment_providers table with CHECK, UNIQUE constraints, and indexes
- `packages/database/src/schema/index.ts` - Added barrel export for payment-providers
- `apps/web/app/api/v1/settings/payment-provider/route.ts` - GET/PUT endpoints for company payment provider credentials
- `apps/web/lib/payment-provider/resolve.ts` - Credential resolver with company-first lookup and platform fallback
- `apps/web/app/api/v1/payments/comgate/client.ts` - Added optional credentials param to initComgatePayment, getComgatePaymentStatus, refundComgatePayment, verifyComgateWebhookSecret

## Decisions Made

- Credentials stored as AES-256-GCM encrypted text (not JSONB) since encrypted blob is opaque
- chargeRecurringPayment intentionally unchanged — platform subscription billing always uses platform credentials (PAY-04)
- GET endpoint returns masked merchant_id (last 4 chars only) — never exposes full secret in API response
- Used direct SQL to create table since drizzle-kit db:push interactive prompts blocked on pre-existing unrelated constraint

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used direct SQL instead of drizzle-kit db:push**

- **Found during:** Task 1 (schema push)
- **Issue:** drizzle-kit db:push shows interactive prompt for pre-existing customers table constraint, cannot be auto-accepted
- **Fix:** Created table directly via postgres driver SQL with identical schema
- **Files modified:** None (database-only change)
- **Verification:** Queried information_schema.columns — all 10 columns present with correct types
- **Committed in:** N/A (DB-only, no code change)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary workaround for non-interactive execution. Schema is identical to drizzle definition.

## Issues Encountered

None beyond the drizzle-kit interactive prompt workaround documented above.

## User Setup Required

None - no external service configuration required. Existing ENCRYPTION_KEY env var is reused for credential encryption.

## Next Phase Readiness

- Schema and APIs ready for Plan 02 to wire into settings UI and booking payment flow
- resolveComgateCredentials() ready to be called from booking payment creation endpoint
- All existing callers compile without changes (backward compatible)

---

_Phase: 51-per-company-payments_
_Completed: 2026-03-27_

## Self-Check: PASSED

- All 6 files verified present on disk
- Both task commits (5b9496d, 4daef32) verified in git log
- TypeScript compilation: zero errors

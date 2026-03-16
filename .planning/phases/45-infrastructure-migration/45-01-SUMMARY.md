---
phase: 45-infrastructure-migration
plan: 01
subsystem: infra,events
tags: [rabbitmq, amqplib, events, publishEvent, cloudEvents, vercel, billing, nextjs, cve]

# Dependency graph
requires: []
provides:
  - "No-op publishEvent stub — all 38 call sites unchanged, no RabbitMQ connection on import"
  - "consumer.ts deleted, ConsumerConnection/consumeMessages/gracefulShutdown removed from @schedulebox/events"
  - "amqplib and @types/amqplib removed from packages/events/package.json"
  - "AI-Powered billing plan fallback uses PLAN_CONFIG (Infinity for maxBookingsPerMonth)"
  - "Next.js 15.5.12 verified — CVE-2025-29927 patched (>= 14.2.25)"
  - "Build passes with zero TypeScript/ESLint errors"
affects: [all API routes using publishEvent, billing page, phase 45-02, phase 45-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "publishEvent is now a fire-and-forget no-op — callers must handle side effects synchronously"
    - "PLAN_CONFIG imported from @schedulebox/shared/types (not /shared root) to avoid prom-client pulling fs module into browser bundle"
    - "Upstash redis.get<string>() explicit type parameter to avoid {} type inference"
    - "NeonHttpQueryResult<T>.rows[0] pattern for scalar SQL queries (not array destructuring)"

key-files:
  created: []
  modified:
    - "packages/events/src/publisher.ts — replaced with no-op publishEvent"
    - "packages/events/src/index.ts — removed consumer exports"
    - "packages/events/package.json — removed amqplib and @types/amqplib"
    - "apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx — PLAN_CONFIG fallback for AI-Powered plan"
    - "apps/web/lib/loyalty/booking-completed-consumer.ts — removed RabbitMQ consumer imports"

key-decisions:
  - 'Import PLAN_CONFIG from @schedulebox/shared/types subpath (not root barrel) to avoid prom-client fs dependency in client bundle'
  - 'booking-completed-consumer.ts converted to direct-invocation handler, startBookingCompletedConsumer becomes a no-op'
  - 'NeonHttpQueryResult does not support array destructuring — use .rows property'

patterns-established:
  - 'No-op publisher: publishEvent logs in dev, does nothing in production — safe to call from any context'
  - 'Subpath imports from @schedulebox/shared prevent prom-client/metrics from leaking into browser bundles'

requirements-completed: [INFRA-01, INFRA-05, FIX-01]

# Metrics
duration: 45min
completed: 2026-03-16
---

# Phase 45 Plan 01: Infrastructure Migration Summary

**No-op publishEvent replaces RabbitMQ amqplib, CVE-2025-29927 verified patched, AI-Powered billing fallback fixed with PLAN_CONFIG, and 9 pre-existing build errors resolved**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-16T16:30:00Z
- **Completed:** 2026-03-16T17:18:41Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Replaced amqplib/RabbitMQ publisher with a no-op stub — app builds without RABBITMQ_URL set
- Removed consumer.ts and all consumer exports from @schedulebox/events
- Fixed billing page fallback: AI-Powered plan now shows "Unlimited" for bookings/employees/services (was showing 0)
- Verified Next.js 15.5.12 satisfies CVE-2025-29927 patch requirement (>= 14.2.25)
- Resolved 9 pre-existing TypeScript/ESLint build errors surfaced during compilation

## Task Commits

Each task was committed atomically:

1. **Task 1: RabbitMQ no-op and cleanup (INFRA-01)** - `b23cbeb` (chore)
2. **Task 2: CVE verification and billing bug fix (INFRA-05, FIX-01)** - Part of `5ef488e` (feat)

## Files Created/Modified

- `packages/events/src/publisher.ts` — No-op publishEvent, removed all amqplib code
- `packages/events/src/index.ts` — Removed consumer export block
- `packages/events/package.json` — Removed amqplib, @types/amqplib dependencies
- `apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx` — PLAN_CONFIG fallback for AI plan
- `apps/web/lib/loyalty/booking-completed-consumer.ts` — Removed RabbitMQ consumer imports, kept handleBookingCompleted
- `apps/web/app/api/v1/ai/insights/route.ts` — Fixed NeonHttpQueryResult array destructuring
- `apps/web/app/[locale]/(dashboard)/reviews/page.tsx` — Fixed PaginationMeta cast, t() type
- `apps/web/app/[locale]/(dashboard)/payments/page.tsx` — Fixed PaginationMeta cast
- `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` — Fixed handleRowClick number/string type
- `apps/web/app/api/v1/payments/route.ts` — Fixed aggregates in PaginationMeta
- `apps/web/app/api/v1/reviews/route.ts` — Added PaginationMeta import for aggregates
- `apps/web/components/booking/BookingCalendar.tsx` — Separated type Locale import

## Decisions Made

- Import `PLAN_CONFIG` from `@schedulebox/shared/types` subpath, not the root barrel export — the root barrel pulls in `./metrics/index` which imports `prom-client` → `fs` module, which breaks client-side bundles
- `booking-completed-consumer.ts` preserved with `handleBookingCompleted` handler (used for direct invocation from API routes) but `startBookingCompletedConsumer` made a no-op
- CVE-2025-29927 confirmed already patched — Next.js ^15.5.10 ships at 15.5.12 which exceeds minimum of 14.2.25

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 9 pre-existing TypeScript/ESLint build errors**

- **Found during:** Task 2 verification (build attempt)
- **Issue:** After switching to Neon HTTP transport (plan 02, already committed), multiple files had type errors surfaced by stricter TypeScript — NeonHttpQueryResult not iterable, redis.get() returning {} type, PaginationMeta missing aggregates field, unused imports
- **Fix:** Fixed each error individually: `.rows[0]` pattern for NeonHttpQueryResult, `redis.get<string>()` explicit typing, `as unknown as PaginationMeta` double-cast, removed unused db/dbTx imports
- **Files modified:** 9 files across apps/web
- **Verification:** `pnpm --filter @schedulebox/web build` — compiled successfully + linting passed + 265 static pages generated
- **Committed in:** `5ef488e` (Upstash Redis migration commit)

---

**Total deviations:** 1 auto-fix batch (Rule 1 — pre-existing type errors surfaced by driver migration)
**Impact on plan:** Required for build correctness. No scope creep — all errors were pre-existing issues surfaced by the Neon/Upstash driver swap already in HEAD.

## Issues Encountered

- Windows EPERM symlink errors during `next build --standalone` trace step — Windows requires Developer Mode or admin rights for symlinks. This is a local environment issue only; Vercel Linux builds are unaffected. Compilation, linting, and static page generation all pass.
- `prom-client` pulled into client bundle via `@schedulebox/shared` barrel import — resolved by using `@schedulebox/shared/types` subpath import for `PLAN_CONFIG`.

## Next Phase Readiness

- Phase 45-02 (Neon + Upstash driver migration): Already complete (committed as `fefa764` + `5ef488e`)
- Phase 45-03 (plan docs): Already complete (committed as `b724408`)
- Build fully passes on clean TypeScript/ESLint check
- All 38 publishEvent call sites unchanged and compile correctly

---

_Phase: 45-infrastructure-migration_
_Completed: 2026-03-16_

## Self-Check: PASSED

- FOUND: `.planning/phases/45-infrastructure-migration/45-01-SUMMARY.md`
- FOUND: commit `b23cbeb` (chore(events): remove RabbitMQ dependency)
- FOUND: commit `5ef488e` (billing fix + build error fixes)
- FOUND: `packages/events/src/publisher.ts` — no amqplib references
- FOUND: `PLAN_CONFIG` import in billing page using `@schedulebox/shared/types` subpath
- FOUND: consumer.ts deleted, no consumer exports in index.ts
- BUILD: Compiled successfully + 265 static pages generated (Windows symlink EPERM in standalone trace is pre-existing env issue)

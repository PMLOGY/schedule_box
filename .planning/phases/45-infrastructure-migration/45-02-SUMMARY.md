---
phase: 45-infrastructure-migration
plan: 02
subsystem: database,infra
tags: [neon, postgresql, upstash, redis, drizzle, serverless, vercel]

# Dependency graph
requires:
  - phase: 45-infrastructure-migration/45-01
    provides: RabbitMQ removal and no-op publishEvent for Vercel

provides:
  - "@neondatabase/serverless db (Neon HTTP) for stateless queries"
  - "dbTx (Neon WebSocket Pool) for interactive transactions with SELECT FOR UPDATE"
  - "@upstash/redis HTTP client for token blacklist and caching"
  - "All setex() calls migrated to set() with { ex } option"
  - "postgres.js moved to devDependencies (local dev only)"
  - "drizzle.config.ts uses DATABASE_URL_UNPOOLED for migrations"

affects: [all API routes using db, all API routes using redis, booking double-booking prevention, auth token blacklist]

# Tech tracking
tech-stack:
  added: ["@neondatabase/serverless@1.0.2", "@upstash/redis@1.37.0"]
  patterns:
    - "Dual transport: db (Neon HTTP) for reads/simple writes, dbTx (WebSocket Pool) for transactions"
    - "Lazy Proxy pattern for both db and redis clients (zero connection on import)"
    - "All db.transaction() calls use dbTx.transaction() (HTTP transport cannot do interactive transactions)"
    - "Upstash redis.set(key, value, { ex: ttl }) instead of redis.setex(key, ttl, value)"

key-files:
  modified:
    - packages/database/src/db.ts
    - packages/database/src/index.ts
    - packages/database/drizzle.config.ts
    - packages/database/package.json
    - apps/web/lib/redis/client.ts
    - apps/web/package.json
    - apps/web/lib/db/client.ts
    - apps/web/lib/auth/jwt.ts
    - apps/web/app/api/v1/auth/login/route.ts
    - apps/web/app/api/v1/auth/register/route.ts
    - apps/web/app/api/v1/auth/forgot-password/route.ts
    - apps/web/lib/booking/booking-service.ts
    - apps/web/lib/booking/booking-transitions.ts
    - apps/web/lib/loyalty/points-engine.ts
    - apps/web/lib/loyalty/rewards-engine.ts

key-decisions:
  - 'All db.transaction() calls use dbTx — Neon HTTP driver cannot run interactive transactions'
  - 'postgres.js kept in devDependencies for local dev scripts (apply-sql, seeds) that need raw SQL'
  - 'getMigrationClient removed from public @schedulebox/database index — dev-only export'
  - 'Upstash redis.set() with { ex } replaces ioredis setex() (different API surface)'

patterns-established:
  - 'Pattern: Use db for all SELECT/INSERT/UPDATE without transactions, dbTx for db.transaction()'
  - 'Pattern: Upstash Redis lazy Proxy matches existing ioredis Proxy pattern'
  - 'Pattern: NeonHttpQueryResult.rows extraction for db.execute() raw SQL queries'

requirements-completed: [INFRA-02, INFRA-03]

# Metrics
duration: 39min
completed: 2026-03-16
---

# Phase 45 Plan 02: Driver Migration Summary

**Neon HTTP + WebSocket Pool dual transport for PostgreSQL, Upstash HTTP for Redis — full Vercel serverless compatibility**

## Performance

- **Duration:** 39 min
- **Started:** 2026-03-16T16:35:07Z
- **Completed:** 2026-03-16T17:14:00Z
- **Tasks:** 2
- **Files modified:** 40

## Accomplishments

- Replaced postgres.js with @neondatabase/serverless: `db` uses Neon HTTP (stateless, zero connection overhead), `dbTx` uses WebSocket Pool for SELECT FOR UPDATE transactions
- Replaced ioredis with @upstash/redis HTTP client with lazy Proxy pattern; all 6 setex() calls converted to set() with { ex } option
- Updated all 27+ files using db.transaction() to use dbTx.transaction() (Neon HTTP driver does not support interactive transactions)
- drizzle.config.ts now uses DATABASE_URL_UNPOOLED for migrations (falls back to DATABASE_URL for local dev)
- TypeScript type-check passes cleanly; build compiled with zero code errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap PostgreSQL driver to Neon serverless with dual transport** - `fefa764` (feat)
2. **Task 2: Swap Redis client to Upstash and fix setex calls** - `5ef488e` (feat)

**Plan metadata:** (this summary commit)

## Files Created/Modified

**Database package:**
- `packages/database/src/db.ts` - Rewritten: neon HTTP + WebSocket Pool dual transport with lazy Proxy
- `packages/database/src/index.ts` - Exports db + dbTx (getMigrationClient removed from public API)
- `packages/database/drizzle.config.ts` - Uses DATABASE_URL_UNPOOLED for migrations
- `packages/database/package.json` - @neondatabase/serverless in deps, postgres moved to devDeps

**Web app — redis:**
- `apps/web/lib/redis/client.ts` - Rewritten: Upstash HTTP transport replacing ioredis
- `apps/web/package.json` - @upstash/redis in deps, ioredis removed

**Web app — setex migrations:**
- `apps/web/lib/auth/jwt.ts` - setex -> set({ ex }), db.transaction -> dbTx.transaction
- `apps/web/app/api/v1/auth/login/route.ts` - 2 setex conversions
- `apps/web/app/api/v1/auth/register/route.ts` - 2 setex conversions
- `apps/web/app/api/v1/auth/forgot-password/route.ts` - 1 setex conversion

**Web app — db.transaction -> dbTx.transaction (27+ files):**
- `apps/web/lib/booking/booking-service.ts` - createBooking + updateBooking SELECT FOR UPDATE
- `apps/web/lib/booking/booking-transitions.ts` - Status transition transactions
- `apps/web/lib/loyalty/points-engine.ts` - All 3 points transactions
- `apps/web/lib/loyalty/rewards-engine.ts` - Reward redemption transaction
- `apps/web/app/api/v1/billing/service.ts` - Subscription state machine transactions
- `apps/web/app/api/v1/payments/saga/booking-payment-handlers.ts` - SAGA handlers
- `apps/web/app/api/v1/public/company/[slug]/bookings/route.ts` - Public booking creation
- `apps/web/lib/auth/password.ts` - Password history transaction
- `apps/web/lib/onboarding/demo-data-seeder.ts` - Demo data transactions
- `apps/web/app/api/v1/gift-cards/redeem/route.ts` - Gift card redemption
- `apps/web/app/api/v1/payments/service.ts` - Payment processing
- (plus employees/*, services/, onboarding/, billing/invoice-service.ts)

## Decisions Made

- All `db.transaction()` calls migrated to `dbTx.transaction()` — Neon HTTP transport does not support interactive transactions at all, not just SELECT FOR UPDATE
- `postgres` kept as devDependency because `apply-sql.ts` and seed scripts use raw `client.begin()` and `client.unsafe()` APIs that are postgres.js-specific
- `getMigrationClient` not exported from public package index; dev scripts still import directly from `./db`
- Dual transport approach: `db` (HTTP, stateless) for the 95% of queries that don't need transactions; `dbTx` (WebSocket Pool) only for transactional code paths

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed NeonHttpQueryResult iteration in admin org routes**

- **Found during:** Task 2 (type-check verification)
- **Issue:** `db.execute()` with Neon HTTP driver returns `NeonHttpQueryResult` (not an array), so `Array.from()` and `.map()` failed with TypeScript errors
- **Fix:** Added `Array.isArray() ? ... : result.rows ?? []` pattern in `organizations/[id]/customers/route.ts` and `organizations/[id]/dashboard/route.ts`; same for `billing/invoice-service.ts`
- **Files modified:** 3 files
- **Committed in:** `5ef488e` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Upstash Redis get() type compatibility**

- **Found during:** Task 2 (type-check)
- **Issue:** Upstash `redis.get<string>()` through Proxy returns `{} | null` type inference, causing TypeScript errors at `parseInt(userIdStr, 10)`
- **Fix:** Added `String(result)` conversion at call sites; updated `redis.get(key)` to `redis.get<string>(key)` in usage-service
- **Files modified:** `auth/reset-password`, `auth/verify-email`, `usage-service.ts`
- **Committed in:** `5ef488e` (Task 2 commit)

**3. [Rule 3 - Blocking] Fixed pre-existing build errors unblocked by Task 1**

- **Found during:** Task 2 (build verification)
- **Issue:** Pre-existing TypeScript errors that weren't blocking build before (a different ESLint error came first) became the build failure after my changes
  - `PaginationMeta` missing `aggregates` field in payments/route.ts and reviews/route.ts
  - Missing `Locale` type import in BookingCalendar.tsx and calendar-toolbar.tsx
  - `booking-completed-consumer.ts` importing removed RabbitMQ functions
  - `usage-service.ts` using untyped `redis.get()`
- **Fix:** Fixed all 4 categories with minimal targeted changes
- **Files modified:** payments/route.ts, reviews/route.ts, BookingCalendar.tsx, calendar-toolbar.tsx, booking-completed-consumer.ts, usage-service.ts
- **Committed in:** `5ef488e` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 new bug from migration, 1 new type compat issue, 1 unblocked pre-existing errors)
**Impact on plan:** All auto-fixes required for correct type checking and build compilation. No scope creep.

## Issues Encountered

- Windows EPERM/ENOENT errors during Next.js standalone output generation (symlink creation) — not a code error, occurs after successful compilation during file system operations. TypeScript type-check passes cleanly.

## User Setup Required

**External services require manual configuration.** Set these environment variables in Vercel dashboard or `.env.local`:

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon connection pooling URL (e.g., `postgres://user:pass@ep-xxx.pooler.neon.tech/neondb?sslmode=require`) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection URL (for migrations) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

## Next Phase Readiness

- Database layer ready for Vercel deployment (HTTP transport, no persistent connections)
- Redis layer ready for Vercel deployment (HTTP transport)
- Plan 45-03 (middleware/Edge compatibility) can proceed
- Local dev still works via `DATABASE_URL` pointing to local PostgreSQL (Pool fallback)

---

## Self-Check: PASSED

- SUMMARY.md created at `.planning/phases/45-infrastructure-migration/45-02-SUMMARY.md`
- Task 1 commit `fefa764` exists
- Task 2 commit `5ef488e` exists

_Phase: 45-infrastructure-migration_
_Completed: 2026-03-16_

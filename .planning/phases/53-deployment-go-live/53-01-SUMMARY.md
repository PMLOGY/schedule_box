---
phase: 53-deployment-go-live
plan: 01
subsystem: infra
tags: [coolify, docker-compose, seed, neon, upstash, production]

requires:
  - phase: 52-verification-bug-fixing
    provides: verified app functionality across all flows
provides:
  - Idempotent production demo seed script for stakeholder demos
  - Coolify docker-compose with all Neon/Upstash production env vars
affects: [53-deployment-go-live]

tech-stack:
  added: []
  patterns: [idempotent-seed-with-slug-check]

key-files:
  created:
    - packages/database/src/seeds/production-demo.ts
  modified:
    - packages/database/package.json
    - docker-compose.coolify.yml

key-decisions:
  - 'Demo seed checks company slug existence for idempotency rather than roles table'
  - 'Roles created on-demand if missing (supports both fresh and pre-seeded DBs)'
  - 'docker-compose DATABASE_URL supports Neon override via Coolify env var substitution'
  - 'Migrate service uses DATABASE_URL_UNPOOLED for direct Neon connection'

patterns-established:
  - 'Production seed pattern: idempotent check by slug, create roles if missing, deterministic data'

requirements-completed: [DEP-01, DEP-03]

duration: 3min
completed: 2026-03-29
---

# Phase 53 Plan 01: Production Demo Seed and Coolify Env Hardening Summary

**Idempotent production demo seed creating 1 company with 3 employees, 5 services, 10 bookings; Coolify docker-compose updated with Neon/Upstash/APP_VERSION env vars**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T11:24:05Z
- **Completed:** 2026-03-29T11:27:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created production-demo.ts seed script that seeds exactly 1 demo company ("Demo Salon Krasa") with owner, 3 employees, 5 services, 3 customers, 10 bookings, and working hours
- Seed is fully idempotent -- second run detects existing company by slug and skips
- Updated docker-compose.coolify.yml with UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, DATABASE_URL_UNPOOLED, APP_VERSION, and Neon-compatible DATABASE_URL override
- Health endpoint confirmed returning 200 with correct JSON payload

## Task Commits

Each task was committed atomically:

1. **Task 1: Create production demo seed script and verify Coolify env vars** - `2e76cdc` (feat)
2. **Task 2: Run production demo seed against local DB to validate** - No commit needed (seed ran successfully, no code changes required)

## Files Created/Modified

- `packages/database/src/seeds/production-demo.ts` - Idempotent production demo seed (1 company, 3 employees, 5 services, 10 bookings)
- `packages/database/package.json` - Added db:seed:demo script
- `docker-compose.coolify.yml` - Added Neon/Upstash/APP_VERSION env vars, updated DATABASE_URL for Neon override

## Decisions Made

- Demo seed checks for company by slug (`demo-salon-krasa`) rather than checking roles table -- more targeted idempotency
- Roles are created on-demand if missing, supporting both fresh production databases and databases with existing dev seed data
- docker-compose DATABASE_URL uses env var substitution so Coolify UI can override with Neon pooled connection URL
- Migrate service uses DATABASE_URL_UNPOOLED for direct Neon connection (migrations need direct, not pooled)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused variable lint error**

- **Found during:** Task 1 commit (pre-commit hook)
- **Issue:** `catch (err)` had unused `err` variable, ESLint flagged it
- **Fix:** Changed to `catch {` (no binding)
- **Files modified:** packages/database/src/seeds/production-demo.ts
- **Verification:** Pre-commit hook passed on second commit attempt
- **Committed in:** 2e76cdc

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial lint fix, no scope impact.

## Issues Encountered

None -- seed ran successfully on first attempt against local database.

## User Setup Required

For production deployment, the user needs to:
- Set `DATABASE_URL` in Coolify UI to Neon pooled connection string
- Set `DATABASE_URL_UNPOOLED` in Coolify UI to Neon direct connection string
- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Coolify UI
- Run `DATABASE_URL=<neon-url> pnpm --filter @schedulebox/database db:seed:demo` to seed production database (or trigger via Coolify migrate container)

## Next Phase Readiness

- Demo seed ready for production Neon database
- Coolify docker-compose has all required env vars for Neon + Upstash production
- Next plan (53-02) can proceed with CI/CD pipeline configuration

---

_Phase: 53-deployment-go-live_
_Completed: 2026-03-29_

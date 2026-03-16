---
phase: 45-infrastructure-migration
plan: 03
subsystem: infra
tags: [vercel, neon, upstash, next.js, readiness, env, cleanup]

# Dependency graph
requires:
  - phase: 45-infrastructure-migration-01
    provides: Neon serverless driver migration
  - phase: 45-infrastructure-migration-02
    provides: Upstash redis migration, ioredis removed
provides:
  - Vercel-native next.config.mjs without standalone output
  - Readiness route checking Upstash env vars, no RabbitMQ
  - Clean .env.example documenting Neon + Upstash variables
  - notification-worker service removed
affects: [46-auth-hardening, 47-notifications, 48-ai-features, 49-performance, 50-production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Vercel-native: no output: standalone, serverExternalPackages includes @neondatabase/serverless'
    - 'Health check pattern: env var presence check for UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'

key-files:
  created: []
  modified:
    - apps/web/next.config.mjs
    - apps/web/app/api/readiness/route.ts
    - .env.example
  deleted:
    - services/notification-worker/ (entire directory, 42 files)

key-decisions:
  - 'output: standalone removed — Vercel handles Next.js deployment natively; standalone is for Docker/self-hosted only'
  - '@neondatabase/serverless added to serverExternalPackages to prevent edge bundling issues'
  - 'notification-worker deleted — RabbitMQ-dependent consumer with no queue to consume; Phase 47 handles notifications properly'

patterns-established:
  - 'Readiness route checks env var presence only (no live connection ping) — suitable for Vercel cold starts'

requirements-completed: [INFRA-04]

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 45 Plan 03: Vercel config, readiness route, env cleanup, and service removal Summary

**next.config.mjs updated for Vercel-native deployment (no standalone), readiness route migrated from REDIS_URL/RabbitMQ to Upstash env vars, .env.example cleaned of all RabbitMQ/Redis vars, and notification-worker (42 files) deleted**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-16T00:00:00Z
- **Completed:** 2026-03-16T00:00:00Z
- **Tasks:** 1 of 2 (Task 2 is a human-verify checkpoint)
- **Files modified:** 3 modified, 42 deleted

## Accomplishments

- Removed `output: 'standalone'` from next.config.mjs — Vercel builds fail with standalone mode
- Replaced `ioredis` with `@neondatabase/serverless` in serverExternalPackages
- Updated readiness route to check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, removed RabbitMQ check block
- Updated .env.example: added Upstash section + `DATABASE_URL_UNPOOLED`, removed Redis host/port/url, removed entire RabbitMQ section
- Deleted `services/notification-worker/` (42 files) — dead code after RabbitMQ removal
- `pnpm build` passes with zero errors

## Task Commits

1. **Task 1: Vercel config, readiness route, env cleanup, service removal** - `db76ac1` (chore)

## Files Created/Modified

- `apps/web/next.config.mjs` - removed standalone output, swapped ioredis for @neondatabase/serverless in serverExternalPackages
- `apps/web/app/api/readiness/route.ts` - checks Upstash env vars, no RabbitMQ block, updated JSDoc
- `.env.example` - Upstash section added, DATABASE_URL_UNPOOLED added, Redis/RabbitMQ sections removed
- `services/notification-worker/` - deleted entirely (42 files)

## Decisions Made

- `output: 'standalone'` removed: Vercel uses its own file tracing mechanism; standalone output adds unnecessary bundling overhead and conflicts with Vercel's deployment pipeline
- `@neondatabase/serverless` added to serverExternalPackages: prevents the Neon WebSocket driver from being bundled into edge functions incorrectly
- notification-worker deleted: the service was purely a RabbitMQ consumer; with RabbitMQ removed (Plan 01 made publishEvent a no-op), there is nothing to consume; Phase 47 will implement proper notification delivery

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond what was already documented in .env.example.

## Next Phase Readiness

- Infrastructure migration codebase changes are complete
- User must verify local build and app startup before proceeding to Phase 46
- Vercel deployment requires: push to GitHub, connect repo in Vercel dashboard, set env vars (DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, plus all others from .env.example)

---

_Phase: 45-infrastructure-migration_
_Completed: 2026-03-16_

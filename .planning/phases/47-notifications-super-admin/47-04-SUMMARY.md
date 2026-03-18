---
phase: 47-notifications-super-admin
plan: 04
subsystem: api, ui, infra
tags: [feature-flags, redis, maintenance-mode, middleware, admin-ui, glassmorphism]

dependency_graph:
  requires:
    - phase: 47-01
      provides: platform DB schema (featureFlags, featureFlagOverrides), writeAuditLog() helper
  provides:
    - getFlag() with Redis 60s TTL cache + DB fallback (global + per-company override)
    - invalidateFlagCache() for targeted Redis key invalidation
    - Feature flag CRUD API (GET/POST /admin/feature-flags, PUT/DELETE /admin/feature-flags/[id])
    - Feature flag overrides API (GET/POST /admin/feature-flags/[id]/overrides)
    - Maintenance mode Redis toggle API (GET/PUT /admin/maintenance)
    - Middleware maintenance check via Upstash REST HTTP (fail-open, 5s cache, bypass cookie)
    - Branded glassmorphism maintenance page (/[locale]/maintenance)
    - Admin maintenance control UI page
    - Admin feature flags management UI page with per-company override expansion
    - Admin navigation with all Phase 47 entries
  affects:
    - All user-facing routes (maintenance middleware intercepts non-admin traffic)
    - Phase 47-05 (broadcast/metrics pages will use admin nav added here)
    - Any feature using getFlag() for gradual rollout control

tech-stack:
  added: []
  patterns:
    - Redis cache-aside pattern (60s TTL, invalidate on mutation)
    - Middleware fail-open on Redis unavailability (never block users on infra error)
    - Admin bypass cookie (httpOnly, sameSite=strict) for maintenance mode passthrough
    - Upstash REST HTTP in middleware (not SDK import, avoids heavy bundle in Edge)
    - ON CONFLICT DO UPDATE upsert for flag overrides

key-files:
  created:
    - apps/web/lib/admin/feature-flags.ts
    - apps/web/app/api/v1/admin/feature-flags/route.ts
    - apps/web/app/api/v1/admin/feature-flags/[id]/route.ts
    - apps/web/app/api/v1/admin/feature-flags/[id]/overrides/route.ts
    - apps/web/app/api/v1/admin/maintenance/route.ts
    - apps/web/app/[locale]/(admin)/admin/feature-flags/page.tsx
    - apps/web/app/[locale]/(admin)/admin/maintenance/page.tsx
    - apps/web/app/[locale]/maintenance/page.tsx
  modified:
    - apps/web/middleware.ts (rewrote to wrap next-intl with maintenance check)
    - apps/web/lib/admin-navigation.ts (added 5 new nav items)
    - apps/web/messages/en.json (admin.nav.*, admin.featureFlags.*, admin.maintenance.*, maintenance.*)
    - apps/web/messages/cs.json (same)
    - apps/web/messages/sk.json (same)

key-decisions:
  - 'Middleware uses direct Upstash REST HTTP fetch (not SDK) to avoid importing heavy redis client into Edge middleware bundle'
  - 'Maintenance check uses next: { revalidate: 5 } cache hint to reduce Redis round-trips per request'
  - 'Fail-open on Redis unavailability — try/catch swallows errors; users never blocked by infrastructure failure'
  - 'Bypass cookie uses httpOnly+sameSite=strict; secret from MAINTENANCE_BYPASS_SECRET env var'
  - 'Flag cache invalidation always deletes global key; company key deleted only if companyId specified'
  - 'Feature flag overrides use ON CONFLICT DO UPDATE upsert on (flagId, companyId) unique constraint'

requirements-completed: [ADMIN-02, ADMIN-05]

duration: 15min
completed: 2026-03-18
---

# Phase 47 Plan 04: Feature Flags + Maintenance Mode Summary

**Redis-cached feature flags with per-company overrides, maintenance mode middleware with Upstash REST HTTP check, glassmorphism maintenance page, and admin control UI.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T15:38:12Z
- **Completed:** 2026-03-18T15:53:24Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Feature flags library with Redis 60s TTL cache-aside pattern — getFlag() resolves company override before global flag; invalidateFlagCache() hits both keys
- Full CRUD API for feature flags and per-company overrides with audit logging on every mutation
- Middleware rewrote from simple `createMiddleware(routing)` export to async function wrapping next-intl with Upstash REST HTTP maintenance check — fail-open, 5s revalidate cache, admin bypass cookie
- Branded glassmorphism maintenance page with gradient mesh, blur orbs, animated loading dots
- Admin nav sidebar expanded from 3 to 8 items covering all Phase 47 pages

## Task Commits

1. **Task 1: Feature flags library + API routes + admin UI page** - `bc29df1` (feat)
2. **Task 2: Maintenance mode middleware + toggle API + branded page + admin nav** - `c3b0ea4` (feat)

## Files Created/Modified

- `apps/web/lib/admin/feature-flags.ts` — getFlag() + invalidateFlagCache() with Redis + Drizzle
- `apps/web/app/api/v1/admin/feature-flags/route.ts` — GET list with override count, POST create
- `apps/web/app/api/v1/admin/feature-flags/[id]/route.ts` — PUT update, DELETE with cache invalidation
- `apps/web/app/api/v1/admin/feature-flags/[id]/overrides/route.ts` — GET list, POST upsert
- `apps/web/app/api/v1/admin/maintenance/route.ts` — GET state, PUT toggle with bypass cookie
- `apps/web/app/[locale]/(admin)/admin/feature-flags/page.tsx` — Admin flags UI with Switch toggles
- `apps/web/app/[locale]/(admin)/admin/maintenance/page.tsx` — Admin maintenance control
- `apps/web/app/[locale]/maintenance/page.tsx` — Branded glass maintenance page
- `apps/web/middleware.ts` — Rewrote to add maintenance check before next-intl
- `apps/web/lib/admin-navigation.ts` — Added featureFlags, broadcast, maintenance, metrics, auditLog items

## Decisions Made

- Upstash REST HTTP in middleware instead of SDK import — avoids bundling heavy redis client into Edge runtime; direct fetch to `${UPSTASH_REDIS_REST_URL}/get/maintenance:enabled` with Bearer token
- `next: { revalidate: 5 }` on the maintenance check fetch — reduces Redis calls per second when many concurrent requests arrive during maintenance
- Fail-open policy: `try/catch` around the Redis check; network errors do not block users
- Flag cache always invalidates global key on any flag change; company key only invalidated when companyId is known (targeted invalidation)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- lint-staged stash/restore mechanism caused conflicts when multiple previous plan's staged files were still pending commit; resolved by committing all pending files together
- TypeScript compiled clean throughout; no type errors encountered

## User Setup Required

Add `MAINTENANCE_BYPASS_SECRET` to environment variables — a secret string used as the maintenance bypass cookie value. Without this env var, the bypass cookie cannot be set and admins lose access during maintenance.

```env
MAINTENANCE_BYPASS_SECRET=your-secure-random-secret-here
```

## Next Phase Readiness

- Phase 47-05 (broadcast + metrics) can use admin nav links already wired in
- Feature flags system ready for use in any route via `getFlag(flagName, companyId)`
- Maintenance mode operational; enable via PUT /api/v1/admin/maintenance

---

_Phase: 47-notifications-super-admin_
_Completed: 2026-03-18_

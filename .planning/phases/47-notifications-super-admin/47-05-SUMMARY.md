---
phase: 47-notifications-super-admin
plan: 05
subsystem: api, ui, admin
tags: [broadcast, metrics, cron, nodemailer, tanstack-query, drizzle, admin-panel]

# Dependency graph
requires:
  - phase: 47-01
    provides: platformBroadcasts + platformDailyMetrics schema, writeAuditLog helper
  - phase: 47-04
    provides: admin layout, feature flags pattern, Glass UI convention

provides:
  - POST/GET /api/v1/admin/broadcast — broadcast CRUD with audience filter and confirmCount gate
  - GET /api/v1/cron/broadcast-dispatch — Vercel Cron every 5 min sends pending broadcasts via nodemailer
  - BroadcastBanner client component — dismissible in-app banner on owner dashboard
  - Admin broadcast management page — list + create dialog with live target count preview
  - GET /api/v1/admin/metrics — live DB KPIs + operational health + daily snapshot storage
  - Admin metrics dashboard — two-row glass card layout with 60s auto-refresh

affects: [Phase 49, Phase 50, any phase needing platform-wide admin communication]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - confirmCount gate: POST requires caller to confirm exact target count before mass email
    - cron-dispatch pattern: Vercel Cron endpoint with CRON_SECRET auth, BATCH caps, sentAt mark
    - broadcast-banner: client-side localStorage dismissal per broadcast ID
    - daily-metric-snapshot: onConflictDoNothing insert for idempotent daily aggregation

key-files:
  created:
    - apps/web/app/api/v1/admin/broadcast/route.ts
    - apps/web/app/api/v1/cron/broadcast-dispatch/route.ts
    - apps/web/components/shared/broadcast-banner.tsx
    - apps/web/app/[locale]/(admin)/admin/broadcast/page.tsx
    - apps/web/app/[locale]/(admin)/admin/metrics/page.tsx
    - apps/web/app/api/v1/admin/metrics/route.ts
  modified:
    - vercel.json
    - apps/web/app/[locale]/(dashboard)/dashboard/page.tsx
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - 'confirmCount gate: POST /broadcast requires caller to pass exact target count to prevent accidental mass email'
  - 'Cron dispatch: max 5 broadcasts per run, max 100 emails per invocation to prevent Vercel timeout'
  - 'BroadcastBanner: shows most recent active broadcast, localStorage keyed by ID, 7-day TTL'
  - 'apiErrorRate placeholder null: Sentry integration deferred to Phase 49, documented as TODO'
  - 'Daily metric snapshot: onConflictDoNothing for idempotent storage, failure never breaks metrics response'
  - 'Metrics files (route + page) discovered already committed in 162dfd3 (Phase 49 context session) — matched plan spec exactly'

patterns-established:
  - 'Broadcast confirmation gate: require confirmCount == actual targetCount to prevent accidental sends'
  - 'Cron rate caps: always limit batch size and total emails per cron invocation'

requirements-completed: [ADMIN-04, ADMIN-06]

# Metrics
duration: 10min
completed: 2026-03-18
---

# Phase 47 Plan 05: Broadcast + Metrics Summary

**Admin broadcast messaging (email + in-app banner) with audience filter + confirmCount gate, and live platform KPI metrics dashboard with daily snapshots**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-18T16:56:39Z
- **Completed:** 2026-03-18T17:06:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Broadcast API with audience filter (all/free/essential/growth/ai_powered), 10-minute rate limit, and confirmCount gate preventing accidental mass email
- Vercel Cron broadcast dispatch sends branded HTML emails via nodemailer to all matching active non-suspended companies, max 5 broadcasts and 100 emails per run
- BroadcastBanner client component on owner dashboard — fetches sent broadcasts from last 7 days, dismissible per-ID via localStorage
- Admin broadcast management page with full CRUD UI, live target count preview, typed confirmation dialog
- Platform metrics API aggregating business KPIs (signups, MRR, churn, active companies, bookings) and operational health (notification/SMS delivery rates, failed payments) with daily snapshot storage
- Admin metrics dashboard with two-row glass card layout (5 KPI cards + 4 health cards), 60-second auto-refresh

## Task Commits

1. **Task 1: Broadcast API + cron dispatch + in-app banner + admin UI** - `13fcdaa` (feat)
2. **Task 2: Platform metrics API + admin metrics dashboard** - `162dfd3` (already committed in prior Phase 49 context session — matched plan spec exactly)

## Files Created/Modified

- `apps/web/app/api/v1/admin/broadcast/route.ts` — Broadcast CRUD (GET list + POST create with audience filter + confirmCount gate + rate limit + audit log)
- `apps/web/app/api/v1/cron/broadcast-dispatch/route.ts` — Vercel Cron every 5 min dispatches pending broadcasts via nodemailer
- `apps/web/components/shared/broadcast-banner.tsx` — Dismissible in-app broadcast banner for owner dashboard
- `apps/web/app/[locale]/(admin)/admin/broadcast/page.tsx` — Admin broadcast management page with create dialog
- `apps/web/app/api/v1/admin/metrics/route.ts` — Live KPI + health aggregation with daily snapshot storage
- `apps/web/app/[locale]/(admin)/admin/metrics/page.tsx` — Two-row glass card metrics dashboard with 60s auto-refresh
- `vercel.json` — Added broadcast-dispatch cron (every 5 minutes)
- `apps/web/app/[locale]/(dashboard)/dashboard/page.tsx` — Added BroadcastBanner above KPI grid for owner view
- `apps/web/messages/{en,cs,sk}.json` — Translations: admin.broadcast.* and admin.metrics.*

## Decisions Made

- **confirmCount gate:** POST /broadcast requires caller to submit the exact number of target companies. The API returns `targetCount` in the 409 response so UI can display it for the admin to type in. Prevents accidental mass email.
- **Cron caps:** Max 5 broadcasts per run + max 100 emails per invocation. Prevents Vercel 30s timeout even when many companies match.
- **BroadcastBanner shows most recent:** When multiple active broadcasts exist, only the newest is shown (highest priority information).
- **apiErrorRate = null:** Placeholder documented as TODO for Phase 49 Sentry integration. UI shows "N/A — Sentry pending".
- **Daily metric snapshot:** `onConflictDoNothing` insert allows the GET endpoint to be called multiple times per day without duplicating data.
- **Metrics files pre-committed:** Both `metrics/route.ts` and `metrics/page.tsx` were already committed in commit 162dfd3 during Phase 49 context research. Content matched the plan spec exactly — no changes needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- ESLint: unused import `isPast` in broadcast page — removed before commit
- ESLint: unused `NextResponse` import in metrics route — removed before commit
- Metrics files already existed from prior Phase 49 context commit (162dfd3) — confirmed content matched plan requirements, no rework needed

## User Setup Required

None - no external service configuration required beyond existing SMTP_* environment variables.

## Next Phase Readiness

- Broadcast system fully operational — admins can schedule and send emails to filtered audiences
- In-app banner shows on owner dashboard immediately after broadcast dispatch
- Metrics dashboard ready — provides live KPI visibility for platform health monitoring
- Daily metrics snapshots accumulating from first API call forward
- API error rate ready to be wired in Phase 49 when Sentry integration is complete

---

_Phase: 47-notifications-super-admin_
_Completed: 2026-03-18_

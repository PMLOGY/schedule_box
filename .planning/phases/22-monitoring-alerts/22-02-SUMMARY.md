---
phase: 22-monitoring-alerts
plan: 02
subsystem: api
tags: [prom-client, monitoring, webhooks, comgate, coverage, github-actions, vitest]

# Dependency graph
requires:
  - phase: 22-01
    provides: worker-side monitoring metrics and scheduler setup
  - phase: 16-testing-foundation
    provides: vitest.shared.ts coverage configuration with v8 provider
  - phase: 19-email-delivery
    provides: notifications table with email/sms records

provides:
  - webhookProcessingTotal Counter in @schedulebox/shared/metrics/business
  - Comgate webhook handler instrumented with success/failure metric increments
  - GET /api/v1/monitoring/email-stats (bounce rate, configurable time window)
  - GET /api/v1/monitoring/sms-stats (estimated monthly cost, percent of limit)
  - GET /api/v1/monitoring/webhook-stats (completed/failed/stuck detection)
  - json-summary coverage reporter in vitest.shared.ts
  - CI coverage summary table in GitHub Step Summary on every test run

affects: [monitoring-dashboard, alerting, devops, phase-23]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Monitoring endpoints use createRouteHandler with SETTINGS_MANAGE permission (admin-only internal API pattern)
    - DB aggregate queries use drizzle sql<number> typed fragments with FILTER (WHERE ...) for single-pass counting
    - Webhook metrics use synchronous Counter.inc() — non-blocking, fire-and-forget after response path
    - CI coverage summary uses jq to parse json-summary reporter output into GitHub Step Summary markdown table

key-files:
  created:
    - apps/web/app/api/v1/monitoring/email-stats/route.ts
    - apps/web/app/api/v1/monitoring/sms-stats/route.ts
    - apps/web/app/api/v1/monitoring/webhook-stats/route.ts
  modified:
    - packages/shared/src/metrics/business.ts
    - apps/web/app/api/v1/webhooks/comgate/route.ts
    - vitest.shared.ts
    - .github/workflows/ci.yml

key-decisions:
  - 'Monitoring endpoints use SETTINGS_MANAGE permission (not a separate MONITORING_READ): reuses existing admin role, avoids new permission proliferation'
  - 'SMS cost estimate uses sent * 1.5 * costPerSegment (rough 1.5 segment average): precise segment count tracked in worker via prom-client, not available in web process'
  - 'Webhook stuck threshold is 5 minutes (processing status older than 5 min): conservative value, most webhooks complete within seconds'
  - 'json-summary reporter added alongside existing reporters (not replacing): json-summary is compact totals for CI parsing, json is per-file detail for coverage tools'
  - 'CI coverage summary uses if: always() so table visible even on threshold failures: critical for diagnosing which package dropped below 80%'
  - 'bounceRate calculated as failed/(delivered+failed) not failed/total: matches industry definition (measures failure rate among attempted deliveries)'

patterns-established:
  - 'Internal monitoring endpoints: createRouteHandler + requiresAuth: true + SETTINGS_MANAGE permission'
  - 'Aggregate stats queries: db.select() with sql<number> typed FILTER (WHERE ...) fragments for single-pass counting'
  - 'Webhook instrumentation: synchronous Counter.inc() after markWebhookCompleted() (success) and in catch block (failure)'

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 22 Plan 02: Monitoring API Endpoints + CI Coverage Summary

**Webhook failure tracking via prom-client counter, 3 admin-only monitoring API endpoints for email/SMS/webhook stats, and GitHub Step Summary coverage table in CI**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T20:35:04Z
- **Completed:** 2026-02-20T20:39:08Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- Instrumented Comgate webhook handler with `webhookProcessingTotal.inc({ gateway: 'comgate', status: 'success'/'failure' })` counter in both success and catch paths
- Created 3 admin-protected monitoring endpoints returning delivery stats (email bounce rate, SMS monthly cost estimate, webhook stuck detection)
- Added `json-summary` to vitest coverage reporters and CI step to write per-package coverage table to `GITHUB_STEP_SUMMARY` on every test run

## Task Commits

Each task was committed atomically:

1. **Task 1: Instrument Comgate webhook with metrics and create monitoring API endpoints** - `316ca79` (feat)
2. **Task 2: Add json-summary coverage reporter and CI coverage summary step** - `4358504` (feat)

**Plan metadata:** `{metadata-hash}` (docs: complete plan)

## Files Created/Modified

- `packages/shared/src/metrics/business.ts` - Added `webhookProcessingTotal` Counter with `gateway` and `status` label dimensions
- `apps/web/app/api/v1/webhooks/comgate/route.ts` - Added `webhookProcessingTotal.inc()` calls on success path (after `markWebhookCompleted`) and in outer catch block
- `apps/web/app/api/v1/monitoring/email-stats/route.ts` - GET endpoint querying notifications table for email delivery stats (delivered, failed, total, bounceRate) with configurable window
- `apps/web/app/api/v1/monitoring/sms-stats/route.ts` - GET endpoint for SMS monthly stats with estimated cost (sent * 1.5 segments * costPerSegment) and percent of monthly limit
- `apps/web/app/api/v1/monitoring/webhook-stats/route.ts` - GET endpoint querying processed_webhooks for completed/failed/stuck counts in configurable window
- `vitest.shared.ts` - Added `'json-summary'` to coverage.reporter array alongside existing text/json/html/lcov reporters
- `.github/workflows/ci.yml` - Added "Generate coverage summary" step with `if: always()` writing markdown table to `$GITHUB_STEP_SUMMARY` between test run and artifact upload

## Decisions Made

- **Monitoring endpoints use `SETTINGS_MANAGE` permission** (not a new `MONITORING_READ` permission): reuses existing admin role, avoids permission proliferation in an already-large permissions set
- **SMS cost estimate uses `sent * 1.5 * costPerSegment`**: precise segment tracking is in the notification worker (prom-client counter), not available in the web process — 1.5 average segments is acceptable for dashboard estimate
- **Webhook "stuck" threshold is 5 minutes** (processing state older than 5 min): most webhooks complete within seconds, 5 min is conservative enough to avoid false positives
- **`json-summary` added alongside existing reporters**, not replacing them: compact totals file needed for CI jq parsing, detailed per-file json needed for external coverage tools
- **`bounceRate = failed / (delivered + failed)`**: matches industry definition — measures failure rate among attempted deliveries, not among all records (which includes pending)

## Deviations from Plan

None - plan executed exactly as written.

The Comgate webhook route had been updated between plan writing and execution (now uses `verifyComgateWebhookSecret` instead of `verifyComgateSignature`), but this was an existing improvement — the metric instrumentation was added to the correct locations (success path after `markWebhookCompleted`, failure path in outer catch).

## Issues Encountered

- **Commit scope validation**: `22-02` scope was rejected by commitlint (allowed scopes: database, backend, frontend, devops, docs, shared, events, ui, web, deps). Used `web` for Task 1 commit and `devops` for Task 2 commit instead.

## User Setup Required

None - no external service configuration required. The monitoring endpoints are available immediately after deploy. Optional env vars with defaults:
- `SMS_COST_PER_SEGMENT_CZK` (default: 1.50)
- `SMS_MONTHLY_COST_LIMIT_CZK` (default: 5000)

## Next Phase Readiness

- MON-03 complete: webhook failure counter increments on each Comgate webhook processing failure
- MON-04 complete: 80% coverage threshold (Phase 16) + human-readable CI summary (this plan)
- Monitoring API endpoints ready for dashboard integration or Prometheus scraping
- Phase 22 MON requirements fully instrumented

---

_Phase: 22-monitoring-alerts_
_Completed: 2026-02-20_

## Self-Check: PASSED

All created files verified on disk. Both task commits confirmed in git log:
- `316ca79` feat(web): add webhook metrics and monitoring API endpoints
- `4358504` feat(devops): add json-summary coverage reporter and CI step summary

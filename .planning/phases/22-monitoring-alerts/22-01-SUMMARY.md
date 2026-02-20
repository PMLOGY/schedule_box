---
phase: 22-monitoring-alerts
plan: 01
subsystem: infra
tags: [prom-client, bullmq, nodemailer, monitoring, alerting, metrics, sms, email]

# Dependency graph
requires:
  - phase: 19-email-delivery
    provides: SMTP configuration and nodemailer transport pattern used for alert emails
  - phase: 20-sms-delivery
    provides: SMS sender with estimateSMSSegments() used for segment-based cost estimation

provides:
  - Worker-local prom-client registry with email/SMS/segment metrics
  - BullMQ repeatable monitoring job running every 5 minutes
  - Dual-channel alert delivery (SMTP email primary, Slack webhook fallback)
  - Email bounce rate alerting (MON-01) above 5% threshold
  - SMS cost alerting (MON-02) when approaching monthly CZK limit
  - /metrics endpoint on worker health server (port 3001) for manual debugging

affects:
  - 22-monitoring-alerts (plans 02+)
  - Any future observability enhancements to the notification worker

# Tech tracking
tech-stack:
  added: [prom-client@15.1.3 (installed in notification-worker package)]
  patterns:
    - Worker-local prom-client Registry separate from shared package (cross-process isolation)
    - Fire-and-forget alert sender (never throws, always logs to console)
    - BullMQ repeatable job with jobId deduplication for monitoring scheduler
    - Lazy SMTP transporter creation on first alert send

key-files:
  created:
    - services/notification-worker/src/monitoring/metrics.ts
    - services/notification-worker/src/monitoring/alert-sender.ts
    - services/notification-worker/src/monitoring/monitoring-scheduler.ts
  modified:
    - services/notification-worker/src/jobs/email-job.ts
    - services/notification-worker/src/jobs/sms-job.ts
    - services/notification-worker/src/services/sms-sender.ts
    - services/notification-worker/src/config.ts
    - services/notification-worker/src/health.ts
    - services/notification-worker/src/index.ts
    - services/notification-worker/package.json (prom-client added)

key-decisions:
  - 'Worker-local prom-client Registry: notification-worker is a separate Node.js process; shared package registry is not visible here'
  - 'alert-sender.ts never throws: alerting failures must not crash the monitoring loop'
  - 'SMS cost estimated from in-process segment counter (not Twilio billing API): avoids 24-48h billing delay'
  - 'BullMQ repeatable job with jobId deduplication: restarts do not create duplicate monitoring jobs'
  - 'Slack webhook is optional fallback via SLACK_WEBHOOK_URL env var: provides redundancy when SMTP is down'
  - 'MONITORING_ALERT_EMAIL falls back to SMTP_FROM then admin@schedulebox.cz: no extra env var required in basic setup'

patterns-established:
  - 'Worker monitoring pattern: define metrics in monitoring/metrics.ts, import in job handlers, expose via /metrics on health server'
  - 'Alert sender pattern: primary channel (SMTP), optional fallback (Slack), always log to console, never throw'
  - 'Monitoring scheduler pattern: BullMQ repeatable job with configurable interval via MONITORING_CHECK_INTERVAL_MS env var'

# Metrics
duration: 7min
completed: 2026-02-20
---

# Phase 22 Plan 01: Monitoring & Alerts Summary

**prom-client metrics + BullMQ repeatable scheduler alerting on email bounce rate (>5%) and SMS cost (approaching monthly CZK limit) via SMTP email and optional Slack webhook**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-20T20:34:09Z
- **Completed:** 2026-02-20T20:40:51Z
- **Tasks:** 2/2
- **Files modified:** 9 (3 created, 6 modified + package.json)

## Accomplishments

- Created worker-local prom-client registry with 4 metrics: emailDeliveryTotal (Counter), smsDeliveryTotal (Counter), smsSegmentsTotal (Counter), smsEstimatedMonthlyCostCzk (Gauge)
- Instrumented email-job.ts and sms-job.ts to increment delivery counters on every success and failure; sms-sender.ts increments segment counter on real Twilio sends only
- Created alert-sender.ts with dual-channel delivery: SMTP email (primary) + Slack webhook (fallback), fire-and-forget contract
- Created monitoring-scheduler.ts: BullMQ repeatable job every 5 minutes checks email bounce rate (MON-01) and SMS monthly cost (MON-02), triggers sendAlert when thresholds breached
- Added /metrics endpoint to worker health server for manual debugging via curl
- All monitoring config overridable via environment variables (thresholds, email, Slack webhook URL)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create worker monitoring metrics and instrument email/SMS jobs** - `7195cad` (feat)
2. **Task 2: Create monitoring scheduler and alert sender with dual-channel delivery** - `a5fd435` (feat)

## Files Created/Modified

- `services/notification-worker/src/monitoring/metrics.ts` - Worker-local prom-client Registry with 4 metrics; getWorkerMetrics() for /metrics endpoint
- `services/notification-worker/src/monitoring/alert-sender.ts` - sendAlert() with SMTP primary + Slack fallback; never throws
- `services/notification-worker/src/monitoring/monitoring-scheduler.ts` - startMonitoringScheduler() creates BullMQ repeatable job; handleMonitoringCheck() runs MON-01 and MON-02 checks
- `services/notification-worker/src/jobs/email-job.ts` - Added emailDeliveryTotal.inc on success and failure paths
- `services/notification-worker/src/jobs/sms-job.ts` - Added smsDeliveryTotal.inc on success and failure paths
- `services/notification-worker/src/services/sms-sender.ts` - Added smsSegmentsTotal.inc after real Twilio message.create
- `services/notification-worker/src/config.ts` - Added monitoring config section with 6 env-var-overridable settings
- `services/notification-worker/src/health.ts` - Added async /metrics route calling getWorkerMetrics()
- `services/notification-worker/src/index.ts` - Added monitoringResources lifecycle (start after schedulers, close in shutdown)
- `services/notification-worker/package.json` - Added prom-client@^15.1.3 dependency

## Decisions Made

- **Worker-local prom-client Registry:** The notification worker is a separate Node.js process from apps/web. The shared package registry is process-scoped; importing from @schedulebox/shared would give a different registry instance not reachable from /api/metrics. Worker gets its own Registry for isolation.
- **SMS cost from in-process segment counter:** Twilio billing API has 24-48h delay. estimateSMSSegments() already exists; multiply by configurable CZK rate. Avoids API complexity.
- **alert-sender.ts never throws:** Alerting failures must never crash the monitoring loop. All paths wrapped in try/catch with error logging and no re-throw.
- **jobId deduplication on repeatable job:** `jobId: 'delivery-stats-check'` prevents duplicate jobs when worker restarts.
- **Removed unused `Queue` type import from index.ts:** ESLint flagged it since MonitoringResources type already encapsulates both Queue and Worker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made health server callback async**

- **Found during:** Task 1 (health.ts /metrics endpoint)
- **Issue:** `createServer((req, res) => { ... })` callback was synchronous; `await getWorkerMetrics()` caused TS1308 compile error
- **Fix:** Changed to `createServer(async (req, res) => { ... })`
- **Files modified:** `services/notification-worker/src/health.ts`
- **Verification:** `pnpm --filter @schedulebox/notification-worker type-check` passes
- **Committed in:** `7195cad` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed unused `Queue` type import causing ESLint error**

- **Found during:** Task 2 (index.ts changes, pre-commit hook)
- **Issue:** Plan said to add `type Queue` import alongside `type Worker`, but `monitoringResources` uses `MonitoringResources` type which already contains Queue; bare `Queue` import flagged as unused by ESLint
- **Fix:** Removed `type Queue` from bullmq import line
- **Files modified:** `services/notification-worker/src/index.ts`
- **Verification:** ESLint passes, `pnpm type-check` passes
- **Committed in:** `a5fd435` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs)
**Impact on plan:** Both fixes required for successful TypeScript compilation and pre-commit hook passage. No scope creep.

## Issues Encountered

- Task 1 was already committed in a prior partial run (commit `7195cad`). Detected by comparing working tree vs HEAD; no re-work needed, proceeded to Task 2 directly.
- Pre-commit hook (commitlint) rejected scope `22-01` — project uses enum `[database, backend, frontend, devops, docs, shared, events, ui, web, deps]`. Used `backend` scope.

## User Setup Required

Optional environment variables for full alerting capability:

- `MONITORING_ALERT_EMAIL` — email address to receive alerts (defaults to SMTP_FROM)
- `SLACK_WEBHOOK_URL` — Slack incoming webhook URL for fallback alerts (optional)
- `EMAIL_BOUNCE_THRESHOLD` — decimal fraction (default: 0.05 = 5%)
- `SMS_MONTHLY_COST_LIMIT_CZK` — monthly SMS budget in CZK (default: 5000)
- `SMS_COST_PER_SEGMENT_CZK` — cost per SMS segment in CZK (default: 1.50)
- `MONITORING_CHECK_INTERVAL_MS` — check interval in ms (default: 300000 = 5 min)

## Next Phase Readiness

- Monitoring scheduler is active: email and SMS delivery are now instrumented and periodic checks will run every 5 minutes when the worker starts with a live Redis connection
- /metrics endpoint available on port 3001 for manual inspection
- Plan 22-02 can proceed (webhook failure monitoring and CI coverage tracking)

---

_Phase: 22-monitoring-alerts_
_Completed: 2026-02-20_

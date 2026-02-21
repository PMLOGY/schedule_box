---
phase: 22-monitoring-alerts
verified: 2026-02-20T21:30:00Z
status: gaps_found
score: 7/9 must-haves verified
re_verification: false
gaps:
  - truth: "Payment webhook failures log to DLQ and trigger alerts"
    status: failed
    reason: "Webhook failures increment a counter and are queryable via monitoring API, but no automatic alert is triggered when the failure count crosses a threshold. The monitoring scheduler only checks email bounce rate and SMS cost -- no webhook failure check calls sendAlert."
    artifacts:
      - path: "apps/web/app/api/v1/webhooks/comgate/route.ts"
        issue: "Increments webhookProcessingTotal.inc on failure, but does not call sendAlert"
      - path: "services/notification-worker/src/monitoring/monitoring-scheduler.ts"
        issue: "handleMonitoringCheck covers email bounce rate and SMS cost only -- no webhook failure check block"
    missing:
      - "Add webhook failure check in handleMonitoringCheck that queries processed_webhooks for failed count in rolling window and calls sendAlert when above threshold"
      - "Alternative: call sendAlert directly in comgate webhook catch block for immediate alerting"
human_verification:
  - test: "Call GET /api/v1/monitoring/email-stats without a valid admin session"
    expected: "Returns 401 or 403, not delivery stats"
    why_human: "Auth middleware behavior requires live HTTP server to verify"
---
# Phase 22: Monitoring and Alerts -- Verification Report

**Phase Goal:** Production issues are detected and alerted immediately before customers complain
**Verified:** 2026-02-20T21:30:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Email delivery failures above 5% in rolling hour window trigger an alert email | VERIFIED | monitoring-scheduler.ts lines 47-85: queries notifications for email channel, calculates failure rate, calls sendAlert when above emailBounceThreshold (0.05) |
| 2 | SMS estimated monthly cost approaching threshold triggers an alert | VERIFIED | monitoring-scheduler.ts lines 87-118: queries SMS notifications, estimates cost from segment counter, calls sendAlert when above 80% of monthly limit |
| 3 | Monitoring checks run automatically every 5 minutes via BullMQ repeatable job | VERIFIED | monitoring-scheduler.ts line 157: repeat.every = checkIntervalMs (default 300000ms); index.ts line 78: startMonitoringScheduler called in startup |
| 4 | Alert sender has email primary + Slack webhook fallback channels | VERIFIED | alert-sender.ts: SMTP transporter primary, Slack POST fallback, both wrapped in try/catch, never throws |
| 5 | Worker health endpoint exposes /metrics for debugging | VERIFIED | health.ts lines 55-59: /metrics route returns getWorkerMetrics() with text/plain content type |
| 6 | Payment webhook failures increment a counter and are queryable via monitoring API | VERIFIED | comgate/route.ts line 197: success inc; line 210: failure inc; webhook-stats/route.ts queries processed_webhooks |
| 7 | Payment webhook failures trigger alerts when threshold is breached | FAILED | handleMonitoringCheck has no webhook failure check block -- only email and SMS checks present; no sendAlert call path for webhook failures |
| 8 | CI pipeline generates a coverage summary in GitHub Step Summary on every test run | VERIFIED | ci.yml lines 68-86: Generate coverage summary step with if: always(), writes markdown table via jq to GITHUB_STEP_SUMMARY |
| 9 | json-summary coverage reporter enabled so CI can parse per-package coverage | VERIFIED | vitest.shared.ts line 14: reporter array includes json-summary |

**Score:** 7/9 truths verified

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| services/notification-worker/src/monitoring/metrics.ts | Worker-local prom-client Registry with 4 metrics | VERIFIED | Exports workerRegister, emailDeliveryTotal, smsDeliveryTotal, smsSegmentsTotal, smsEstimatedMonthlyCostCzk, getWorkerMetrics() |
| services/notification-worker/src/monitoring/alert-sender.ts | Alert delivery via SMTP + optional Slack webhook | VERIFIED | Exports sendAlert(payload), never-throw contract enforced via try/catch in both channel paths |
| services/notification-worker/src/monitoring/monitoring-scheduler.ts | BullMQ repeatable job querying DB and triggering alerts | PARTIAL | Exports startMonitoringScheduler, implements handleMonitoringCheck for MON-01 and MON-02; missing webhook failure check block |
| services/notification-worker/src/jobs/email-job.ts | Email delivery metric increments on success/failure | VERIFIED | Line 70: inc sent; line 77: inc failed in catch block |
| services/notification-worker/src/jobs/sms-job.ts | SMS delivery metric increments on success/failure | VERIFIED | Line 64: inc sent; line 71: inc failed in catch block |

#### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| apps/web/app/api/v1/webhooks/comgate/route.ts | webhookProcessingTotal.inc on success/failure | VERIFIED | Line 197: success; line 210: failure; imported from @schedulebox/shared/metrics/business |
| packages/shared/src/metrics/business.ts | webhookProcessingTotal Counter definition | VERIFIED | Lines 36-41: Counter with gateway and status labelNames on shared register |
| apps/web/app/api/v1/monitoring/email-stats/route.ts | GET returning email delivery stats with bounce rate | VERIFIED | FILTER aggregates on notifications; returns delivered/failed/total/bounceRate; SETTINGS_MANAGE protected |
| apps/web/app/api/v1/monitoring/sms-stats/route.ts | GET returning SMS delivery stats with cost estimate | VERIFIED | Returns sent/failed/total/estimatedCostCzk/percentOfLimit; SETTINGS_MANAGE protected |
| apps/web/app/api/v1/monitoring/webhook-stats/route.ts | GET returning webhook stats with stuck detection | VERIFIED | Queries processed_webhooks for completed/failed/stuck counts; SETTINGS_MANAGE protected |
| vitest.shared.ts | json-summary in coverage.reporter array | VERIFIED | Line 14: includes json-summary |
| .github/workflows/ci.yml | Coverage summary step writing to GITHUB_STEP_SUMMARY | VERIFIED | Lines 68-86: step after tests with if: always() |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| email-job.ts | monitoring/metrics.ts | emailDeliveryTotal.inc | WIRED | Import line 15; increments at lines 70 (success) and 77 (catch) |
| sms-job.ts | monitoring/metrics.ts | smsDeliveryTotal.inc | WIRED | Import line 15; increments at lines 64 (success) and 71 (catch) |
| sms-sender.ts | monitoring/metrics.ts | smsSegmentsTotal.inc | WIRED | Import line 8; increment at line 91 after real Twilio send only (mock path returns before this) |
| monitoring-scheduler.ts | alert-sender.ts | sendAlert for email failures | WIRED | Import line 13; sendAlert called at lines 72-77 |
| monitoring-scheduler.ts | alert-sender.ts | sendAlert for SMS cost | WIRED | sendAlert called at lines 113-117 |
| monitoring-scheduler.ts | alert-sender.ts | sendAlert for webhook failures | NOT_WIRED | No webhook failure check block in handleMonitoringCheck |
| index.ts | monitoring-scheduler.ts | startMonitoringScheduler at startup | WIRED | Import lines 17-19; called at line 78; closed in shutdown at lines 156-160 |
| comgate/route.ts | packages/shared/src/metrics/business.ts | webhookProcessingTotal.inc | WIRED | Import line 29; increments at lines 197 (success) and 210 (failure) |
| ci.yml | coverage-summary.json | jq parsing to GITHUB_STEP_SUMMARY | WIRED | Lines 76-83 iterate packages and append to GITHUB_STEP_SUMMARY |

---

### Requirements Coverage

| Requirement | Description | Status | Blocking Issue |
|-------------|-------------|--------|----------------|
| MON-01 | Email delivery monitoring (bounce rate alerts above 5%) | SATISFIED | Scheduler queries notifications table hourly and calls sendAlert when bounce rate exceeds threshold |
| MON-02 | SMS usage tracking with cost alerts | SATISFIED | Scheduler estimates monthly cost from segment counter and calls sendAlert at 80% and 100% of limit |
| MON-03 | Payment webhook failure logging and alerting | BLOCKED | Counter incremented and queryable via API, but no automatic alert fires on failure threshold breach |
| MON-04 | Test coverage tracking in CI (fail build if below 80%) | SATISFIED | 80% threshold enforced via vitest.shared.ts; json-summary enables CI Step Summary table |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/web/app/api/v1/webhooks/twilio-usage/route.ts | 26 | TODO: Phase 22 will add proper alerting | Info | Pre-existing TODO from before Phase 22; Twilio usage alerting is not a MON-03 deliverable |

No blocker anti-patterns in Phase 22 implemented files.

---

### Human Verification Required

#### 1. Monitoring Scheduler Live Cycle

**Test:** Start the notification worker with Redis running, send an email job that fails (invalid SMTP config), wait up to 5 minutes and check terminal logs.
**Expected:** Logs show [Monitor] Health check completed every 5 minutes. If bounce rate is above 5%, logs show [Monitor Alert] Email bounce rate above threshold.
**Why human:** 5-minute repeatable job cycle; requires live Redis, worker process, and real notification failures to cross threshold.

#### 2. Alert Email Delivery

**Test:** Configure MONITORING_ALERT_EMAIL and valid SMTP env vars, push email bounce rate above 5%, wait for scheduler cycle.
**Expected:** Alert email received at the configured address with subject prefix [ScheduleBox WARNING].
**Why human:** Requires live SMTP server; cannot verify email receipt programmatically.

#### 3. Monitoring API Authentication

**Test:** Call GET /api/v1/monitoring/email-stats without a valid admin session cookie.
**Expected:** Returns 401 or 403, not the stats payload.
**Why human:** Auth middleware behavior requires live HTTP server to verify.

---

### Gaps Summary

One gap blocks full goal achievement: MON-03 active alerting is not implemented.

The ROADMAP success criterion states: "Payment webhook failures log to DLQ and trigger alerts." The implementation delivers the counter-and-query half (prom-client counter increment on every failure, queryable via GET /api/v1/monitoring/webhook-stats) but not the active-alert half (no scheduled check calls sendAlert when webhook failures cross a threshold).

The monitoring scheduler in services/notification-worker/src/monitoring/monitoring-scheduler.ts implements two checks in handleMonitoringCheck:
- MON-01: email bounce rate check that queries notifications table and calls sendAlert
- MON-02: SMS cost check that estimates cost from segment counter and calls sendAlert

An equivalent third check for webhook failures was not added. The gap requires approximately 20-30 additional lines in handleMonitoringCheck:
1. Query processed_webhooks for failed count in the last hour
2. If failures exceed a configurable threshold (e.g. 5 in 1 hour = warning, 10 = critical), call sendAlert

An alternative approach: add a direct sendAlert call in the Comgate webhook catch block (fire-and-forget), providing immediate alerting consistent with the phase goal of "detected immediately" rather than waiting for the 5-minute scheduler cycle.

All other success criteria are fully satisfied: email bounce monitoring with active alerts, SMS cost monitoring with active alerts, 5-minute repeatable BullMQ scheduler, dual-channel alert sender with never-throw contract, worker /metrics endpoint on port 3001, webhook failure counter, three auth-protected monitoring API endpoints (email-stats, sms-stats, webhook-stats), json-summary coverage reporter, and CI GitHub Step Summary with per-package coverage table.

---

_Verified: 2026-02-20T21:30:00Z_
_Verifier: Claude (gsd-verifier)_

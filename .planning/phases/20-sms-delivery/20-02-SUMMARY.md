---
phase: 20-sms-delivery
plan: 02
subsystem: infra
tags: [twilio, sms, helm, kubernetes, secrets, usage-triggers, cost-monitoring]

# Dependency graph
requires:
  - phase: 19-email-delivery
    provides: Helm secrets pattern (secretRef injection, no empty-string overrides)
  - phase: 20-sms-delivery/01
    provides: Twilio SDK installed, SMS sender service, config.ts with TWILIO_FROM_NUMBER
provides:
  - Twilio usage trigger webhook at /api/v1/webhooks/twilio-usage
  - One-time setup script for Twilio Usage Triggers API
  - Twilio credentials in Helm secrets.yaml (native + ExternalSecret)
  - Worker-deployment.yaml free of empty-string secret overrides (Twilio + VAPID)
  - .env.example documenting SMS_NO_SHOW_THRESHOLD and SMS_BUDGET_ALERT_THRESHOLD
affects: [22-monitoring, 20-sms-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns: [twilio-usage-triggers, helm-secret-injection]

key-files:
  created:
    - apps/web/app/api/v1/webhooks/twilio-usage/route.ts
    - scripts/setup-twilio-usage-trigger.ts
  modified:
    - helm/schedulebox/templates/secrets.yaml
    - helm/schedulebox/templates/worker-deployment.yaml
    - .env.example

key-decisions:
  - 'TWILIO_FROM_NUMBER used in Helm secrets (matching config.ts) instead of incorrect TWILIO_PHONE_NUMBER from old deployment yaml'
  - 'VAPID empty-string overrides removed alongside Twilio overrides (same bug pattern)'
  - 'Usage trigger webhook logs alerts only (Phase 22 will add Slack/email alerting)'

patterns-established:
  - 'One-time setup scripts in scripts/ directory for external service configuration'
  - 'Helm secrets pattern: credentials only in secrets.yaml, never hardcoded empty-string in deployment manifests'

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 20 Plan 02: SMS Cost Monitoring & Helm Secrets Summary

**Twilio usage trigger webhook + setup script for SMS cost monitoring, with Helm secrets fix for Twilio/VAPID credential injection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T20:33:54Z
- **Completed:** 2026-02-20T20:38:24Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Created webhook endpoint at /api/v1/webhooks/twilio-usage that receives Twilio Usage Trigger POST callbacks and logs SMS spending alerts
- Created one-time setup script (scripts/setup-twilio-usage-trigger.ts) that creates monthly recurring usage triggers via Twilio API
- Fixed Helm worker-deployment.yaml by removing hardcoded empty TWILIO_* and VAPID_* env vars that silently overrode secretRef injection
- Added TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to Helm secrets.yaml (both native K8s Secret and ExternalSecret)
- Updated .env.example with SMS cost optimization documentation (SMS_NO_SHOW_THRESHOLD, SMS_BUDGET_ALERT_THRESHOLD)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Twilio usage trigger webhook and setup script** - `69ec547` (feat)
2. **Task 2: Fix Helm secrets and update .env.example for Twilio** - `ea0685f` (chore) + `316ca79` (Helm changes via lint-staged)

**Plan metadata:** (pending) (docs: complete plan)

## Files Created/Modified

- `apps/web/app/api/v1/webhooks/twilio-usage/route.ts` - Webhook endpoint receiving Twilio Usage Trigger POST callbacks with spending alert logging
- `scripts/setup-twilio-usage-trigger.ts` - One-time script creating monthly recurring Twilio usage trigger via API
- `helm/schedulebox/templates/secrets.yaml` - Added TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER to native Secret and ExternalSecret
- `helm/schedulebox/templates/worker-deployment.yaml` - Removed hardcoded empty TWILIO_*/VAPID_* env entries overriding secretRef
- `.env.example` - Added SMS_NO_SHOW_THRESHOLD, SMS_BUDGET_ALERT_THRESHOLD documentation with improved Twilio credential comments

## Decisions Made

- Used TWILIO_FROM_NUMBER in Helm secrets (matching config.ts) instead of the incorrect TWILIO_PHONE_NUMBER that was in the old worker-deployment.yaml
- Removed VAPID empty-string overrides alongside Twilio -- same bug pattern as SMTP fix in Phase 19 Plan 03
- Usage trigger webhook logs alerts via console.warn only -- Phase 22 (Monitoring) will add proper Slack/email alerting
- Setup script uses NEXT_PUBLIC_APP_URL for callback URL with https://app.schedulebox.cz as default

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Parallel agent commits created interleaving: Helm file changes were picked up by lint-staged during the Task 1 commit cycle and also committed in an interleaved commit (316ca79) from another agent. The changes are correct and present in HEAD; the commit attribution is slightly split across commits.

## User Setup Required

**External services require manual configuration after Twilio account is created:**

1. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `.env.local`
2. Run `npx tsx scripts/setup-twilio-usage-trigger.ts` to create the monthly SMS budget alert trigger
3. Optionally adjust `SMS_BUDGET_ALERT_THRESHOLD` (default: $50 USD)

## Next Phase Readiness

- SMS cost monitoring infrastructure complete (webhook + setup script)
- Helm secrets correctly configured for Twilio credential injection
- Ready for Phase 20 Plan 03 (remaining SMS delivery tasks)

## Self-Check: PASSED

All 6 files verified present on disk. Both commit hashes (69ec547, ea0685f) verified in git log.

---

_Phase: 20-sms-delivery_
_Completed: 2026-02-20_

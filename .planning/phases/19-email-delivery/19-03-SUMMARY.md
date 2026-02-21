---
phase: 19-email-delivery
plan: "03"
subsystem: infra
tags: [helm, kubernetes, smtp, cesky-hosting, secrets, notification-worker]

# Dependency graph
requires:
  - phase: 19-email-delivery
    provides: Email delivery research and notification worker SMTP implementation

provides:
  - Helm secrets.yaml with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in both native K8s Secret and ExternalSecret blocks
  - worker-deployment.yaml free of hardcoded empty-string SMTP overrides (secrets now injected via secretRef)
  - .env.example documenting cesky-hosting.cz SMTP configuration for developers

affects: [20-sms-delivery, 22-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Helm secrets.yaml as single source of truth for all credential fields (SMTP via secretRef, not per-deployment env overrides)'
    - 'ExternalSecret data array mirrors native Secret stringData for parity across deployment modes'

key-files:
  created: []
  modified:
    - helm/schedulebox/templates/secrets.yaml
    - helm/schedulebox/templates/worker-deployment.yaml
    - .env.example

key-decisions:
  - 'SMTP provider changed to cesky-hosting.cz (not Brevo): SMTP_HOST default is smtp.cesky-hosting.cz, SMTP_FROM default is no-reply@schedulebox.cz'
  - 'SMTP_PORT omitted from ExternalSecret block: has a safe default (587) in native Secret block, no external override needed'
  - 'smtpUser and smtpPass have no Helm default: must be explicitly provided at deploy time (empty string = SMTP not configured, worker logs warning)'
  - 'Twilio and VAPID hardcoded empty-string env entries left intact: Phase 20 (SMS) scope'

patterns-established:
  - 'All worker credentials come from secretRef (envFrom), not per-env hardcoded entries: avoids env override precedence bug'

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 19 Plan 03: Helm SMTP Secrets Configuration Summary

**Kubernetes SMTP credential injection fixed by adding cesky-hosting.cz fields to secrets.yaml and removing empty-string env overrides that silently blocked email delivery in production**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T18:41:33Z
- **Completed:** 2026-02-20T18:49:00Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Added SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to Helm secrets.yaml in both the native K8s Secret (`stringData`) and ExternalSecret (`data`) blocks — credentials now flow from secrets into the worker via the existing `secretRef`
- Removed four hardcoded `value: ""` SMTP env entries from worker-deployment.yaml that were overriding the secretRef and silently preventing email delivery
- Updated .env.example from legacy SendGrid configuration to cesky-hosting.cz with correct field documentation (SMTP_USER = full email address)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SMTP secrets to Helm secrets.yaml** - `5315fb6` (feat)
2. **Task 2: Remove hardcoded SMTP overrides, update .env.example** - `1b49647` (fix)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `helm/schedulebox/templates/secrets.yaml` - Added 5 SMTP fields to native Secret stringData, 4 SMTP fields (no port) to ExternalSecret data array
- `helm/schedulebox/templates/worker-deployment.yaml` - Removed SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS empty-string overrides; updated Twilio comment to clarify secretRef injection
- `.env.example` - Replaced SendGrid SMTP block with cesky-hosting.cz block, documented SMTP_USER as full email address

## Decisions Made

- SMTP provider switched to cesky-hosting.cz per user override (not Brevo as in the original plan)
- SMTP_HOST default: `smtp.cesky-hosting.cz`; SMTP_FROM default: `no-reply@schedulebox.cz`
- SMTP_PORT excluded from ExternalSecret (has safe 587 default in native block, no per-environment override needed)
- smtpUser/smtpPass intentionally have no Helm default — empty = SMTP not configured, worker logs warning rather than crashing

## Deviations from Plan

### User Override Applied

**SMTP provider changed from Brevo to cesky-hosting.cz (user instruction)**

- **Applied to:** Task 1 (secrets.yaml defaults) and Task 2 (.env.example content)
- **Changes vs plan:**
  - `SMTP_HOST` default: `smtp.cesky-hosting.cz` (plan had `smtp-relay.brevo.com`)
  - `SMTP_FROM` default: `no-reply@schedulebox.cz` (plan had `info@schedulebox.cz`)
  - `.env.example` comment header: "Cesky Hosting" (plan had "Brevo")
  - `.env.example` SMTP_USER: `no-reply@schedulebox.cz` with note "full email address" (plan had Brevo account email)
  - `.env.example` SMTP_PASS: `your-smtp-password-here` (plan had `your-brevo-smtp-key-here`)
  - Removed Brevo-specific SMTP key vs API key distinction note
- **Files modified:** `helm/schedulebox/templates/secrets.yaml`, `.env.example`

---

**Total deviations:** 1 user override (provider substitution — all plan structure and logic unchanged)
**Impact on plan:** Functional outcome identical; cesky-hosting.cz replaces Brevo as the documented SMTP provider.

## Issues Encountered

- Commit lint hook rejected initial commit: scope `19-03` not in allowed list. Fixed to `devops`. Line-length violation fixed by shortening bullet points.

## User Setup Required

None - no external service configuration required (SMTP credentials will be provided at deploy time via `--set secrets.smtpUser=... --set secrets.smtpPass=...`).

## Next Phase Readiness

- Helm chart is ready for a production SMTP deploy: `helm upgrade schedulebox . --set secrets.smtpHost=smtp.cesky-hosting.cz --set secrets.smtpUser=no-reply@schedulebox.cz --set secrets.smtpPass=<password>`
- Phase 19 Plan 04 (email template implementation or integration testing) can proceed
- Phase 20 (SMS/Twilio) may follow the same pattern: add Twilio fields to secrets.yaml, remove hardcoded empty-string env entries from worker-deployment.yaml

---

_Phase: 19-email-delivery_
_Completed: 2026-02-20_

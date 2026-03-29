---
phase: 53-deployment-go-live
plan: 03
subsystem: infra
tags: [coolify, domain, ssl, comgate, recurring, billing, production]

requires:
  - phase: 53-deployment-go-live
    provides: production deployment on Coolify with demo seed (53-01), E2E CI gate (53-02)
provides:
  - Ready-to-configure documentation for custom domain setup (DEP-02)
  - Ready-to-configure documentation for Comgate recurring billing verification (DEP-04)
  - Clear prerequisites and step-by-step guides for both deferred items
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/53-deployment-go-live/53-03-DEFERRED-SETUP.md
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - 'Custom domain (DEP-02) deferred -- app runs on Coolify-generated URL until domain is chosen'
  - 'Comgate recurring billing (DEP-04) deferred -- blocked on Comgate support activating recurring for merchant 498621'
  - 'Both items documented with full setup guides so they can be completed independently when prerequisites are met'

patterns-established: []

requirements-completed: []

duration: 2min
completed: 2026-03-29
---

# Phase 53 Plan 03: Custom Domain and Comgate Billing -- Deferred with Setup Guides

**Both DEP-02 (custom domain) and DEP-04 (Comgate recurring billing) deferred with comprehensive ready-to-configure documentation; app live on Coolify URL**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T11:43:44Z
- **Completed:** 2026-03-29T11:45:50Z
- **Tasks:** 3 (1 decision resolved, 2 documented as deferred)
- **Files modified:** 2

## Accomplishments

- Resolved domain decision: defer custom domain, use Coolify-generated URL for now
- Created comprehensive setup guide (53-03-DEFERRED-SETUP.md) covering both DEP-02 and DEP-04 with prerequisites, step-by-step instructions, verification commands, and troubleshooting
- Updated REQUIREMENTS.md traceability table to reflect deferred status of both requirements
- Comgate billing verification skipped per user request -- documented exact steps for when recurring is activated

## Task Commits

Each task was committed atomically:

1. **Task 1: Domain decision** - No commit (checkpoint decision: defer-domain)
2. **Task 2: Document deferred DEP-02 and DEP-04** - `893969a` (docs)
3. **Task 3: Comgate billing verification** - Skipped per user request (deferred with documentation)

## Files Created/Modified

- `.planning/phases/53-deployment-go-live/53-03-DEFERRED-SETUP.md` - Complete setup guides for custom domain (DNS, Coolify, SSL) and Comgate recurring billing (activation, verification, troubleshooting)
- `.planning/REQUIREMENTS.md` - Updated DEP-02 and DEP-04 status to Deferred with cross-references

## Decisions Made

- **Custom domain deferred:** User chose "defer-domain" -- the app is accessible via Coolify-generated URL. When a domain is chosen, follow the guide in 53-03-DEFERRED-SETUP.md (DNS A record, Coolify domain config, Let's Encrypt auto-SSL)
- **Comgate billing deferred:** User requested skipping verification. Comgate recurring payments require merchant 498621 activation by Comgate support. Full verification steps documented for when activation completes
- **Both requirements remain open:** DEP-02 and DEP-04 are not marked complete but have clear documentation paths to completion

## Deviations from Plan

None -- plan was executed as designed for the deferral path. Both Task 2 and Task 3 had explicit deferral paths built into the plan.

## Issues Encountered

None.

## User Setup Required

**Both deferred items require user action when ready:**

**DEP-02 (Custom Domain):**
1. Choose a domain name
2. Configure DNS A record to point to Coolify server IP
3. Add domain in Coolify UI > Application > Settings > Domains
4. Update NEXT_PUBLIC_APP_URL and NEXTAUTH_URL env vars
5. Redeploy

**DEP-04 (Comgate Recurring):**
1. Contact Comgate support to activate recurring for merchant 498621
2. Verify COMGATE_MERCHANT_ID and COMGATE_SECRET in Coolify env vars
3. Test subscription upgrade flow on production

See `.planning/phases/53-deployment-go-live/53-03-DEFERRED-SETUP.md` for detailed instructions.

## Next Phase Readiness

- v3.1 milestone is effectively complete for code delivery
- App is deployed and functional on Coolify with demo data
- E2E CI gate is in place
- Two operational items (domain + billing) remain as deferred configuration tasks
- No code changes required for either -- both are infrastructure/service configuration

---

## Self-Check: PASSED

- 53-03-SUMMARY.md: FOUND
- 53-03-DEFERRED-SETUP.md: FOUND
- Commit 893969a: FOUND

---

_Phase: 53-deployment-go-live_
_Completed: 2026-03-29_

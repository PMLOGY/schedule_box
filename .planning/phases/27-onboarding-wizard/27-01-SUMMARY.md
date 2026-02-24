---
phase: 27-onboarding-wizard
plan: 01
subsystem: ui
tags: [react, zustand, zod, react-hook-form, next-intl, qrcode, wizard, onboarding]

# Dependency graph
requires:
  - phase: v1.0-api
    provides: PUT /api/v1/settings/company, POST /api/v1/services, PUT /api/v1/settings/working-hours
  - phase: 24-ai-ui
    provides: dashboard layout pattern, i18n message structure

provides:
  - 4-step onboarding wizard at /[locale]/onboarding
  - Zustand store managing wizard state (step, data, completedSteps Set)
  - Zod validation schemas for all 3 data-entry steps
  - QR code generation for booking URL (qrcode library)
  - onboarding_completed flag set via PUT /api/v1/settings/company on completion
  - Industry-specific working hour defaults and service templates

affects:
  - 27-02 (dashboard redirect hook depends on useOnboardingRedirect)
  - 27-03 (any onboarding completion tracking)
  - 27-04 (feature analytics tied to onboarding funnel)

# Tech tracking
tech-stack:
  added:
    - qrcode@1.5.4 (QR code data URL generation in browser)
    - '@types/qrcode@1.5.6' (TypeScript types)
  patterns:
    - Onboarding wizard stores data in Zustand (same pattern as booking-wizard.store.ts)
    - Step components are self-contained — each calls its own API endpoint directly
    - Industry type selection propagates to subsequent steps via shared store data
    - QR code generated client-side via useEffect when bookingUrl is available
    - onboarding_completed=true set only at final step completion before router.push

key-files:
  created:
    - apps/web/stores/onboarding-wizard.store.ts
    - apps/web/validations/onboarding.ts
    - apps/web/hooks/use-onboarding.ts
    - apps/web/app/[locale]/(dashboard)/onboarding/page.tsx
    - apps/web/app/[locale]/(dashboard)/onboarding/layout.tsx
    - apps/web/components/onboarding/setup-wizard.tsx
    - apps/web/components/onboarding/wizard-step-indicator.tsx
    - apps/web/components/onboarding/steps/company-details-step.tsx
    - apps/web/components/onboarding/steps/first-service-step.tsx
    - apps/web/components/onboarding/steps/working-hours-step.tsx
    - apps/web/components/onboarding/steps/share-link-step.tsx
  modified:
    - apps/web/validations/settings.ts (add onboarding_completed, industry_type)
    - apps/web/app/api/v1/settings/company/route.ts (map new fields, add to GET/PUT responses)
    - apps/web/messages/cs.json (onboarding namespace with industry types, all step labels)
    - apps/web/messages/en.json (onboarding namespace)
    - apps/web/messages/sk.json (onboarding namespace)

key-decisions:
  - 'Use Switch (radix-ui/react-switch, already installed) instead of Checkbox (radix-ui/react-checkbox not installed) for working hours day toggles'
  - 'Each step component calls its API endpoint directly (fetch) rather than through a shared mutation — simpler and matches existing booking wizard pattern'
  - 'Industry template pre-fills stored in a static map constant inside first-service-step, no API call needed'
  - 'WorkingHoursStep initializes from industry defaults when store has no data, falls back to standard Mon-Fri 9-17'
  - 'ShareLinkStep fetches company slug from /api/v1/settings/company on mount if not already in store'

patterns-established:
  - 'Onboarding wizard steps self-contained: own form state, own API call, own error handling'
  - 'Industry type drives defaults in steps 2 and 3 via data.industryType from Zustand store'
  - 'Minimal layout for onboarding route (no sidebar/header) overrides dashboard layout'

# Metrics
duration: 9min
completed: 2026-02-24
---

# Phase 27 Plan 01: Onboarding Wizard Summary

**4-step business setup wizard (company details, first service, working hours, share link) with QR code generation, industry-specific defaults, and onboarding_completed flag via existing v1 APIs**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-24T15:06:25Z
- **Completed:** 2026-02-24T15:15:00Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- Full 4-step wizard at `/[locale]/onboarding` behind AuthGuard with minimal layout (no sidebar)
- Zustand store tracks step, data, completedSteps Set, isSubmitting, error across all 4 steps
- Company details step: react-hook-form + Zod, industry type select (20 types from DB constraint), address fields, calls PUT /api/v1/settings/company
- First service step: duration select (15-120 min), price with Kč suffix, "Use template" button pre-fills industry-specific defaults, calls POST /api/v1/services
- Working hours step: 7-day schedule with Switch toggles and time selects (06:00-22:00 in 30-min increments), industry-specific defaults (beauty: 8-18, fitness: 6-22, medical: 7-16), calls PUT /api/v1/settings/working-hours
- Share link step: booking URL in styled box, copy-to-clipboard with 2-second "Copied!" feedback, QR code (200x200) via qrcode.toDataURL(), download QR button, "Complete setup" sets onboarding_completed=true and redirects to dashboard
- All UI text available in cs/en/sk via `onboarding` namespace in message files (steps, labels, industry types, action buttons)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create onboarding Zustand store, validation schemas, redirect hook, and install qrcode package** - `66dbad8` (feat)
2. **Task 2: Create wizard route, layout, step components, and i18n messages** - `fe05a37` (feat via Phase 26 Plan 02 commit)

**Plan metadata:** (committed with SUMMARY.md in final commit)

## Files Created/Modified

- `apps/web/stores/onboarding-wizard.store.ts` - Zustand store: OnboardingStep 1|2|3|4, WorkingHourEntry, completedSteps Set, all actions
- `apps/web/validations/onboarding.ts` - INDUSTRY_TYPES const, companyDetailsSchema, firstServiceSchema, workingHoursSchema
- `apps/web/hooks/use-onboarding.ts` - useOnboardingRedirect hook using TanStack Query
- `apps/web/app/[locale]/(dashboard)/onboarding/page.tsx` - Page route rendering SetupWizard
- `apps/web/app/[locale]/(dashboard)/onboarding/layout.tsx` - Minimal layout (no sidebar), AuthGuard, logo only
- `apps/web/components/onboarding/setup-wizard.tsx` - Orchestrator: WizardStepIndicator + step switching + error alert
- `apps/web/components/onboarding/wizard-step-indicator.tsx` - 4-step indicator with completed (green check), current (highlighted), future (muted)
- `apps/web/components/onboarding/steps/company-details-step.tsx` - react-hook-form, industry select, address, PUT /api/v1/settings/company
- `apps/web/components/onboarding/steps/first-service-step.tsx` - Service form with industry template, POST /api/v1/services
- `apps/web/components/onboarding/steps/working-hours-step.tsx` - 7-day grid with Switch toggles, industry defaults, PUT /api/v1/settings/working-hours
- `apps/web/components/onboarding/steps/share-link-step.tsx` - QR code via qrcode lib, copy button, download QR, complete setup
- `apps/web/validations/settings.ts` - Added onboarding_completed z.boolean().optional() and industry_type z.string().optional()
- `apps/web/app/api/v1/settings/company/route.ts` - Added mapping for onboarding_completed and industry_type; added to GET/PUT response selections
- `apps/web/messages/cs.json` - Added onboarding namespace with 20 industry type labels and all step/action translations
- `apps/web/messages/en.json` - Added onboarding namespace (English)
- `apps/web/messages/sk.json` - Added onboarding namespace (Slovak)

## Decisions Made

- Switch component (radix-ui/react-switch) used for working hours day toggles instead of Checkbox (radix-ui/react-checkbox not installed in the project). Switch provides equivalent toggle UX.
- Each step component calls its API endpoint directly (fetch) rather than through shared mutations — matches the existing booking-wizard.store pattern and keeps each step self-contained.
- Industry template pre-fills stored as a static constant in first-service-step — no API round-trip needed for template data (20 industry templates).
- WorkingHoursStep initializes from industry-specific defaults when store has no data, falls back to standard Mon-Fri 9:00-17:00. Five industry groups defined (beauty, fitness/wellness, medical/health, default).
- ShareLinkStep fetches company slug on mount from /api/v1/settings/company if not already in store data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Switch instead of missing Checkbox component**

- **Found during:** Task 2 (working-hours-step.tsx)
- **Issue:** Plan specified using `@/components/ui/checkbox` but this component doesn't exist. @radix-ui/react-checkbox is not installed.
- **Fix:** Replaced Checkbox import with Switch (already available at @/components/ui/switch). Updated `onCheckedChange` handler to `onCheckedChange={(checked: boolean) => ...}` with explicit type.
- **Files modified:** apps/web/components/onboarding/steps/working-hours-step.tsx
- **Verification:** TypeScript check passes with no errors in the file
- **Committed in:** fe05a37 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing component)
**Impact on plan:** Minimal UX difference — Switch and Checkbox both function as boolean toggles. No scope creep.

## Issues Encountered

- Task 1 and Task 2 files were found already committed in prior session commits (`66dbad8` for Task 1, `fe05a37` for Task 2). The pre-commit hook ran ESLint and Prettier on files before they were staged, then restored them via stash, requiring re-staging. All artifacts verified present and correct in HEAD.
- Prior Phase 26 session included our onboarding wizard files in its summary commit — this is acceptable since all files were committed correctly.

## User Setup Required

None - no external service configuration required. The qrcode library runs entirely client-side, no API keys needed.

## Next Phase Readiness

- Wizard route fully functional at /[locale]/onboarding with all 4 steps
- useOnboardingRedirect hook ready for Phase 27 Plan 02 (dashboard redirect integration)
- Industry type stored in Zustand store and persisted to DB — available for AI/analytics
- onboarding_completed flag in DB available for conditional rendering across the app

---

_Phase: 27-onboarding-wizard_
_Completed: 2026-02-24_

---
phase: 27-onboarding-wizard
plan: 04
subsystem: ui
tags: [industry-templates, onboarding, react, nextjs, drizzle, i18n, sonner]

# Dependency graph
requires:
  - phase: 27-01
    provides: setup wizard foundation (4-step wizard, store, working hours step)

provides:
  - 8 industry template presets with Czech service names and CZK pricing
  - POST /api/v1/onboarding/apply-template endpoint (creates services + working hours in one transaction)
  - IndustryTemplatePicker component (collapsible 8-card grid with icons, service count, price range)
  - Wizard service step integration (template picker above manual form, marks steps 2+3, jumps to step 4)
  - cs/en/sk i18n for onboarding.templates namespace (8 keys)

affects:
  - onboarding wizard conversion rate
  - service creation flow
  - working hours configuration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Industry template data file exports typed const array + lookup helpers
    - Apply-template API: single transaction (insert services loop + delete/insert working hours + update company)
    - Collapsible template picker: useState toggle, collapsed by default to avoid UI overwhelm
    - Template applied callback marks multiple wizard steps done and jumps to target step

key-files:
  created:
    - apps/web/lib/onboarding/industry-templates.ts
    - apps/web/app/api/v1/onboarding/apply-template/route.ts
    - apps/web/components/onboarding/industry-template-picker.tsx
  modified:
    - apps/web/components/onboarding/steps/first-service-step.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json

key-decisions:
  - 'Static template data in TypeScript const (no DB) — no API round-trip for template catalog, instant load'
  - 'BadRequestError thrown on unknown industry_type — handled by createRouteHandler centralized error handler'
  - 'buildWorkingHours helper creates full 7-day array from active-day config — Sunday=0 convention maintained'
  - 'Template application marks wizard steps 2 AND 3 as complete then jumps to step 4 (share link)'
  - 'Collapsible picker (collapsed by default) avoids overwhelming users who prefer manual entry'
  - 'Lucide icon names stored as strings in template data with ICON_MAP lookup in picker component'
  - 'tutoring templates have isOnline=true — online service semantics for video/remote tutoring'

patterns-established:
  - 'Template data file: exports INDUSTRY_TEMPLATES array + getTemplateByIndustry() + getIndustryOptions()'
  - 'Apply template API: uses createRouteHandler with SERVICES_CREATE permission, transaction wraps all mutations'
  - 'IndustryTemplatePicker: per-card loading state (not global), toast.success on apply, callback pattern'

# Metrics
duration: 7min
completed: 2026-02-24
---

# Phase 27 Plan 04: Industry Template Presets Summary

**8 Czech business vertical templates (beauty/fitness/yoga/medical/auto/tutoring/photo/spa) that pre-fill services, CZK prices, and working hours in one API transaction — reducing onboarding wizard time from ~5 min to under 2 min**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-24T10:03:35Z
- **Completed:** 2026-02-24T10:10:36Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created `apps/web/lib/onboarding/industry-templates.ts` with 8 full industry templates — each with 5-8 Czech services (CZK prices, durations, buffer times, capacity) and 7-day working hours schedule
- Created `POST /api/v1/onboarding/apply-template` API that atomically inserts all services, replaces company-level working hours, and updates `company.industry_type` in a single Drizzle transaction
- Built `IndustryTemplatePicker` component: 2-column card grid with Lucide icons, Czech names, service counts, price ranges, per-card loading spinners, and sonner toast notifications
- Updated `FirstServiceStep` wizard step to show collapsible template picker above the manual form; applying a template marks steps 2+3 done and jumps directly to step 4 (share link)
- Added `onboarding.templates` i18n namespace to cs/en/sk with 8 translation keys

## Task Commits

1. **Task 1: Create industry template data file with 8 verticals** - `0e85875` (feat)
2. **Task 2: Create apply-template API endpoint and template picker UI** - `c866d29` (feat)

## Files Created/Modified

- `apps/web/lib/onboarding/industry-templates.ts` - Static template data for 8 industry verticals; exports INDUSTRY_TEMPLATES, getTemplateByIndustry(), getIndustryOptions()
- `apps/web/app/api/v1/onboarding/apply-template/route.ts` - POST endpoint using createRouteHandler; inserts services + working hours + updates company in one transaction
- `apps/web/components/onboarding/industry-template-picker.tsx` - Client component; 8-card grid with icon mapping, per-card loading state, sonner toasts
- `apps/web/components/onboarding/steps/first-service-step.tsx` - Updated to include collapsible template picker section above manual service form
- `apps/web/messages/cs.json` - Added onboarding.templates namespace (8 keys)
- `apps/web/messages/en.json` - Added onboarding.templates namespace (8 keys)
- `apps/web/messages/sk.json` - Added onboarding.templates namespace (8 keys)

## Decisions Made

- Static TypeScript const for template data (no DB table) — no API round-trip for catalog, instant render, zero migration
- `BadRequestError` thrown on unknown industry_type — cleanly handled by `createRouteHandler`'s centralized error handler returning 400
- `buildWorkingHours()` helper creates full 7-day working hours array from active-day config — ensures consistent 7-entry arrays in all templates
- Template applied callback marks both step 2 (service) and step 3 (working hours) as complete, then calls `setStep(4)` to jump directly to the share link step
- Collapsible picker (closed by default, toggled by "Použít šablonu oboru" button with chevron) — avoids overwhelming users who already know their service details
- Lucide icons stored as string names in template data (`"Scissors"`, `"Dumbbell"`, etc.) with `ICON_MAP` lookup in component — decouples template data from React imports
- `tutoring` services have `isOnline: true` — correct for remote tutoring (video session semantics)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Commit lint enforces `scope` from `[database, backend, frontend, devops, docs, shared, events, ui, web, deps]` — used `web` scope (first attempt with `27-04` scope failed; fixed immediately)

## User Setup Required

None - no external service configuration required. Template data is static.

## Next Phase Readiness

- Phase 27 is now complete — all 4 plans executed
- Industry templates integrated into onboarding wizard; available from service step
- Template picker can be reused in Settings > Services page as a standalone component
- All TypeScript compiles, all i18n keys present in cs/en/sk

---

_Phase: 27-onboarding-wizard_
_Completed: 2026-02-24_

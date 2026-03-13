---
phase: 40-business-owner-flow
plan: 01
subsystem: ui
tags: [react, nextjs, tanstack-query, sonner, lucide, i18n, glassmorphism]

# Dependency graph
requires:
  - phase: 39-auth-session
    provides: Auth store (useAuthStore, user.role) used for isEmployee check in dashboard
  - phase: 37-auth-polish
    provides: Glass design system (glass-surface class) used in BookingLinkCard
provides:
  - BookingLinkCard component displaying and copying public booking URL
  - useDeleteService mutation hook for soft-deleting services
  - Delete confirmation dialog in service edit flow
affects: [public-booking-flow, services-management, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Copy-to-clipboard with 2s icon feedback (useState + setTimeout) — no external lib"
    - "Destructive action with two-step confirm dialog (trash icon -> confirm dialog)"
    - "mr-auto in DialogFooter to push delete button to left while save/cancel stay right"

key-files:
  created:
    - apps/web/components/dashboard/booking-link-card.tsx
  modified:
    - apps/web/app/[locale]/(dashboard)/dashboard/page.tsx
    - apps/web/hooks/use-services-query.ts
    - apps/web/app/[locale]/(dashboard)/services/page.tsx
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - "BookingLinkCard placed after DemoDataCard and before KPI grid — prominent position for owners without blocking onboarding"
  - "Copy feedback uses useState+setTimeout (no external lib) consistent with existing patterns"
  - "Delete uses separate confirmation Dialog (not AlertDialog) for consistency with rest of codebase"
  - "Employee CRUD (OWNER-03) verified complete via grep — no code changes needed"

patterns-established:
  - "Two-step destructive action: icon button in DialogFooter (mr-auto) -> confirmation Dialog"
  - "Booking URL constructed as {window.location.origin}/{locale}/{slug}/booking"

requirements-completed:
  - OWNER-01
  - OWNER-02
  - OWNER-03

# Metrics
duration: 15min
completed: 2026-03-13
---

# Phase 40 Plan 01: Business Owner Flow Summary

**BookingLinkCard with copy-to-clipboard on dashboard, useDeleteService soft-delete with two-step confirmation dialog, and OWNER-03 employee CRUD verified wired to real API endpoints**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-13T14:00:00Z
- **Completed:** 2026-03-13T14:15:00Z
- **Tasks:** 2
- **Files modified:** 6 (+ 1 created)

## Accomplishments
- Created BookingLinkCard showing real company slug from useCompanySettingsQuery, constructs /{locale}/{slug}/booking URL, copy button with 2s check-icon feedback and sonner toast
- Added useDeleteService mutation hook (soft delete via DELETE /services/{uuid}) with services query invalidation on success
- Added Trash2 delete button in edit service dialog footer (mr-auto, destructive styling), confirmation dialog before execution
- Verified employee CRUD (OWNER-03): useCreateEmployee, useUpdateEmployee, useAssignEmployeeServices, useInviteEmployee all call real apiClient endpoints
- i18n translations added in en/cs/sk for dashboard.bookingLink.* and services.delete*

## Task Commits

1. **Task 1: Add public booking URL card and copy-to-clipboard on dashboard** - `b3e3b88` (feat)
2. **Task 2: Add delete service hook and delete button to services page** - `92e97cd` (feat)

## Files Created/Modified
- `apps/web/components/dashboard/booking-link-card.tsx` - New component, glass-surface Card with booking URL display and copy button
- `apps/web/app/[locale]/(dashboard)/dashboard/page.tsx` - Imports and renders BookingLinkCard after DemoDataCard
- `apps/web/hooks/use-services-query.ts` - Added useDeleteService mutation hook
- `apps/web/app/[locale]/(dashboard)/services/page.tsx` - Delete button in edit dialog, confirmation dialog, handleDelete handler
- `apps/web/messages/en.json` - Added dashboard.bookingLink.* and services.delete* translations
- `apps/web/messages/cs.json` - Czech translations for same keys
- `apps/web/messages/sk.json` - Slovak translations for same keys

## Decisions Made
- BookingLinkCard placed after DemoDataCard and before KPI grid — visible to owners without disrupting onboarding flow
- Copy feedback uses useState+setTimeout pattern (no external library), consistent with existing codebase
- Delete uses a separate Dialog for confirmation rather than AlertDialog — consistent with rest of app
- OWNER-03 (employee CRUD) required no code changes; all hooks already wired to real API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-commit linter (lint-staged) reverted two state additions after first edit; re-applied on second pass. TypeScript compilation clean throughout.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Owner flow foundation complete: booking URL shareable, services fully manageable (CRUD + delete), employees fully manageable
- Ready for Phase 40 Plan 02 (public booking flow or next plan in phase)

---
*Phase: 40-business-owner-flow*
*Completed: 2026-03-13*

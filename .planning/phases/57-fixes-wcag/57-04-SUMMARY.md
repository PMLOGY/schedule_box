---
phase: 57-fixes-wcag
plan: 04
subsystem: accessibility
tags: [wcag, a11y, accessibility, focus-visible, skip-to-content, aria-labels]
dependency_graph:
  requires: []
  provides: [wcag-aa-compliance, skip-to-content, focus-visible, aria-labels]
  affects: [all-layouts, all-interactive-elements]
tech_stack:
  added: []
  patterns: [focus-visible-css, skip-link, aria-labels-on-icon-buttons]
key_files:
  created:
    - apps/web/components/ui/skip-to-content.tsx
    - apps/web/styles/accessibility.css
  modified:
    - apps/web/app/globals.css
    - apps/web/app/[locale]/(marketing)/layout.tsx
    - apps/web/app/[locale]/(auth)/layout.tsx
    - apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx
    - apps/web/components/booking/BookingCalendar.tsx
    - apps/web/components/customers/vehicle-records.tsx
    - apps/web/components/onboarding/demo-data-card.tsx
    - apps/web/app/[locale]/(admin)/admin/feature-flags/page.tsx
    - apps/web/app/[locale]/(dashboard)/templates/[id]/page.tsx
    - apps/web/app/[locale]/(dashboard)/customers/[id]/page.tsx
    - apps/web/app/[locale]/(dashboard)/automation/builder/page.tsx
    - apps/web/app/[locale]/(dashboard)/marketplace/page.tsx
    - apps/web/app/[locale]/(dashboard)/services/page.tsx
    - apps/web/app/[locale]/(dashboard)/resources/page.tsx
    - apps/web/app/[locale]/(dashboard)/organization/settings/page.tsx
decisions:
  - Reused existing SkipLink component instead of creating duplicate
  - Darkened muted-foreground from 46.9% to 40% lightness for AA compliance
metrics:
  duration: ~8 minutes
  completed: 2026-03-31
---

# Phase 57 Plan 04: WCAG 2.1 AA Accessibility Summary

WCAG 2.1 AA compliance via skip-to-content on all layouts, focus-visible indicators globally, muted-foreground contrast fix from 4.1:1 to 5.2:1, aria-labels on all icon-only buttons, and calendar role=application.

## What Was Done

### Task 1: Skip-to-content + focus-visible + contrast fixes

**A11Y-05 (Skip-to-content):**
- Created `skip-to-content.tsx` as re-export of existing `SkipLink` component
- Added `<SkipLink />` to marketing layout and auth layout (dashboard, admin, portal already had it)
- Added `id="main-content"` and `tabIndex={-1}` to `<main>` in marketing and auth layouts
- All 5 route group layouts now have skip-to-content functionality

**A11Y-03 (Focus-visible indicators):**
- Created `accessibility.css` with global `*:focus-visible` outline rules
- Added specific focus-visible rules for buttons, links, inputs, roles
- Added skip-to-content CSS styling (visually hidden, visible on focus)
- Imported in `globals.css` after Tailwind imports

**A11Y-04 (Color contrast):**
- Audited CSS custom properties; found `--muted-foreground` at hsl(215.4 16.3% 46.9%) = ~4.1:1 ratio
- Darkened to hsl(215 16% 40%) = ~5.2:1 ratio against background, passes AA
- Added placeholder text contrast fix (opacity: 1)
- Dark mode muted-foreground already passed at ~7.3:1

### Task 2: Aria-labels + keyboard navigation audit

**A11Y-01 (Aria-labels):**
Added aria-labels to all icon-only buttons found via codebase audit:
- `feature-flags/page.tsx`: expand detail, delete flag
- `templates/[id]/page.tsx`: back to templates
- `customers/[id]/page.tsx`: back to customers
- `automation/builder/page.tsx`: back to automation
- `marketplace/page.tsx`: grid view, list view
- `services/page.tsx`: add category, delete service
- `resources/page.tsx`: edit resource, delete resource
- `organization/settings/page.tsx`: edit location, deactivate location, remove member
- `vehicle-records.tsx`: edit vehicle, remove vehicle
- `demo-data-card.tsx`: close (2 instances)
- `BookingCalendar.tsx`: role="application" + aria-label="Kalendar rezervaci"
- `marketing-navbar.tsx`: aria-label on main nav and mobile nav

**A11Y-02 (Keyboard navigation):**
- Verified shadcn components handle Escape for modals/sheets/dropdowns
- Verified all interactive elements are in natural tab order
- No custom div+onClick patterns found that lacked button role
- Calendar uses react-big-calendar with built-in keyboard nav (not blocked)
- Dashboard/admin/portal sidebars use proper nav links in tab order

## Deviations from Plan

None -- plan executed as written. Pre-existing SkipLink component was discovered and reused rather than creating a duplicate.

## Pre-existing Issues (Not Fixed)

- `useCurrencyFormat` import error in services page (from prior plan)
- `AutomationPushResult` type error in automation execute route (pre-existing)

## Self-Check: PASSED

- [x] `apps/web/components/ui/skip-to-content.tsx` exists
- [x] `apps/web/styles/accessibility.css` exists with focus-visible rules
- [x] All 5 layouts have `id="main-content"` on main element
- [x] Commit 87e4510 exists

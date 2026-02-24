# Phase 26 Research: Booking UX Polish and Calendar Upgrade

**Phase:** 26-booking-ux-polish
**Researched:** 2026-02-21
**Confidence:** HIGH (all code paths inspected, libraries verified in STACK.md)

---

## Current Codebase State

### Dashboard Booking Calendar (FullCalendar)

**Location:** `apps/web/components/booking/BookingCalendar.tsx`

The dashboard calendar currently uses FullCalendar v6 with these plugins:
- `@fullcalendar/daygrid` — month view
- `@fullcalendar/timegrid` — day/week views
- `@fullcalendar/interaction` — drag-drop rescheduling (ALREADY WORKING)

**Key finding:** Drag-and-drop rescheduling already works. `BookingCalendar.tsx` has:
- `handleEventDrop` that calls `useRescheduleBooking()` mutation
- Optimistic UI with FullCalendar's `info.revert()` on failure
- Event source function (`fetchEvents`) that calls `/api/v1/bookings`
- Czech locale, 15-min slots, 06:00-22:00 range

**What needs to change for Phase 26:** The ROADMAP says "react-big-calendar" but FullCalendar is already working with drag-drop. The requirement (BUX-02) is "day/week/month views with drag-and-drop rescheduling." This is ALREADY IMPLEMENTED. The calendar upgrade should focus on:
1. Ensuring react-big-calendar replaces FullCalendar per research recommendations (MIT vs premium license issue)
2. OR keeping FullCalendar and focusing on polish (theme integration, mobile responsiveness)

**Decision:** Replace FullCalendar with react-big-calendar as specified in STACK.md research. FullCalendar's resource-timeline plugin requires a premium license (`schedulerLicenseKey: "GPL-My-Project-Is-Open-Source"` is used in `CalendarView.tsx` which is technically non-compliant for a SaaS product). react-big-calendar is MIT and handles day/week/month views.

### Calendar Store

**Location:** `apps/web/stores/calendar.store.ts`

Zustand store with:
- `view`: CalendarView type (`resourceTimelineDay | resourceTimelineWeek | dayGridMonth`)
- `selectedDate`, `selectedEmployeeIds`, `showCancelled`
- View names need updating when switching to react-big-calendar

### Calendar Toolbar

**Location:** `apps/web/components/calendar/calendar-toolbar.tsx`

Uses date-fns with Czech locale, already has day/week/month toggle buttons. References `resourceTimelineDay`, `resourceTimelineWeek`, `dayGridMonth` view names. Needs updating for react-big-calendar view names.

### Calendar CSS

**Location:** `apps/web/styles/calendar.css`

64 lines of FullCalendar CSS overrides mapped to shadcn CSS variables. All `.fc-*` selectors. Will need replacement with `.rbc-*` selectors for react-big-calendar.

### Booking Wizard (Public Widget)

**Location:** `apps/web/components/booking/BookingWizard.tsx`

4-step wizard: Service -> DateTime -> CustomerInfo -> Confirmation
- `StepIndicator.tsx` — Already has step circles with labels, `aria-label="Step X of 4"`, hidden labels on mobile (`hidden md:block`)
- `Step2DateTimeSelect.tsx` — Uses `react-day-picker` calendar + `AvailabilityGrid.tsx` for time slots
- `Step4Confirmation.tsx` — Creates booking, redirects to `/bookings` on success. NO add-to-calendar. NO micro-animation.

### AvailabilityGrid (Time Slots)

**Location:** `apps/web/components/booking/AvailabilityGrid.tsx`

Currently groups slots by EMPLOYEE, not by time-of-day. Grid of `Button` components with `h-12` height (48px, meets 44px target). **But no Morning/Afternoon/Evening grouping.**

### Embed Widget

**Location:** `apps/web/app/embed/[company_slug]/`

Three files:
- `layout.tsx` — Imports `../../globals.css` (CRITICAL: shares CSS vars with main app)
- `page.tsx` — Server component, fetches company + services
- `widget-content.tsx` — Client component, service list with "Book" buttons

**CSS dependency:** The embed layout imports `globals.css` directly, meaning ANY change to CSS custom properties (--primary, --background, etc.) affects embedded widgets on customer sites. This is the exact risk identified in PITFALLS.md.

### Public Booking Page

**Location:** `apps/web/app/[locale]/[company_slug]/page.tsx`

Full public booking page with company info, services grid, reviews, contact section. Services link to `/[locale]/bookings/new?service=...&company=...`.

### Playwright E2E Setup

**Location:** `apps/web/e2e/`

Existing config at `apps/web/e2e/playwright.config.ts`:
- 3 browser projects (chromium, firefox, webkit)
- Auth setup with storageState
- `baseURL: http://localhost:3000`
- Tests: auth, booking, payment, ai-fallback

**No visual regression tests exist yet.** Need to add a visual regression test project.

### Existing Dependencies

From `apps/web/package.json`:
- **motion: ^12.34.3** — ALREADY INSTALLED (for Phase 25 landing page)
- **FullCalendar packages** — 7 packages installed (@fullcalendar/core, daygrid, timegrid, interaction, react, resource, resource-timeline)
- **react-day-picker: ^9.4.3** — Used in booking wizard date selection
- **date-fns: ^4.1.0** — Used throughout
- **tailwindcss-animate: ^1.0.7** — Still using deprecated package (not yet migrated to tw-animate-css)
- **@playwright/test: ^1.58.2** — Available for visual regression

**Missing:**
- react-big-calendar (needs install)
- react-dnd + react-dnd-html5-backend (needs install)
- @types/react-big-calendar (needs install)
- tw-animate-css (needs install, replace tailwindcss-animate)

---

## Requirement Mapping

| Req ID | Requirement | Current State | Plan |
|--------|-------------|---------------|------|
| BUX-01 | Embed widget visual regression baseline | No visual tests exist | 26-01 |
| BUX-02 | Dashboard calendar day/week/month + drag-drop | FullCalendar works, replace with react-big-calendar | 26-02 |
| BUX-03 | Mobile 44px tap targets | AvailabilityGrid buttons are 48px (h-12), but StepIndicator circles are 40px (h-10 w-10) | 26-03 |
| BUX-04 | Time slots grouped Morning/Afternoon/Evening | AvailabilityGrid groups by employee only | 26-03 |
| BUX-05 | Progress stepper "Step X of Y" | StepIndicator exists with step circles, has aria-label, labels hidden on mobile | 26-03 |
| BUX-06 | Add-to-calendar ICS file | Not implemented | 26-04 |
| BUX-07 | Booking confirmation micro-animation | Not implemented, motion already installed | 26-04 |

---

## Key Decisions

1. **react-big-calendar replaces FullCalendar** — FullCalendar resource-timeline requires premium license; react-big-calendar is MIT. The existing drag-drop reschedule mutation (`useRescheduleBooking`) is library-agnostic and can be reused.

2. **Keep calendar.store.ts view type names** — Update the type from FullCalendar names to react-big-calendar names (`day`, `week`, `month`, `agenda`). CalendarToolbar references these.

3. **Embed widget visual regression uses Playwright's built-in screenshot comparison** — No external library needed. `expect(page).toHaveScreenshot()` with `maxDiffPixelRatio` threshold.

4. **ICS generation is server-side only** — RFC 5545 format, no external library needed. Plain string template with proper CRLF line endings.

5. **Motion is already installed** — `motion: ^12.34.3` in package.json. No install needed for micro-animations.

6. **shadcn/ui diff audit before globals.css changes** — Run `npx shadcn@latest diff` to identify any component customizations before modifying CSS variables.

---

## Risk Mitigations

1. **Embed widget CSS isolation:** The embed layout imports `globals.css`. Visual regression baseline in 26-01 catches any accidental breakage. No `globals.css` CSS variable changes are planned in Phase 26.

2. **Calendar migration data loss:** The `fetchEvents` callback pattern in BookingCalendar.tsx needs to be adapted to react-big-calendar's event source pattern. react-big-calendar uses `events` prop (array), not a callback. Events will be loaded via React Query's `useQuery` hook instead.

3. **Mobile tap targets:** StepIndicator circles are 40px (h-10 w-10), which is below the 44px minimum. This needs to be increased to `h-11 w-11` (44px) for mobile compliance.

---

_Research completed: 2026-02-21_

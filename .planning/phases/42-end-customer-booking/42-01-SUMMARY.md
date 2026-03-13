---
phase: 42-end-customer-booking
plan: 01
subsystem: ui
tags: [next-intl, react-query, public-booking, tracking, review]

# Dependency graph
requires:
  - phase: 40-business-owner-flow
    provides: Public booking creation API and booking UUID pattern
  - phase: 42-end-customer-booking
    provides: Review submission API at /api/v1/public/bookings/{uuid}/review
provides:
  - Flat API response shape for public booking lookup (service_name, company_name, company_slug)
  - Booking tracking page with Leave a Review CTA for completed bookings
  - Booking wizard confirmation with Track Your Booking link to /{locale}/{slug}/booking/{uuid}
  - Review page reads flat API field names correctly
affects: [customer-portal, public-booking-flow, review-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public API returns flat field names matching frontend interface exactly — no nested objects"
    - "Booking tracking and review linked via company_slug + booking UUID path pattern"

key-files:
  created: []
  modified:
    - apps/web/app/api/v1/public/bookings/[uuid]/route.ts
    - apps/web/app/[locale]/[company_slug]/booking/[uuid]/page.tsx
    - apps/web/app/[locale]/[company_slug]/review/[bookingUuid]/page.tsx
    - apps/web/app/[locale]/[company_slug]/book/page.tsx
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - "Public booking API returns flat service_name/company_name/company_slug instead of nested objects to match tracking page's PublicBooking interface"
  - "Review link on tracking page uses plain <a> href (not next-intl Link) since it targets a public dynamic route outside the i18n navigation helper's scope"

patterns-established:
  - "Public API shape must match frontend interface field names exactly — avoids impedance mismatch bugs"

requirements-completed: [CUST-01, CUST-02, CUST-03]

# Metrics
duration: 12min
completed: 2026-03-13
---

# Phase 42 Plan 01: End-Customer Booking Summary

**Public booking -> tracking -> review flow fully wired: flat API shape, confirmation tracking link, and completed-booking review CTA**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-13T15:15:00Z
- **Completed:** 2026-03-13T15:27:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Fixed API response shape mismatch: GET /api/v1/public/bookings/{uuid} now returns flat `service_name`, `company_name`, `company_slug` matching the tracking page's `PublicBooking` interface
- Added "Leave a Review" section on the booking tracking page shown when `status === 'completed'`, linking to `/{locale}/{slug}/review/{uuid}`
- Added "Track Your Booking" link on the booking wizard confirmation step pointing to `/{locale}/{slug}/booking/{uuid}` so customers can navigate directly to their tracking page
- Fixed review page to read `booking.service_name` and `booking.company_name` instead of the previously nested `booking.service?.name` and `booking.company?.name`
- Added `reviewCta`, `leaveReview`, `trackBooking`, `trackDescription` translation keys in en/cs/sk

## Task Commits

1. **Task 1: Fix tracking API response shape and add review link to tracking page** - `47c8fed` (fix)
2. **Task 2: Add tracking link to booking wizard confirmation step** - `132cdfc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/api/v1/public/bookings/[uuid]/route.ts` - Returns flat service_name/company_name/company_slug instead of nested objects
- `apps/web/app/[locale]/[company_slug]/booking/[uuid]/page.tsx` - Added Star + ExternalLink imports; review CTA section for completed bookings
- `apps/web/app/[locale]/[company_slug]/review/[bookingUuid]/page.tsx` - Updated to use booking.service_name and booking.company_name
- `apps/web/app/[locale]/[company_slug]/book/page.tsx` - Added ExternalLink import; Track Your Booking button + trackDescription below booking ID
- `apps/web/messages/en.json` - Added reviewCta, leaveReview, trackBooking, trackDescription keys
- `apps/web/messages/cs.json` - Added same keys in Czech
- `apps/web/messages/sk.json` - Added same keys in Slovak

## Decisions Made

- Public booking API returns flat field names (`service_name`, `company_name`, `company_slug`) so frontend interface requires no mapping layer — prevents future mismatch bugs
- Review link uses a plain `<a>` tag rather than next-intl `Link` component since the public review route is a dynamic path outside the configured i18n navigation helper

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- End-to-end public booking -> confirmation -> tracking -> review chain is complete
- Customers can track bookings via URL, cancel pending/confirmed bookings, and submit reviews after completion
- Ready for Phase 43 (Admin Platform) or any portal phase that builds on the public flow

---
*Phase: 42-end-customer-booking*
*Completed: 2026-03-13*

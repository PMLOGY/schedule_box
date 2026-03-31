---
phase: 56-industry-verticals-ui
plan: 02
subsystem: booking-verticals
tags: [industry-verticals, booking-metadata, cleaning, tutoring, auto-service, vehicle-history]
dependency_graph:
  requires: [56-01]
  provides: [booking-vertical-fields, vehicle-service-history, tutoring-editable-notes]
  affects: [booking-detail-panel, customer-bookings-api, vehicle-records]
tech_stack:
  added: []
  patterns: [jsonb-metadata-fields, editable-inline-form, expandable-card, vehicle-spz-filter]
key_files:
  created: []
  modified:
    - apps/web/lib/industry/industry-fields.ts
    - apps/web/lib/industry/industry-labels.ts
    - apps/web/components/booking/BookingDetailPanel.tsx
    - packages/shared/src/schemas/booking.ts
    - apps/web/lib/booking/booking-service.ts
    - apps/web/app/api/v1/customers/[id]/bookings/route.ts
    - apps/web/components/customers/vehicle-records.tsx
decisions:
  - Used PUT /bookings/:id with booking_metadata field for tutoring notes save (reuses existing endpoint)
  - Added booking_metadata to shared bookingUpdateSchema for broad compatibility
  - Used JSONB ->>'license_plate' filter for per-vehicle booking queries
metrics:
  duration: ~8min
  completed: 2026-03-31
---

# Phase 56 Plan 02: Booking-level Vertical Fields Summary

Cleaning address, tutoring editable notes/homework, and per-vehicle service history on bookings using booking_metadata JSONB.

## What Was Done

### Task 1: Booking Form Vertical Fields and Editable Tutoring Notes
- Added `cleaning_service` vertical fields (address) and `tutoring` vertical fields (lesson_notes, homework) to `VERTICAL_FIELDS`
- Added corresponding Zod schemas (`cleaningMetadataSchema`, `tutoringMetadataSchema`) to the discriminated union
- Added `cleaning_service` and `tutoring` industry label overrides (Student, Lekce, Klient, etc.)
- Added `booking_metadata` to the shared `bookingUpdateSchema` so PUT /bookings/:id accepts metadata updates
- Updated `updateBooking` service to persist `booking_metadata` in both time-change and simple-update branches
- Added editable tutoring notes section to `BookingDetailPanel` with inline edit/save/cancel using Textarea fields
- Tutoring notes (lesson_notes, homework) are editable post-session via "Upravit poznamky" button

### Task 2: Per-Vehicle Service History
- Added `vehicle_spz` optional query parameter to `GET /api/v1/customers/:id/bookings`
- When provided, filters bookings by `booking_metadata->>'license_plate'` JSONB expression
- Added `booking_metadata` to the customer bookings API select for full data
- Added expandable service history to each vehicle card in `vehicle-records.tsx`
- Chevron toggle expands/collapses per-vehicle booking history fetched via `useQuery`
- Displays date, notes, status badge (color-coded), and price for each booking
- Shows "Zatim zadne zakazky" empty state when no bookings match

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Added booking_metadata to bookingUpdateSchema**
- **Found during:** Task 1
- **Issue:** The shared bookingUpdateSchema did not include booking_metadata, preventing PATCH/PUT updates to metadata
- **Fix:** Added `booking_metadata: z.record(z.unknown()).nullable().optional()` to the schema
- **Files modified:** packages/shared/src/schemas/booking.ts, apps/web/lib/booking/booking-service.ts

**2. [Rule 2 - Missing Functionality] Added industry labels for cleaning and tutoring**
- **Found during:** Task 1
- **Issue:** No Czech label overrides existed for the new verticals
- **Fix:** Added cleaning_service (Klient, Objednavka, Uklid) and tutoring (Student, Lekce, Predmet) label maps
- **Files modified:** apps/web/lib/industry/industry-labels.ts

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b430b6a | Cleaning/tutoring vertical fields and editable tutoring notes |
| 2 | cabcdda | Per-vehicle service history and vehicle_spz booking filter |

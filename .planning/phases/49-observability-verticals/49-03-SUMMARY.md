---
phase: 49-observability-verticals
plan: 03
subsystem: frontend-verticals
tags: [verticals, booking-form, ai-settings, upselling, metadata]
dependency_graph:
  requires: [49-02]
  provides: [vertical-booking-form, ai-settings-page, upselling-gate, booking-metadata-display]
  affects: [booking-wizard, booking-detail-panel, navigation]
tech_stack:
  added: []
  patterns:
    - VERTICAL_FIELDS lookup for conditional field render
    - useIndustryLabels hook for section heading labels
    - bookingMetadataSchema Zod validation in public booking API
    - industry_config.ai sub-key JSONB pattern for AI settings
    - Upselling gate via industryConfig.ai.upselling_enabled
key_files:
  created:
    - apps/web/app/api/v1/settings/ai/route.ts
    - apps/web/app/[locale]/(dashboard)/settings/ai/page.tsx
  modified:
    - apps/web/components/booking/Step3CustomerInfo.tsx
    - apps/web/components/booking/BookingDetailPanel.tsx
    - apps/web/components/booking/UpsellingSuggestions.tsx
    - apps/web/app/api/v1/public/company/[slug]/bookings/route.ts
    - apps/web/app/api/v1/ai/optimization/upselling/route.ts
    - apps/web/lib/booking/booking-service.ts
    - apps/web/lib/navigation.ts
    - apps/web/stores/booking-wizard.store.ts
decisions:
  - Step3CustomerInfo reads company industryType from useCompanySettingsQuery (dashboard context)
  - metadata stripped of empty strings before storing; null returned when no vertical fields filled
  - Public booking API validates metadata.industry_type matches company.industryType to prevent spoofing
  - bookingMetadata added to both getBooking and listBookings selects for full coverage
  - UpsellingSuggestions queries /settings/ai with retry:false to avoid auth errors in public flow
  - Upselling API gate uses fail-open pattern — DB errors never block upselling compute
metrics:
  duration: 11min
  completed: "2026-03-18T21:01:22Z"
  tasks: 2
  files: 10
---

# Phase 49 Plan 03: Vertical Booking Form + AI Settings Summary

Wire vertical fields into booking form and detail panel; AI settings page with upselling gate and sidebar nav link.

## What Was Built

**Task 1 — Vertical fields in booking form + booking_metadata in APIs**

- `Step3CustomerInfo.tsx`: imports `useIndustryLabels` and `VERTICAL_FIELDS`. Section heading now shows `labels.customer` (e.g., "Pacient" for medical, "Vozidlo" for auto, "Zákazník" for generic). Vertical-specific fields (birth_number/insurance_provider, SPZ/VIN) rendered below standard fields in a bordered section only when the company's `industryType` has fields defined.
- Form schema extended with optional `metadata: z.record(z.string())`. On submit, `buildMetadata()` strips empty strings and returns null if nothing filled.
- `booking-wizard.store.ts`: added `bookingMetadata` field to `BookingWizardData`.
- Public booking API: added `bookingMetadataSchema` to request schema. Validates `metadata.industry_type` matches company's actual industry to prevent spoofing. Passes `bookingMetadata` to DB insert.
- `booking-service.ts`: added `bookingMetadata` to `BookingWithRelations` type; selects it in both `getBooking` and `listBookings`.

**Task 2 — Booking detail metadata display + AI settings + nav + upselling gate**

- `BookingDetailPanel.tsx`: imports `VERTICAL_FIELDS` and `useIndustryLabels`. Renders a new section below Notes when `booking.bookingMetadata` is present, displaying Czech field labels from VERTICAL_FIELDS lookup keyed by industry_type.
- `apps/web/app/api/v1/settings/ai/route.ts` (new): GET merges `getIndustryAiDefaults` with stored `industry_config.ai` sub-key; returns merged config + defaults for hint display. PUT updates only the `ai` sub-key of `industryConfig` JSONB while preserving other sub-keys.
- `apps/web/app/[locale]/(dashboard)/settings/ai/page.tsx` (new): "use client" page with upselling Switch and capacity_mode Select. Each control shows industry default as hint text. Mutations via `useMutation` with query invalidation on success.
- `navigation.ts`: added `aiSettings` entry with `Sparkles` icon pointing to `/settings/ai`, role `owner`.
- `UpsellingSuggestions.tsx`: queries `/settings/ai` with `retry: false`. Returns null when `upselling_enabled === false`.
- Upselling API: checks `industryConfig.ai.upselling_enabled` before computing; returns `{ recommendations: [], fallback: false }` when disabled. Uses fail-open catch to never block on DB errors.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `pnpm --filter @schedulebox/web build` completes with zero errors
- `grep -c "useIndustryLabels" Step3CustomerInfo.tsx` → 3
- `grep -c "VERTICAL_FIELDS" Step3CustomerInfo.tsx` → 2
- `grep -c "aiSettings" navigation.ts` → 1
- AI settings API accessible at `/api/v1/settings/ai`
- AI settings page at `/[locale]/(dashboard)/settings/ai/page.tsx`
- Upselling gated by `industryConfig.ai.upselling_enabled` at both API and component layers

## Commits

- `a1216f0`: feat(web): inject vertical fields into booking form and APIs
- `3d1417b`: feat(web): add AI settings page, vertical metadata display, upselling gate

## Self-Check: PASSED

All created/modified files found on disk. Both commits verified in git log.

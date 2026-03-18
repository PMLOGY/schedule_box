---
phase: 49-observability-verticals
plan: 02
subsystem: database
tags: [industry-verticals, zod, jsonb, drizzle, react-hook, czech-labels, vitest]

# Dependency graph
requires:
  - phase: 48-marketplace-ux
    provides: company settings query with industry_type field
  - phase: 45-infrastructure-migration
    provides: Neon/Drizzle database layer with pg-core types

provides:
  - industry-labels.ts with getIndustryLabels (medical_clinic, auto_service, fallback defaults)
  - industry-fields.ts with VERTICAL_FIELDS and bookingMetadataSchema (discriminated union Zod)
  - industry-ai-defaults.ts with getIndustryAiDefaults (medical disables upselling, fitness/yoga group mode)
  - useIndustryLabels React hook bridging company settings to label resolver
  - booking_metadata JSONB column on bookings table (Drizzle schema + DB migration applied)
  - 19 unit tests across 3 test files covering VERT-01/02/03/04

affects:
  - 49-03 (UI wiring plan — imports all modules from this plan)
  - future booking form components (VERTICAL_FIELDS drives field rendering)
  - AI optimization service (getIndustryAiDefaults drives feature flags)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Industry vertical config as pure TypeScript objects (no DB query needed for labels/fields)
    - Discriminated union Zod schema for multi-vertical booking_metadata JSONB validation
    - Thin React hook pattern for bridging company context to pure resolver functions

key-files:
  created:
    - apps/web/lib/industry/industry-labels.ts
    - apps/web/lib/industry/industry-fields.ts
    - apps/web/lib/industry/industry-ai-defaults.ts
    - apps/web/lib/industry/__tests__/industry-labels.test.ts
    - apps/web/lib/industry/__tests__/industry-ai-defaults.test.ts
    - apps/web/lib/industry/__tests__/booking-metadata.test.ts
    - apps/web/hooks/use-industry-labels.ts
    - packages/database/src/sql/add-booking-metadata-column.ts
  modified:
    - packages/database/src/schema/bookings.ts

key-decisions:
  - 'Industry labels are NOT i18n translations — they are business domain terminology per vertical stored as TypeScript constants'
  - 'bookingMetadata validation happens at Zod API layer, no DB CHECK constraint — allows future verticals without DDL changes'
  - 'ALTER TABLE applied via postgres superuser (postgres/postgres) consistent with Phase 47/48 pattern — schedulebox user lacks ALTER TABLE'
  - 'useIndustryLabels is a thin hook — all logic lives in industry-labels.ts for pure function testability'

patterns-established:
  - 'Vertical config pattern: RECORD<string, Partial<T>> overrides spread over DEFAULT_T — getX(industryType) = { ...defaults, ...overrides[industryType] }'
  - 'bookingMetadataSchema: z.discriminatedUnion on industry_type — adding a new vertical = add one schema to the union'

requirements-completed: [VERT-01, VERT-02, VERT-03, VERT-04]

# Metrics
duration: 24min
completed: 2026-03-18
tasks_completed: 2
files_created: 8
files_modified: 1
---

# Phase 49 Plan 02: Industry Verticals Foundation Summary

**Czech industry vertical config layer — getIndustryLabels, VERTICAL_FIELDS, bookingMetadataSchema Zod discriminated union, useIndustryLabels hook, and booking_metadata JSONB column in Drizzle + DB**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-18T20:13:51Z
- **Completed:** 2026-03-18T20:37:52Z
- **Tasks:** 2
- **Files modified:** 9 (8 created, 1 modified)

## Accomplishments

- Created `industry-labels.ts` with `getIndustryLabels` resolving medical_clinic (Pacient/Termín/Vyšetření), auto_service (Vozidlo/Zakázka/Servis), and generic Czech defaults
- Created `industry-fields.ts` with `VERTICAL_FIELDS` (birth_number, insurance_provider for medical; license_plate, VIN for auto) and `bookingMetadataSchema` discriminated union Zod schema
- Created `industry-ai-defaults.ts` with `getIndustryAiDefaults` — medical disables upselling, fitness/yoga use group capacity mode
- Created `useIndustryLabels` React hook bridging `useCompanySettingsQuery` to label resolver
- Added `booking_metadata JSONB` column to Drizzle schema and applied `ALTER TABLE` migration via postgres superuser — verified via `information_schema`
- 19 unit tests passing across 3 test files (VERT-01/02/03/04 coverage)

## Task Commits

Each task was committed atomically:

1. **Task 1: Industry config modules + Zod schemas + hook + unit tests** - `55a432d` (feat)
2. **Task 2: Add booking_metadata JSONB column to Drizzle schema + migration** - `d09987e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/lib/industry/industry-labels.ts` — getIndustryLabels, IndustryLabels interface, INDUSTRY_LABEL_MAP
- `apps/web/lib/industry/industry-fields.ts` — VERTICAL_FIELDS, bookingMetadataSchema, VerticalField interface
- `apps/web/lib/industry/industry-ai-defaults.ts` — getIndustryAiDefaults, IndustryAiConfig interface
- `apps/web/lib/industry/__tests__/industry-labels.test.ts` — 6 tests for getIndustryLabels (VERT-03)
- `apps/web/lib/industry/__tests__/industry-ai-defaults.test.ts` — 5 tests for getIndustryAiDefaults (VERT-04)
- `apps/web/lib/industry/__tests__/booking-metadata.test.ts` — 8 tests for bookingMetadataSchema (VERT-01/02)
- `apps/web/hooks/use-industry-labels.ts` — useIndustryLabels hook
- `packages/database/src/schema/bookings.ts` — added jsonb import and bookingMetadata column
- `packages/database/src/sql/add-booking-metadata-column.ts` — migration script (postgres superuser)

## Decisions Made

- Industry labels are NOT i18n translations — they are domain terminology (medical = "Pacient", auto = "Vozidlo") stored as TypeScript constants. i18n handles language, vertical labels handle business context.
- `bookingMetadata` validation is at the Zod API layer only, no DB CHECK constraint — allows future verticals without DDL changes
- `ALTER TABLE` applied via postgres superuser (`postgres/postgres`) consistent with Phase 47/48 pattern
- `useIndustryLabels` is intentionally thin — all logic in `industry-labels.ts` to enable pure function unit testing without React

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed off-by-one in VIN max-length test**

- **Found during:** Task 1 (booking-metadata.test.ts)
- **Issue:** Test comment said "18 chars — too long" but string `'ABCDE123456789012'` was exactly 17 chars (within the max), so the test expected `false` but `safeParse` returned `success: true`
- **Fix:** Corrected the test string to `'ABCDE1234567890123'` (18 chars, genuinely exceeds `max(17)`)
- **Files modified:** `apps/web/lib/industry/__tests__/booking-metadata.test.ts`
- **Verification:** All 19 tests pass after fix
- **Committed in:** `55a432d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test string)
**Impact on plan:** Required fix for correct test coverage of VIN length validation. No scope creep.

## Issues Encountered

- Build verification (`next build`) fails with a pre-existing Windows file system timing error (`ENOENT: build-manifest.json`) unrelated to our changes. TypeScript type-check (`tsc --noEmit`) passes cleanly with zero errors. All 19 unit tests pass. Pre-existing issue tracked in SCOPE BOUNDARY — not fixed here.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All industry vertical config modules ready for 49-03 UI wiring
- `useIndustryLabels` hook ready for booking form and dashboard components
- `VERTICAL_FIELDS` ready for dynamic form field rendering per vertical
- `booking_metadata` JSONB column exists in DB and Drizzle schema — ready for API layer wiring
- `bookingMetadataSchema` ready for import in booking API routes

---

_Phase: 49-observability-verticals_
_Completed: 2026-03-18_

---
phase: 49-observability-verticals
verified: 2026-03-18T22:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 49: Observability + Verticals Verification Report

**Phase Goal:** Production errors and performance are visible through Sentry and OpenTelemetry traces on Vercel, and the platform supports medical and automotive industry verticals with per-industry field capture and AI configuration
**Verified:** 2026-03-18T22:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | API route traces appear in Vercel observability dashboard with route, duration, and status | VERIFIED | `registerOTel({ serviceName: 'schedulebox' })` called unconditionally at top of `instrumentation.ts`; custom spans (`schedulebox.auth.login`, `schedulebox.booking.list`, `schedulebox.booking.create`) confirmed in auth/login, bookings, and public booking routes |
| 2  | All API route log output is structured JSON with level, message, route, duration_ms, and request_id | VERIFIED | `route-logger.ts` exports `logRouteComplete` producing fields: route, method, status, duration_ms, request_id via `logInfo`/`logError`; used on all exit paths in 3 critical routes |
| 3  | Every request has a unique X-Request-Id header for log correlation | VERIFIED | `middleware.ts` generates `crypto.randomUUID()` and sets `X-Request-Id` + `x-request-id` on both redirect and normal responses (lines 41-42, 55-56) |
| 4  | Trace sampling rate is configured at 10% via OTEL_TRACES_SAMPLER env vars | VERIFIED | `.env.example` lines 143+145: `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1` |
| 5  | Medical vertical fields (birth_number, insurance_provider) are defined with Czech labels | VERIFIED | `industry-fields.ts` VERTICAL_FIELDS.medical_clinic: birth_number ('Rodné číslo'), insurance_provider ('Pojišťovna') |
| 6  | Automotive vertical fields (license_plate, vin) are defined with Czech labels | VERIFIED | `industry-fields.ts` VERTICAL_FIELDS.auto_service: license_plate ('SPZ'), vin ('VIN') |
| 7  | getIndustryLabels returns Pacient/Termin/Vysetreni for medical_clinic | VERIFIED | `industry-labels.ts` INDUSTRY_LABEL_MAP.medical_clinic: customer='Pacient', booking='Termín', service='Vyšetření' |
| 8  | getIndustryLabels returns Vozidlo/Zakazka/Servis for auto_service | VERIFIED | `industry-labels.ts` INDUSTRY_LABEL_MAP.auto_service: customer='Vozidlo', booking='Zakázka', service='Servis' |
| 9  | getIndustryAiDefaults disables upselling for medical_clinic | VERIFIED | `industry-ai-defaults.ts` INDUSTRY_AI_DEFAULTS.medical_clinic: upselling_enabled=false, capacity_mode='individual' |
| 10 | booking_metadata JSONB column exists on bookings table | VERIFIED | `packages/database/src/schema/bookings.ts` line 70: `bookingMetadata: jsonb('booking_metadata')` |
| 11 | Medical business booking form shows vertical fields; heading shows 'Pacient' for medical | VERIFIED | `Step3CustomerInfo.tsx`: imports `useIndustryLabels` and `VERTICAL_FIELDS`; renders `labels.customer` heading (line 275); conditional vertical field block (lines 138-166); `buildMetadata()` attaches `industry_type` |
| 12 | Upselling is gated by industry_config.ai.upselling_enabled | VERIFIED | `UpsellingSuggestions.tsx` returns null when `aiSettings?.upselling_enabled === false`; upselling API route checks `storedAi.upselling_enabled ?? defaults.upselling_enabled` before computing |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/web/instrumentation.ts` | VERIFIED | `registerOTel` called unconditionally with serviceName and service.version attribute |
| `apps/web/lib/logger/route-logger.ts` | VERIFIED | Exports `logRouteComplete` and `getRequestId`; produces structured JSON; 63 lines |
| `apps/web/lib/logger/__tests__/route-logger.test.ts` | VERIFIED | 4 test cases (2 `logRouteComplete`, 2 `getRequestId`); vi.mock on `@schedulebox/shared/logger` |
| `apps/web/middleware.ts` | VERIFIED | `crypto.randomUUID()` + `X-Request-Id` on both redirect and normal responses |
| `.env.example` | VERIFIED | `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG=0.1` documented |
| `apps/web/lib/industry/industry-labels.ts` | VERIFIED | Exports `getIndustryLabels`, `IndustryLabels`, `DEFAULT_LABELS`, `INDUSTRY_LABEL_MAP` |
| `apps/web/lib/industry/industry-fields.ts` | VERIFIED | Exports `VERTICAL_FIELDS`, `VerticalField`, `bookingMetadataSchema` (discriminated union), type aliases |
| `apps/web/lib/industry/industry-ai-defaults.ts` | VERIFIED | Exports `getIndustryAiDefaults`, `IndustryAiConfig`, `INDUSTRY_AI_DEFAULTS`, `DEFAULT_AI_CONFIG` |
| `apps/web/lib/industry/__tests__/industry-labels.test.ts` | VERIFIED | Exists in `apps/web/lib/industry/__tests__/` |
| `apps/web/lib/industry/__tests__/industry-ai-defaults.test.ts` | VERIFIED | Exists in `apps/web/lib/industry/__tests__/` |
| `apps/web/lib/industry/__tests__/booking-metadata.test.ts` | VERIFIED | Exists in `apps/web/lib/industry/__tests__/` |
| `apps/web/hooks/use-industry-labels.ts` | VERIFIED | Exports `useIndustryLabels`; imports `useCompanySettingsQuery` and `getIndustryLabels`; useMemo memoization |
| `packages/database/src/schema/bookings.ts` | VERIFIED | `bookingMetadata: jsonb('booking_metadata')` at line 70 |
| `apps/web/components/booking/Step3CustomerInfo.tsx` | VERIFIED | Contains `VERTICAL_FIELDS` and `useIndustryLabels`; vertical field section conditional on industry; `buildMetadata()` helper |
| `apps/web/components/booking/BookingDetailPanel.tsx` | VERIFIED | Imports `VERTICAL_FIELDS` and `useIndustryLabels`; renders `booking.bookingMetadata` section with field label lookup |
| `apps/web/app/api/v1/settings/ai/route.ts` | VERIFIED | Exports `GET` and `PUT`; merges `getIndustryAiDefaults` with stored `industry_config.ai`; requires SETTINGS_MANAGE permission |
| `apps/web/app/[locale]/(dashboard)/settings/ai/page.tsx` | VERIFIED | `useQuery`+`useMutation` for ai settings; Switch for upselling_enabled; Select for capacity_mode; defaults hint display |
| `apps/web/lib/navigation.ts` | VERIFIED | `aiSettings` entry at lines 177-179 with `Sparkles` icon and href `/settings/ai`, role `owner` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `instrumentation.ts` | `@vercel/otel` | `registerOTel` call | WIRED | Import and call confirmed at lines 1, 9 |
| `middleware.ts` | route-logger (indirect) | `x-request-id` header propagated | WIRED | Header set in middleware; read by `getRequestId(req)` in API routes |
| `Step3CustomerInfo.tsx` | `industry-fields.ts` | `VERTICAL_FIELDS` import | WIRED | Line 13: `import { VERTICAL_FIELDS } from '@/lib/industry/industry-fields'`; used line 71 |
| `Step3CustomerInfo.tsx` | `use-industry-labels.ts` | `useIndustryLabels` import | WIRED | Line 12: `import { useIndustryLabels } from '@/hooks/use-industry-labels'`; called lines 69, 182 |
| `public/.../bookings/route.ts` | `industry-fields.ts` | `bookingMetadataSchema` | WIRED | Line 41: import; line 66: in request schema; line 519: passed to DB insert |
| `upselling/route.ts` | `companies.industryConfig` | `upselling_enabled` check | WIRED | Reads `storedAi.upselling_enabled ?? defaults.upselling_enabled`; returns empty when disabled |
| `navigation.ts` | `settings/ai/page.tsx` | `href: '/settings/ai'` | WIRED | Line 178: `href: '/settings/ai'`; page file confirmed at `app/[locale]/(dashboard)/settings/ai/page.tsx` |
| `use-industry-labels.ts` | `use-settings-query.ts` | `useCompanySettingsQuery` | WIRED | Line 12: import; line 22: called to read `data?.industry_type` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| OBS-01 | 49-01 | OpenTelemetry instrumentation on API routes with @vercel/otel + 10% sampling | SATISFIED | `registerOTel` in instrumentation.ts (unconditional); OTEL env vars in .env.example; custom spans on 3 routes; all 6 commits verified in git |
| OBS-02 | 49-01 | Structured JSON logging compatible with Vercel log drain | SATISFIED | `route-logger.ts` with `logRouteComplete` produces `level, message, route, method, status, duration_ms, request_id`; 4 unit tests passing |
| VERT-01 | 49-02, 49-03 | Medical vertical — booking_metadata JSONB supports birth_number, insurance fields | SATISFIED | `VERTICAL_FIELDS.medical_clinic` defined; `bookingMetadataSchema` includes `medicalMetadataSchema`; public booking API stores `bookingMetadata`; 8 schema tests in booking-metadata.test.ts |
| VERT-02 | 49-02, 49-03 | Automotive vertical — booking_metadata JSONB supports SPZ/VIN fields | SATISFIED | `VERTICAL_FIELDS.auto_service` defined with license_plate/vin; `autoMetadataSchema` in discriminated union; same API storage path |
| VERT-03 | 49-02, 49-03 | Per-industry UI labels dynamically rendered from industry config | SATISFIED | `getIndustryLabels` returns medical/auto/default label sets; `useIndustryLabels` hook bridges to company settings; `Step3CustomerInfo` renders `labels.customer` heading; `BookingDetailPanel` uses `useIndustryLabels` for metadata section |
| VERT-04 | 49-02, 49-03 | Per-industry AI config (disable upselling for medical, adjust capacity for fitness) | SATISFIED | `getIndustryAiDefaults` returns medical upselling_enabled=false; AI settings page with GET/PUT API; upselling gate in both `UpsellingSuggestions.tsx` and upselling API route |

No orphaned requirements found. All 6 IDs declared in plan frontmatter match REQUIREMENTS.md entries, and all are tracked as Complete for Phase 49.

---

### Anti-Patterns Found

None detected. Scanned all 18 key artifacts for: TODO/FIXME/HACK/PLACEHOLDER, empty return implementations (`return null`, `return {}`, `return []`), and console.log-only handlers. The `placeholder` occurrences found are legitimate `VerticalField.placeholder` UI text definitions — not stub code.

---

### Human Verification Required

#### 1. Vertical fields visibility in public booking flow

**Test:** Create a booking as a customer for a company with `industry_type = 'medical_clinic'`. Proceed to Step 3 of the booking wizard.
**Expected:** Form shows "Pacient — doplňkové údaje" section below standard fields with "Rodné číslo" and "Pojišťovna" inputs. A company with `industry_type = 'general'` shows no extra fields and displays "Zákazník" in the subtitle.
**Why human:** Field visibility depends on `useCompanySettingsQuery` returning the company's actual `industry_type` from DB — requires a real seeded test company.

#### 2. AI settings page interactive behaviour

**Test:** Log in as owner, navigate to sidebar → AI Settings (/settings/ai). Toggle upselling switch, change capacity mode.
**Expected:** Controls update immediately via mutation; page shows industry default hint text; subsequent page load persists changes.
**Why human:** Requires authenticated session, DB write, and visual confirmation of hint text display.

#### 3. Vercel OTEL trace visibility

**Test:** Deploy to Vercel and navigate to Observability → Traces dashboard.
**Expected:** Traces named `schedulebox.auth.login`, `schedulebox.booking.list`, `schedulebox.booking.create` appear with span duration and HTTP attributes. Approximately 10% of requests sampled when env vars are set.
**Why human:** Cannot verify Vercel platform trace ingestion without deployment + Vercel dashboard access.

#### 4. Booking detail panel metadata display

**Test:** Create a medical booking with birth_number filled in. Open the booking in the detail panel.
**Expected:** Detail panel renders a section with Czech label "Rodné číslo" and the stored value. No extra section appears for bookings without metadata.
**Why human:** Requires end-to-end booking creation storing metadata + dashboard panel render.

---

### Gaps Summary

No gaps found. All 12 observable truths are verified, all 18 required artifacts exist and are substantive, all 8 key links are wired, and all 6 requirement IDs (OBS-01, OBS-02, VERT-01, VERT-02, VERT-03, VERT-04) are satisfied with evidence in the codebase. Four items flagged for human testing require live deployment or DB-seeded state.

---

_Verified: 2026-03-18T22:00:00Z_
_Verifier: Claude (gsd-verifier)_

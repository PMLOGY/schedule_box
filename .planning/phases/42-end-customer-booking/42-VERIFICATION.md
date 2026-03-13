---
phase: 42-end-customer-booking
verified: 2026-03-13T00:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 42: End-Customer Booking — Verification Report

**Phase Goal:** A customer with only a public booking URL can complete a booking end-to-end, track it, leave a review, and accumulate loyalty points
**Verified:** 2026-03-13
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Customer visiting /{company_slug}/book can select a service, pick a slot, enter details, and submit — booking is created | VERIFIED | `book/page.tsx` implements 4-step wizard (service → datetime → details → confirmation); `bookingMutation` POSTs to `/api/v1/public/company/${companySlug}/bookings`; response sets `bookingResult` |
| 2 | After booking, confirmation page shows a tracking link to /{company_slug}/booking/{uuid} | VERIFIED | Confirmation step (line 706-714 of `book/page.tsx`) renders `<Link href={\`/${locale}/${companySlug}/booking/${bookingResult.id}\`}>` with ExternalLink icon and `t('confirmation.trackBooking')` label |
| 3 | Tracking page at /{company_slug}/booking/{uuid} shows service name, company name, date, time, status | VERIFIED | `booking/[uuid]/page.tsx` fetches `/api/v1/public/bookings/${uuid}`; renders `booking.company_name`, `booking.service_name`, `start_time`/`end_time` formatted with date-fns, and status badge |
| 4 | When booking status is completed, tracking page shows a Leave Review link | VERIFIED | Lines 174-185 of `booking/[uuid]/page.tsx`: `{booking.status === 'completed' && (…)}` renders Star icon + `t('reviewCta')` + `<a href={\`/${locale}/${params.company_slug}/review/${params.uuid}\`}>` |
| 5 | Review page at /{company_slug}/review/{bookingUuid} allows rating + comment submission for completed bookings | VERIFIED | `review/[bookingUuid]/page.tsx` fetches booking via API, blocks submission when `status !== 'completed'`, renders 5-star selector + Textarea + email POSTed to `/api/v1/public/bookings/${bookingUuid}/review` |
| 6 | When a booking is marked completed, loyalty points are awarded synchronously to the customer's loyalty card | VERIFIED | `booking-transitions.ts` lines 284-291: after RabbitMQ publish try/catch, calls `await awardPointsForBooking(existing.id, companyId)` in its own try/catch (non-critical, booking completion never blocked) |
| 7 | A returning customer (matched by email) who has a loyalty card with redeemable rewards can apply a discount during booking | VERIFIED | `public/company/[slug]/bookings/route.ts`: `reward_id` in Zod schema (line 59); lines 266-370 validate program→card→reward, check points balance, calculate discount, call `redeemPoints`, increment `currentRedemptions` |
| 8 | Points accumulate across bookings — second completed booking adds to existing card balance | VERIFIED | `awardPointsForBooking` in `points-engine.ts` line 324: idempotency check only skips if a `loyalty_transactions` row for that `bookingId` already exists; separate bookings produce separate transactions, each additive |

**Score:** 8/8 truths verified

---

## Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `apps/web/app/api/v1/public/bookings/[uuid]/route.ts` | Public booking lookup, flat field names | VERIFIED | Returns `service_name`, `company_name`, `company_slug` as flat fields (lines 62-65). Exports `GET`. 68 lines, fully wired. |
| `apps/web/app/[locale]/[company_slug]/booking/[uuid]/page.tsx` | Booking tracking page with review link | VERIFIED | 251 lines; fetches API, renders all fields, review CTA at lines 174-185 wired to completed status |
| `apps/web/app/[locale]/[company_slug]/book/page.tsx` | Booking wizard with tracking link on confirmation | VERIFIED | 743 lines; confirmation step at lines 706-714 contains `<Link>` to tracking URL using `bookingResult.id` |
| `apps/web/lib/booking/booking-transitions.ts` | Synchronous loyalty points award on completeBooking | VERIFIED | Imports `awardPointsForBooking` (line 29); called at line 287 inside non-fatal try/catch after event publish |
| `apps/web/app/api/v1/public/loyalty/route.ts` | Public loyalty balance and rewards lookup | VERIFIED | 166 lines; validates email+company_slug, walks company→customer→program→card→rewards chain; returns `has_card`, `points_balance`, `available_rewards` |
| `apps/web/app/api/v1/public/company/[slug]/bookings/route.ts` | Booking creation with optional loyalty discount | VERIFIED | 487 lines; `reward_id` field in schema, full validation/discount/points-deduction block present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `book/page.tsx` | `/{locale}/{company_slug}/booking/{uuid}` | `<Link>` on confirmation step | WIRED | Line 707: `href={\`/${locale}/${companySlug}/booking/${bookingResult.id}\`}` |
| `booking/[uuid]/page.tsx` | `/{locale}/{company_slug}/review/{uuid}` | `<a>` tag when status=completed | WIRED | Line 179: `href={\`/${locale}/${params.company_slug}/review/${params.uuid}\`}` (plain `<a>` per design decision — avoids next-intl scope issue) |
| `booking/[uuid]/page.tsx` | `/api/v1/public/bookings/{uuid}` | `fetch` in `useQuery` | WIRED | Line 65: `fetch(\`/api/v1/public/bookings/${params.uuid}\`)` with response assigned to `booking` state |
| `booking-transitions.ts` | `apps/web/lib/loyalty/points-engine.ts` | `import { awardPointsForBooking }` | WIRED | Line 29 import; line 287 call: `awardPointsForBooking(existing.id, companyId)` |
| `public/company/[slug]/bookings/route.ts` | `apps/web/lib/loyalty/points-engine.ts` | `import { redeemPoints }` | WIRED | Line 33 import; line 360 call: `redeemPoints(card.id, reward.pointsCost, …)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CUST-01 | 42-01-PLAN.md | Public booking wizard works end-to-end — select service → pick slot → enter details → booking created | SATISFIED | `book/page.tsx` 4-step wizard; `bookingMutation` POSTs to public bookings API; `BookingResult` returned and stored |
| CUST-02 | 42-01-PLAN.md | Booking confirmation shows booking ID and status, trackable via URL | SATISFIED | Confirmation step renders booking ID (`bookingResult.id.slice(0,8)...`), status badge, and full `<Link>` to tracking URL |
| CUST-03 | 42-01-PLAN.md | Customer can leave a review after completed booking | SATISFIED | Review CTA on tracking page (status=completed only); `review/[bookingUuid]/page.tsx` guards submission behind `isCompleted` check; POST to `/api/v1/public/bookings/{uuid}/review` |
| CUST-04 | 42-02-PLAN.md | Loyalty points accumulate for returning customers and discounts apply | SATISFIED | `completeBooking` calls `awardPointsForBooking` synchronously; `reward_id` in booking schema with full deduction logic; `GET /api/v1/public/loyalty` endpoint live |

All 4 requirements accounted for. No orphaned requirements.

---

## Anti-Patterns Found

No blockers or warnings detected.

Scan of phase-modified files:

| File | Pattern Checked | Result |
|------|----------------|--------|
| `public/bookings/[uuid]/route.ts` | Empty returns, TODO, stub | Clean |
| `booking/[uuid]/page.tsx` | Placeholder renders, empty handlers | Clean — cancel handler calls `cancelMutation.mutate(cancelEmail)` |
| `book/page.tsx` | Confirmation tracking link | Clean — `<Link href={...}>` wired to `bookingResult.id` |
| `review/[bookingUuid]/page.tsx` | `booking.service?.name` (stale nested access) | Clean — updated to `booking.service_name` (line 111) |
| `booking-transitions.ts` | Synchronous call present, not just event | Clean — lines 284-291 |
| `public/loyalty/route.ts` | Static/empty response | Clean — full DB chain |
| `public/company/[slug]/bookings/route.ts` | `reward_id` wired end-to-end | Clean |

---

## Human Verification Required

### 1. Full booking wizard flow

**Test:** Navigate to `/{locale}/{company_slug}/book`, complete all 4 steps with real customer details, click submit
**Expected:** Booking created, confirmation card appears with truncated booking ID and "Track Your Booking" button
**Why human:** Multi-step UI state, form validation, slot selection interaction

### 2. Tracking link navigation

**Test:** From confirmation page, click "Track Your Booking"
**Expected:** Browser navigates to `/{locale}/{slug}/booking/{uuid}`; page renders company name, service name, date/time, status badge
**Why human:** Real navigation and data render after DB insert

### 3. Review CTA visibility gating

**Test:** Access tracking page for a booking in `pending` or `confirmed` status
**Expected:** Review CTA ("How was your experience?") is NOT visible; visible only after booking is marked completed
**Why human:** Status-dependent conditional render requires actual booking state

### 4. Review submission flow

**Test:** Mark a booking as completed, open tracking page, click "Leave a Review", submit rating + comment + email
**Expected:** Review accepted, success screen shown
**Why human:** Requires completed booking in DB; cross-page flow

### 5. Loyalty points accumulation

**Test:** Mark two bookings completed for the same customer email; check loyalty_transactions table
**Expected:** Two separate transaction rows; second booking adds to existing card balance
**Why human:** Requires DB inspection and completed booking state transitions

### 6. Loyalty discount at booking time

**Test:** GET `/api/v1/public/loyalty?email=x&company_slug=y` with a customer who has a card; then POST booking with `reward_id`
**Expected:** Points deducted from card, `discountAmount` set on booking row, reward `currentRedemptions` incremented
**Why human:** Requires seeded loyalty card with sufficient balance and active reward

---

## Summary

Phase 42 goal is achieved. All 8 observable truths are verified against actual code, not SUMMARY claims:

- The booking wizard (`book/page.tsx`) is a complete 4-step React flow — not a placeholder
- The tracking link on confirmation is a real `<Link>` to `/{locale}/{slug}/booking/{bookingResult.id}`
- The tracking page fetches from the corrected flat-field API and renders `service_name`, `company_name`, date/time
- The review CTA is conditionally rendered only for `status === 'completed'` and links correctly
- The review page reads `booking.service_name` and `booking.company_name` (flat, not nested)
- `completeBooking` calls `awardPointsForBooking(existing.id, companyId)` synchronously — `existing.id` is the UUID (confirmed via `BookingWithRelations` where `id: bookings.uuid`)
- The public loyalty endpoint walks the full DB chain and is not a stub
- The booking POST route accepts `reward_id`, validates points, applies discount, deducts balance

TypeScript compiles without errors. All 4 requirements (CUST-01 through CUST-04) are satisfied and accounted for in REQUIREMENTS.md (marked Complete, Phase 42).

---

_Verified: 2026-03-13_
_Verifier: Claude (gsd-verifier)_

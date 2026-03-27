# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** Milestone v3.1 — Phase 51: Per-Company Payments

## Current Position

Phase: 51 of 53 (Per-Company Payments)
Plan: 1 of 4 complete
Status: Executing phase 51
Last activity: 2026-03-27 — Plan 51-01 complete (payment_providers schema, credential resolver, Comgate client overrides)

Progress: [██░░░░░░░░] ~10% (v3.1)

## What's Done

**v1.0 shipped** (15 phases, 101 plans — 2026-02-12)
**v1.1 shipped** (7 phases, 22 plans — 2026-02-21)
**v1.2 shipped** (5 phases, 20 plans — 2026-02-24)
**v1.3 shipped** (5 phases, 21 plans — 2026-02-25)
**v1.4 shipped** (6 phases, 11 plans — 2026-03-12): glassmorphism redesign
**v2.0 shipped** (6 phases, 11 plans — 2026-03-16): full functionality, all 4 views working
**v3.0 shipped** (6 phases, 26 plans — 2026-03-18): Vercel infra, security hardening, super-admin, marketplace, observability, testing

## Decisions

See `.planning/PROJECT.md` Key Decisions section (decisions 1-20 logged there).

Recent decisions affecting v3.1:
- [Phase 50]: v3.0 complete — all 47 requirements delivered, 6 phases shipped
- [Phase 28]: Comgate recurring live but requires manual activation — contact support for merchant 498621
- [Phase 46]: PII expand-contract migration pending contract phase (drop plaintext columns after backfill verified)
- Per-company payments: provider-agnostic `payment_providers` table — PAY-03 drives schema design so Stripe can be added without DDL changes
- [Phase 51-01]: Credentials stored as AES-256-GCM encrypted text (not JSONB) — encrypted blob is opaque
- [Phase 51-01]: chargeRecurringPayment unchanged — platform subscription billing always uses platform credentials (PAY-04)
- [Phase 51-01]: GET endpoint returns masked merchant_id (last 4 chars) — never exposes full secret

## Blockers

- **[ACTIVE]** Comgate recurring activation requires contacting Comgate support for merchant 498621 — needed for DEP-04 verification
- **[PENDING]** Custom domain not yet provided — DEP-02 gated on user providing domain name
- Real testimonials needed for landing page — placeholder content still in place

## Performance Metrics

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 15 | 101 | 2 days |
| v1.1 | 7 | 22 | 5 days |
| v1.2 | 5 | 20 | 4 days |
| v1.3 | 5 | 21 | 1 day |
| v1.4 | 6 | 11 | 16 days |
| v2.0 | 6 | 11 | 3 days |
| v3.0 | 6 | 26 | 2 days |

## Session Continuity

Last session: 2026-03-27
Stopped at: Completed 51-01-PLAN.md (payment_providers schema & credential resolver)
Resume file: None

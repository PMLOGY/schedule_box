# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.1 Production Hardening — real integrations, test coverage, deployment polish

## Position

- **Milestone:** v1.1 Production Hardening
- **Phase:** Not started (defining requirements)
- **Status:** Defining requirements
- **Last activity:** 2026-02-15 — Milestone v1.1 started

## What's Done

v1.0 shipped (103 requirements, 15 phases, 101 plans). Deployed to Railway with all services running.

Post-v1.0 fixes (2026-02-15):
- Fixed Redis NOAUTH in notification worker
- Wired dashboard to real analytics data
- Replaced hardcoded placeholder values
- Fixed analytics date calculation bug

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

## Blockers

- No external service accounts yet (SMTP, Twilio, Comgate) — user will set up during v1.1

## Metrics

| Metric | v1.0 Final | v1.1 Target |
|--------|-----------|-------------|
| Test Coverage | 0% | 80%+ critical paths |
| Email Delivery | Not configured | Working SMTP |
| SMS Delivery | Not configured | Working Twilio |
| Payments | Code only | Live Comgate |

---
*Last updated: 2026-02-15 after v1.1 milestone start*

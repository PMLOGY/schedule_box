# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.1 Production Hardening — Phase 16 Testing Foundation

## Current Position

- **Milestone:** v1.1 Production Hardening
- **Phase:** 16 of 22 (Testing Foundation)
- **Status:** Ready to plan
- **Last activity:** 2026-02-15 — v1.1 roadmap created with 7 phases, 33 requirements

Progress: [████████████████░░░░░░░░░░░░░░░░░░░░] 68% (15/22 phases)

## What's Done

**v1.0 shipped** (103 requirements, 15 phases, 101 plans). Deployed to Railway 2026-02-15.

**Post-v1.0 fixes** (2026-02-15):
- Fixed Redis NOAUTH in notification worker
- Wired dashboard to real analytics data
- Replaced hardcoded placeholder values
- Fixed analytics date calculation bug

**v1.1 roadmap created** (2026-02-15):
- 7 phases mapped (16-22)
- 33 requirements with 100% coverage
- Testing foundation → Integration/E2E tests → Email/SMS → Payments → Monitoring
- Dependencies validated (test infrastructure before services)

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Recent decisions:**
- Phase ordering: Testing infrastructure first (16-18), then services (19-21), monitoring last (22)
- Test coverage target: 80% enforced in CI (not 100% — focus on critical paths)
- SMTP provider: Brevo (best free tier, lowest entry cost)
- SMS provider: Keep Twilio (code exists, TypeScript-native SDK v4)
- E2E framework: Playwright over Cypress (Safari support for 40% CZ iOS users)

## Blockers

- No external service accounts yet (SMTP, Twilio, Comgate production) — will configure during v1.1 phases
- Testcontainers on Railway compatibility unknown — will test in Phase 17, fallback to Railway test DB if Docker-in-Docker fails

## Metrics

| Metric | v1.0 Final | v1.1 Current | v1.1 Target |
|--------|-----------|--------------|-------------|
| Phases Complete | 15/15 | 0/7 | 7/7 |
| Test Coverage | 0% | 0% | 80%+ critical paths |
| Email Delivery | Not configured | Not configured | Working SMTP |
| SMS Delivery | Not configured | Not configured | Working Twilio |
| Payments | Code only | Code only | Live Comgate |

---
*Last updated: 2026-02-15 after v1.1 roadmap creation*

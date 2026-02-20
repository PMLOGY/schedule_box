# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.1 Production Hardening — Phase 16 Testing Foundation

## Current Position

- **Milestone:** v1.1 Production Hardening
- **Phase:** 16 of 22 (Testing Foundation)
- **Current Plan:** 16-04 (next to execute)
- **Status:** In progress (3/N plans complete in phase 16)
- **Last activity:** 2026-02-20 — Phase 16 Plan 03 complete (MSW 2.0 configuration + CI test pipeline)

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

**Phase 16 Plan 01 complete** (2026-02-20):
- Vitest 4.0.18 installed across monorepo with coverage-v8, UI, happy-dom
- Shared base config (vitest.shared.ts) with 80% coverage thresholds
- Per-package vitest.config.ts for shared, events, web, notification-worker
- Root test scripts: test, test:unit, test:watch, test:ui, test:coverage
- Smoke test passes (generateSlug Czech diacritics, 5 assertions)

**Phase 16 Plan 03 complete** (2026-02-20):
- MSW 2.0 installed and configured in @schedulebox/web
- Default handlers for Comgate (3 endpoints), AI service (3 endpoints), notifications (1 endpoint)
- MSW lifecycle in vitest.setup.ts (listen/resetHandlers/close); setupFiles added to web vitest.config.ts
- 9 MSW handler tests verify interception and override pattern work
- CI pipeline updated: test job runs pnpm test:coverage, build job requires [lint, test]
- Plan 16-02 partial work (shared utility tests + vitest config refinements) also committed

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Recent decisions:**
- Phase ordering: Testing infrastructure first (16-18), then services (19-21), monitoring last (22)
- Test coverage target: 80% enforced in CI (not 100% — focus on critical paths)
- SMTP provider: Brevo (best free tier, lowest entry cost)
- SMS provider: Keep Twilio (code exists, TypeScript-native SDK v4)
- E2E framework: Playwright over Cypress (Safari support for 40% CZ iOS users)
- Vitest 4.0 removed defineWorkspace: use test.projects array in vitest.config.ts instead
- Coverage thresholds at 80% for lines/functions/branches/statements enforced via v8 provider
- web package uses happy-dom environment; all other packages use node environment
- MSW onUnhandledRequest: 'warn' (not 'error') during bootstrap phase to avoid test failures
- build-ai CI job only needs lint (AI service is Python, not covered by Vitest)

## Blockers

- No external service accounts yet (SMTP, Twilio, Comgate production) — will configure during v1.1 phases
- Testcontainers on Railway compatibility unknown — will test in Phase 17, fallback to Railway test DB if Docker-in-Docker fails

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 16-testing-foundation | 01 | 8min | 2/2 | 13 |
| 16-testing-foundation | 03 | 4min | 2/2 | 8 |

## Metrics

| Metric | v1.0 Final | v1.1 Current | v1.1 Target |
|--------|-----------|--------------|-------------|
| Phases Complete | 15/15 | 0/7 | 7/7 |
| Test Coverage | 0% | ~15% (2 files, 78 tests) | 80%+ critical paths |
| Email Delivery | Not configured | Not configured | Working SMTP |
| SMS Delivery | Not configured | Not configured | Working Twilio |
| Payments | Code only | Code only | Live Comgate |

---
*Last updated: 2026-02-20 after Phase 16 Plan 03 (MSW 2.0 + CI test pipeline)*
*Last session: Stopped at Completed 16-03-PLAN.md*

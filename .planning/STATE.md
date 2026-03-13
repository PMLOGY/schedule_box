---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Full Functionality & Production Readiness
status: active
stopped_at: Completed 42-end-customer-booking-02-PLAN.md
last_updated: "2026-03-13T16:35:46.962Z"
last_activity: 2026-03-13 — Roadmap created for v2.0 (24 requirements, 6 phases)
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 9
  completed_plans: 9
  percent: 97
---

---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Full Functionality & Production Readiness
status: active
stopped_at: null
last_updated: "2026-03-13T00:00:00.000Z"
last_activity: 2026-03-13 — Roadmap created, 6 phases defined (39-44)
progress:
  [██████████] 97%
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** Phase 39 — Auth & Session

## Current Position

Phase: 39 of 44 (Auth & Session)
Plan: —
Status: Ready to plan
Last activity: 2026-03-13 — Roadmap created for v2.0 (24 requirements, 6 phases)

Progress: [░░░░░░░░░░] 0%

## What's Done

**v1.0 shipped** (15 phases, 101 plans — 2026-02-12)
**v1.1 shipped** (7 phases, 22 plans — 2026-02-21)
**v1.2 shipped** (5 phases, 20 plans — 2026-02-24)
**v1.3 shipped** (5 phases, 21 plans — 2026-02-25)
**v1.4 shipped** (6 phases, 11 plans — 2026-03-12): glassmorphism redesign, glass tokens, Tailwind plugin, CVA glass variants, gradient mesh, aurora animation, Plus Jakarta Sans, dark mode + responsive QA

## Decisions

See `.planning/PROJECT.md` Key Decisions section (decisions 1-20 logged there).

Recent decisions affecting v2.0:
- Docker Compose on VPS is the deployment target (not Kubernetes/Helm)
- Public booking works without customer auth (simpler UX)
- CI/CD pipeline out of scope — deployment config only
- [Phase 39-auth-session]: Background refresh interval stored at module level (not in Zustand state) to avoid serialization; cookie path /api/v1/auth covers all auth sub-routes; companyId null guard removed in rotateRefreshToken to unblock admin/customer refresh
- [Phase 39-auth-session]: Employee invite: POST /employees/invite validates company scope + 409 guards + transaction links users.id to employees.userId
- [Phase 40-business-owner-flow]: BookingLinkCard placed after DemoDataCard — prominent for owners without blocking onboarding
- [Phase 40-business-owner-flow]: Two-step delete: Trash2 icon (mr-auto in DialogFooter) -> confirmation Dialog for services
- [Phase 43-admin-platform]: Company deactivation check in login uses strict === false to safely handle NULL from LEFT JOIN; admin role excluded via roleName check
- [Phase 43-admin-platform]: useToggleCompanyActive invalidates both companies and stats queries so KPI dashboard stays fresh after company state changes
- [Phase 40-business-owner-flow]: Booking UUID pattern: always use booking.uuid for API calls, booking.id is internal DB reference only
- [Phase 40-business-owner-flow]: RevenueMiniChart uses synthetic daily distribution from analytics totals — dedicated daily-revenue endpoint deferred
- [Phase 41-employee-flow]: Working hours: handleSave sends all 7 days unconditionally so inactive days persist in DB
- [Phase 41-employee-flow]: Time-off date range creates N separate override records (one per day) matching existing schema
- [Phase 41-employee-flow]: Employee /me/bookings: employee_id filter forced server-side; both hooks called unconditionally with ternary selection to satisfy rules-of-hooks
- [Phase 42-end-customer-booking]: Public booking API returns flat service_name/company_name/company_slug to match frontend PublicBooking interface exactly
- [Phase 42-end-customer-booking]: Review link on tracking page uses plain href (not next-intl Link) since public review route is outside i18n navigation helper scope
- [Phase 42-end-customer-booking]: Synchronous awardPointsForBooking after RabbitMQ publish in completeBooking — idempotent, non-critical fallback for dev/single-server deployments
- [Phase 42-end-customer-booking]: Public loyalty GET returns has_card=false for unknown email/company rather than 404 — prevents information leakage on public endpoint

## Blockers

- Real testimonials needed for landing page social proof — placeholder content in place
- **[DEFERRED]** Comgate recurring activation — code complete (Phase 28), live recurring requires contacting Comgate support for merchant 498621

## Performance Metrics

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 15 | 101 | 2 days |
| v1.1 | 7 | 22 | 5 days |
| v1.2 | 5 | 20 | 4 days |
| v1.3 | 5 | 21 | 1 day |
| v1.4 | 6 | 11 | 16 days |
| Phase 39-auth-session P01 | 3 | 2 tasks | 5 files |
| Phase 39-auth-session P02 | 15 | 2 tasks | 7 files |
| Phase 40-business-owner-flow P01 | 15 | 2 tasks | 7 files |
| Phase 40-business-owner-flow P02 | 13 | 2 tasks | 3 files |
| Phase 41-employee-flow P02 | 4 | 2 tasks | 4 files |
| Phase 41-employee-flow P01 | 4 | 2 tasks | 6 files |
| Phase 42-end-customer-booking P01 | 12 | 2 tasks | 7 files |
| Phase 42-end-customer-booking P02 | 15 | 2 tasks | 3 files |

## Session Continuity

Last session: 2026-03-13T16:35:46.958Z
Stopped at: Completed 42-end-customer-booking-02-PLAN.md
Resume file: None

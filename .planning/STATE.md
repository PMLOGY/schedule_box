---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Full Functionality & Production Readiness
status: active
stopped_at: Completed 43-admin-platform-01-PLAN.md
last_updated: "2026-03-13T14:36:51.615Z"
last_activity: 2026-03-13 — Roadmap created for v2.0 (24 requirements, 6 phases)
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 5
  completed_plans: 4
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

## Session Continuity

Last session: 2026-03-13T14:36:45.748Z
Stopped at: Completed 43-admin-platform-01-PLAN.md
Resume file: None

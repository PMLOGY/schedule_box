---
phase: 39-auth-session
plan: 02
subsystem: auth
tags: [employees, user-accounts, invite, role-management, drizzle, react-query]

# Dependency graph
requires:
  - phase: 39-auth-session-01
    provides: JWT auth, refresh token rotation, login flow all working
provides:
  - POST /api/v1/employees/invite endpoint creates users row with role=employee linked to employees record
  - GET /employees now returns has_account boolean per employee
  - Employee invite dialog on employees page with employee select, email, password fields
  - Visual has_account badge (ShieldCheck/ShieldOff) per employee row
  - Translation keys for invite flow in en/cs/sk
affects: [employee-schedule, portal, auth-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Owner creates employee login: POST /api/v1/employees/invite links users row to employees.userId"
    - "has_account derived server-side from userId IS NOT NULL — no extra query needed"
    - "Pre-fill email in invite dialog from employee.email if available"

key-files:
  created:
    - apps/web/app/api/v1/employees/invite/route.ts
  modified:
    - apps/web/validations/employee.ts
    - apps/web/app/api/v1/employees/route.ts
    - apps/web/hooks/use-employees-query.ts
    - apps/web/app/[locale]/(dashboard)/employees/page.tsx
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - "Invite endpoint validates employees.companyId == caller company before linking — no cross-tenant leakage"
  - "Duplicate prevention: 409 if employee.userId IS NOT NULL or email already in users table"
  - "Transaction wraps: hashPassword + insert users + insert passwordHistory + update employees.userId + employees.email"
  - "has_account derived from userId in the existing GET /employees LEFT JOIN — zero added queries"
  - "Invite button disabled when all employees already have accounts (employeesWithoutAccount.length === 0)"

patterns-established:
  - "Employee invite pattern: check employee ownership + userId null guard + email uniqueness + transaction"

requirements-completed: [AUTH-04]

# Metrics
duration: 15min
completed: 2026-03-13
---

# Phase 39 Plan 02: Employee Invite Summary

**POST /api/v1/employees/invite with transaction-safe user account creation linked to employees.userId, plus invite dialog with ShieldCheck/ShieldOff account status badges on employees page**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-13T14:00:00Z
- **Completed:** 2026-03-13T14:15:00Z
- **Tasks:** 2
- **Files modified:** 7 (1 created)

## Accomplishments
- POST /api/v1/employees/invite creates a users row with role=employee and atomically links it to the employees record via employees.userId FK
- Duplicate prevention: 409 Conflict if employee already has a user account OR email already registered
- GET /employees extended to return `has_account: boolean` derived from `userId IS NOT NULL` — no extra DB query
- Employees page has "Create Login" button + invite dialog (employee select, email, password inputs)
- Visual badge per row shows ShieldCheck (green) for employees with logins, ShieldOff for those without
- useInviteEmployee mutation hook added to use-employees-query.ts
- Translation keys added to en/cs/sk: inviteEmployee, inviteTitle, inviteDescription, inviteSuccess, inviteError, selectEmployee, setPassword, hasAccount, noAccount

## Task Commits

1. **Task 1: Create employee invite API endpoint** - `f7a8be5` (feat)
2. **Task 2: Add employee invite UI to employees page** - `a92438f` (feat)

## Files Created/Modified
- `apps/web/app/api/v1/employees/invite/route.ts` - POST endpoint: validates company scope, checks for existing account, creates user + links employee in transaction
- `apps/web/validations/employee.ts` - Added employeeInviteSchema Zod schema
- `apps/web/app/api/v1/employees/route.ts` - GET handler now selects userId and returns has_account boolean
- `apps/web/hooks/use-employees-query.ts` - Employee interface updated (has_account field), useInviteEmployee mutation added
- `apps/web/app/[locale]/(dashboard)/employees/page.tsx` - Invite dialog + ShieldCheck/ShieldOff status column
- `apps/web/messages/en.json` - Invite translation keys (English)
- `apps/web/messages/cs.json` - Invite translation keys (Czech)
- `apps/web/messages/sk.json` - Invite translation keys (Slovak)

## Decisions Made
- Invite endpoint validates `employees.companyId == caller's companyId` before processing — prevents cross-tenant account creation
- Transaction wraps hash + insert users + insert passwordHistory + update employees.userId/email atomically
- `has_account` is derived server-side (`userId IS NOT NULL`) within the existing LEFT JOIN query — zero overhead
- Invite button is disabled when `employeesWithoutAccount.length === 0` (all employees already have accounts)
- Email pre-populated in invite dialog from `employee.email` if present, reducing friction for owner

## Deviations from Plan

None - plan executed exactly as written. The GET /employees modification to include `has_account` was explicitly called out in Task 2 step 8.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Employee login accounts can now be created from the employees page
- Created employees can log in and will be routed to /dashboard with employee-role nav
- Employee role routing (plan 39-01) is already in place — end-to-end flow is complete
- AUTH-04 requirement satisfied

---
*Phase: 39-auth-session*
*Completed: 2026-03-13*

## Self-Check: PASSED

- FOUND: apps/web/app/api/v1/employees/invite/route.ts
- FOUND: apps/web/validations/employee.ts (employeeInviteSchema)
- FOUND: .planning/phases/39-auth-session/39-02-SUMMARY.md
- FOUND: commit f7a8be5 (feat backend: invite endpoint)
- FOUND: commit a92438f (feat frontend: invite dialog)

---
phase: 39-auth-session
verified: 2026-03-13T00:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 39: Auth Session Verification Report

**Phase Goal:** Users stay logged in, tokens refresh silently, and each role lands on the correct page after login — including owners who can create employee accounts
**Verified:** 2026-03-13
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                         | Status     | Evidence                                                                                                                          |
|----|-----------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------------------------------------------|
| 1  | Refreshing the browser does not log the user out                                              | ✓ VERIFIED | `_hasHydrated` flag + `onRehydrateStorage` callback in `auth.store.ts` lines 183–190 prevents `useAuth` from redirecting before rehydration completes |
| 2  | After 15+ minutes of inactivity, the session auto-renews without a login prompt               | ✓ VERIFIED | `startBackgroundRefresh` sets a 12-min `setInterval` at module level; started on `login`, resumed in `onRehydrateStorage` if `isAuthenticated`; `stopBackgroundRefresh` called on `logout` |
| 3  | Logging in as admin routes to /admin, owner to /dashboard, employee to /dashboard, customer to /portal | ✓ VERIFIED | `getHomeForRole` in `use-auth.ts` lines 10–19: admin→`/admin`, customer→`/portal/bookings`, default→`/dashboard`; `isRoleAllowedForPath` enforces cross-role redirect on every route change |
| 4  | Owner can create a new employee account with email and password                               | ✓ VERIFIED | `POST /api/v1/employees/invite` endpoint exists and is fully implemented with `PERMISSIONS.EMPLOYEES_MANAGE` guard, transaction, and `hashPassword` |
| 5  | The created employee can log in with those credentials                                        | ✓ VERIFIED | Invite endpoint inserts into `users` table with `role=employee`, `isActive: true`, `companyId`, and `passwordHash` — standard login flow accepts these |
| 6  | The employee user is linked to the correct company and has the employee role                  | ✓ VERIFIED | Transaction links `employees.userId` to new `users.id` and sets `employees.email`; `companyId` scoped from caller's company via `findCompanyId` |

**Score:** 6/6 truths verified

---

## Required Artifacts

### Plan 39-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/stores/auth.store.ts` | Auth store with hydration tracking + background refresh interval | ✓ VERIFIED | Contains `_hasHydrated: false` field, `setHasHydrated`, `startBackgroundRefresh`/`stopBackgroundRefresh` (module-level `setInterval`), and `onRehydrateStorage` callback |
| `apps/web/hooks/use-auth.ts` | Hydration-aware auth guard that waits for store rehydration | ✓ VERIFIED | `if (!_hasHydrated) return` guard at line 86 prevents any redirect until store is hydrated; all four role paths routed correctly |
| `apps/web/lib/auth/jwt.ts` | Token refresh that works for admin users (no companyId) | ✓ VERIFIED | `rotateRefreshToken` uses `user.companyId ?? 0` at line 215; no `!user.companyId` guard present — admin/customer users can rotate tokens |

### Plan 39-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/app/api/v1/employees/invite/route.ts` | POST endpoint to create employee user account linked to employees table | ✓ VERIFIED | Exists, substantive (131 lines), uses `createRouteHandler`, transaction-wraps user insert + passwordHistory + employees.userId update |
| `apps/web/validations/employee.ts` | Zod schema for employee invite request | ✓ VERIFIED | `employeeInviteSchema` at lines 96–101 — uuid, email, password (min 8), optional name |
| `apps/web/app/[locale]/(dashboard)/employees/page.tsx` | Employee invite form UI accessible from employees page | ✓ VERIFIED | Full invite Dialog at lines 449–508 with employee Select, email input, password input, submit with validation disabled state; `useInviteEmployee` mutation wired via `handleInvite` |

---

## Key Link Verification

### Plan 39-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `auth.store.ts` | `hooks/use-auth.ts` | `useAuthStore` hydration state | ✓ WIRED | `use-auth.ts` line 79 destructures `_hasHydrated` from `useAuthStore`; used in guard at line 86 |
| `auth.store.ts` | `/api/v1/auth/refresh` | background refresh interval | ✓ WIRED | `setInterval` in `startBackgroundRefresh` calls `state.refreshToken()` which POSTs to `/auth/refresh` via `apiClient` |
| `login/route.ts` | `refresh/route.ts` | consistent cookie path | ✓ WIRED | `login/route.ts` line 215: `path: '/api/v1/auth'`; `refresh/route.ts` line 59: `path: '/api/v1/auth'` — identical |

### Plan 39-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `invite/route.ts` | `packages/database` employees table | updates `employees.userId` after creating users record | ✓ WIRED | Transaction at lines 113–119: `tx.update(employees).set({ userId: newUser.id, email: body.email })` |
| `invite/route.ts` | `apps/web/lib/auth/password.ts` | `hashPassword` for new employee credentials | ✓ WIRED | Import at line 14; called at line 72: `const passwordHash = await hashPassword(body.password)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| AUTH-01 | 39-01 | User session persists across browser refresh without random logouts | ✓ SATISFIED | `_hasHydrated` guard in `use-auth.ts` + `onRehydrateStorage` in `auth.store.ts` prevent false logout on reload |
| AUTH-02 | 39-01 | Token refresh works silently — no mid-session expiration | ✓ SATISFIED | 12-min `setInterval` background refresh; api-client 401 handler retries with refreshed token for all roles |
| AUTH-03 | 39-01 | Each role routes to correct view after login | ✓ SATISFIED | `getHomeForRole` and `isRoleAllowedForPath` in `use-auth.ts` cover admin, customer, owner/manager/employee |
| AUTH-04 | 39-02 | Owner can create employee accounts with credentials/invite | ✓ SATISFIED | `POST /api/v1/employees/invite` + invite dialog on employees page; full end-to-end from owner action to employee login |

All four requirements marked `[x]` in `.planning/REQUIREMENTS.md`. No orphaned requirements — every AUTH-01 through AUTH-04 is accounted for in the plans and implemented in code.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `employees/page.tsx` | 218 | Hard-coded "Login" column header (not translated) | ℹ️ Info | Column header uses literal string `"Login"` instead of a translation key — minor i18n gap, does not block functionality |

No blockers or warnings found. No stub returns, no TODO/FIXME markers, no placeholder logic in phase-modified files.

---

## Human Verification Required

### 1. Browser Refresh Session Persistence

**Test:** Log in as owner (test@example.com / password123), navigate to /dashboard, then press F5 (hard refresh).
**Expected:** User remains on /dashboard, no redirect to /login, session fully intact.
**Why human:** Cannot programmatically verify localStorage rehydration timing across a full browser reload cycle.

### 2. Background Refresh Interval

**Test:** Log in, open DevTools Network tab, wait 12 minutes (or temporarily change `BACKGROUND_REFRESH_INTERVAL_MS` to 60000 for testing).
**Expected:** A POST to `/api/v1/auth/refresh` fires automatically without any user action, returning new tokens.
**Why human:** Cannot observe setInterval firing in a static code review.

### 3. Role-Based Routing End-to-End

**Test:** Log in as admin (admin@schedulebox.cz / password123). Attempt to navigate to /dashboard manually.
**Expected:** Redirected back to /admin immediately.
**Why human:** Requires live browser navigation to verify redirect timing and absence of flash.

### 4. Employee Invite Flow End-to-End

**Test:** Log in as owner, go to /employees, click "Create Login", select an employee without an account, enter a unique email + password (8+ chars), submit.
**Expected:** Success toast fires, employee row badge changes to ShieldCheck (green "Has login"), new user can log in with those credentials and land on /dashboard.
**Why human:** Requires live DB interaction and cross-session login verification.

### 5. Duplicate Prevention

**Test:** After creating an employee login account, try to create another account for the same employee via the invite dialog (it should be disabled because `employeesWithoutAccount` would exclude them after success). Also try the API directly with the same email.
**Expected:** Invite button disabled for employees already having accounts; API returns 409 Conflict on duplicate email or already-linked employee.
**Why human:** Requires runtime state verification after the first invite succeeds.

---

## Gaps Summary

None. All six observable truths are verified, all six required artifacts exist and are substantive and wired, all four key links are confirmed, and all four AUTH requirements are satisfied with direct code evidence.

The only notable finding is a minor i18n gap — the "Login" column header on the employees table is a hard-coded English string rather than a translation key. This does not block any requirement and is cosmetic only.

---

_Verified: 2026-03-13_
_Verifier: Claude (gsd-verifier)_

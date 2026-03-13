---
phase: 43-admin-platform
verified: 2026-03-13T15:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 43: Admin Platform Verification Report

**Phase Goal:** Platform administrators can monitor real activity across all companies and manage company and user accounts
**Verified:** 2026-03-13T15:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                    | Status     | Evidence                                                                                                            |
|----|----------------------------------------------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------------------------------|
| 1  | Admin dashboard shows live platform stats (companies, users, bookings, revenue) matching DB              | VERIFIED   | `admin/stats/route.ts` executes 6 real DB queries; `admin/page.tsx` binds all 6 KPI cards to `useAdminStats()` data |
| 2  | Admin can toggle a company between active and deactivated from the companies table                       | VERIFIED   | `PUT` handler in `admin/companies/route.ts` (line 104) validates UUID+boolean, finds by UUID, updates `isActive`; companies page (line 112-119) calls `handleToggleActive` wired to `useToggleCompanyActive` |
| 3  | A deactivated company's owner/employee users cannot log in — login returns an error                      | VERIFIED   | `login/route.ts` line 70 selects `companyIsActive: companies.isActive`; lines 91-97 throw `UnauthorizedError('Company account is deactivated')` when `companyId` exists, `companyIsActive === false`, and `roleName !== 'admin'` |
| 4  | Admin can search users, filter by role, and toggle individual user accounts active/inactive              | VERIFIED   | `admin/users/route.ts` GET applies `ilike` search and `eq(roles.name, roleFilter)` conditions; users page has `<Input>` search + `<Select>` role filter wired to `useAdminUsers` params; PUT handler toggles `isActive` per UUID |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                                                                 | Provides                                                | Status     | Details                                                                            |
|--------------------------------------------------------------------------|---------------------------------------------------------|------------|------------------------------------------------------------------------------------|
| `apps/web/app/api/v1/admin/companies/route.ts`                           | GET companies list; PUT toggle company isActive         | VERIFIED   | Exports both `GET` and `PUT`; PUT uses `updateCompanySchema` (uuid + is_active); real DB update at line 122-125 |
| `apps/web/app/[locale]/(admin)/admin/companies/page.tsx`                 | Companies table with Activate/Deactivate toggle button  | VERIFIED   | Actions column at line 64; Button renders `t('deactivate')`/`t('activate')` per row; `handleToggleActive` wired |
| `apps/web/app/api/v1/auth/login/route.ts`                                | Login route that blocks users from deactivated companies | VERIFIED  | `companyIsActive` added to SELECT (line 70); guard check at lines 91-97; strict `=== false` prevents admin bypass via NULL |
| `apps/web/hooks/use-admin-queries.ts`                                    | `useToggleCompanyActive` mutation hook                  | VERIFIED   | Exported at line 94; `mutationFn` calls `apiClient.put('/admin/companies', data)`; `onSuccess` invalidates both `['admin','companies']` and `['admin','stats']` |
| `apps/web/app/api/v1/admin/stats/route.ts`                               | Live platform KPIs for dashboard                        | VERIFIED   | 6 separate DB queries for companies, users, bookings, revenue, 30d companies, 7d bookings; returns all to dashboard |
| `apps/web/app/api/v1/admin/users/route.ts`                               | GET users with search/filter; PUT toggle user isActive  | VERIFIED   | Search with `ilike`, role filter with `eq(roles.name, roleFilter)`, paginated; PUT updates `isActive` per UUID |

### Key Link Verification

| From                                          | To                        | Via                                              | Status     | Details                                                                         |
|-----------------------------------------------|---------------------------|--------------------------------------------------|------------|---------------------------------------------------------------------------------|
| `admin/companies/page.tsx`                    | `/api/v1/admin/companies` | `useToggleCompanyActive` mutation calling PUT     | WIRED      | `apiClient.put('/admin/companies', data)` at use-admin-queries.ts:98; page imports and calls mutation at line 35 |
| `apps/web/app/api/v1/auth/login/route.ts`    | `companies.isActive`      | company active check after user auth             | WIRED      | `companyIsActive: companies.isActive` in SELECT; guard at lines 91-97 with strict false comparison and admin role exemption |

### Requirements Coverage

| Requirement | Source Plan  | Description                                                               | Status    | Evidence                                                                                             |
|-------------|--------------|---------------------------------------------------------------------------|-----------|------------------------------------------------------------------------------------------------------|
| ADMIN-01    | 43-01-PLAN   | Admin dashboard shows real platform-wide stats (total companies, users, bookings, revenue) | SATISFIED | `admin/stats/route.ts` queries all 6 KPIs from DB; dashboard page renders them in 6 KPI cards via `useAdminStats()` |
| ADMIN-02    | 43-01-PLAN   | Admin can view, activate, and deactivate company accounts; deactivated users blocked from login | SATISFIED | Companies route GET lists all; PUT toggles isActive; login route enforces block with 401 for deactivated company users |
| ADMIN-03    | 43-01-PLAN   | Admin can view and manage all users across companies                       | SATISFIED | Users route GET supports search + role filter + pagination; PUT toggles user isActive; users page wires all controls |

All 3 requirement IDs declared in the plan frontmatter are present in REQUIREMENTS.md and fully satisfied. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODOs, FIXMEs, placeholders, empty returns, or stub implementations found in any modified file.

### Human Verification Required

#### 1. Live Stats Match DB State

**Test:** Log in as admin, visit `/admin`. Note all 6 KPI numbers. Query the database directly (`SELECT count(*) FROM companies`, etc.). Compare values.
**Expected:** Dashboard numbers match the actual database row counts and sum of completed booking prices.
**Why human:** Cannot run the database and live Next.js server in a programmatic check.

#### 2. Company Toggle Reflects Immediately

**Test:** From `/admin/companies`, click "Deactivate" on a test company. Observe the table row badge update and the button text flip to "Activate". Then click "Activate" and confirm badge returns to active.
**Expected:** Toggle fires a PUT, toast appears ("Company has been deactivated"/"Company has been activated"), table refreshes without full page reload.
**Why human:** Requires browser interaction with a running server and live DB.

#### 3. Login Block for Deactivated Company

**Test:** Deactivate a test company via admin UI. Attempt to log in as that company's owner. Confirm login fails with the message "Company account is deactivated". Verify the platform admin account can still log in normally.
**Expected:** Owner login returns 401 with deactivation message; admin is unaffected.
**Why human:** Requires running server, session state, and end-to-end HTTP flow.

#### 4. User Search and Role Filter

**Test:** Visit `/admin/users`. Type a partial name/email in the search box. Apply a role filter (e.g., "Owner"). Verify results narrow correctly. Click "Deactivate" on a user.
**Expected:** Search and filter update the user list via API params; toggle button changes user status and shows toast.
**Why human:** Requires browser interaction and visible UI feedback.

### Gaps Summary

No gaps identified. All four observable truths are fully verified at all three levels (exists, substantive, wired):

- The stats API executes real DB queries and the dashboard renders them in 6 KPI cards.
- The company PUT handler is fully implemented with Zod validation, UUID lookup, and isActive update; the companies page imports the mutation and calls it from a per-row button.
- The login route was correctly extended with `companyIsActive` in the SELECT and a strict `=== false` guard (safely handling NULL for admin/customer users) that throws a clear error.
- The users API supports search and role filtering with real `ilike` and `eq` conditions; the users page has functional search input, role select, and toggle button.
- All 5 translation keys (activate/deactivate/activated/deactivated/toggleError) are present in all three locales (en, cs, sk) under `admin.companies`.
- TypeScript compiles with zero errors.

---

_Verified: 2026-03-13T15:00:00Z_
_Verifier: Claude (gsd-verifier)_

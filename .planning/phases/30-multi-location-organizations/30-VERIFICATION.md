---
phase: 30-multi-location-organizations
verified: 2026-02-24T23:45:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: Log in as franchise owner, verify location switcher dropdown in header
    expected: Dropdown shows all org locations; selecting another reloads page with new context
    why_human: Visual rendering and full-page reload behavior cannot be verified programmatically
  - test: Navigate to /organization/settings, add a location, edit it, deactivate it
    expected: Add dialog creates location, edit dialog updates it, deactivate confirms then soft-disables
    why_human: Form interactions, dialog rendering, and toast notifications need visual verification
  - test: Navigate to /organization/dashboard, check per-location metrics
    expected: KPI totals row and location cards show bookings count, revenue, N/A for occupancy
    why_human: Visual layout, currency formatting, and data accuracy need human eyes
  - test: Log in as location_manager, verify org dashboard returns 403
    expected: Dashboard shows access restricted message, switcher not visible
    why_human: Role-based UI visibility requires end-to-end session testing
  - test: Navigate to /organization/customers, search for multi-location customer
    expected: Customer appears once with locations_visited badge showing count > 1
    why_human: Dedup correctness requires real multi-location customer data in DB
---

# Phase 30: Multi-Location Organizations Verification Report

**Phase Goal:** Franchise owners can manage multiple business locations under one organization, switch location context in the dashboard, and assign location-level managers.
**Verified:** 2026-02-24T23:45:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Franchise owner can create org, add locations, switch between them via dropdown; data scoped to selected location | VERIFIED | POST /api/v1/organizations creates org with plan gating. LocationSwitcher calls switchLocation which POSTs to /api/v1/auth/switch-location, receives new JWT scoped to target company, triggers window.location.reload(). switch-location/route.ts calls validateLocationAccess then generateTokenPair with targetCompanyId. |
| 2 | Franchise owner sees all locations with per-location metrics on a single screen | VERIFIED | GET /api/v1/organizations/[id]/dashboard returns per-location bookings_count, revenue_total via raw SQL. Dashboard UI page renders KPI cards plus responsive grid of location cards each showing metrics. |
| 3 | Location manager can only access assigned location | VERIFIED | validateLocationAccess in org-scope.ts throws ForbiddenError when location_manager companyId does not match target. Dashboard API throws ForbiddenError if role !== franchise_owner. Integration test verifies location_manager CANNOT switch to unassigned location. |
| 4 | Franchise owner can add, edit, deactivate locations; deactivation is soft | VERIFIED | POST locations/route.ts inserts companies with organizationId, checks limit. PUT updates fields. DELETE sets isActive=false only. Settings page has add/edit/deactivate dialogs wired to mutations. |
| 5 | Cross-location customers appear as single record via email-based dedup | VERIFIED | GET customers/route.ts uses DISTINCT ON (COALESCE(email, phone, uuid::text)) for dedup, computes locations_visited via COUNT(DISTINCT company_id). Customer page renders table with locations_visited badge. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| packages/database/src/schema/organizations.ts | VERIFIED | 81 lines, both tables with indexes, CHECK constraint, unique constraint |
| packages/shared/src/types/organization.ts | VERIFIED | 68 lines, 8 types exported and re-exported from index.ts |
| packages/database/src/schema/auth.ts (organizationId) | VERIFIED | organizationId integer column with index |
| packages/database/src/schema/relations.ts | VERIFIED | organizationsRelations + organizationMembersRelations defined |
| packages/database/src/schema/index.ts | VERIFIED | export * from ./organizations |
| packages/database/src/migrations/0002_fluffy_iceman.sql | VERIFIED | Full DDL: CREATE TABLE, ALTER TABLE, FKs, indexes |
| apps/web/app/api/v1/auth/switch-location/route.ts | VERIFIED | 84 lines, validateLocationAccess + generateTokenPair + blacklistToken |
| apps/web/lib/db/org-scope.ts | VERIFIED | 164 lines, 3 exported functions |
| apps/web/validations/organization.ts | VERIFIED | 107 lines, 7 Zod schemas plus params schemas |
| apps/web/app/api/v1/organizations/route.ts | VERIFIED | 192 lines, GET/POST with plan gating |
| apps/web/app/api/v1/organizations/[id]/route.ts | VERIFIED | 170 lines, GET/PUT with franchise_owner check |
| apps/web/app/api/v1/organizations/[id]/locations/route.ts | VERIFIED | 189 lines, GET/POST with slug uniqueness + plan limit |
| apps/web/app/api/v1/organizations/[id]/locations/[locationId]/route.ts | VERIFIED | 166 lines, PUT updates, DELETE soft-disables |
| apps/web/app/api/v1/organizations/[id]/members/route.ts | VERIFIED | 282 lines, GET/POST/DELETE with role validation |
| apps/web/app/api/v1/organizations/[id]/dashboard/route.ts | VERIFIED | 160 lines, raw SQL per-location metrics, franchise_owner only |
| apps/web/app/api/v1/organizations/[id]/customers/route.ts | VERIFIED | 210 lines, DISTINCT ON dedup, paginated, franchise_owner only |
| apps/web/components/layout/location-switcher.tsx | VERIFIED | 114 lines, React Query + DropdownMenu + switchLocation + reload |
| apps/web/app/[locale]/(dashboard)/organization/page.tsx | VERIFIED | 279 lines, create CTA + overview + stats + location grid |
| apps/web/app/[locale]/(dashboard)/organization/settings/page.tsx | VERIFIED | 860 lines, LocationsSection + MembersSection with full CRUD |
| apps/web/app/[locale]/(dashboard)/organization/dashboard/page.tsx | VERIFIED | 298 lines, KPI cards + location grid + 403 handling |
| apps/web/app/[locale]/(dashboard)/organization/customers/page.tsx | VERIFIED | 297 lines, debounced search + paginated table + dedup badges |
| apps/web/stores/auth.store.ts (switchLocation) | VERIFIED | switchLocation action + organizationId in User interface |
| apps/web/lib/navigation.ts | VERIFIED | Organization nav item with Building2 icon, roles [owner] |
| apps/web/lib/middleware/rbac.ts | VERIFIED | ORGANIZATIONS_MANAGE + ORGANIZATIONS_READ constants |
| tests/integration/auth/switch-location.test.ts | VERIFIED | 391 lines, 10 test cases covering all security boundaries |
| tests/integration/helpers/seed-helpers.ts | VERIFIED | seedOrganization + seedOrganizationMember exported |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| location-switcher.tsx | switch-location/route.ts | POST /api/v1/auth/switch-location | WIRED |
| location-switcher.tsx | auth.store.ts | useAuthStore + switchLocation | WIRED |
| header.tsx | location-switcher.tsx | Component import + render | WIRED |
| switch-location/route.ts | org-scope.ts | validateLocationAccess | WIRED |
| switch-location/route.ts | jwt.ts | generateTokenPair + blacklistToken | WIRED |
| organizations/route.ts | org-scope.ts | findOrganizationForUser | WIRED |
| dashboard/route.ts | org-scope.ts | findOrganizationCompanyIds | WIRED |
| customers/route.ts | org-scope.ts | findOrganizationCompanyIds | WIRED |
| locations/route.ts | companies table | organizationId in insert | WIRED |
| [locationId]/route.ts | companies table | soft-deactivation (isActive=false) | WIRED |
| settings/page.tsx | location APIs | CRUD mutations (POST/PUT/DELETE) | WIRED |
| settings/page.tsx | member APIs | CRUD mutations (POST/DELETE) | WIRED |
| dashboard/page.tsx | dashboard API | React Query fetch | WIRED |
| customers/page.tsx | customers API | React Query fetch | WIRED |

### Requirements Coverage

| Requirement | Status |
|-------------|--------|
| ORG-01: Organizations table linking companies | SATISFIED |
| ORG-02: Location switcher with JWT switch | SATISFIED |
| ORG-03: Organization-level RBAC roles | SATISFIED |
| ORG-04: Organization dashboard with metrics | SATISFIED |
| ORG-05: Cross-location customer visibility | SATISFIED |
| ORG-06: Location CRUD from organization settings | SATISFIED |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| dashboard/route.ts | 146 | occupancy_percent: null (Phase 31) | Info | Documented intentional null; occupancy deferred to analytics phase |

No TODO, FIXME, placeholder, or stub patterns found in any Phase 30 files.

### Human Verification Required

#### 1. Location Switcher Visual and Functional Test
**Test:** Log in as a franchise owner with 2+ locations. Verify the location switcher dropdown appears in the dashboard header.
**Expected:** Dropdown shows org name, separator, all locations with check icon on current. Selecting a different location reloads the page with new company context.
**Why human:** Visual rendering, dropdown behavior, full-page reload with JWT swap cannot be verified without a running browser session.

#### 2. Organization Settings CRUD Test
**Test:** Navigate to /organization/settings. Add a new location, edit an existing location, and deactivate a location.
**Expected:** Add dialog creates location with all fields. Edit dialog updates fields. Deactivate shows confirmation then marks location inactive. Location count updates.
**Why human:** Dialog rendering, form validation feedback, toast notifications, and table updates require visual verification.

#### 3. Organization Dashboard Metrics Test
**Test:** Navigate to /organization/dashboard as a franchise owner.
**Expected:** Three KPI cards (Total Bookings, Total Revenue in CZK, Active Locations). Responsive grid of location cards each showing bookings count, revenue, occupancy (N/A), and Switch to location button.
**Why human:** Visual layout, CZK currency formatting, and data accuracy against actual DB records need human eyes.

#### 4. Location Manager Access Restriction Test
**Test:** Log in as a location_manager assigned to one location. Navigate to /organization/dashboard and /organization/customers.
**Expected:** Dashboard shows access restricted message. Customer search shows restriction. Location switcher not visible.
**Why human:** Role-based visibility requires end-to-end session testing with different user accounts.

#### 5. Cross-Location Customer Dedup Test
**Test:** Navigate to /organization/customers. Search for a customer who visited multiple locations.
**Expected:** Customer appears as a single row with blue badge showing N locations where N > 1. Pagination works.
**Why human:** Dedup correctness and badge rendering require real multi-location customer data in the database.

### Gaps Summary

No code-level gaps found. All 5 observable truths are verified with complete implementations across 25+ artifacts. All key links are fully wired. All 6 requirements (ORG-01 through ORG-06) are satisfied by the codebase.

The only outstanding item is human verification of the visual UI, which cannot be tested programmatically. The occupancy_percent returning null in the dashboard API is documented and expected (deferred to Phase 31 Analytics).

The integration test suite (10 test cases) provides strong confidence in the security boundary: cross-org switch rejection, location_manager scope enforcement, and edge case handling are all programmatically tested at the DB level.

---

_Verified: 2026-02-24T23:45:00Z_
_Verifier: Claude (gsd-verifier)_

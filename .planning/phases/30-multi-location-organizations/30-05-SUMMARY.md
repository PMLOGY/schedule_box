---
phase: 30-multi-location-organizations
plan: 05
subsystem: api, ui
tags: [organization, dashboard, metrics, customer-dedup, cross-location, react-query, drizzle, raw-sql]

# Dependency graph
requires:
  - phase: 30-01
    provides: organizations + organization_members tables, companies.organizationId FK
  - phase: 30-02
    provides: validateLocationAccess, switch-location JWT endpoint
  - phase: 30-04
    provides: location switcher dropdown, org overview page, org settings page
provides:
  - GET /api/v1/organizations/[id]/dashboard with per-location bookings + revenue metrics
  - GET /api/v1/organizations/[id]/customers with email-based dedup and locations_visited count
  - Organization dashboard UI with KPI cards and location grid
  - Cross-location customer search UI with debounced search, pagination, dedup badges
  - Sub-navigation across org pages (overview, dashboard, customers, settings)
affects: [31-analytics, customer-crm, reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Raw SQL via Drizzle db.execute() for cross-company aggregation queries'
    - 'DISTINCT ON (COALESCE(email, phone, uuid::text)) for email-based customer dedup'
    - 'Array.from() to convert Drizzle RowList to standard array'
    - 'useDebouncedValue custom hook for search input (300ms delay)'
    - 'Paginated API response pattern for org-scoped customer queries'

key-files:
  created:
    - apps/web/app/api/v1/organizations/[id]/dashboard/route.ts
    - apps/web/app/api/v1/organizations/[id]/customers/route.ts
    - apps/web/app/[locale]/(dashboard)/organization/dashboard/page.tsx
    - apps/web/app/[locale]/(dashboard)/organization/customers/page.tsx
  modified:
    - apps/web/app/[locale]/(dashboard)/organization/page.tsx
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - 'Raw SQL via db.execute() for cross-company dashboard metrics (correlated subqueries per company avoid N+1)'
  - 'DISTINCT ON (COALESCE(email, phone, uuid::text)) dedup: email preferred, phone fallback, uuid as unique last resort'
  - 'Occupancy percent returned as null with documentation note: to be refined in Phase 31 Analytics'
  - 'Payment status filtered as paid (not completed) matching payments.status schema CHECK constraint'
  - 'Franchise owner only access on both dashboard and customer APIs (location_manager gets 403)'
  - 'Sub-navigation added to all org pages via action buttons (dashboard, customers, settings)'

patterns-established:
  - 'Org-scoped raw SQL pattern: findOrganizationCompanyIds() then ANY($companyIds) in raw SQL'
  - 'Cross-location dedup: DISTINCT ON with COALESCE fallback chain for customer identity'
  - 'useDebouncedValue hook for search input debouncing in client components'

# Metrics
duration: 12min
completed: 2026-02-24
---

# Phase 30 Plan 05: Organization Dashboard and Cross-Location Customers Summary

**Per-location metrics dashboard with KPI cards and cross-location customer search with email-based deduplication using DISTINCT ON**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-24T21:53:24Z
- **Completed:** 2026-02-24T22:05:51Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Organization dashboard API returns per-location bookings count and revenue for current month, plus org-level aggregates
- Cross-location customer API deduplicates by email/phone with locations_visited count per customer
- Dashboard UI shows 3 KPI totals cards + responsive location grid with per-location metrics and "switch to location" button
- Customer search UI with debounced input (300ms), paginated table, and locations-visited badges (blue for >1, gray for 1)
- Sub-navigation connecting all organization pages (overview, dashboard, customers, settings) via action buttons
- All translations added for cs/en/sk locales

## Task Commits

Each task was committed atomically:

1. **Task 1: Organization dashboard API and cross-location customer API** - `fc5d478` (feat)
2. **Task 2: Organization dashboard UI and cross-location customer search UI** - `3c5c2e0` (feat)

## Files Created/Modified

- `apps/web/app/api/v1/organizations/[id]/dashboard/route.ts` - GET endpoint for per-location bookings + revenue metrics
- `apps/web/app/api/v1/organizations/[id]/customers/route.ts` - GET endpoint for cross-location customer search with email dedup
- `apps/web/app/[locale]/(dashboard)/organization/dashboard/page.tsx` - Organization dashboard UI with KPI cards and location grid
- `apps/web/app/[locale]/(dashboard)/organization/customers/page.tsx` - Cross-location customer search with debounce, pagination, dedup badges
- `apps/web/app/[locale]/(dashboard)/organization/page.tsx` - Added sub-navigation to dashboard/customers/settings
- `apps/web/messages/en.json` - English translations for dashboard and customers sections
- `apps/web/messages/cs.json` - Czech translations for dashboard and customers sections
- `apps/web/messages/sk.json` - Slovak translations for dashboard and customers sections

## Decisions Made

- Used raw SQL via `db.execute()` for cross-company dashboard metrics since correlated subqueries per company are more efficient than N+1 Drizzle queries
- DISTINCT ON (COALESCE(email, phone, uuid::text)) dedup strategy: email is primary key, phone is fallback, uuid ensures customers without both email and phone are treated as unique
- Occupancy percent is returned as null (documented as "to be refined in Phase 31 Analytics") since computing it accurately requires working_hours schedule data which is complex
- Payment status filtered as `paid` (matching the payments.status CHECK constraint) not `completed` (which is a booking status)
- Both dashboard and customer APIs restricted to franchise_owner only (location_manager gets 403 ForbiddenError)
- Array.from() used to convert Drizzle RowList (which does not have .rows) to standard array

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Drizzle RowList access pattern**

- **Found during:** Task 1 (Dashboard API)
- **Issue:** Plan suggested `.rows` property on db.execute() result but Drizzle RowList is array-like without .rows
- **Fix:** Used Array.from() to convert RowList to standard array
- **Files modified:** dashboard/route.ts, customers/route.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** fc5d478 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed unused imports causing ESLint errors**

- **Found during:** Task 1 (Dashboard API)
- **Issue:** Imported companies, bookings, payments from @schedulebox/database but raw SQL doesn't reference Drizzle schema objects
- **Fix:** Removed unused imports (companies, bookings, payments)
- **Files modified:** dashboard/route.ts
- **Verification:** ESLint passes, commit succeeds
- **Committed in:** fc5d478 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed payment status filter from 'completed' to 'paid'**

- **Found during:** Task 1 (Dashboard API)
- **Issue:** Plan used payments.status = 'completed' but payments CHECK constraint uses 'paid' (completed is a booking status)
- **Fix:** Used status = 'paid' in revenue query
- **Files modified:** dashboard/route.ts
- **Verification:** Matches payments schema CHECK constraint values
- **Committed in:** fc5d478 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Organization dashboard and customer CRM complete for franchise owners
- Ready for Phase 31 Analytics (occupancy calculation can be built on top of the existing dashboard API)
- All org pages connected via sub-navigation
- Remaining Phase 30 plans (if any) can build on the established org-scope raw SQL pattern

---

_Phase: 30-multi-location-organizations_
_Completed: 2026-02-24_

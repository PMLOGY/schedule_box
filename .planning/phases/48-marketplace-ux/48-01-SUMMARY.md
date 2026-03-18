---
phase: 48-marketplace-ux
plan: 01
subsystem: ui
tags: [react, next-intl, tanstack-query, drizzle, marketplace, geolocation, glassmorphism]

requires:
  - phase: 47-notifications-super-admin
    provides: platform infrastructure and auth patterns

provides:
  - Public marketplace browse with debounced search, category/city/geo filters
  - Featured businesses carousel (horizontal snap scroll, primary border accent)
  - Grid/list toggle with glass cards and horizontal row layouts
  - Sort by rating, distance, featured, name
  - company_slug in API response (LEFT JOIN companies) for firm detail links
  - Extended MarketplaceListing and MarketplaceListingsParams types
  - 'featured' sort option in shared sortByEnum schema

affects:
  - 48-02 firm detail page (uses company_slug for navigation)
  - Any future plan reading marketplace listings types

tech-stack:
  added: []
  patterns:
    - Debounced search via useRef/setTimeout (300ms), no external lib
    - Collapsible filter panel as Card variant glass
    - Geolocation via navigator.geolocation.getCurrentPosition with fail-safe
    - Featured carousel as overflow-x-auto snap-x snap-mandatory
    - Grid/list toggle as icon button pair with border wrap

key-files:
  created: []
  modified:
    - packages/shared/src/schemas/marketplace.ts
    - apps/web/app/api/v1/marketplace/listings/route.ts
    - apps/web/hooks/use-marketplace-query.ts
    - apps/web/app/[locale]/(dashboard)/marketplace/page.tsx

key-decisions:
  - "company_slug added via LEFT JOIN companies in both geo and non-geo route branches"
  - "Featured sort: featured DESC, averageRating DESC in both route branches"
  - "Legacy MarketplaceListing fields kept as optional for MyListing tab backward compat"
  - "Distance sort disabled in sort dropdown when geo is not active"
  - "Featured carousel only rendered when featuredListings.length > 0"

patterns-established:
  - "Debounced search: useRef<ReturnType<typeof setTimeout>> + 300ms clearTimeout/setTimeout in useEffect"
  - "Geo filter: navigator.geolocation.getCurrentPosition sets lat/lng/radius_km state"
  - "Radius slider: range input min=1 max=50 updates geo state inline"

requirements-completed: [MKT-01, MKT-02, MKT-05, MKT-06]

duration: 20min
completed: 2026-03-18
---

# Phase 48 Plan 01: Marketplace Search & Filter Summary

**Public marketplace browse with debounced search, category/city/geo radius filters, featured carousel, grid/list toggle, and company_slug links to firm detail pages**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-18T17:26:00Z
- **Completed:** 2026-03-18T17:46:21Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended shared `sortByEnum` to include `'featured'` and wired featured sort in both API branches (geo + non-geo)
- Added `company_slug` to both route branches via LEFT JOIN on companies table
- Rewrote marketplace browse tab with full search/filter UX: debounced search, collapsible filter panel (category, city, sort, geolocation radius), grid/list toggle
- Featured carousel renders above results with horizontal snap scrolling and primary border accent when featured listings exist
- Featured badge (Sparkles icon) and Verified badge (CheckCircle icon) on cards in both grid and list views
- Card click routes to `/${locale}/${company_slug}` for firm detail navigation

## Task Commits

1. **Task 1: Extend API + shared schema for featured sort and company slug** — included in `f4f726a` (feat)
2. **Task 2: Build marketplace search/filter UI with grid/list toggle and featured carousel** — included in `f4f726a` (feat)

Both tasks committed together as they were part of the same logical change set.

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/shared/src/schemas/marketplace.ts` — Added `'featured'` to `sortByEnum`
- `apps/web/app/api/v1/marketplace/listings/route.ts` — Added company_slug (LEFT JOIN), featured sort in both branches
- `apps/web/hooks/use-marketplace-query.ts` — Extended MarketplaceListing + MarketplaceListingsParams types with all API fields
- `apps/web/app/[locale]/(dashboard)/marketplace/page.tsx` — Full rewrite of browse tab with search, filters, carousel, grid/list

## Decisions Made

- `company_slug` added via LEFT JOIN on companies table (not a separate API call) — single query, consistent in both geo and non-geo paths
- Legacy `MarketplaceListing` fields (`company_name`, `rating`, `is_visible`, etc.) kept as optional to avoid breaking the MyListing tab that expects them
- Distance sort option disabled in dropdown when geo is not active (no lat/lng)
- Featured carousel is conditionally rendered only when `featuredListings.length > 0`
- Used `'/' + locale + '/' + company_slug` string concatenation in onClick handlers to avoid template literal issues during file write

## Deviations from Plan

None — plan executed exactly as written. Both tasks (API extension and UI rewrite) completed in a single commit due to their interdependence (the page depends on the extended hook types which depend on the API changes).

## Issues Encountered

- File write tool required multiple attempts due to linter auto-modifying files between read and write; used the Write tool after reading fresh state
- Bash heredoc approach failed for JSX files with backtick template literals; used the Write tool directly

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Marketplace browse is fully functional; firm detail page (`48-02`) can now receive traffic from card clicks via `company_slug`
- All filter params (city, lat, lng, radius_km, sort_by) pass through to API
- Featured businesses will appear in carousel once `featured=true` is set on their listings

---

_Phase: 48-marketplace-ux_
_Completed: 2026-03-18_

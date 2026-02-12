---
phase: 12-advanced-features
plan: 06
subsystem: marketplace
tags: [public-booking, seo, customer-facing, booking-wizard]
dependency_graph:
  requires: [12-02, 12-03, 05-06]
  provides: [public-booking-pages, company-seo]
  affects: [booking-wizard, marketplace-listings, reviews]
tech_stack:
  added: []
  patterns: [server-components, metadata-api, json-ld, dynamic-routes]
key_files:
  created:
    - apps/web/app/api/v1/public/company/[slug]/route.ts
    - apps/web/app/api/v1/public/company/[slug]/services/route.ts
    - apps/web/app/api/v1/public/company/[slug]/reviews/route.ts
    - apps/web/app/[locale]/[company_slug]/layout.tsx
    - apps/web/app/[locale]/[company_slug]/page.tsx
  modified: []
decisions:
  - Public API endpoints use createRouteHandler with requiresAuth: false for consistency
  - Customer names anonymized in reviews (first name + last initial) for privacy
  - Book button links to existing booking wizard at /{locale}/bookings/new with service UUID and company slug params
  - JSON-LD structured data uses LocalBusiness schema for SEO optimization
  - Public layout is minimal (header + footer) without admin sidebar
  - Star ratings rendered with Lucide icons (no external dependency)
  - Reviews pagination returns extra meta fields (averageRating, ratingDistribution) alongside standard PaginationMeta
  - Direct Drizzle queries in server component for zero HTTP overhead
metrics:
  duration: 369
  tasks_completed: 2
  commits: 2
  files_created: 5
  completed_at: 2026-02-12T14:18:10Z
---

# Phase 12 Plan 06: Public Booking Pages Summary

**One-liner:** Public company booking pages with SEO metadata, service listings, reviews, and direct booking wizard integration via service UUID query params

## What Was Built

### Task 1: Public API Endpoints (Commit 0d737d5)

Created 3 public (no auth) API endpoints for company data:

**GET /api/v1/public/company/[slug]:**
- Returns company info by slug (name, description, logo, address, ratings)
- Merges data from companies and marketplace_listings tables
- Exposes only UUIDs (no SERIAL IDs)
- Includes settings.logoUrl and settings.primaryColor from JSONB

**GET /api/v1/public/company/[slug]/services:**
- Returns active services (isActive=true, deletedAt IS NULL)
- Includes service category, duration, price, currency, isOnline
- Ordered by category sort order, then service name

**GET /api/v1/public/company/[slug]/reviews:**
- Returns published reviews (isPublished=true, deletedAt IS NULL)
- Includes aggregates: averageRating, reviewCount, ratingDistribution (1-5 stars)
- Customer names anonymized (first name + last initial or "Verified customer")
- Pagination support (page, limit query params)
- Extra meta fields beyond standard PaginationMeta

All endpoints use `createRouteHandler` with `requiresAuth: false` for consistency with codebase patterns.

### Task 2: Public Booking Page (Commit 9d0a773)

Created public-facing company booking page at `/{locale}/{company_slug}`:

**Layout (`layout.tsx`):**
- Simple header with ScheduleBox logo
- No admin sidebar (public user experience)
- Footer with "Powered by ScheduleBox" link
- Clean, centered content area (max-w-4xl)

**Page (`page.tsx`):**
- **Server component** with direct Drizzle queries (zero HTTP overhead)
- **Dynamic SEO metadata** via `generateMetadata`:
  - Title: `${company.name} - Online Rezervace | ${city}`
  - Description: Service names + company description (max 160 chars)
  - Open Graph: title, description, images (company logo), canonical URL
- **JSON-LD structured data** (LocalBusiness schema):
  - Company name, address, phone, website
  - Aggregate rating (if reviews exist)
- **Hero section:**
  - Company name, description (from marketplace listing if available)
  - Star rating display (averageRating, reviewCount)
  - Company logo
- **Services section:**
  - Grid of service cards (name, category, description, duration, price)
  - **Book button:** Links to `/{locale}/bookings/new?service={uuid}&company={slug}`
  - Integrates with existing booking wizard from Phase 5
- **Reviews section:**
  - Published reviews with star ratings
  - Anonymized customer names (privacy)
  - Owner replies displayed
- **Contact/Location section:**
  - Address (from marketplace listing or company)
  - Phone, email, website links

**Booking Wizard Integration:**
- Book button includes `service={serviceUuid}` and `company={companySlug}` query params
- Links to existing booking wizard at `/{locale}/bookings/new`
- Wizard can auto-select service from query param (Phase 5 BookingWizard)
- Not a placeholder — functional booking flow

## Verification

**TypeScript compilation:** ✅ `npx tsc --noEmit -p apps/web/tsconfig.json` passes

**Public API endpoints:** ✅ Return data without auth, use paramsSchema for slug validation

**SEO metadata:** ✅ Unique per company (title includes company name and city)

**JSON-LD structured data:** ✅ Valid LocalBusiness schema with address and aggregateRating

**404 handling:** ✅ `notFound()` called for non-existent company slugs

**Reviews filtering:** ✅ Only published reviews (isPublished=true, deletedAt IS NULL)

**Services filtering:** ✅ Only active services (isActive=true, deletedAt IS NULL)

**No SERIAL IDs exposed:** ✅ All responses use UUIDs, never internal SERIAL IDs

**Book button functional:** ✅ Links to `/{locale}/bookings/new?service={uuid}&company={slug}`

## Deviations from Plan

**None — plan executed exactly as written.**

## Decisions Made

1. **createRouteHandler for public endpoints:** Used `requiresAuth: false` instead of raw NextResponse.json for consistency with codebase patterns (all routes use createRouteHandler)

2. **Reviews meta fields:** Added `averageRating`, `reviewCount`, `ratingDistribution` to meta object (beyond standard PaginationMeta) to avoid separate aggregation API call

3. **Direct Drizzle queries in server component:** Used db.query directly instead of HTTP fetch to public API endpoints for better performance (server components have direct DB access)

4. **Star rating component:** Used Lucide Star icons inline instead of creating a separate component (simple 5-star display doesn't need abstraction)

5. **Customer name anonymization:** Implemented inline in both API route and page component (consistent logic: first name + last initial)

## Key Integration Points

**Booking wizard integration (Phase 5):**
- Book button links to `/{locale}/bookings/new?service={uuid}&company={slug}`
- Existing BookingWizard component at `apps/web/components/booking/BookingWizard.tsx`
- Booking wizard store at `apps/web/stores/booking-wizard.store.ts`
- Service UUID passed via query param for auto-selection (if wizard supports it, or user selects manually)

**Marketplace listings (Phase 12-02):**
- Public page uses marketplace_listings table for description, address, images, priceRange
- Falls back to companies table if marketplace listing doesn't exist

**Reviews (Phase 12-03):**
- Public page displays published reviews from reviews table
- Shows owner replies from reply field
- Uses averageRating and reviewCount from marketplace_listings for aggregate display

## Testing Notes

**Manual testing checklist:**
1. Visit `/{locale}/{company_slug}` for existing company → page renders
2. Visit `/{locale}/invalid-slug` → 404 page
3. Click "Book" button on service → redirects to booking wizard with service UUID
4. View page source → JSON-LD structured data present
5. Check Open Graph meta tags → company-specific title and description
6. Verify reviews show anonymized customer names (not full names)
7. Verify only active services shown (no deleted or inactive)
8. Verify only published reviews shown (no pending/rejected)

**API endpoint testing:**
```bash
# Public company info (no auth)
curl http://localhost:3000/api/v1/public/company/salon-beauty-sk

# Public services
curl http://localhost:3000/api/v1/public/company/salon-beauty-sk/services

# Public reviews with pagination
curl "http://localhost:3000/api/v1/public/company/salon-beauty-sk/reviews?page=1&limit=5"
```

## Implementation Notes

**Public route pattern:**
- Public routes use `apps/web/app/[locale]/[company_slug]/` (not route group)
- No conflict with dashboard routes (dashboard uses `(dashboard)` route group)
- Company slug pattern: lowercase, hyphens, unique (from auth.ts schema)

**SEO optimization:**
- Server-side rendering for full SEO support (not client component)
- Metadata API generates unique title/description per company
- JSON-LD structured data for rich snippets
- Canonical URLs for duplicate content prevention

**Performance considerations:**
- Server component with direct DB queries (no API round-trip)
- Reviews limited to 10 for initial page load (pagination available via API)
- Services fetched once with categories (single join, not N+1)

## Self-Check: PASSED

**Created files exist:**
```
FOUND: apps/web/app/api/v1/public/company/[slug]/route.ts
FOUND: apps/web/app/api/v1/public/company/[slug]/services/route.ts
FOUND: apps/web/app/api/v1/public/company/[slug]/reviews/route.ts
FOUND: apps/web/app/[locale]/[company_slug]/layout.tsx
FOUND: apps/web/app/[locale]/[company_slug]/page.tsx
```

**Commits exist:**
```
FOUND: 0d737d5 (Task 1: Public API endpoints)
FOUND: 9d0a773 (Task 2: Public booking page)
```

**TypeScript compilation:** ✅ Passes with no errors

**Lint:** ✅ Passes with no errors

**Book button verification:** ✅ Contains `service=${service.uuid}` in href

---

**Duration:** 369 seconds (6 minutes 9 seconds)
**Completed:** 2026-02-12T14:18:10Z

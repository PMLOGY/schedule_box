# Phase 48: Marketplace & UX - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Public marketplace page where customers discover businesses with search, filtering (category, city, geolocation radius), and sorting. Enhanced firm detail pages with photos, reviews, map, and direct booking link. Improved owner booking management via modal/drawer with real-time 30s polling updates. Video meeting management settings page and API webhooks management page for owners.

</domain>

<decisions>
## Implementation Decisions

### Marketplace Search & Filtering

- Search bar with collapsible filter panel — search always visible, filters expand on demand
- Filter panel includes: category, city, geolocation radius
- Geolocation: Claude's discretion on approach (text input with geocoding vs map preview — pick simplest that meets radius filtering requirement)
- Results display: toggle between grid and list view (user can switch)
- Grid: responsive cards (3 cols desktop, 2 tablet, 1 mobile) with logo/photo, name, category, rating, city, price range
- List: horizontal rows with photo left, info right
- Featured businesses: horizontal scroll carousel at top of results + "Featured" badge on cards in normal results
- Sort options: rating, distance, featured status

### Firm Detail Page

- Enhance existing `/{locale}/{slug}` page (not a separate /marketplace page) — single source of truth
- Add: photo gallery, map embed, featured badge, enhanced reviews display
- Map embed: Claude's discretion (static tile vs interactive Leaflet — pick what balances UX and simplicity)
- Photo gallery: Claude's discretion (use data from marketplace_listings JSONB if available, placeholder if no photos exist)
- "Book Now" button links directly to `/{slug}/book` (existing booking wizard)

### Booking Modal & Real-time UX

- Booking detail: Claude's discretion on Sheet vs Dialog (existing BookingDetailPanel uses Sheet with status actions — keep or switch based on what best fits "modal/drawer" requirement)
- Status actions (confirm/cancel/complete/no-show) execute from within the panel without navigating away
- After action: Claude's discretion (stay open with updated status vs close — pick most natural UX)
- Auto-refresh: 30s TanStack Query polling (already decided in v3.0 — refetchInterval: 30_000)
- "Last updated X seconds ago" indicator: Claude's discretion on placement (top-right of table vs floating bar — pick cleanest)
- New bookings highlighted with brief blue/glass glow animation (3-5 seconds) using existing motion library

### Video Meeting Management

- Dedicated settings sub-page: Settings > Video Meetings
- Custom link only — owner pastes any meeting URL (Zoom, Teams, Meet, etc.), stored and attached to bookings
- No direct API integration with video providers (no OAuth flows)
- Video link automatically included in booking confirmation emails (when Phase 47 notifications active)
- List of upcoming meetings linked to bookings visible on the page

### Webhooks Management

- Dedicated settings sub-page: Settings > Webhooks
- Event types: booking events (created, confirmed, cancelled, completed, no_show) + payment events (received, refunded)
- Full request/response delivery log — timestamp, event type, URL, HTTP status, response time, request/response body (truncated), expandable for full detail (Stripe-like)
- Test button: sends sample booking.created event with fake data, shows response inline
- Auto-generated HMAC secret per endpoint (SHA-256 signature verification) — secret shown once on creation, revealable in settings
- 3 retries with exponential backoff on delivery failure (1min, 5min, 30min) — marked "failed" after all retries exhausted
- Limit: 5 webhook endpoints per company

### Claude's Discretion

- Geolocation input approach (text + geocoding vs text + map preview)
- Map embed implementation (static tile image vs interactive Leaflet)
- Photo gallery display approach (based on available data model)
- Booking detail panel type (keep Sheet or switch to Dialog)
- Auto-refresh indicator placement
- Post-action behavior (panel stays open or closes)
- Exact animation timing and styling for new booking highlights

</decisions>

<specifics>
## Specific Ideas

- Featured carousel at top of marketplace results — horizontal scrolling, like an app store featured section
- Webhook delivery log modeled after Stripe's webhook logs — expandable rows with full request/response detail
- Grid/list toggle for marketplace results — let users choose their preferred browsing style
- Video links included in booking confirmation emails for seamless online consultation experience
- New booking glow animation should feel subtle and premium — not flashy

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `apps/web/app/[locale]/(dashboard)/marketplace/page.tsx`: Existing marketplace page with browse/my-listing tabs — enhance with search/filter
- `apps/web/hooks/use-marketplace-query.ts`: TanStack Query hooks for listings (staleTime: 60_000) — extend with search/filter params
- `apps/web/app/[locale]/[company_slug]/page.tsx`: Server component with company hero, services grid, reviews, JSON-LD — enhance with photos/map
- `apps/web/components/booking/BookingDetailPanel.tsx`: Sheet-based detail with status actions and useMutation — polish/enhance
- `apps/web/components/booking/BookingStatusBadge.tsx`: Color-coded glass status badges — reuse
- `apps/web/components/shared/data-table.tsx`: TanStack react-table with sorting, pagination, loading/error/empty states, onRowClick — reuse for webhook logs
- `apps/web/components/ui/sheet.tsx`: Radix-based slide-over panel — used by BookingDetailPanel
- `apps/web/components/ui/dialog.tsx`: Radix-based centered modal with glass-surface-heavy styling
- `apps/web/app/api/v1/marketplace/listings/route.ts`: GET listings with pagination/search — extend with geo/category/city filters
- `apps/web/app/api/v1/video/meetings/route.ts`: Video meeting CRUD with provider factory — extend
- `apps/web/app/api/v1/webhooks/`: Existing payment/tracking webhooks — patterns to follow
- `apps/web/app/api/v1/monitoring/webhook-stats/route.ts`: Webhook statistics endpoint — reuse patterns

### Established Patterns

- TanStack Query: `useQuery` with `refetchInterval` for auto-refresh (existing in AI insights, billing, usage queries)
- Mutations: `useMutation` + `queryClient.invalidateQueries` for data updates
- Glass UI: `variant="glass"` on Card, Dialog components — use throughout
- Settings pages: existing settings structure with sub-pages — add Video Meetings and Webhooks
- API routes: Zod validation on input, auth middleware, standardized error responses
- Database: marketplace_listings table exists, video_meetings table exists
- Public pages: `/{locale}/{slug}` pattern for company profiles

### Integration Points

- Sidebar navigation: add Video Meetings and Webhooks links under Settings section
- Marketplace listings API: add query params for category, city, lat/lng/radius
- Company profile page: add photo gallery section, map embed section
- Booking list page: add refetchInterval: 30_000, "last updated" indicator
- BookingDetailPanel: ensure actions don't navigate away
- Settings routes: new pages at `/(dashboard)/settings/video-meetings` and `/(dashboard)/settings/webhooks`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 48-marketplace-ux_
_Context gathered: 2026-03-18_

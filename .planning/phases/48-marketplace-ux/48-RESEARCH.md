# Phase 48: Marketplace & UX - Research

**Researched:** 2026-03-18
**Domain:** Next.js App Router, TanStack Query, Drizzle ORM, React + glassmorphism UI
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Search bar always visible, filters expand on demand (collapsible panel)
- Filter panel: category, city, geolocation radius
- Grid (3/2/1 cols) + list toggle; featured carousel at top; Featured badge on cards
- Sort options: rating, distance, featured status
- Enhance existing `/{locale}/{slug}` page — single source of truth for firm detail
- Firm detail: photo gallery, map embed, featured badge, enhanced reviews
- "Book Now" links to `/{locale}/{slug}/book` (existing wizard)
- Booking detail uses existing Sheet (BookingDetailPanel) — keep Sheet approach
- Status actions (confirm/cancel/complete/no-show) execute inside the panel without navigation
- Auto-refresh: 30s TanStack Query `refetchInterval: 30_000`
- "Last updated X seconds ago" indicator visible
- New bookings: brief blue/glass glow animation (3-5 seconds) via existing motion library
- Video meeting page: Settings > Video Meetings — custom URL only, no OAuth
- Video links included in confirmation emails (Phase 47 activated)
- Webhooks page: Settings > Webhooks — booking + payment events, full delivery log
- HMAC-SHA256 secret per endpoint; 3 retries with exponential backoff; 5 endpoints max
- Webhook log: Stripe-like expandable rows with request/response body

### Claude's Discretion

- Geolocation input approach (text geocoding vs text + map preview)
- Map embed implementation (static tile vs interactive Leaflet)
- Photo gallery display approach (based on available data model)
- Auto-refresh indicator placement (top-right of table vs floating bar)
- Post-action behavior (panel stays open with updated status vs closes)
- Exact animation timing and styling for new booking highlights

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                    | Research Support                                                                                      |
| ------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| MKT-01 | Public marketplace page at /marketplace with full-text search across firms     | Existing page + API exist; extend MarketplaceListingsParams with city/geo; add collapsible filter UI  |
| MKT-02 | Filter by category, subcategory, city, and geolocation radius                  | API already supports category/city/lat/lng/radius_km params; frontend hook needs new params           |
| MKT-03 | Firm detail page with description, photos, reviews, services list, and map     | Existing `/{locale}/{slug}` page has reviews + services; add photo gallery + map section              |
| MKT-04 | Direct booking from marketplace firm profile (links to existing booking wizard) | "Book Now" button already links to `/{locale}/{slug}/book`; confirm it's wired correctly              |
| MKT-05 | Premium listing placement for AI-Powered tier (featured flag)                  | `featured` boolean column exists on `marketplace_listings`; need featured carousel + badge            |
| MKT-06 | Sort by average rating, distance, and featured status                          | API supports `sort_by: 'rating' | 'distance' | 'name'`; add `featured` sort option to enum + backend |
| UX-01  | Booking detail opens in modal/drawer                                           | `BookingDetailPanel` (Sheet) already exists and works; already integrated in bookings page            |
| UX-02  | Status changes via modal actions                                               | `BookingDetailPanel` already has confirm/cancel/complete/no-show buttons; fix post-action close       |
| UX-03  | Real-time 30s polling                                                          | Add `refetchInterval: 30_000` to `useBookingsQuery`; add "last updated" timestamp indicator           |
| UX-04  | Video meetings management UI page                                              | New settings sub-page; existing `/api/v1/video/meetings` endpoint; DB schema ready                    |
| UX-05  | Webhooks settings UI page                                                      | New settings sub-page + new DB table + new API routes; full CRUD + delivery log                       |

</phase_requirements>

---

## Summary

Phase 48 is a feature-rich but largely additive phase — most of the heavy lifting is already done at the API and DB layers. The marketplace listings API (`/api/v1/marketplace/listings`) already handles category, city, lat/lng, radius, and sort filtering. The firm detail page already renders reviews and services. The `BookingDetailPanel` (Sheet component) already has status-action mutations. What is missing is: the UI wiring for filters/sort/carousel/map/photos on the frontend, the `refetchInterval` + timestamp on bookings, and two completely new settings sub-pages (Video Meetings, Webhooks).

The most complex new work is the **Webhooks settings page**, which requires a new DB table (`webhook_endpoints`), new API routes (CRUD + test + delivery log), HMAC secret generation, retry-with-backoff delivery logic, and a Stripe-like expandable log UI. This is the only genuinely new backend surface in the phase.

The **video meetings page** is simpler: the DB schema and API already exist but were designed for OAuth-based video providers. Since CONTEXT.md locks custom-URL-only (paste any Zoom/Teams/Meet link), the new page needs to bypass the existing provider factory and instead store a free-form URL. This requires a minor schema/API adaptation — or a separate simpler API route that stores custom URLs without provider validation.

**Primary recommendation:** Plan the phase in 5 waves: (1) Marketplace search + filter + sort + featured UI, (2) Firm detail enhancements (photos + map), (3) Booking dashboard 30s polling + detail panel polish, (4) Video Meetings settings page, (5) Webhooks settings page + backend.

---

## Standard Stack

### Core

| Library                    | Version  | Purpose                                       | Why Standard                                              |
| -------------------------- | -------- | --------------------------------------------- | --------------------------------------------------------- |
| @tanstack/react-query      | existing | Data fetching, caching, polling               | Already in use throughout project; `refetchInterval` key  |
| motion (framer-motion)     | existing | New booking glow animation                    | Already installed; zero new packages policy               |
| lucide-react               | existing | Icons (MapPin, Video, Webhook, Star, etc.)    | Already in use                                            |
| next-intl                  | existing | i18n translations for all new UI              | Project-standard                                          |
| zod                        | existing | Input validation for new API routes           | Project-standard for every API input                      |
| drizzle-orm                | existing | New `webhook_endpoints` + `webhook_deliveries` tables | Project ORM                                      |
| crypto (Node built-in)     | built-in | HMAC-SHA256 secret generation                 | `crypto.randomBytes(32).toString('hex')` — no npm install |

### Supporting

| Library            | Version  | Purpose                          | When to Use                            |
| ------------------ | -------- | -------------------------------- | -------------------------------------- |
| date-fns           | existing | "Last updated X seconds ago"     | `formatDistanceToNow` / interval timer |
| sonner             | existing | Toast feedback on actions        | Already used for booking actions       |
| isomorphic-dompurify | existing | Sanitize marketplace content   | Phase 46 mandate — user-generated text |

### Map Embed Decision

Recommendation: **Static OpenStreetMap tile embed** (iframe or `<img>` via tile API) over interactive Leaflet. Rationale:
- Zero new npm packages
- No hydration issues (static tile = `<img>` tag with lat/lng baked into URL)
- Sufficient UX for "view where this business is"
- Pattern: `https://staticmap.openstreetmap.de/staticmap.php?center={lat},{lng}&zoom=15&size=640x200&markers={lat},{lng}`
- Or simpler: embed an OpenStreetMap iframe using the standard embed URL

Recommendation: **Text geocoding input** for geolocation filter (type address → browser `navigator.geolocation` for "near me" button; no geocoding API needed at all if user only needs radius from current location).

### Alternatives Considered

| Instead of                    | Could Use              | Tradeoff                                                              |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------- |
| Static map tile               | Leaflet.js interactive | Leaflet needs new package + complex hydration; static sufficient here |
| `refetchInterval` polling     | SSE/WebSocket          | Locked decision: Vercel serverless 60s; polling is the correct choice |
| Node crypto for HMAC          | jose / jsonwebtoken    | crypto is built-in; no dependency justified for a simple hex secret   |
| Separate custom_video_url col | Reuse provider factory | Provider factory validates 'zoom'/'ms_teams' which conflicts; separate col cleaner |

### Installation

No new npm packages required. Zero new npm packages policy confirmed.

---

## Architecture Patterns

### Recommended Project Structure

New files:

```
apps/web/app/[locale]/(dashboard)/
├── settings/
│   ├── video-meetings/
│   │   └── page.tsx                  # UX-04
│   └── webhooks/
│       └── page.tsx                  # UX-05

apps/web/app/api/v1/
├── video/
│   └── meetings/
│       └── custom/route.ts           # New: store custom URL (no provider factory)
├── webhooks-config/                  # NEW namespace (avoid collision with /webhooks/*)
│   ├── endpoints/
│   │   ├── route.ts                  # GET (list), POST (create)
│   │   └── [id]/
│   │       ├── route.ts              # DELETE
│   │       └── test/route.ts         # POST test event
│   └── deliveries/route.ts           # GET delivery log

packages/database/src/schema/
└── webhook-config.ts                 # New: webhook_endpoints + webhook_deliveries tables

apps/web/hooks/
├── use-marketplace-query.ts          # Extend with city/lat/lng/radius/sort params
├── use-bookings-query.ts             # Add refetchInterval: 30_000
├── use-video-meetings-query.ts       # New: video meetings CRUD hooks
└── use-webhooks-config-query.ts      # New: webhook endpoints + deliveries hooks
```

### Pattern 1: Extending TanStack Query with refetchInterval

**What:** Add `refetchInterval: 30_000` to booking list query + track last-fetch timestamp in component state
**When to use:** UX-03 — booking dashboard auto-refresh

```typescript
// Source: existing pattern in AI insights, billing queries
export function useBookingsQuery(params: BookingListQuery) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => { ... },
    staleTime: 30_000,
    refetchInterval: 30_000, // ADD THIS
  });
}
```

"Last updated" indicator — track in component:

```typescript
const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
// In useEffect watching data changes:
useEffect(() => { if (data) setLastUpdated(new Date()); }, [data]);
// Render: formatDistanceToNow(lastUpdated, { addSuffix: true })
```

### Pattern 2: Marketplace Filter State with URL-free State

**What:** Filter state managed in component state (not URL params) — collapsible panel
**When to use:** MKT-01, MKT-02

```typescript
const [filters, setFilters] = useState<{
  category: string;
  city: string;
  lat?: number;
  lng?: number;
  radius_km: number;
  sort_by: 'rating' | 'distance' | 'featured';
}>({ category: '', city: '', radius_km: 10, sort_by: 'rating' });

const [showFilters, setShowFilters] = useState(false);
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
```

Pass all active filters to `useMarketplaceListings(filters)`. Extended hook signature:

```typescript
export interface MarketplaceListingsParams {
  page?: number;
  limit?: number;
  category?: string;
  city?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  sort_by?: 'rating' | 'distance' | 'featured';
}
```

### Pattern 3: Featured Carousel (Horizontal Scroll)

**What:** `featured=true` listings rendered in a horizontal scroll container above the main grid
**When to use:** MKT-05

```typescript
// Filter client-side from the fetched data
const featuredListings = listings.filter((l) => l.featured);
const regularListings = listings.filter((l) => !l.featured);

// Render featured carousel
<div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
  {featuredListings.map((listing) => (
    <FeaturedCard key={listing.id} listing={listing} className="snap-start w-72 shrink-0" />
  ))}
</div>
```

### Pattern 4: New Booking Glow Animation

**What:** Track newly-arrived booking IDs; apply glow via motion `animate` for 4s
**When to use:** UX-03

```typescript
// Detect new bookings by comparing prev data IDs with current data IDs
const [newBookingIds, setNewBookingIds] = useState<Set<string>>(new Set());
const prevIdsRef = useRef<Set<string>>(new Set());

useEffect(() => {
  if (!data) return;
  const currentIds = new Set(data.data.map((b) => b.id));
  const newIds = [...currentIds].filter((id) => !prevIdsRef.current.has(id));
  if (prevIdsRef.current.size > 0 && newIds.length > 0) {
    setNewBookingIds(new Set(newIds));
    setTimeout(() => setNewBookingIds(new Set()), 4000);
  }
  prevIdsRef.current = currentIds;
}, [data]);

// In row render:
<motion.tr
  animate={newBookingIds.has(booking.id) ? { boxShadow: ['0 0 0px #0057FF00', '0 0 12px #0057FF88', '0 0 0px #0057FF00'] } : {}}
  transition={{ duration: 4 }}
>
```

### Pattern 5: Webhook Endpoint CRUD + HMAC

**What:** Owner creates webhook endpoints with auto-generated HMAC secret; project stores secret hashed, shows plaintext once
**When to use:** UX-05

Secret generation:
```typescript
// Source: Node crypto built-in
import crypto from 'crypto';
const secret = crypto.randomBytes(32).toString('hex'); // 64-char hex
const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
// Store secretHash in DB; return plaintext secret to client ONCE
```

HMAC signature on delivery:
```typescript
const sig = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');
// Header: X-ScheduleBox-Signature: sha256={sig}
```

### Pattern 6: Custom Video Meeting URL Storage

**What:** Bypass existing provider factory; store free-form URL in `meetingUrl` column
**When to use:** UX-04

The existing `video_meetings` table has a `provider` column with a CHECK constraint: `IN ('zoom', 'google_meet', 'ms_teams')`. Since we're not calling provider APIs, the cleanest approach is to use `provider = 'custom'` — but that violates the CHECK constraint.

**Recommended approach:** Add a new `custom_meeting_url` column to `companies` table OR use the `videoMeetings` table by relaxing the provider check to add `'custom'`. Alternatively, add a separate `company_video_settings` column to the `companies` table with `customMeetingUrl varchar(500)`.

The simplest approach that avoids a DB migration complexity: add `custom_meeting_url` to `companies` table. The settings page becomes a simple company profile update — set a URL once, attach to all new bookings at confirmation time.

### Anti-Patterns to Avoid

- **Geocoding API call for address input:** Use `navigator.geolocation` for "near me" button — no external geocoding service needed. The API already accepts lat/lng.
- **Polling with staleTime < refetchInterval:** Keep `staleTime: 30_000` equal to `refetchInterval: 30_000` to avoid redundant refetches on window focus.
- **Storing plaintext HMAC secrets in DB:** Store SHA-256 hash; return raw secret only in the creation response.
- **Blocking booking flow on webhook delivery:** Webhook delivery MUST be fire-and-forget (async, non-blocking). Never await inside booking create/update routes.
- **Using `/webhooks/` namespace for new config routes:** Existing `/api/v1/webhooks/` handles inbound payment/tracking webhooks. New routes for owner-managed outbound webhooks must use a different namespace (e.g., `/api/v1/webhook-endpoints/`).

---

## Don't Hand-Roll

| Problem                          | Don't Build                          | Use Instead                             | Why                                         |
| -------------------------------- | ------------------------------------ | --------------------------------------- | ------------------------------------------- |
| Haversine geo-distance           | Custom formula                       | Already in listings API (sql template)  | Already implemented and tested              |
| TanStack Query cache invalidation | Manual state refresh                | `queryClient.invalidateQueries`        | Cache invalidation is complex; library handles it |
| Sheet slide-over                 | Custom drawer component              | Existing `Sheet` from shadcn/ui         | Already used in BookingDetailPanel          |
| HMAC-SHA256                      | Custom crypto implementation         | Node `crypto` built-in                  | Standard library, battle-tested             |
| Map embed                        | Custom map rendering                 | OpenStreetMap static tile iframe        | Zero deps, no API key, sufficient UX        |
| Retry with backoff               | Custom setTimeout retry logic        | Simple implementation: delays=[60,300,1800]s | Simple enough to hand-roll here (no 3rd-party retry library needed) |

**Key insight:** The geo-filtering, session management, and query infrastructure are already built. This phase is 80% frontend wiring + 20% new backend (webhooks-config).

---

## Common Pitfalls

### Pitfall 1: Provider CHECK Constraint on video_meetings

**What goes wrong:** Creating a video meeting with `provider = 'custom'` throws a DB check violation.
**Why it happens:** `video_meetings.provider` has `CHECK (provider IN ('zoom', 'google_meet', 'ms_teams'))`.
**How to avoid:** Use a simpler approach — add `custom_meeting_url` to `companies` table (one column, one setting). No new rows in `video_meetings` for custom URLs.
**Warning signs:** `CHECK constraint` error in DB logs on insert.

### Pitfall 2: `/webhooks/` Namespace Collision

**What goes wrong:** New owner-configurable webhook routes conflict with existing inbound webhook handlers.
**Why it happens:** `/api/v1/webhooks/` already has comgate, email-tracking, twilio-usage, and push register routes.
**How to avoid:** Use `/api/v1/webhook-endpoints/` as the namespace for outbound owner-managed webhooks.
**Warning signs:** Route not found or wrong handler invoked.

### Pitfall 3: Featured Sort Missing from API

**What goes wrong:** Sort option `featured` doesn't exist in the current `sortByEnum` which only has `rating | distance | name`.
**Why it happens:** The schema was built before featured-sort was a requirement.
**How to avoid:** Add `'featured'` to `sortByEnum` in `packages/shared/src/schemas/marketplace.ts` AND add the sort logic branch in `apps/web/app/api/v1/marketplace/listings/route.ts`.
**Warning signs:** Frontend passes `sort_by=featured`, API returns validation error.

### Pitfall 4: Marketplace Hook Type Mismatch

**What goes wrong:** `MarketplaceListing` type in hook doesn't include new API fields (`featured`, `images`, `latitude`, `longitude`, `address_city`, `distance`).
**Why it happens:** Hook type was defined early when listing had fewer fields. The API response already returns all these fields.
**How to avoid:** Update `MarketplaceListing` interface in `use-marketplace-query.ts` to match the full API response.
**Warning signs:** TypeScript errors or `undefined` when accessing `listing.featured`.

### Pitfall 5: Booking ID Type — String vs Number

**What goes wrong:** `handleRowClick(String(booking.id))` in bookings page suggests `id` is a number at some point.
**Why it happens:** API uses UUID (string) but component coerces with `String()`.
**How to avoid:** Confirm the `bookingId` prop passed to `BookingDetailPanel` is always a UUID string. The `useBookingDetail(bookingId)` hook needs a UUID not a SERIAL.
**Warning signs:** 404 from `/bookings/{id}` if SERIAL integer is passed instead of UUID.

### Pitfall 6: DOMPurify on Marketplace Content

**What goes wrong:** Displaying user-generated description/reviews without sanitization on firm detail page.
**Why it happens:** The server-component `/{locale}/{slug}/page.tsx` renders description directly from DB.
**How to avoid:** Phase 46 mandate — wrap all user-generated strings in `sanitizeHtml()` from `isomorphic-dompurify` before rendering. Since this is a server component, `DOMPurify` server-side config applies.
**Warning signs:** XSS audit failure; strings like `<script>` in description.

### Pitfall 7: Webhook Delivery Blocking Request

**What goes wrong:** Booking mutation route awaits webhook delivery, causing slow responses or timeouts.
**Why it happens:** Easy to accidentally await the delivery call.
**How to avoid:** Webhook delivery must be `void triggerWebhooks(event, payload)` — fire and forget. Use `setImmediate` or just call without await.
**Warning signs:** Booking confirm/complete actions become slow; Vercel function timeout.

---

## Code Examples

### Extend MarketplaceListingsParams

```typescript
// apps/web/hooks/use-marketplace-query.ts
export interface MarketplaceListingsParams {
  page?: number;
  limit?: number;
  category?: string;
  city?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  sort_by?: 'rating' | 'distance' | 'name' | 'featured';
}
```

### Add featured to sortByEnum (shared schemas)

```typescript
// packages/shared/src/schemas/marketplace.ts
export const sortByEnum = z.enum(['rating', 'distance', 'name', 'featured']);
```

Add to API handler:
```typescript
// In standard query (non-geo) branch:
} else if (sort_by === 'featured') {
  orderByClause = sql`${marketplaceListings.featured} DESC, ${marketplaceListings.averageRating} DESC`;
}
```

### Static OpenStreetMap Embed

```tsx
// In /{locale}/{slug}/page.tsx — server component
{listing?.latitude && listing?.longitude && (
  <section>
    <h2>{t('location')}</h2>
    <div className="rounded-xl overflow-hidden border border-white/20">
      <iframe
        title={`${company.name} map`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(listing.longitude)-0.01},${Number(listing.latitude)-0.01},${Number(listing.longitude)+0.01},${Number(listing.latitude)+0.01}&layer=mapnik&marker=${listing.latitude},${listing.longitude}`}
        className="w-full h-48"
        loading="lazy"
      />
    </div>
  </section>
)}
```

### New DB Schema: webhook_endpoints

```typescript
// packages/database/src/schema/webhook-config.ts
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 2048 }).notNull(),
  secretHash: varchar('secret_hash', { length: 64 }).notNull(), // SHA-256 of raw secret
  events: text('events').array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('idx_webhook_endpoints_company').on(table.companyId),
  companyLimit: check('webhook_endpoints_limit_5', sql`true`), // enforced in app logic
}));

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  endpointId: integer('endpoint_id').notNull().references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  responseTimeMs: integer('response_time_ms'),
  attempt: integer('attempt').default(1),
  status: varchar('status', { length: 20 }).default('pending'), // pending | delivered | failed
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  endpointIdx: index('idx_webhook_deliveries_endpoint').on(table.endpointId),
  statusIdx: index('idx_webhook_deliveries_status').on(table.status),
}));
```

### Custom Meeting URL on Companies

```typescript
// Simple approach: add to companies table via migration
// ALTER TABLE companies ADD COLUMN custom_meeting_url VARCHAR(500);
// In settings page: PATCH /api/v1/settings with { custom_meeting_url: '...' }
// At booking confirmation time: fetch company.custom_meeting_url, inject into email
```

### Booking List with refetchInterval + Last Updated

```typescript
// apps/web/app/[locale]/(dashboard)/bookings/page.tsx
const [lastUpdated, setLastUpdated] = useState(new Date());
const { data, isLoading } = isEmployee ? employeeQuery : ownerQuery;

// Track updates
useEffect(() => {
  if (data) setLastUpdated(new Date());
}, [data]);

// Render indicator (top-right of filter card):
<span className="text-xs text-muted-foreground">
  {t('lastUpdated')} {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: dateLocale })}
</span>
```

---

## State of the Art

| Old Approach                    | Current Approach                            | Notes                                        |
| ------------------------------- | ------------------------------------------- | -------------------------------------------- |
| Full page navigation on booking click | Sheet/Drawer pattern (already implemented) | UX-01: already done, just needs polish      |
| No real-time updates            | 30s polling with refetchInterval            | Locked decision: no SSE/WS on Vercel serverless |
| Video provider OAuth            | Custom URL paste                            | Phase decision: simplest that meets requirement |
| No outbound webhooks            | Owner-configured HMAC webhooks              | New feature, modeled after Stripe            |

---

## Open Questions

1. **Company slug on public marketplace page**
   - What we know: The public `/{locale}/{slug}` page is authenticated-user agnostic (server component, public).
   - What's unclear: The `/marketplace` dashboard page (inside `(dashboard)`) calls `listing.slug` to navigate to profile. But `MarketplaceListing` type in the hook doesn't currently include `slug`.
   - Recommendation: Verify that the listings API returns `company_slug` (join with companies table). The current `listings/route.ts` selects from `marketplaceListings` without joining companies. A JOIN or subquery is needed to get `slug`.

2. **Webhook delivery trigger location**
   - What we know: Webhooks should fire on `booking.created`, `booking.confirmed`, `booking.cancelled`, `booking.completed`, `booking.no_show`, `payment.received`, `payment.refunded`.
   - What's unclear: Where exactly to place the delivery trigger calls — in each booking status-change route handler, or centrally.
   - Recommendation: Create a `triggerWebhooks(companyId, eventType, payload)` utility in `apps/web/lib/webhooks/trigger.ts`. Call it (fire-and-forget) from: booking create route, booking status action routes, payment completion route.

3. **Company_slug missing from marketplace_listings API response**
   - What we know: `marketplace_listings` table has `company_id` FK but no `slug` column. The `companies` table has `slug`.
   - What's unclear: The current listings API response doesn't include slug. "View Profile" button in the current marketplace page uses `listing.slug` but this is undefined.
   - Recommendation: Join `companies` table in the listings API query and include `company_slug` in the response. Update `MarketplaceListing` type to include `company_slug: string | null`.

---

## Validation Architecture

### Test Framework

| Property           | Value                        |
| ------------------ | ---------------------------- |
| Framework          | Vitest (not yet configured)  |
| Config file        | None — Wave 0 gap            |
| Quick run command  | `pnpm --filter @schedulebox/web test --run` |
| Full suite command | `pnpm test --run`            |

### Phase Requirements → Test Map

| Req ID | Behavior                                      | Test Type    | Automated Command                                          | File Exists? |
| ------ | --------------------------------------------- | ------------ | ---------------------------------------------------------- | ------------ |
| MKT-01 | Marketplace search returns matching firms     | Manual + E2E | Manual: navigate /marketplace, type query, verify results  | No           |
| MKT-02 | Category/city/radius filter narrows results   | Manual       | Manual: apply filters, verify API params in network tab    | No           |
| MKT-03 | Firm detail shows photos, map, reviews        | Manual       | Manual: navigate to /{slug}, verify sections visible       | No           |
| MKT-04 | Book Now links to /{slug}/book                | Manual       | Manual: click Book Now, verify URL                         | No           |
| MKT-05 | Featured badge + carousel visible             | Manual       | Manual: seed featured=true listing, verify badge + section | No           |
| MKT-06 | Sort by rating, distance, featured works      | Manual       | Manual: toggle sort, verify order changes                  | No           |
| UX-01  | Booking row click opens Sheet panel           | Manual       | Manual: click row, panel slides in                         | No           |
| UX-02  | Status actions work inside panel              | Manual       | Manual: confirm booking from panel, verify status update   | No           |
| UX-03  | 30s auto-refresh + last-updated indicator     | Manual       | Manual: wait 30s, observe indicator update                 | No           |
| UX-04  | Video meetings settings page renders + saves  | Manual       | Manual: navigate Settings > Video Meetings, paste URL      | No           |
| UX-05  | Webhooks page: create endpoint, test, log     | Manual       | Manual: create endpoint, click Test, verify delivery log   | No           |

All requirements are manual-only for this phase — they involve UI interactions, animation timing, and third-party URL calls that are impractical to automate without a running dev server. No Playwright E2E exists yet (Phase 50 scope).

### Wave 0 Gaps

- [ ] No Vitest config exists — covered by Phase 50 (TEST-01)
- [ ] No E2E Playwright tests — covered by Phase 50 (TEST-02)
- [ ] These gaps do not block Phase 48 delivery; manual QA is the gate

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `apps/web/app/api/v1/marketplace/listings/route.ts` — confirmed geo-filter and sort already implemented
- Direct code inspection of `packages/database/src/schema/marketplace.ts` — confirmed `featured`, `images`, `latitude`, `longitude` columns exist
- Direct code inspection of `packages/database/src/schema/video.ts` — confirmed provider CHECK constraint issue
- Direct code inspection of `packages/database/src/schema/webhooks.ts` — confirmed `processed_webhooks` is inbound-only; no outbound webhook table exists
- Direct code inspection of `apps/web/components/booking/BookingDetailPanel.tsx` — confirmed Sheet pattern + mutations already implemented
- Direct code inspection of `apps/web/hooks/use-bookings-query.ts` — confirmed `staleTime: 30_000` but no `refetchInterval`
- Direct code inspection of `apps/web/lib/navigation.ts` — confirmed `/settings` nav entry, `/settings/billing` sub-page exists as structural reference

### Secondary (MEDIUM confidence)

- OpenStreetMap embed URL pattern — standard public URL, verified against openstreetmap.org embed documentation
- Node `crypto.randomBytes(32).toString('hex')` for HMAC secret — Node.js built-in, standard pattern

### Tertiary (LOW confidence)

- None — all findings verified against source code or official documentation

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries confirmed present in package.json / codebase
- Architecture: HIGH — all patterns derived from direct code inspection
- Pitfalls: HIGH — all identified from actual constraint violations found in source code
- New DB design: MEDIUM — webhook_endpoints/deliveries design is new; column choices are reasonable but not yet validated against Drizzle push

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable dependencies, 30 days)

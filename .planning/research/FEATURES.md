# Feature Landscape: ScheduleBox v1.3 — Revenue & Growth

**Domain:** AI-powered Scheduling SaaS — Subscription Billing, Multi-Location, Usage Gating, Analytics, Design Polish
**Researched:** 2026-02-24
**Confidence:** MEDIUM-HIGH overall (Comgate recurring API specifics LOW — docs are behind auth; SaaS patterns HIGH from multiple verified sources; CZ/SK billing law MEDIUM from official sources)

---

## Context

ScheduleBox v1.2 shipped a fully functional, demo-ready product. v1.3 is about turning it into a **revenue-generating SaaS business**:

- Pricing tiers exist on the landing page but are **not enforced** — everyone gets all features
- Comgate is integrated for one-time booking payments but **not for subscriptions**
- The system has one company per account — no concept of **multiple locations**
- Analytics exist but show **booking data only** — no SaaS/business health metrics
- The UI works but lacks the **visual polish** expected from a premium CZK 2,990/month product

**What already exists (do not rebuild):**
- Booking engine, availability, double-booking prevention
- Comgate one-time payment + webhook infrastructure
- CRM, loyalty program, coupons, gift cards
- 7 AI/ML models (no-show, CLV, pricing, capacity, health score, reminder timing, upselling)
- Onboarding wizard with industry templates
- Marketing landing page with pricing tiers (Free/490/1490/2990 Kč)
- i18n (cs/en/sk), full notification system (email + SMS)
- RabbitMQ event infrastructure, Drizzle ORM, PostgreSQL RLS

---

## Category 1: Subscription Billing

### How Competing Platforms Handle This

**Calendly/Acuity pattern:** Monthly credit card auto-charge with instant plan activation. Upgrade activates immediately with proration. Downgrade schedules for end of period. Failed payment triggers 3–4 retry attempts over 14 days before account downgrade.

**Fresha pattern:** Usage-based (zero subscription) — charges per transaction. Not applicable to ScheduleBox's subscription model.

**Reservio/Reservanto (CZ market):** Monthly SEPA or card payment. Invoice emailed on each charge. Czech companies require IČO on invoice and 10-year retention.

### Table Stakes

Features users expect when paying a subscription. Missing = trust is broken immediately.

| Feature | Why Expected | Complexity | Dependencies on Existing Features |
|---------|-------------|-----------|----------------------------------|
| **Comgate recurring payment initiation** | First-party Czech payment gateway — avoids needing Stripe or other foreign gateways | HIGH | Existing Comgate integration (Phase 21). Requires Comgate account-level approval for recurring feature. New API params: `recurrence=ON`, `recurrenceCycle=MONTH`. |
| **Subscription lifecycle state machine** | Plans must move through: `trialing → active → past_due → canceled → paused` | HIGH | New DB table `company_subscriptions`. Must integrate with existing `companies.plan` column. |
| **Automatic monthly charge** | Background job debits saved card on renewal date | HIGH | Existing RabbitMQ queue for async jobs. New cron scheduler or pg-cron. |
| **Failed payment dunning** | Smart retry (day 1, 3, 7, 14) + email notifications. Standard 14-day grace period. | MEDIUM | Existing notification worker + email infrastructure. New dunning state tracking. |
| **Grace period enforcement** | Account stays functional during grace period but shows persistent banner. Hard lock after 14 days. | MEDIUM | Must integrate with tier enforcement (Category 3). |
| **Plan upgrade / downgrade UI** | Settings page with current plan, upgrade CTA, downgrade with end-of-period scheduling | MEDIUM | Existing settings pages. Upgrade → Comgate payment. Downgrade → schedule change. |
| **Proration on upgrade** | Mid-period upgrade charges only remaining days on new plan. Standard expectation. | MEDIUM | New billing math utility. Comgate doesn't handle proration — must calculate and charge delta. |
| **Subscription invoice PDF** | Czech law: invoice within 15 days, must include IČO, VAT if applicable, stored 10 years | HIGH | Existing invoice PDF generation (Phase 6). New invoice type: `subscription`. Czech VAT: 21% standard, 12% reduced. |
| **Cancellation flow** | Self-serve cancel with confirmation + "reasons" survey. Access until period end. | LOW | UI only, minimal backend state change. |
| **Payment history page** | List of all charges with PDF download, status (paid/failed/refunded) | LOW | Existing payments table. New filter for subscription-type charges. |

### Differentiators

Features that set ScheduleBox apart in the CZ/SK market for billing.

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|-----------|-------|
| **Annual plan with 2 months free** | Industry-standard LTV boost. "Pay 10 months, get 12." | MEDIUM | Annual billing cycle in Comgate. Significant MRR/ARR improvement. Target 30% annual adoption. |
| **Trial-to-paid conversion flow** | Contextual upgrade prompts at friction points (booking #48 of 50 limit, etc.) | MEDIUM | Requires usage metering (Category 3). Most effective: prompt at 80% limit consumption, not at hard stop. |
| **Čeština na faktuře** | Invoice text in Czech with proper legal terminology. Required by Czech B2B buyers. | LOW | Template change only. Already have i18n. |
| **Pause subscription** | For seasonal businesses (ski instructors, summer camps). Pause 1–3 months, card not charged. | MEDIUM | CZ/SK SMB market is seasonally heavy. Reduces churn vs. cancelation. New subscription state. |

### Anti-Features

Features to explicitly NOT build in v1.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|----------|-------------------|
| **Per-booking revenue share (Fresha model)** | Vendor lock-in through payment dependency destroys trust. SMB owners hate unpredictable costs. | Fixed subscription only |
| **Multi-currency billing** | CZK/EUR complexity; Comgate handles CZK natively. EUR adds accounting complexity for CZ entities. | CZK only in v1.3 |
| **Complex proration edge cases** | Mid-month upgrade + addon + partial refund logic creates bugs. Start simple. | Immediate upgrade charge = full month of difference. Refine in v1.4. |
| **Stripe/PayPal for subscriptions** | Comgate is the chosen CZ gateway; adding a second billing system creates split state | Comgate recurring only |

### User Flows

**New Subscription (from Free):**
1. User hits tier limit (e.g., booking 51 of 50) → contextual upgrade modal appears
2. Modal shows plan comparison with current usage highlighted
3. User selects Essential/Growth/AI-Powered plan
4. Redirect to Comgate payment page (first charge + recurring consent)
5. Comgate webhook fires → subscription activated → plan column updated → welcome email sent

**Monthly Renewal (background):**
1. Cron job runs on renewal_date
2. Comgate recurring charge API called with stored recurrence token
3. Success → subscription renewed, invoice generated + emailed
4. Failure → retry schedule begins (day 1, 3, 7, 14)
5. Retry 4 fails → subscription enters `past_due` → user emailed → grace period starts
6. Day 14 past_due → account locked to Free tier, data preserved

**Upgrade (Active Subscriber):**
1. User clicks "Upgrade" in Settings → Plan
2. Shows proration calculation ("You'll be charged X Kč today for the remaining 14 days")
3. Confirm → immediate Comgate charge for delta
4. Plan updated instantly, new features unlocked

**Downgrade:**
1. User selects lower plan
2. "Your plan changes to [X] on [renewal date]. Until then, you keep current features."
3. Scheduled plan change recorded. No immediate charge change.
4. On renewal date: lower plan charge, features adjusted

### Complexity Assessment

| Aspect | Complexity | Reason |
|--------|-----------|--------|
| Comgate recurring API integration | HIGH | Requires separate account approval; limited public docs; must handle async webhook flow |
| Subscription state machine | HIGH | 6+ states, edge cases with concurrent upgrades/dunning |
| Proration math | MEDIUM | Custom calculation since Comgate doesn't prorate |
| Czech invoice compliance | MEDIUM | PDF template change + IČO/DIČ fields |
| UI (settings/upgrade flow) | LOW-MEDIUM | Standard modal/page patterns; shadcn components available |

---

## Category 2: Multi-Location / Franchise Management

### How Competing Platforms Handle This

**Fresha:** Each location is a separate "workspace" that shares the same account login. Owner switches between locations via top-level dropdown. Separate bank accounts per location (Fresha's unique feature). Analytics filterable by location or aggregated.

**Pabau:** Role-based access per location. Practice managers see their location; head office sees all. Consolidated reporting with location filter. Client records are global (accessible from any branch).

**Homebase/FranConnect (franchise-first):** Central admin ("franchisor") controls brand standards, menus, pricing ranges. Location manager ("franchisee") operates within those constraints. Separate P&L per location with roll-up reporting.

**AppMaster/small chain pattern (5-50 branches):** Location is a first-class entity with its own staff, services, working hours, and resources. Customers book at a specific location. Central admin can view/manage all locations.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing Features |
|---------|-------------|-----------|----------------------------------|
| **Location entity** | A company can have 1-N locations. Each location has own address, hours, staff, services, resources | HIGH | New DB: `locations` table. RLS must scope to location within company. Existing `companies` → `locations` → everything else hierarchy. |
| **Location switcher UI** | Owner switches active location via top-nav dropdown. Single login, multiple locations. | MEDIUM | Global state change (Zustand). All subsequent data queries scoped to selected location. |
| **Per-location working hours** | Location A: Mon-Fri, Location B: Tue-Sat | LOW | Existing `working_hours` table needs `location_id` FK |
| **Per-location staff assignment** | Staff assigned to 1 or more locations. Staff calendar shows only their assigned locations. | MEDIUM | Existing `employees` table needs `location_id` (M:N join table). |
| **Per-location services with pricing overrides** | Base service defined at company level. Location can override price (e.g., Prague branch charges more). | MEDIUM | New `location_service_overrides` table. Fallback to company-level service if no override. |
| **Central admin role** | "Franchisor" or chain owner can see all locations, manage settings, view aggregated analytics | HIGH | New role in RBAC: `chain_admin`. Existing RBAC infrastructure. |
| **Location manager role** | Location manager can only manage their assigned location(s). Cannot see other locations' data. | HIGH | New role: `location_manager`. RLS update to enforce location_id scope. |
| **Aggregated analytics** | Owner dashboard shows total revenue, bookings across ALL locations + breakdown by location | HIGH | Existing analytics queries need GROUP BY location_id + roll-up view. |
| **Customer location history** | Customer who visits multiple branches has unified profile | MEDIUM | Existing `customers` table is already company-scoped (cross-location). No change needed. |
| **Booking at specific location** | Public booking widget shows "Choose location" step first | MEDIUM | Existing booking widget needs location selection step prepended. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|-----------|-------|
| **Separate payout accounts per location** | Fresha does this — critical for franchise where each franchisee owns their branch financially | HIGH | Comgate supports multiple merchant accounts. Each location has own bank account for payouts. Complex implementation. |
| **Cross-location booking** | "Book at whichever branch has availability" — single customer UI shows all branches' slots | HIGH | Requires availability engine to query across locations simultaneously. Already built for single-location. |
| **Location performance benchmarking** | "Branch Prague is 23% above chain average for revenue per booking" | MEDIUM | Dashboard comparison component. Analytics data already collected if location_id tracked. |
| **Template propagation** | Central admin pushes service catalog changes to all branches at once | MEDIUM | Admin action: "Apply to all locations". Useful for price increases, new service rollouts. |
| **Branch-level AI insights** | No-show predictor per location (each branch may have different customer behavior) | HIGH | AI models would need per-location training. Complex. Probably v1.4. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|----------|-------------------|
| **Full white-label per location** | Each branch having completely different branding = unmanageable. SMBs with 5-50 branches want consistency. | Company-level branding, location-specific name/address only |
| **Separate billing per location** | Subscription billing at branch level creates 5-50 billing relationships. Nightmare for SMB. | Single subscription at company level covers all locations. Tier limits scale with locations (e.g., Growth = up to 5 locations). |
| **Full franchise royalty management** | Revenue share calculations, franchise fee collection = enterprise ERP territory. Out of scope. | Revenue reporting only. Let owners do their own accounting. |
| **Inter-location staff time tracking** | Staff traveling between branches → complex scheduling math | Staff is assigned to specific locations. Cross-location assignments are manual. |

### User Flows

**Setting Up a Second Location:**
1. Settings → Locations → "Add Location"
2. Enter name, address, working hours for new branch
3. System creates new location record, generates public booking URL: `/book/[company-slug]/[location-slug]`
4. Admin assigns existing staff to location (or invites new staff for that branch)
5. Optionally clone service catalog from existing location with price overrides
6. New location immediately available in location switcher and analytics

**Chain Admin Daily Use:**
1. Login → landing on "All Locations" aggregate dashboard
2. See total: bookings today (across all), revenue this month, utilization %
3. Click location name → drill into single-location view
4. Staff management, schedule management operate on selected location's data
5. Analytics report with "Compare Locations" toggle

**Location Manager Daily Use:**
1. Login → automatically scoped to their assigned location(s)
2. Cannot see other locations' data (RLS enforced)
3. Same booking/staff/analytics UI but single-location only
4. Cannot change subscription plan (chain admin only)

### Complexity Assessment

| Aspect | Complexity | Reason |
|--------|-----------|--------|
| Location entity + DB migration | HIGH | Cascading FK changes across most tables (bookings, staff, services, resources, hours) |
| RLS updates for location scoping | HIGH | Every RLS policy must now scope to location_id within company_id |
| Aggregated analytics queries | HIGH | Cross-location GROUP BY with roll-up; performance-sensitive |
| UI location switcher | MEDIUM | Zustand global state; context propagation throughout app |
| Cross-location booking widget | HIGH | Availability engine query fan-out |
| Per-location payout accounts | HIGH | Comgate multi-merchant configuration; not standard |

---

## Category 3: Usage Limits and Tier Gating

### How Competing Platforms Handle This

**Calendly pattern:** Free = 1 active event type. Soft-limit with persistent banner. Hitting limit shows modal with upgrade CTA. No hard block for most features — the upgrade prompt is the enforcement.

**Acuity pattern:** Calendars = staff count. At limit, "Add Staff Member" button shows lock icon + upgrade required. Feature access checked server-side at API level, not just UI.

**Stripe/SaaS standard (2025):** Hybrid model — hard limits for resource-cost features (e.g., SMS credits, AI API calls), soft limits with prompts for productivity features (event types, bookings count). 80% threshold triggers first warning, 100% triggers upgrade prompt, 110% triggers hard lock.

**Industry consensus:** Hard limit at Free tier (no payment method captured, must prevent abuse). Soft limit with grace for paid tiers (customer has paid in good faith, brief over-limit is acceptable). Always allow data access even when over-limit.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing Features |
|---------|-------------|-----------|----------------------------------|
| **Server-side entitlement check** | UI-only gating is trivially bypassed. All tier limits must be enforced in API middleware. | HIGH | New `entitlements` middleware in Next.js API routes. Checks company plan before processing request. |
| **Booking count metering** | Free: 50 bookings/month. Count tracked in DB. API rejects booking #51. | MEDIUM | New `monthly_booking_count` field or view on `companies`. Reset on 1st of month. |
| **Staff count limit** | Free: 1, Essential: 3, Growth: 10, AI-Powered: unlimited | MEDIUM | Check on staff creation API. Existing `employees` table count. |
| **Location count limit** | Free: 1, Essential: 1, Growth: 5, AI-Powered: unlimited | MEDIUM | Check on location creation API (Category 2 dependency). |
| **AI feature gating** | AI features available only on Growth+ or AI-Powered tier | LOW | Add tier check to existing `/api/ai/*` route middleware. Already structured as separate routes. |
| **Upgrade prompt on limit hit** | When user hits a limit, show upgrade modal (not just a generic error) | MEDIUM | New `UpgradeModal` component. Must pass context: "You've used 50/50 bookings this month." |
| **Usage visible to user** | "38 of 50 bookings used this month" in dashboard | LOW | Query against metered field. Display in dashboard sidebar/banner. |
| **80% threshold warning** | Proactive: at 40/50 bookings, show yellow banner "Running low on bookings" | LOW | Computed property. Banner component in layout. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|-----------|-------|
| **Contextual upgrade prompts** | "You've reached your Free limit. Owners like you upgrade to Essential to handle seasonal peaks." | MEDIUM | User-segment-aware copy. Industry detected during onboarding (wizard already exists). Copy variation by industry segment. Conversion lift of ~32% vs generic prompts (Mixpanel data). |
| **AI-gated feature preview** | Free/Essential users can _see_ AI features (greyed out) with "Try for 14 days" CTA. Shows value before asking for money. | MEDIUM | Show AI section in sidebar with lock icon. Click → trial activation or upgrade prompt. Better than hiding features entirely. |
| **Usage reset notification** | "Your booking count reset to 0. You have 50 bookings available this month!" Email on 1st of month. | LOW | Simple cron + notification template. Reduces churn from accidental limit-anxiety. |
| **Overage option (paid tiers)** | Growth tier can purchase extra bookings: 100 additional bookings for 99 Kč. | HIGH | New metered billing concept on top of subscription. Comgate one-time charge via existing infrastructure. Complex to implement correctly. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|----------|-------------------|
| **Surprise hard-lock without warning** | User hits limit mid-appointment, gets error, customer can't book. Terrible UX. Trust destroyed. | Show warnings at 80%, 90%, 100%. Only hard-lock after 14-day grace. |
| **Feature flag without UI explanation** | Button just disappears or is grayed out with no explanation. User thinks it's a bug. | Always show locked features with lock icon + tier label + "Upgrade to [Plan]" tooltip. |
| **Retroactive limit enforcement** | Removing existing bookings/staff/data when downgrading. | Read-only state: can view existing data, cannot add new. E.g., downgrade from 3 staff to 1 limit: existing 3 staff records kept, cannot add 4th. |
| **Per-API-call billing (metered billing)** | "You called the AI API 847 times this month. That's 847 Kč." — SMB owners panic at variable costs. | Flat tier with generous limits. AI API calls are internal, not exposed as a cost driver. |

### User Flows

**Hitting the Free Booking Limit:**
1. User creates booking #51 → API returns `HTTP 402` with `{ error: "LIMIT_REACHED", code: "BOOKING_LIMIT_MONTHLY", limit: 50, plan: "free" }`
2. Frontend catches 402 → shows UpgradeModal: "You've reached your 50 booking limit for this month"
3. Modal shows plan comparison focused on booking limits
4. CTA: "Upgrade to Essential — 490 Kč/month, unlimited bookings"
5. Click → subscription flow (Category 1)

**Accessing Locked AI Feature (Essential Tier):**
1. User navigates to AI Tools → No-show Predictor
2. Page renders with feature preview (blurred/locked overlay)
3. Banner: "No-show Predictor is available on Growth plan (1,490 Kč/month)"
4. CTA button: "Upgrade to Growth"
5. Optional: "Start 14-day free trial" (trial of AI tier)

**Entitlement Middleware Flow (backend):**
```
POST /api/v1/bookings
→ auth middleware (verify JWT)
→ entitlement middleware:
   - get company.plan, company.subscription_status
   - if plan === 'free': count this month's bookings
   - if count >= 50: return 402 BOOKING_LIMIT_MONTHLY
   - if subscription_status === 'past_due': allow but add warning header
→ booking creation handler
```

### Complexity Assessment

| Aspect | Complexity | Reason |
|--------|-----------|--------|
| Entitlement middleware | MEDIUM | Straightforward but must cover all relevant API routes |
| Booking count metering | LOW | COUNT query scoped to company + month; cached in Redis |
| Upgrade modal + copy | MEDIUM | Multiple states, context-aware copy, plan comparison data |
| 402 error handling frontend | MEDIUM | Must catch in all forms/actions that create resources |
| AI feature preview/lock UI | LOW | CSS overlay + conditional render |
| Overage billing | HIGH | New billing concept; defer to v1.4 |

---

## Category 4: Analytics Dashboards

### How Competing Platforms Handle This

**Fresha analytics:** Owner sees: revenue by day/week/month, top services by revenue, top staff by revenue, client retention rate, new vs returning clients, bookings by source. Filterable by location and date range.

**Acuity/Calendly:** Simpler — booking count, no-show rate, top event types. Revenue only if payment collected.

**Mindbody (enterprise):** Full P&L dashboard, class attendance trends, membership metrics, marketing attribution. Complex but the gold standard for fitness/wellness.

**SaaS platform metrics (ChartMogul/Baremetrics pattern):** MRR, ARR, new MRR, churned MRR, expansion MRR, net revenue retention, plan distribution, churn rate by cohort. These are **operator-level** metrics (ScheduleBox internal), not the booking analytics shown to SMB owners.

**Two distinct dashboards are needed:**
1. **Business owner dashboard** — booking/revenue/customer analytics for SMB owners using ScheduleBox
2. **Platform admin dashboard** — SaaS metrics for ScheduleBox operators (MRR, churn, plan distribution)

### Table Stakes — Business Owner Dashboard

| Feature | Why Expected | Complexity | Dependencies on Existing Features |
|---------|-------------|-----------|----------------------------------|
| **Revenue over time chart** | Core SMB KPI. Weekly/monthly/yearly. Line chart with comparison to prior period. | MEDIUM | Existing bookings + payments tables. Query by date range, aggregate by day/week. |
| **Bookings count + cancellation rate** | "How busy am I? How many cancel?" — first thing owners ask | LOW | Existing booking status column. COUNT with GROUP BY status. |
| **No-show rate** | Directly measures AI impact on business. Also shows value of no-show predictor. | LOW | Existing booking.status='no_show'. Simple ratio. |
| **Top services by revenue** | "Which service makes me the most money?" | LOW | JOIN bookings + services, SUM amount, ORDER BY desc. |
| **Top staff by revenue/bookings** | "Who's my best employee?" — important for commission structures | LOW | JOIN bookings + employees, aggregate. |
| **New vs returning customer ratio** | Customer retention health. "Am I growing new business or just serving regulars?" | MEDIUM | First-booking date per customer. More complex query. |
| **Occupancy rate** | "What % of my available slots are actually booked?" Peak hours visibility. | HIGH | Must compare booked slots to total available slots (working hours - blocked time). Complex. |
| **Peak hours heatmap** | "When am I busiest?" — for staffing decisions | MEDIUM | COUNT bookings by hour of day, day of week. Heat map visualization. |
| **Date range filter** | Today / This week / This month / Last month / Custom range | LOW | Standard dashboard filter, applied to all charts |
| **Export to CSV** | Owners want data for their accountant | LOW | Existing pattern from customer export (Phase 8). |

### Differentiators — Business Owner Dashboard

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|-----------|-------|
| **AI prediction overlay** | Revenue chart shows "predicted next week: X Kč" as dotted line. Makes AI model value tangible. | HIGH | Requires trained demand forecasting model (from Phase 23). Overlay on existing chart. |
| **No-show $ impact** | "Your AI prevented 12 no-shows this month, saving you estimated 3,600 Kč" | MEDIUM | (avg booking value) × (reduced no-show count). Gamified AI impact metric. CZ market loves this. |
| **Staff performance comparison** | Bar chart: staff side-by-side on revenue, bookings, avg rating. With benchmark. | MEDIUM | Multiple metrics per staff. Benchmark line. Standard chart library. |
| **Customer cohort retention** | "Of customers who first visited in January, 67% came back in February" | HIGH | True cohort analysis. Complex SQL with window functions. Meaningful only once platform has usage history. |
| **Multi-location comparison** (v1.3 dependency) | "Prague branch: 94,500 Kč / Brno branch: 67,200 Kč this month" side-by-side | MEDIUM | Requires Category 2 (multi-location) to be built first. |

### Table Stakes — Platform Admin Dashboard (ScheduleBox Operators)

| Feature | Why Expected | Complexity | Dependencies on Existing Features |
|---------|-------------|-----------|----------------------------------|
| **MRR / ARR tracking** | Core SaaS health metric. Sum of all active subscription charges. | MEDIUM | Requires Category 1 (subscriptions) first. Sum of company_subscriptions.amount_czk where status='active'. |
| **New MRR this month** | New subscriptions started × their monthly value | LOW | Filter subscriptions by created_at in current month |
| **Churned MRR** | Subscriptions canceled × their monthly value. Churn rate % | LOW | Subscriptions where status changed to 'canceled' in period |
| **Plan distribution** | How many companies on each plan. Visualizes upgrade funnel. | LOW | COUNT companies GROUP BY plan |
| **Total companies / active companies** | Total registered vs active (at least 1 booking in 30 days) | LOW | Simple aggregate queries |
| **Failed payment rate** | % of renewal attempts that fail. High rate = dunning problem. | LOW | Requires subscription billing (Category 1) |

### Anti-Features — Analytics

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|----------|-------------------|
| **Real-time dashboard (WebSocket)** | SMBs don't need live updates. Booking comes in every few hours. Over-engineering. | 5-minute cache. Refresh button. |
| **OLAP / data warehouse** | ScheduleBox at CZ/SK scale (500-5000 customers) doesn't need BigQuery or Snowflake. | Optimized PostgreSQL queries + materialized views + Redis cache. |
| **Custom report builder** | Drag-and-drop analytics = months of engineering. SMB owners won't use it. | Fixed, opinionated reports. Date range filter. Export to CSV. |
| **Revenue recognition (GAAP)** | Deferred revenue, ASC 606 — enterprise accounting territory. | Cash basis reporting only. Show what was charged when. |
| **Competitor intelligence in this phase** | Feature already documented in spec (Phase 12) but is low ROI. | Exclude from v1.3 scope. AI feature but not analytics category. |

### User Flows

**Owner Analytics Daily Check:**
1. Dashboard → Analytics (or dedicated /analytics page)
2. Default view: "This Month" date range
3. Above-fold: Revenue total, bookings count, new customers, occupancy rate (4 KPI cards)
4. Below-fold: Revenue chart (bar/line, day by day), Top Services table, Top Staff table
5. Peak hours heatmap (bottom section)
6. Filter: dropdown for date range → charts re-query automatically

**Multi-Location Analytics:**
1. Analytics page → Location dropdown: "All Locations" (default) / "Prague" / "Brno"
2. "All Locations" = aggregated view with location breakdown table below charts
3. Single location = same view as current single-location dashboard

### Complexity Assessment

| Aspect | Complexity | Reason |
|--------|-----------|--------|
| Revenue + booking charts | LOW-MEDIUM | Standard SQL aggregation. Already partial analytics in place. |
| Occupancy rate | HIGH | Requires computing available slots from working hours, excluding blocked time |
| Cohort retention analysis | HIGH | Window function SQL, only meaningful with sufficient data history |
| AI prediction overlay | HIGH | Depends on trained forecasting model (Phase 23 output) |
| Platform admin dashboard | MEDIUM | Depends on subscription billing existing first (Category 1) |
| Multi-location analytics | HIGH | Depends on Category 2 (locations) being implemented |

---

## Category 5: Frontend / Design System Polish

### How Competing Platforms Handle This

**Calendly 2024-2025:** Polished "product-led" aesthetic. Clean white with strategic purple accents. Heavy use of white space. Every button has hover state, disabled state, loading state. Motion is purposeful (200ms ease transitions). Top-tier typography hierarchy (Inter font, clear H1/H2/body contrast).

**Fresha:** Dark sidebar, light content area. Consistent 8px grid. Color-coded status badges (green=confirmed, yellow=pending, red=canceled). The booking calendar is pixel-perfect.

**Mangomint/Pabau (premium positioning):** $300-500/month tier pricing is justified visually. Every component feels intentional. Empty states have illustrations + CTAs. Loading skeletons instead of spinners. Responsive across tablet (salon owners use iPads).

**shadcn/ui + Tailwind (2025 best practice):** Design tokens (CSS variables) as single source of truth. Component-level Storybook documentation. Dark mode via `class="dark"`. Consistent spacing via `space-y-*`, `gap-*` Tailwind utilities. No hardcoded colors.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing Features |
|---------|-------------|-----------|----------------------------------|
| **Consistent color palette enforcement** | Single CSS variable set drives all component colors. No rogue `#3B82F6` hardcoded. | LOW | Audit existing `globals.css`. Enforce via Tailwind config `theme.extend.colors`. |
| **Loading states on all async actions** | Every button click that triggers API call shows spinner or loading text. No double-submit. | MEDIUM | Systematic audit of all form/button components. Add `disabled + loading` states. Currently inconsistent. |
| **Empty states with CTAs** | "You have no bookings yet" + "Create your first booking" button. Every list view. | LOW | 5-8 components to add. shadcn `EmptyState` pattern. |
| **Error states on forms** | Inline validation errors on all form fields. Not just red borders — text explaining the error. | MEDIUM | Existing Zod validation returns errors. Frontend must surface them consistently. |
| **Toast notification consistency** | Success/error/warning toasts use the same component (shadcn Sonner). Not mix of alert types. | LOW | Audit and standardize. Already have toast infrastructure. |
| **Mobile responsiveness (tablet-first)** | Salon owners use iPads. Calendar and booking list must work on 768px screen. | MEDIUM | Test and fix current breakpoints. Calendar component most problematic. |
| **Typography hierarchy** | H1 → H2 → H3 → body → caption — all consistent sizes, weights, line-heights. | LOW | CSS variable or Tailwind typography config. |
| **Button state completeness** | Every button: default, hover, active, disabled, loading. Consistent across all buttons. | MEDIUM | Systematic audit. shadcn Button component already has these variants; must be used consistently. |
| **Skeleton loaders over spinners** | Page-level loading uses content skeletons (maintains layout). Spinners only for actions. | MEDIUM | Replace spinner patterns on main list pages (bookings, customers, analytics). |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|-----------|-------|
| **Dark mode** | Tech-forward SMB owners (barbershops, fitness studios) strongly prefer dark UI. Already documented in spec. | MEDIUM | Tailwind `dark:` classes + CSS variable flip. shadcn already supports `class="dark"`. System preference detection. |
| **Micro-animations on state changes** | Booking status change: subtle fade transition. List item delete: slide-out animation. | LOW-MEDIUM | Tailwind `transition-*` utilities. Framer Motion for complex cases. Perceived quality increase. |
| **Command palette (⌘K)** | Power users (owners who know keyboard shortcuts) love this. Modern SaaS standard. | MEDIUM | shadcn `cmdk` package. Search across bookings, customers, services. Navigate without mouse. |
| **Onboarding progress indicator** | New users see "Setup Progress: 3/5 steps complete" in sidebar. Clear path to activation. | LOW | Existing onboarding wizard (Phase 27). Progress persistence in user profile. |
| **Branded color customization** | Business can set their brand color used in booking widget and customer-facing emails. | MEDIUM | CSS variable override per company. Complicates dark mode interaction. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|----------|-------------------|
| **Full Figma design system documentation** | Internal dev tool. Doesn't ship product. | Code-only component standards. Comments in components. |
| **Custom icon library** | Building proprietary icons = months of work. Lucide React (already used by shadcn) is comprehensive. | Stick with Lucide React. Use consistent icon sizes (16/20/24px). |
| **Complex animation library** | Lottie/GSAP for loading animations = unnecessary dependency and bundle size. | CSS transitions + Tailwind. Framer Motion only for 2-3 key interactions. |
| **Full Storybook setup** | Valuable but time-consuming. SMB SaaS at this stage needs shipping, not documentation. | README component usage notes. Add Storybook in v1.4 when team grows. |
| **Complete accessibility audit** | WCAG 2.1 AA full audit = specialist work. | Maintain keyboard navigation and aria-labels on interactive elements. Screen reader basics only. |

### User Flows (Design Audit Focus)

**Highest-Impact Polish Areas (evidence-based priority):**

1. **Booking creation flow** — Entry point for primary value. Any friction here = customer dissatisfaction. Audit: wizard steps, slot selection, confirmation page.

2. **Dashboard (first screen after login)** — First impression daily. Must be scannable in 5 seconds. Audit: KPI cards, chart, today's appointments list.

3. **Settings / Plan page** — Where subscription decisions happen. Must feel premium and trustworthy to justify CZK 2,990/month.

4. **Public booking widget** — Customer-facing. Embeds on owner's website. Must work flawlessly and match owner's brand.

5. **Mobile calendar view** — Salon owners check their schedule on mobile constantly. Must be pixel-perfect at 375px.

### Complexity Assessment

| Aspect | Complexity | Reason |
|--------|-----------|--------|
| Loading/error state audit | MEDIUM | Systematic but low-creativity work. All routes/forms must be touched. |
| Empty states | LOW | New component, add to 5-8 pages. |
| Dark mode | MEDIUM | CSS variable flip straightforward; must verify all custom styles use variables. |
| Mobile calendar fix | MEDIUM-HIGH | Calendar grid is notoriously tricky at small viewports. |
| Command palette | MEDIUM | cmdk library makes it fast; indexing data for search adds complexity. |
| Typography/spacing | LOW | Config change + audit. |

---

## Cross-Category Feature Dependencies

```
Category 1 (Billing) → Category 3 (Usage Gating)
   Billing must exist to enforce plan-based limits meaningfully.
   Without billing, limits are enforced but no upgrade path exists.

Category 2 (Multi-Location) → Category 4 (Analytics)
   Multi-location analytics requires location entity to exist.
   Build location DB schema first, analytics aggregation second.

Category 1 (Billing) → Category 4 (Platform Admin Dashboard)
   MRR/ARR dashboard requires subscription records to exist.

Category 3 (Usage Gating) → Category 1 (Billing)
   Upgrade prompts (gating) must route to subscription flow (billing).
   Both must exist for the loop to close.

Category 5 (Design Polish) — independent, but:
   Plan/settings page polish should happen after billing is built
   (you're polishing the page that shows subscription state).
```

**Recommended build order within v1.3:**
1. Category 1 — Subscription Billing (enables everything else)
2. Category 3 — Usage Gating (pairs with billing to close the upgrade loop)
3. Category 2 — Multi-Location (independent, highest complexity, most value for Growth tier upsell)
4. Category 4 — Analytics (parallel with multi-location; platform dashboard after billing)
5. Category 5 — Design Polish (ongoing, highest priority on pages that subscription/billing build touches)

---

## MVP Recommendation

**Must have for v1.3 launch (revenue generation depends on these):**

1. Comgate recurring subscription integration (Category 1 — core)
2. Subscription lifecycle state machine (Category 1 — core)
3. Monthly renewal job + dunning email flow (Category 1 — core)
4. Booking count entitlement check + upgrade prompt (Category 3 — core)
5. Staff count + AI feature gating (Category 3 — core)
6. Revenue + bookings analytics dashboard (Category 4 — owner)
7. Loading/empty/error state audit (Category 5 — polish)

**Should have for v1.3 (increases tier adoption and retention):**

8. Proration on upgrade + invoice PDF (Category 1)
9. Multi-location entity + location switcher (Category 2)
10. Central admin + location manager roles (Category 2)
11. Peak hours heatmap + top staff/service charts (Category 4)
12. Dark mode + skeleton loaders (Category 5)

**Defer to v1.4 (complex, lower immediate revenue impact):**

- Cross-location booking (Category 2) — very high complexity
- Per-location payout accounts (Category 2) — Comgate multi-merchant complexity
- Customer cohort retention analysis (Category 4) — needs data history to be meaningful
- Overage billing (Category 3) — new billing concept
- Branch-level AI models (Category 2) — requires per-location training data
- Annual billing cycle (Category 1) — lower urgency than monthly subscription

---

## CZ/SK Market Considerations

| Consideration | Impact | Notes |
|--------------|--------|-------|
| **Czech invoice requirements** | HIGH | IČO mandatory on B2B invoices. 15-day issuance window. 10-year retention. Already have PDF generation — extend it. |
| **Comgate is not Stripe** | HIGH | No built-in subscription management, proration, or dunning. All must be custom-built. Recurring feature requires account-level approval from Comgate. |
| **GDPR on subscription data** | MEDIUM | Payment method tokens stored at Comgate — not in ScheduleBox DB (correct). Subscription records must be deletable per GDPR right-to-erasure (preserve for 10 years if invoice exists — legal conflict to resolve). |
| **CZK pricing psychology** | MEDIUM | SMB owners compare to Reservio (250-1500 Kč) and Reservanto (200-800 Kč). Essential at 490 Kč is competitive. Growth at 1,490 Kč needs clear AI/multi-staff justification. |
| **Seasonal business model** | MEDIUM | Ski instructors, summer camps, event photographers = high churn in off-season. Subscription pause feature (Category 1 differentiator) directly addresses this and reduces Czech/Slovak churn. |
| **Preference for phone/face-to-face support** | LOW | Czech SMBs don't self-serve billing issues. In-app chat or email support link on billing pages reduces involuntary churn. |
| **Slovak market VAT** | LOW | Slovak VAT is 20% (not Czech 21%). If billing Slovak companies, VAT rate must be configurable per company country. |

---

## Sources

- [Comgate Recurring Payments](https://help.comgate.cz/docs/en/recurring-payments) — MEDIUM confidence (docs require auth to access full detail)
- [Comgate Payment Methods Overview](https://apidoc.comgate.cz/en/metody-platebni-brany/) — MEDIUM confidence
- [Fresha Multi-Location Management](https://www.fresha.com/blog/easy-ways-to-manage-multiple-locations) — HIGH confidence (official blog)
- [Pabau Multi-Location Scheduling](https://pabau.com/blog/multi-location-scheduling-software/) — HIGH confidence (official platform)
- [Stigg — Beyond Metering (Usage Limits)](https://www.stigg.io/blog-posts/beyond-metering-the-only-guide-youll-ever-need-to-implement-usage-based-pricing) — HIGH confidence (authoritative technical guide)
- [Appcues — Freemium Upgrade Prompts](https://www.appcues.com/blog/best-freemium-upgrade-prompts) — MEDIUM confidence (industry blog with case studies)
- [Stripe — Upgrade/Downgrade Subscriptions](https://docs.stripe.com/billing/subscriptions/upgrade-downgrade) — HIGH confidence (official docs)
- [Chargebee — Proration](https://www.chargebee.com/subscription-management/handle-prorations/) — HIGH confidence (billing platform docs)
- [Kinde — Dunning Strategies](https://kinde.com/learn/billing/churn/dunning-strategies-for-saas-email-flows-and-retry-logic/) — MEDIUM confidence
- [Engageware — Appointment Analytics](https://engageware.com/blog/the-hidden-value-of-appointment-scheduling-analytics/) — MEDIUM confidence
- [Eurofiscalis — Czech Invoice Requirements](https://www.eurofiscalis.com/en/invoicing-in-czech-republic/) — HIGH confidence (official tax advisory)
- [Shadn/ui Design Tokens](https://shadisbaih.medium.com/building-a-scalable-design-system-with-shadcn-ui-tailwind-css-and-design-tokens-031474b03690) — MEDIUM confidence
- [SaaS KPIs Dashboard — HubiFi](https://www.hubifi.com/blog/saas-kpi-dashboard-metrics) — MEDIUM confidence
- [VisionWrights — Multi-Location Analytics](https://visionwrights.com/blog/multi-location-analytics-what-franchise-operators-need) — MEDIUM confidence

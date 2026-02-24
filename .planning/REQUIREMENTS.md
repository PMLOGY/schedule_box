# Requirements: ScheduleBox

**Defined:** 2026-02-24 (v1.3)
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

---

## v1.3 Requirements

### Subscription Billing

- [ ] **BILL-01**: Comgate recurring payment initialization — first payment creates recurring template, server stores `initRecurringId` for future charges
- [ ] **BILL-02**: Subscription state machine with states: trialing, active, past_due, cancelled, expired — transitions triggered by Comgate webhooks and manual actions
- [ ] **BILL-03**: Plan upgrade and downgrade — immediate plan change with prorated billing for the current period
- [ ] **BILL-04**: Invoice PDF generation for each billing cycle with Czech VAT compliance (ICO, DIC, sequential numbering)
- [ ] **BILL-05**: Comgate recurring webhook handler — processes payment success, failure, and cancellation events with idempotent `subscription_events` log
- [ ] **BILL-06**: Billing portal page — current plan, next payment date, plan comparison, upgrade/downgrade buttons, invoice history with PDF download
- [ ] **BILL-07**: BullMQ recurring billing job — initiates Comgate charge on billing cycle date, handles retries on failure, updates subscription state

### Usage Limits and Tier Enforcement

- [ ] **LIMIT-01**: Redis-based atomic usage counters per company per billing period (bookings/month, employees, services)
- [ ] **LIMIT-02**: Hard limit on booking creation — block immediately when monthly booking quota exceeded, show upgrade prompt
- [ ] **LIMIT-03**: Hard limit on employee and service creation — block when tier maximum exceeded, show upgrade prompt
- [ ] **LIMIT-04**: Usage dashboard widget showing current consumption vs tier limits with visual progress bars
- [ ] **LIMIT-05**: Plan tier limits configuration — Free: 50 bookings/month, Essential: 500, Growth: 2000, AI-Powered: unlimited

### Multi-Location Organizations

- [ ] **ORG-01**: Organizations table linking multiple companies (locations) under one franchise entity, with `organization_owner` role
- [ ] **ORG-02**: Location switcher in dashboard header — switch active company context via `/auth/switch-location` endpoint issuing new JWT
- [ ] **ORG-03**: Organization-level RBAC roles — franchise_owner (all locations), location_manager (single location), with permission checks
- [ ] **ORG-04**: Organization dashboard showing all locations with key metrics (bookings, revenue, occupancy) per location
- [ ] **ORG-05**: Cross-location customer visibility — customers visible and searchable across all locations within an organization
- [ ] **ORG-06**: Location CRUD from organization settings — add new location, edit location details, deactivate location

### Analytics and Reporting

- [ ] **ANLYT-01**: Revenue dashboard — daily/weekly/monthly revenue line charts, payment method breakdown pie chart, revenue per service
- [ ] **ANLYT-02**: Booking analytics — booking volume trends, peak hours heatmap, service popularity ranking, cancellation and no-show rates
- [ ] **ANLYT-03**: Customer retention metrics — repeat booking rate, customer churn, CLV distribution histogram
- [ ] **ANLYT-04**: Employee utilization dashboard — bookings per employee bar chart, utilization percentage, revenue attribution per employee
- [ ] **ANLYT-05**: Cross-location aggregate analytics for franchise owners — org-level totals with per-location breakdown drill-down
- [ ] **ANLYT-06**: Platform admin dashboard — MRR chart, churn rate, plan distribution, active company count, new signups trend
- [ ] **ANLYT-07**: PostgreSQL materialized views for analytics pre-aggregation with BullMQ nightly refresh job
- [ ] **ANLYT-08**: Exportable reports — PDF and CSV export for revenue, bookings, and customer reports

### Frontend Polish and Design System

- [ ] **UI-01**: Dashboard redesign — professional layout grid with data visualization cards, KPI summary row, quick actions
- [ ] **UI-02**: Design system harmonization — consistent spacing scale, typography hierarchy, color palette, shadow system, border radii across all pages
- [ ] **UI-03**: Landing page upgrade — real imagery, improved hero animations, better copywriting, testimonials section refresh
- [ ] **UI-04**: Dark mode support — system preference detection, manual toggle, all components and pages styled for dark theme
- [ ] **UI-05**: Loading and error states audit — skeleton loaders on every data-fetching page, consistent error boundaries, empty states review
- [ ] **UI-06**: Responsive design audit — mobile/tablet/desktop breakpoints verified on all dashboard and marketing pages

---

## Future Requirements (v1.4+)

- **PERF-01**: Load testing with k6 against production-like environment
- **SEC-01**: Penetration testing and security audit
- **SCALE-01**: Horizontal scaling validation with multiple web instances
- **VOICE-01**: Natural language / voice booking via OpenAI NLU integration
- **TENANT-01**: Per-tenant AI models (requires >10K bookings per company)
- **FORECAST-01**: Capacity forecast chart with Prophet (needs real historical data)
- **NOTIF-01**: In-app notification center with real-time updates
- **API-01**: Public API with OAuth2 for third-party integrations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | PWA sufficient, defer to v2.0 |
| Stripe billing | Using Comgate recurring — single Czech provider for all payments |
| Per-tenant AI models | SMBs have 50-500 bookings, need >10K for meaningful per-tenant training |
| Capacity forecast chart | Prophet needs real data, not synthetic, to be credible |
| Real-time chat | High complexity, not core to scheduling value |
| White-label multi-tenant | Franchise model covers multi-location; full white-label is v2.0+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BILL-01 | Phase 28 | Pending |
| BILL-02 | Phase 28 | Pending |
| BILL-03 | Phase 28 | Pending |
| BILL-04 | Phase 28 | Pending |
| BILL-05 | Phase 28 | Pending |
| BILL-06 | Phase 28 | Pending |
| BILL-07 | Phase 28 | Pending |
| LIMIT-01 | Phase 29 | Pending |
| LIMIT-02 | Phase 29 | Pending |
| LIMIT-03 | Phase 29 | Pending |
| LIMIT-04 | Phase 29 | Pending |
| LIMIT-05 | Phase 29 | Pending |
| ORG-01 | Phase 30 | Pending |
| ORG-02 | Phase 30 | Pending |
| ORG-03 | Phase 30 | Pending |
| ORG-04 | Phase 30 | Pending |
| ORG-05 | Phase 30 | Pending |
| ORG-06 | Phase 30 | Pending |
| ANLYT-01 | Phase 31 | Pending |
| ANLYT-02 | Phase 31 | Pending |
| ANLYT-03 | Phase 31 | Pending |
| ANLYT-04 | Phase 31 | Pending |
| ANLYT-05 | Phase 31 | Pending |
| ANLYT-06 | Phase 31 | Pending |
| ANLYT-07 | Phase 31 | Pending |
| ANLYT-08 | Phase 31 | Pending |
| UI-01 | Phase 32 | Pending |
| UI-02 | Phase 32 | Pending |
| UI-03 | Phase 32 | Pending |
| UI-04 | Phase 32 | Pending |
| UI-05 | Phase 32 | Pending |
| UI-06 | Phase 32 | Pending |

**Coverage:**
- v1.3 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---

_Requirements defined: 2026-02-24_
_Last updated: 2026-02-24 after roadmap creation (all 32 requirements mapped)_

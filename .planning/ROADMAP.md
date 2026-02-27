# ScheduleBox — Roadmap

## Milestones

- **v1.0 ScheduleBox Platform** — Phases 1-15 (shipped 2026-02-12)
- **v1.1 Production Hardening** — Phases 16-22 (shipped 2026-02-21)
- **v1.2 Product Readiness** — Phases 23-27 (shipped 2026-02-24)
- **v1.3 Revenue & Growth** — Phases 28-32 (shipped 2026-02-25)
- **v1.4 Design Overhaul** — Phases 33-37 (in progress)

## Phases

<details>
<summary>v1.0 ScheduleBox Platform (Phases 1-15) — SHIPPED 2026-02-12</summary>

### Milestone 1: Foundation & MVP
- [x] Phase 1: Project Setup & Infrastructure (7/10 plans) — completed 2026-02-10
- [x] Phase 2: Database Foundation (9/9 plans) — completed 2026-02-10
- [x] Phase 3: Auth & Core Services (8/8 plans) — completed 2026-02-10
- [x] Phase 4: Frontend Shell (8/8 plans) — completed 2026-02-11
- [x] Phase 5: Booking MVP (8/9 plans) — completed 2026-02-11
- [x] Phase 6: Payment Integration (7/7 plans) — completed 2026-02-11

### Milestone 2: Business Features
- [x] Phase 7: Notifications & Automation (7/7 plans) — completed 2026-02-11
- [x] Phase 8: CRM & Marketing (3/3 plans) — completed 2026-02-11
- [x] Phase 9: Loyalty Program (8/8 plans) — completed 2026-02-11

### Milestone 3: AI & Advanced
- [x] Phase 10: AI Phase 1 — Predictions (4/4 plans) — completed 2026-02-11
- [x] Phase 11: AI Phase 2 — Optimization (5/5 plans) — completed 2026-02-11
- [x] Phase 12: Advanced Features (8/8 plans) — completed 2026-02-12

### Milestone 4: Polish & Launch
- [x] Phase 13: Polish (4/4 plans) — completed 2026-02-12
- [x] Phase 14: AI Phase 3 — Voice & Intelligence (5/5 plans) — completed 2026-02-12
- [x] Phase 15: DevOps & Launch (6/6 plans) — completed 2026-02-12

</details>

<details>
<summary>v1.1 Production Hardening (Phases 16-22) — SHIPPED 2026-02-21</summary>

- [x] Phase 16: Testing Foundation (4/4 plans) — completed 2026-02-20
- [x] Phase 17: Integration Testing (3/3 plans) — completed 2026-02-20
- [x] Phase 18: E2E Testing (3/3 plans) — completed 2026-02-20
- [x] Phase 19: Email Delivery (4/4 plans) — completed 2026-02-20
- [x] Phase 20: SMS Delivery (3/3 plans) — completed 2026-02-24
- [x] Phase 21: Payment Processing (3/3 plans) — completed 2026-02-24
- [x] Phase 22: Monitoring & Alerts (2/2 plans) — completed 2026-02-20

**Note:** Twilio (Phase 20-03) and Comgate (Phase 21-03) credentials configured 2026-02-24. All plans complete.

</details>

<details>
<summary>v1.2 Product Readiness (Phases 23-27) — SHIPPED 2026-02-24</summary>

- [x] Phase 23: AI Service Training Pipeline (5/5 plans) — completed 2026-02-24
- [x] Phase 24: AI-Powered UI Surfaces (2/2 plans) — completed 2026-02-24
- [x] Phase 25: Landing Page & Czech Legal (4/4 plans) — completed 2026-02-21
- [x] Phase 26: Booking UX Polish (4/4 plans) — completed 2026-02-24
- [x] Phase 27: Onboarding Wizard (5/5 plans, incl. gap closure) — completed 2026-02-24

**34 requirements delivered with 100% coverage.** Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.3 Revenue & Growth (Phases 28-32) — SHIPPED 2026-02-25</summary>

**Milestone goal:** Enable ScheduleBox to generate recurring revenue through subscription billing, enforce plan tiers, support franchise businesses with multi-location management, and deliver analytics dashboards and frontend polish that justify paid tier pricing.

**Requirements:** 32 total (BILL-01..07, LIMIT-01..05, ORG-01..06, ANLYT-01..08, UI-01..06)

- [x] Phase 28: Subscription Billing Infrastructure (5/5 plans) — completed 2026-02-24
- [x] Phase 29: Usage Limits and Tier Enforcement (3/3 plans) — completed 2026-02-24
- [x] Phase 30: Multi-Location Organizations (5/5 plans) — completed 2026-02-24
- [x] Phase 31: Analytics and Reporting (5/5 plans) — completed 2026-02-25
- [x] Phase 32: Frontend Polish and Design System (3/3 plans) — completed 2026-02-25

</details>

---

## v1.4 Design Overhaul (Phases 33-37)

**Milestone goal:** Transform ScheduleBox from a functional AI-generated-looking app into a premium, distinctive SaaS product through a full visual redesign applying glassmorphism and the Behance blue (#0057FF) aesthetic across every page — making the product look worth 2,990 CZK/month.

**Requirements:** 31 total (DSYS-01..07, COMP-01..06, DASH-01..05, MKTG-01..05, AUTH-01..03, POLSH-01..06)

**Build order rationale:** Tokens before components (CSS variables must exist before any component references them — undefined variables silently produce transparent effects). Components before pages (verify glass system works in isolation before applying to live pages). Dashboard before marketing (higher z-index complexity with calendar popovers, booking drawers, and reservation modals). Auth last (simplest structure, single card). Polish bundled with auth since auth scope is small.

**Frontend-only milestone:** No backend, API, database, or RabbitMQ changes in any phase.

---

### Phase 33: Token Foundation and Background System

**Goal:** The glass design system infrastructure exists in CSS and Tailwind config, making all subsequent glass effects possible and correctly themed in both light and dark mode.

**Dependencies:** None (first phase of v1.4).

**Requirements:** DSYS-01, DSYS-02, DSYS-03, DSYS-04, DSYS-05, DSYS-06, DSYS-07

**Plans:** 2 plans

Plans:
- [ ] 33-01-PLAN.md — Glass CSS token system + gradient mesh backgrounds + accessibility fallbacks in globals.css
- [ ] 33-02-PLAN.md — Tailwind config extensions + glass-plugin.ts + Plus Jakarta Sans font swap

**Success Criteria** (what must be TRUE):

1. Applying the `gradient-mesh` class to any layout wrapper produces a visible radial gradient background with colored orbs in both light and dark mode, with distinct orb saturation values for each theme.
2. Applying `glass-surface`, `glass-surface-subtle`, or `glass-surface-heavy` to any `div` over a gradient background produces a visibly frosted glass panel; the effect is absent on a flat background, confirming the class works correctly by requiring a background behind it.
3. On a viewport below 768px, the blur intensity of all glass surfaces is automatically reduced (verifiable by inspecting computed styles); no JavaScript is involved in this degradation.
4. With `prefers-reduced-transparency` enabled in OS accessibility settings, all glass surfaces fall back to opaque card backgrounds; with `prefers-reduced-transparency` off and `@supports (backdrop-filter)` true, glass is active.
5. All text on any glass surface passes WCAG 4.5:1 contrast ratio when tested with the brightest gradient orb positioned directly behind it, due to the semi-opaque `::before` scrim baked into the `glass-surface` base class.

---

### Phase 34: Primitive Components and shadcn Variants

**Goal:** The glass component library is complete and verified: existing shadcn components have opt-in glass variants, and new primitive components exist for layout-level glass usage — all backward compatible with zero changes to existing usage.

**Dependencies:** Phase 33 (glass tokens and gradient mesh must exist before any component references `var(--glass-bg)` or `glass-surface`).

**Requirements:** COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06

**Plans:** 2 plans

Plans:
- [x] 34-01-PLAN.md — CVA glass variants on Card, Button, Dialog, Badge components
- [x] 34-02-PLAN.md — GlassPanel and GradientMesh primitive components

**Success Criteria** (what must be TRUE):

1. Every existing `<Card />`, `<Button />`, `<Dialog />`, and `<Badge />` in the codebase renders identically to before this phase — no existing usage required a prop change.
2. `<Card variant="glass" />` renders a frosted glass card with correct border, shadow, and blur values in both light and dark mode; hovering the card transitions to `shadow-glass-hover` with a smooth CSS transition.
3. `<Dialog />` opened over a gradient background shows a heavy glass panel (glass-surface-heavy) for the content area and a blurred backdrop overlay; existing Dialog usage (booking detail, upgrade modal) remains functional with no prop changes.
4. `<Badge variant="glass" />` renders booking status pills (Confirmed, Cancelled, No-show) as translucent glass with correct color tints visible in both light and dark mode.
5. `<GradientMesh />` placed in a layout renders as a `fixed inset-0 -z-10` background that does not create a CSS stacking context, confirmed by verifying that dropdowns and modals in the same layout continue to layer above it correctly.

---

### Phase 35: Dashboard Glass Application

**Goal:** The logged-in dashboard experience uses glass throughout — gradient mesh background, glass KPI cards, frosted header — while all data-dense surfaces (tables, calendar cells, chart canvases) remain opaque and every existing overlay (calendar popovers, booking drawers, modals) continues to layer correctly.

**Dependencies:** Phase 34 (glass components must exist before pages apply them).

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05

**Plans:** 2 plans

Plans:
- [ ] 35-01-PLAN.md — Dashboard layout gradient mesh + stacking context audit + header frosted glass
- [ ] 35-02-PLAN.md — KPI stat cards glass variant + all dashboard sub-pages glass card wrappers

**Success Criteria** (what must be TRUE):

1. The dashboard header is a frosted glass bar (glass-surface-subtle, sticky top-0) that shows a slight blur of content scrolling behind it; the location switcher dropdown and theme toggle inside the header remain fully functional.
2. The four KPI stat cards on the dashboard home use `Card variant="glass"` and transition to `shadow-glass-hover` on hover; the dashboard welcome heading uses gradient text.
3. All dashboard sub-pages (calendar, bookings, customers, analytics, settings, billing, organization) wrap their content sections in glass cards, while data tables, calendar cells, and chart canvases inside those pages are explicitly opaque.
4. The dashboard sidebar remains solid with no glass treatment; sidebar navigation text is legible at all nav-item sizes in both light and dark mode.
5. All existing interactive overlays — the calendar day popover, booking detail drawer, reservation modal, and dropdown menus — layer correctly above the glass dashboard layout with no z-index clipping or stacking context interference.

---

### Phase 36: Marketing Pages Glass Application

**Goal:** The marketing landing page and secondary pages present a premium, high-conversion glass aesthetic with gradient mesh, glass navigation, glass pricing and feature cards, and animated aurora on the hero — making a prospect's first impression match a 2,990 CZK/month product.

**Dependencies:** Phase 34 (glass components must exist). Phase 35 is not required (marketing and dashboard are independent route groups).

**Requirements:** MKTG-01, MKTG-02, MKTG-03, MKTG-04, MKTG-05

**Plans:** 2 plans

Plans:
- [ ] 36-01-PLAN.md — Marketing layout gradient mesh + glass navbar + hero section with aurora animation
- [ ] 36-02-PLAN.md — Pricing glass cards + testimonials glass cards + footer + privacy/terms pages

**Success Criteria** (what must be TRUE):

1. The marketing layout applies a vibrant gradient mesh background across all marketing pages; the navbar is a glass bar (glass-surface) that replaces the previous solid navigation and remains functional including the mobile slide-over menu.
2. The landing page hero `<h1>` uses gradient text (blue-to-indigo), and the hero section has a slow-moving aurora animation (15-20s CSS keyframe cycle) visible behind the content without degrading scroll performance.
3. The pricing section shows the featured Growth tier with `glass-surface` treatment and the other tiers with `glass-surface-subtle`; all CTA buttons (the primary conversion actions) remain solid with no glass treatment.
4. Testimonials and social proof sections use glass card containers, and the footer and secondary marketing pages (privacy, terms) are styled consistently with the rest of the marketing glass system.
5. The mobile navigation slide-over opens correctly over the fixed gradient mesh background with no visual clipping or stacking context breakage; the overlay layers above the gradient mesh at all tested breakpoints (375px, 768px).

---

### Phase 37: Auth Pages and Polish Pass

**Goal:** Auth pages present a premium glass card entry experience, and the full v1.4 polish layer is complete — entrance animations, glass shimmer loading, glass interactive components, dark mode QA, and responsive QA — making the product feel complete and deliberate at every interaction.

**Dependencies:** Phase 34 (glass components), Phase 35 (dashboard animations reference dashboard page structure), Phase 36 (polish QA covers marketing pages).

**Requirements:** AUTH-01, AUTH-02, AUTH-03, POLSH-01, POLSH-02, POLSH-03, POLSH-04, POLSH-05, POLSH-06

**Plans:** 2 plans

Plans:
- [ ] 37-01-PLAN.md — Auth layout glass card + entrance animation + glass dropdowns and tooltips
- [ ] 37-02-PLAN.md — Glass shimmer loading skeletons + KPI card entrance animations + dark mode QA + responsive QA

**Success Criteria** (what must be TRUE):

1. The login, register, and reset-password pages show a centered glass card (glass-surface-heavy) on a gradient mesh background; the card slides up and fades in on page load using the Motion library; all form inputs inside the card are opaque with clear focus states.
2. On the dashboard, the four KPI stat cards animate in with a stagger effect (50ms per card, 300ms ease-out fade and slide) on initial page load; the animation does not replay on tab switch or re-render.
3. Loading states in glass contexts (dashboard sub-pages, auth card pending state) show a glass shimmer skeleton with a Motion-powered shimmer wave, replacing the flat `PageSkeleton` and `TableSkeleton` components.
4. shadcn Select and DropdownMenu components in settings and filter contexts show a glass panel style; shadcn Tooltip shows a frosted glass style instead of the default black rectangle.
5. All glass components on every page are visually correct in dark mode on a #191919 base: opacity values are high enough to be visible (not below 50%), borders are prominent enough to define the glass edge, and gradient orbs have sufficient saturation to be seen through the glass.
6. All pages pass a responsive review at 375px, 768px, and 1280px: no horizontal scroll, no element overlap, glass blur degradation is active on the 375px viewport, and all interactive elements have adequate tap target sizes.

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Project Setup | v1.0 | 7/10 | Complete | 2026-02-10 |
| 2. Database Foundation | v1.0 | 9/9 | Complete | 2026-02-10 |
| 3. Auth & Core | v1.0 | 8/8 | Complete | 2026-02-10 |
| 4. Frontend Shell | v1.0 | 8/8 | Complete | 2026-02-11 |
| 5. Booking MVP | v1.0 | 8/9 | Complete | 2026-02-11 |
| 6. Payments | v1.0 | 7/7 | Complete | 2026-02-11 |
| 7. Notifications | v1.0 | 7/7 | Complete | 2026-02-11 |
| 8. CRM & Marketing | v1.0 | 3/3 | Complete | 2026-02-11 |
| 9. Loyalty | v1.0 | 8/8 | Complete | 2026-02-11 |
| 10. AI Predictions | v1.0 | 4/4 | Complete | 2026-02-11 |
| 11. AI Optimization | v1.0 | 5/5 | Complete | 2026-02-11 |
| 12. Advanced | v1.0 | 8/8 | Complete | 2026-02-12 |
| 13. Polish | v1.0 | 4/4 | Complete | 2026-02-12 |
| 14. AI Voice | v1.0 | 5/5 | Complete | 2026-02-12 |
| 15. DevOps & Launch | v1.0 | 6/6 | Complete | 2026-02-12 |
| 16. Testing Foundation | v1.1 | 4/4 | Complete | 2026-02-20 |
| 17. Integration Testing | v1.1 | 3/3 | Complete | 2026-02-20 |
| 18. E2E Testing | v1.1 | 3/3 | Complete | 2026-02-20 |
| 19. Email Delivery | v1.1 | 4/4 | Complete | 2026-02-20 |
| 20. SMS Delivery | v1.1 | 3/3 | Complete | 2026-02-24 |
| 21. Payment Processing | v1.1 | 3/3 | Complete | 2026-02-24 |
| 22. Monitoring & Alerts | v1.1 | 2/2 | Complete | 2026-02-20 |
| 23. AI Service | v1.2 | 5/5 | Complete | 2026-02-24 |
| 24. AI-Powered UI | v1.2 | 2/2 | Complete | 2026-02-24 |
| 25. Landing Page | v1.2 | 4/4 | Complete | 2026-02-21 |
| 26. Booking UX Polish | v1.2 | 4/4 | Complete | 2026-02-24 |
| 27. Onboarding Wizard | v1.2 | 5/5 | Complete | 2026-02-24 |
| 28. Subscription Billing | v1.3 | 5/5 | Complete | 2026-02-24 |
| 29. Usage Limits | v1.3 | 3/3 | Complete | 2026-02-24 |
| 30. Multi-Location Orgs | v1.3 | 5/5 | Complete | 2026-02-24 |
| 31. Analytics | v1.3 | 5/5 | Complete | 2026-02-25 |
| 32. Frontend Polish | v1.3 | 3/3 | Complete | 2026-02-25 |
| 33. Token Foundation | v1.4 | 2/2 | Complete | 2026-02-25 |
| 34. Component Glass Variants | v1.4 | 2/2 | Complete | 2026-02-25 |
| 35. Dashboard Glass | v1.4 | 2/2 | Complete | 2026-02-25 |
| 36. Marketing Glass | v1.4 | 2/2 | Complete | 2026-02-25 |
| 37. Auth and Polish | v1.4 | TBD | Not started | - |

---
*Roadmap created: 2026-02-10*
*v1.0 shipped: 2026-02-12*
*v1.1 shipped: 2026-02-21*
*v1.2 shipped: 2026-02-24*
*v1.3 shipped: 2026-02-25*
*v1.4 roadmap created: 2026-02-25*

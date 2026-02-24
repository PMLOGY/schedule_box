# ScheduleBox — Roadmap

## Milestones

- ✅ **v1.0 ScheduleBox Platform** — Phases 1-15 (shipped 2026-02-12)
- ✅ **v1.1 Production Hardening** — Phases 16-22 (shipped 2026-02-21, Twilio + Comgate credentials deferred)
- 🚧 **v1.2 Product Readiness** — Phases 23-27 (in progress)

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

---

## 🚧 v1.2 Product Readiness (In Progress)

**Milestone Goal:** Make ScheduleBox a polished, demo-ready product with working AI models, professional UI, smooth workflows, and a landing page — so the sales team can confidently present it to SMB customers.

**Key insight:** ScheduleBox's AI features (no-show prediction, CLV scoring, dynamic pricing) are genuinely unique in the Czech/Slovak scheduling market. No competitor (Reservio, Bookio, Calendly) offers ML-based predictions. This is the primary differentiator, but only if the models are actually trained and the predictions are visibly surfaced in the UI.

---

### Phase 23: AI Service — Training Pipeline and Model Deployment

**Goal**: AI service returns real trained predictions instead of heuristic fallbacks, with model versioning, state persistence, and production-grade deployment on Railway
**Depends on**: Nothing (foundation for all AI work in v1.2)
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):

1. Training scripts fetch real feature data from Next.js internal API routes and produce trained model files
2. No-show predictor returns predictions with `confidence > 0.5` and `fallback: false` (not the heuristic 0.4)
3. Pricing optimizer state persists across Railway container restarts (Redis-backed, not filesystem)
4. AI service starts on Railway with all models loaded, Prophet warmed up, and health check passing within 30 seconds
5. Model version mismatch between training and serving environments raises a RuntimeError at startup (not silent degradation)

**Plans:** 5 plans

Plans:
- [x] 23-01-PLAN.md — Internal training API routes (6 endpoints) + API key auth middleware
- [x] 23-02-PLAN.md — No-show and CLV model training with .meta.json sidecars
- [x] 23-03-PLAN.md — Pricing optimizer Redis persistence + model version validation at startup
- [x] 23-04-PLAN.md — Railway deployment (railway.toml, 1.5GB memory, Prophet warmup, ThreadPoolExecutor)
- [x] 23-05-PLAN.md — Weekly retraining CI workflow (.github/workflows/train-models.yml)

---

### Phase 24: AI-Powered UI Surfaces

**Goal**: AI predictions are visible and actionable in the dashboard, making the AI investment tangible for demos
**Depends on**: Phase 23 (needs real trained models returning meaningful predictions)
**Requirements**: AIUI-01, AIUI-02, AIUI-03, AIUI-04, AIUI-05
**Success Criteria** (what must be TRUE):

1. Every booking row in the management list shows a color-coded no-show risk badge (red >50%, yellow 30-50%, green <30%)
2. Booking detail page shows the no-show probability with an actionable label ("High risk -- consider SMS reminder"), not a raw decimal
3. Dashboard AI insights panel shows a daily digest of high-risk bookings and optimization suggestions
4. When a company has fewer than 10 bookings, AI features show "AI features activate after 10 bookings" with a progress indicator instead of low-confidence predictions

**Plans:** 2 plans in 2 waves

Plans:
- [x] 24-01-PLAN.md — No-show risk badge on booking list + booking detail probability display (Wave 1)
- [x] 24-02-PLAN.md — AI insights dashboard panel + confidence transparency + AI onboarding state (Wave 2)

---

### Phase 25: Landing Page and Czech Legal Compliance

**Goal**: Czech SMB owners can discover ScheduleBox via a professional Czech-language landing page with live widget demo, clear pricing, and full legal compliance
**Depends on**: Nothing (architecturally independent; marketing route group, no backend changes)
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07
**Success Criteria** (what must be TRUE):

1. Unauthenticated visitor on schedulebox.cz sees a Czech-language landing page with a live embedded booking widget demo (not a screenshot)
2. Pricing page shows three tiers (Free / CZK 299 / CZK 699) with "Zacit zdarma" primary CTA leading to registration
3. Cookie consent banner has no pre-checked boxes (strict opt-in compliant with Czech Electronic Communications Act 2022)
4. Footer displays company ICO, DIC, registered address; privacy policy and terms of service pages exist in Czech at /cs/privacy and /cs/terms
5. Lighthouse performance score is above 90 (SSR/SSG, no above-the-fold client JS, next/image for hero)

**Plans:** 4 plans in 2 waves

Plans:
- [x] 25-01-PLAN.md — Marketing route group layout, navbar, footer with legal info, i18n messages, Motion install (Wave 1)
- [x] 25-02-PLAN.md — Hero section with live widget embed + feature grid + trust badges (Wave 2)
- [x] 25-03-PLAN.md — Pricing page (3 tiers) + social proof section (Wave 2)
- [x] 25-04-PLAN.md — Czech privacy policy, terms of service, cookie consent implementation (Wave 2)

---

### Phase 26: Booking UX Polish and Calendar Upgrade

**Goal**: Booking experience matches Calendly-level polish with drag-and-drop calendar, mobile-optimized slot selection, and smooth micro-animations
**Depends on**: Phase 25 (landing page drives traffic to booking widget; widget must be polished when visitors arrive)
**Requirements**: BUX-01, BUX-02, BUX-03, BUX-04, BUX-05, BUX-06, BUX-07
**Success Criteria** (what must be TRUE):

1. Embed widget visual regression baseline exists in Playwright BEFORE any globals.css changes (prevents breaking widgets on customer sites)
2. Dashboard booking calendar shows day/week/month views with drag-and-drop rescheduling via react-big-calendar
3. Mobile booking flow has 44px minimum tap targets, time slots grouped by Morning/Afternoon/Evening, and a progress stepper showing "Step X of Y"
4. After booking confirmation, user sees an add-to-calendar button that downloads a valid ICS file with correct booking details
5. Booking confirmation page displays a micro-animation (Motion fade-in + scale on success icon) that makes the completion feel satisfying

**Plans:** 4 plans in 2 waves

Plans:
- [x] 26-01-PLAN.md — Embed widget visual regression baseline + shadcn/ui diff audit (Wave 1)
- [x] 26-02-PLAN.md — react-big-calendar upgrade with drag-and-drop + shadcn theme integration (Wave 2)
- [x] 26-03-PLAN.md — Mobile UX audit: tap targets, slot grouping, progress stepper, skeleton loaders (Wave 2)
- [x] 26-04-PLAN.md — ICS calendar endpoint + Motion micro-animations on booking confirmation (Wave 2)

---

### Phase 27: Onboarding and Business Setup Wizard

**Goal**: New business owner goes from registration to sharing their live booking link in under 5 minutes, with guided setup and helpful empty states throughout
**Depends on**: Phase 26 (wizard's final step shows the live booking link; that widget should be polished when owners first see it)
**Requirements**: ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06, ONB-07
**Success Criteria** (what must be TRUE):

1. New business owner completes a 4-step wizard (Company details + logo, First service, Working hours, Share booking link) in under 5 minutes
2. Wizard's final step shows the live booking URL and a QR code with copy-to-clipboard feedback
3. Dashboard onboarding checklist widget tracks 5 setup items and is dismissible when all are complete
4. Every previously-blank table and list in the dashboard shows an action-oriented empty state with illustration, headline, and primary action button
5. "Load demo data" option seeds a realistic Czech business (Beauty Studio Praha, 3 services, 10 bookings, 5 customers, AI predictions active) clearly labeled as demo data

**Plans:** 4 plans in 2 waves

Plans:
- [ ] 27-01-PLAN.md — 4-step business setup wizard (company, service, hours, share link + QR)
- [ ] 27-02-PLAN.md — Onboarding checklist widget + empty states across all dashboard sections
- [ ] 27-03-PLAN.md — Demo company data seeder + Driver.js contextual tooltips
- [ ] 27-04-PLAN.md — Industry template presets (8 verticals with Czech service names and CZK pricing)

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
| 27. Onboarding Wizard | v1.2 | 0/4 | Planning complete | - |

---
*Roadmap created: 2026-02-10*
*v1.0 shipped: 2026-02-12*
*v1.1 roadmap added: 2026-02-15*
*v1.1 shipped: 2026-02-21*
*v1.2 roadmap added: 2026-02-21*
*Phase 25 planned: 2026-02-21*
*Phase 24 planned: 2026-02-21*
*Phase 26 planned: 2026-02-21*
*Phase 27 planned: 2026-02-21*
*Phase 23 executed: 2026-02-24*
*Phase 24 executed: 2026-02-24*

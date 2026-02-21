# Requirements: ScheduleBox

**Defined:** 2026-02-15 (v1.1), 2026-02-21 (v1.2)
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

---

## v1.2 Requirements

### AI Service — Training Pipeline and Model Deployment

- [ ] **AI-01**: Internal training feature-extraction API routes (6 endpoints) protected by AI_SERVICE_API_KEY header validation
- [ ] **AI-02**: No-show predictor trained with XGBoost on 500+ synthetic samples, producing confidence > 0.5 predictions
- [ ] **AI-03**: CLV predictor trained with Random Forest, producing meaningful customer lifetime value scores
- [ ] **AI-04**: Pricing optimizer Multi-Armed Bandit state persisted to Redis (survives Railway container restarts)
- [ ] **AI-05**: Model versioning with .meta.json sidecars; startup validation raises RuntimeError on sklearn/xgboost version mismatch
- [ ] **AI-06**: Weekly model retraining CI workflow (.github/workflows/train-models.yml) with manual dispatch option
- [ ] **AI-07**: Railway AI service deployed with railway.toml, 1.5GB memory limit, Prophet startup warmup, health check passing within 30s
- [ ] **AI-08**: CPU-bound ML inference runs in ThreadPoolExecutor (not blocking FastAPI async event loop)

### AI-Powered UI Surfaces

- [ ] **AIUI-01**: No-show risk badge on booking management list rows (red >50%, yellow 30-50%, green <30%)
- [ ] **AIUI-02**: No-show probability displayed on booking detail page with actionable label (not raw decimal)
- [ ] **AIUI-03**: AI insights dashboard panel showing daily digest of high-risk bookings and optimization suggestions
- [ ] **AIUI-04**: Confidence transparency UI — show "AI confidence: X%" when trained; show "Insufficient data" when confidence < 0.5
- [ ] **AIUI-05**: AI onboarding state for new companies — "AI features activate after 10 bookings" with progress indicator

### Landing Page and Czech Legal Compliance

- [ ] **LAND-01**: (marketing) route group with marketing layout (no AuthGuard, no sidebar, marketing navbar + footer)
- [ ] **LAND-02**: Czech hero section with live embedded booking widget demo and "Zacit zdarma" primary CTA
- [ ] **LAND-03**: Three-tier pricing page (Free / CZK 299 / CZK 699) with annual discount option
- [ ] **LAND-04**: Feature grid (6 cards with icons) and trust badge row (GDPR, Czech hosting, Comgate, bank-level security)
- [ ] **LAND-05**: Czech privacy policy (/cs/privacy) and terms of service (/cs/terms) pages
- [ ] **LAND-06**: Strict opt-in cookie consent (no pre-checked boxes, Czech Electronic Communications Act 2022 compliant)
- [ ] **LAND-07**: Footer with company ICO, DIC, registered address visible on every marketing page

### Booking UX Polish and Calendar Upgrade

- [ ] **BUX-01**: Playwright visual regression baseline for embed widget established before any globals.css changes
- [ ] **BUX-02**: react-big-calendar upgrade with day/week/month views, drag-and-drop rescheduling via react-dnd, shadcn theme
- [ ] **BUX-03**: Smart time slot grouping by Morning/Afternoon/Evening (client-side, no API changes)
- [ ] **BUX-04**: Mobile tap targets minimum 44px on calendar cells and booking flow buttons
- [ ] **BUX-05**: Progress stepper ("Step X of Y") and skeleton loaders on slot fetch (not blank white screens)
- [ ] **BUX-06**: Add-to-calendar ICS endpoint (/api/v1/bookings/[id]/calendar.ics) with RFC 5545 format
- [ ] **BUX-07**: Micro-animations on booking confirmation (Motion 0.3s fade-in + scale on success icon)

### Onboarding and Business Setup Wizard

- [ ] **ONB-01**: 4-step business setup wizard (Company details + logo, First service, Working hours, Share booking link)
- [ ] **ONB-02**: "Your booking link is ready" moment with booking URL, QR code, and copy-to-clipboard with browser feedback
- [ ] **ONB-03**: 5-item onboarding checklist dashboard widget (dismissible after completion)
- [ ] **ONB-04**: Empty states with action prompts on every previously-blank table and list in the dashboard
- [ ] **ONB-05**: Demo company data option ("Beauty Studio Praha" with 3 services, 10 bookings, 5 customers, clearly labeled)
- [ ] **ONB-06**: Driver.js contextual tooltips on first visit to each dashboard section (never repeated)
- [ ] **ONB-07**: Industry template presets for 8 verticals with pre-filled Czech service names and CZK pricing

---

<details>
<summary>v1.1 Requirements (shipped 2026-02-21)</summary>

### Testing Foundation

- [x] **TEST-01**: Test runner (Vitest) configured with workspace-level and per-package configs
- [x] **TEST-02**: Unit tests for shared utilities, validation schemas, and pure functions (80%+ coverage)
- [x] **TEST-03**: MSW 2.0 configured for mocking external APIs (Comgate, AI service, SMTP)
- [x] **TEST-04**: CI pipeline runs unit tests on every push with coverage enforcement

### Integration Testing

- [x] **ITEST-01**: Testcontainers configured for PostgreSQL, Redis, and RabbitMQ in test environment
- [x] **ITEST-02**: Integration test for double-booking prevention (concurrent SELECT FOR UPDATE)
- [x] **ITEST-03**: Integration test for multi-tenant RLS isolation (company_id scoping)
- [x] **ITEST-04**: Integration test for Comgate webhook signature verification and payment status updates
- [x] **ITEST-05**: Integration test for booking status transitions (pending -> confirmed -> completed)
- [x] **ITEST-06**: CI pipeline runs integration tests with real database containers

### E2E Testing

- [x] **E2E-01**: Playwright configured with Chrome, Firefox, and Safari/WebKit browsers
- [x] **E2E-02**: E2E test for user registration and login flow
- [x] **E2E-03**: E2E test for booking creation end-to-end (select service -> choose slot -> confirm)
- [x] **E2E-04**: E2E test for payment flow with Comgate test mode
- [x] **E2E-05**: E2E test for AI fallback behavior (circuit breaker returns defaults)
- [x] **E2E-06**: CI pipeline runs E2E tests against staging deployment

### Email Delivery

- [x] **EMAIL-01**: SMTP provider configured with production credentials
- [x] **EMAIL-02**: SPF and DKIM DNS records configured for sender domain
- [x] **EMAIL-03**: Booking confirmation emails deliver successfully to major CZ providers
- [x] **EMAIL-04**: Reminder emails (24h, 2h) deliver successfully
- [x] **EMAIL-05**: Password reset and email verification emails deliver successfully

### SMS Delivery

- [x] **SMS-01**: Twilio configured with production credentials and Czech phone number *(code complete, account setup deferred)*
- [x] **SMS-02**: Booking reminder SMS delivers to Czech mobile numbers with correct diacritics
- [x] **SMS-03**: SMS cost optimization: only send for high no-show risk bookings (AI score > 0.7)
- [x] **SMS-04**: SMS usage monitoring with alert at cost threshold

### Payment Processing

- [x] **PAY-01**: Comgate merchant account verified with production credentials *(code complete, KYC deferred)*
- [x] **PAY-02**: Payment creation works with real cards in production
- [x] **PAY-03**: Webhook callback processes payment confirmations correctly in production
- [x] **PAY-04**: Refund flow works end-to-end in production

### Monitoring & Alerts

- [x] **MON-01**: Email delivery monitoring (bounce rate, delivery rate)
- [x] **MON-02**: SMS usage tracking with cost alerts
- [x] **MON-03**: Payment webhook failure logging and alerting
- [x] **MON-04**: Test coverage tracking in CI (fail build if below 80%)

</details>

---

## Future Requirements (v1.3+)

- **PERF-01**: Load testing with k6 against production-like environment
- **SEC-01**: Penetration testing and security audit
- **SCALE-01**: Horizontal scaling validation with multiple web instances
- **VOICE-01**: Natural language / voice booking via OpenAI NLU integration
- **TENANT-01**: Per-tenant AI models (requires >10K bookings per company)
- **FORECAST-01**: Capacity forecast chart with Prophet (needs real historical data)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | PWA sufficient, defer to v2.0 |
| Per-tenant AI models | SMBs have 50-500 bookings, need >10K for meaningful per-tenant training |
| Voice/NL booking | 3+ months to build reliably, defer to v2.0 |
| Capacity forecast chart | Prophet needs real data, not synthetic, to be credible |
| Competitor comparison page | High content maintenance cost |
| Video product tour | Requires professional recording; defer until UX finalized |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 23 | Pending |
| AI-02 | Phase 23 | Pending |
| AI-03 | Phase 23 | Pending |
| AI-04 | Phase 23 | Pending |
| AI-05 | Phase 23 | Pending |
| AI-06 | Phase 23 | Pending |
| AI-07 | Phase 23 | Pending |
| AI-08 | Phase 23 | Pending |
| AIUI-01 | Phase 24 | Pending |
| AIUI-02 | Phase 24 | Pending |
| AIUI-03 | Phase 24 | Pending |
| AIUI-04 | Phase 24 | Pending |
| AIUI-05 | Phase 24 | Pending |
| LAND-01 | Phase 25 | Pending |
| LAND-02 | Phase 25 | Pending |
| LAND-03 | Phase 25 | Pending |
| LAND-04 | Phase 25 | Pending |
| LAND-05 | Phase 25 | Pending |
| LAND-06 | Phase 25 | Pending |
| LAND-07 | Phase 25 | Pending |
| BUX-01 | Phase 26 | Pending |
| BUX-02 | Phase 26 | Pending |
| BUX-03 | Phase 26 | Pending |
| BUX-04 | Phase 26 | Pending |
| BUX-05 | Phase 26 | Pending |
| BUX-06 | Phase 26 | Pending |
| BUX-07 | Phase 26 | Pending |
| ONB-01 | Phase 27 | Pending |
| ONB-02 | Phase 27 | Pending |
| ONB-03 | Phase 27 | Pending |
| ONB-04 | Phase 27 | Pending |
| ONB-05 | Phase 27 | Pending |
| ONB-06 | Phase 27 | Pending |
| ONB-07 | Phase 27 | Pending |

**Coverage:**
- v1.2 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---

_Requirements defined: 2026-02-15 (v1.1), 2026-02-21 (v1.2)_
_Last updated: 2026-02-21 after v1.2 roadmap creation_

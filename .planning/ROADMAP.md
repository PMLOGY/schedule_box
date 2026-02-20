# ScheduleBox — Roadmap

## Milestones

- ✅ **v1.0 ScheduleBox Platform** — Phases 1-15 (shipped 2026-02-12)
- 🚧 **v1.1 Production Hardening** — Phases 16-22 (in progress)

## Phases

<details>
<summary>✅ v1.0 ScheduleBox Platform (Phases 1-15) — SHIPPED 2026-02-12</summary>

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

## 🚧 v1.1 Production Hardening (In Progress)

**Milestone Goal:** Make ScheduleBox production-ready with real email/SMS delivery, payment processing, and test coverage so it's reliable for real customers.

### Phase 16: Testing Foundation

**Goal**: Developer can run automated tests locally and in CI to catch bugs before production
**Depends on**: Nothing (foundation for all testing)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):

1. Developer can run `pnpm test:unit` and see test results with coverage report
2. CI pipeline fails on push if unit tests fail or coverage drops below 80%
3. Shared utilities and validation schemas have 80%+ unit test coverage
4. External APIs (Comgate, AI service, SMTP) are mockable via MSW in tests

**Plans:** 4 plans

Plans:
- [x] 16-01-PLAN.md — Vitest workspace config, shared config, per-package configs
- [x] 16-02-PLAN.md — Unit tests for shared utilities and Zod validation schemas
- [x] 16-03-PLAN.md — MSW external API mocking and CI pipeline test job
- [x] 16-04-PLAN.md — Gap closure: fix CI coverage gate enforcement (events coverage.include + pnpm -r CI command)

---

### Phase 17: Integration Testing

**Goal**: Critical database operations validate correctly against real PostgreSQL/Redis/RabbitMQ behavior
**Depends on**: Phase 16 (test runner must exist)
**Requirements**: ITEST-01, ITEST-02, ITEST-03, ITEST-04, ITEST-05, ITEST-06
**Success Criteria** (what must be TRUE):

1. Concurrent booking attempts to the same slot fail correctly (double-booking prevention works)
2. Two different companies cannot access each other's data via RLS policies
3. Comgate webhook signature verification rejects tampered payloads
4. Booking status transitions validate correctly (pending -> confirmed -> completed)
5. Integration tests run in CI using Testcontainers with real database behavior

**Plans:** 3 plans

Plans:
- [x] 17-01-PLAN.md — Testcontainers infrastructure, globalSetup, DB helpers, seed factories
- [x] 17-02-PLAN.md — Double-booking prevention and RLS tenant isolation tests
- [x] 17-03-PLAN.md — Comgate webhook signature, booking status transitions, CI pipeline integration

---

### Phase 18: E2E Testing

**Goal**: User flows work correctly across browsers and detect visual regressions before deployment
**Depends on**: Phase 16 (test runner must exist)
**Requirements**: E2E-01, E2E-02, E2E-03, E2E-04, E2E-05, E2E-06
**Success Criteria** (what must be TRUE):

1. User can complete registration and login flow on Chrome, Firefox, and Safari
2. User can create a booking end-to-end (select service -> choose slot -> confirm) without errors
3. Payment flow with Comgate test mode completes successfully
4. AI circuit breaker returns fallback defaults when AI service times out
5. E2E tests run in CI against staging deployment before production release

**Plans:** 3 plans

Plans:
- [x] 18-01-PLAN.md — Playwright setup, config, auth storageState, page objects, mock helpers
- [x] 18-02-PLAN.md — Auth (registration + login) and booking creation E2E tests
- [x] 18-03-PLAN.md — Payment flow and AI fallback E2E tests, CI pipeline E2E job

---

### Phase 19: Email Delivery

**Goal**: Customers receive booking confirmations, reminders, and password reset emails reliably in their inbox
**Depends on**: Phase 16 (can test email templates with mocks)
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05
**Success Criteria** (what must be TRUE):

1. SMTP provider (Brevo) is configured with production credentials and sends successfully
2. Emails arrive in inbox (not spam) for major Czech providers (Gmail, Seznam, Centrum)
3. SPF and DKIM DNS records validate correctly for sender domain
4. Booking confirmations and reminders (24h, 2h) deliver successfully
5. Password reset and email verification flows work end-to-end

**Plans:** 4 plans

Plans:
- [ ] 19-01-PLAN.md — Auth email library (nodemailer) + password reset and email verification wiring
- [ ] 19-02-PLAN.md — Booking cancellation template + company name DB lookup fix
- [ ] 19-03-PLAN.md — Helm SMTP secrets fix + .env.example Brevo update
- [ ] 19-04-PLAN.md — DNS setup (DKIM/DMARC) + end-to-end deliverability verification

---

### Phase 20: SMS Delivery

**Goal**: High-risk bookings receive SMS reminders to reduce no-shows
**Depends on**: Phase 19 (email patterns established first)
**Requirements**: SMS-01, SMS-02, SMS-03, SMS-04
**Success Criteria** (what must be TRUE):

1. Twilio is configured with production credentials and Czech phone number
2. SMS delivers to Czech mobile numbers with correct diacritics (UCS-2 encoding)
3. SMS only sends for high no-show risk bookings (AI score > 0.7) to optimize costs
4. SMS usage monitoring alerts when approaching cost threshold

**Plans**: TBD

Plans:
- [ ] 20-01: TBD

---

### Phase 21: Payment Processing

**Goal**: Customers can pay for bookings with real cards and businesses receive funds
**Depends on**: Phase 17 (integration tests validate payment flows)
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):

1. Comgate merchant account is verified (KYC complete) with production credentials
2. Payment creation works with real cards in production environment
3. Webhook callback processes payment confirmations and updates booking status correctly
4. Refund flow works end-to-end (customer receives money back)

**Plans**: TBD

Plans:
- [ ] 21-01: TBD

---

### Phase 22: Monitoring & Alerts

**Goal**: Production issues are detected and alerted immediately before customers complain
**Depends on**: Phases 19, 20, 21 (services must exist to monitor)
**Requirements**: MON-01, MON-02, MON-03, MON-04
**Success Criteria** (what must be TRUE):

1. Email delivery monitoring tracks bounce rate and alerts if above 5%
2. SMS usage tracking alerts when approaching monthly cost threshold
3. Payment webhook failures log to DLQ and trigger alerts
4. Test coverage tracking in CI fails build if coverage drops below 80%

**Plans**: TBD

Plans:
- [ ] 22-01: TBD

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
| 19. Email Delivery | v1.1 | 0/4 | Planned | - |
| 20. SMS Delivery | v1.1 | 0/TBD | Not started | - |
| 21. Payment Processing | v1.1 | 0/TBD | Not started | - |
| 22. Monitoring & Alerts | v1.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-10*
*v1.0 shipped: 2026-02-12*
*v1.1 roadmap added: 2026-02-15*

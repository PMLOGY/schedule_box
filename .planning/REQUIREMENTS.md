# Requirements: ScheduleBox v1.1

**Defined:** 2026-02-15
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

## v1.1 Requirements

### Testing Foundation

- [ ] **TEST-01**: Test runner (Vitest) configured with workspace-level and per-package configs
- [ ] **TEST-02**: Unit tests for shared utilities, validation schemas, and pure functions (80%+ coverage)
- [ ] **TEST-03**: MSW 2.0 configured for mocking external APIs (Comgate, AI service, SMTP)
- [ ] **TEST-04**: CI pipeline runs unit tests on every push with coverage enforcement

### Integration Testing

- [ ] **ITEST-01**: Testcontainers configured for PostgreSQL, Redis, and RabbitMQ in test environment
- [ ] **ITEST-02**: Integration test for double-booking prevention (concurrent SELECT FOR UPDATE)
- [ ] **ITEST-03**: Integration test for multi-tenant RLS isolation (company_id scoping)
- [ ] **ITEST-04**: Integration test for Comgate webhook signature verification and payment status updates
- [ ] **ITEST-05**: Integration test for booking status transitions (pending -> confirmed -> completed)
- [ ] **ITEST-06**: CI pipeline runs integration tests with real database containers

### E2E Testing

- [ ] **E2E-01**: Playwright configured with Chrome, Firefox, and Safari/WebKit browsers
- [ ] **E2E-02**: E2E test for user registration and login flow
- [ ] **E2E-03**: E2E test for booking creation end-to-end (select service -> choose slot -> confirm)
- [ ] **E2E-04**: E2E test for payment flow with Comgate test mode
- [ ] **E2E-05**: E2E test for AI fallback behavior (circuit breaker returns defaults)
- [ ] **E2E-06**: CI pipeline runs E2E tests against staging deployment

### Email Delivery

- [ ] **EMAIL-01**: SMTP provider (Brevo) configured with production credentials
- [ ] **EMAIL-02**: SPF and DKIM DNS records configured for sender domain
- [ ] **EMAIL-03**: Booking confirmation emails deliver successfully to major CZ providers (Gmail, Seznam, Centrum)
- [ ] **EMAIL-04**: Reminder emails (24h, 2h) deliver successfully
- [ ] **EMAIL-05**: Password reset and email verification emails deliver successfully

### SMS Delivery

- [ ] **SMS-01**: Twilio configured with production credentials and Czech phone number
- [ ] **SMS-02**: Booking reminder SMS delivers to Czech mobile numbers with correct diacritics
- [ ] **SMS-03**: SMS cost optimization: only send for high no-show risk bookings (AI score > 0.7)
- [ ] **SMS-04**: SMS usage monitoring with alert at cost threshold

### Payment Processing

- [ ] **PAY-01**: Comgate merchant account verified (KYC complete) with production credentials
- [ ] **PAY-02**: Payment creation works with real cards in production
- [ ] **PAY-03**: Webhook callback processes payment confirmations correctly in production
- [ ] **PAY-04**: Refund flow works end-to-end in production

### Monitoring & Alerts

- [ ] **MON-01**: Email delivery monitoring (bounce rate, delivery rate via Brevo dashboard)
- [ ] **MON-02**: SMS usage tracking with cost alerts
- [ ] **MON-03**: Payment webhook failure logging and alerting
- [ ] **MON-04**: Test coverage tracking in CI (fail build if below 80%)

## Future Requirements (v1.2+)

- **PERF-01**: Load testing with k6 against production-like environment
- **SEC-01**: Penetration testing and security audit
- **SCALE-01**: Horizontal scaling validation with multiple web instances
- **MOBILE-01**: PWA enhancements (offline support, push notifications)
- **I18N-01**: Polish and German language support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | PWA sufficient for v1.1, defer to v2.0 |
| New AI models | Existing 7 models sufficient, need production validation first |
| Kubernetes migration | Railway handles scaling for now |
| OAuth providers (Google/Facebook) | Email/password auth works, OAuth scaffolding exists for later |
| Real-time WebSocket events | Current polling works, optimize in v1.2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 16 | Pending |
| TEST-02 | Phase 16 | Pending |
| TEST-03 | Phase 16 | Pending |
| TEST-04 | Phase 16 | Pending |
| ITEST-01 | Phase 17 | Pending |
| ITEST-02 | Phase 17 | Pending |
| ITEST-03 | Phase 17 | Pending |
| ITEST-04 | Phase 17 | Pending |
| ITEST-05 | Phase 17 | Pending |
| ITEST-06 | Phase 17 | Pending |
| E2E-01 | Phase 18 | Pending |
| E2E-02 | Phase 18 | Pending |
| E2E-03 | Phase 18 | Pending |
| E2E-04 | Phase 18 | Pending |
| E2E-05 | Phase 18 | Pending |
| E2E-06 | Phase 18 | Pending |
| EMAIL-01 | Phase 19 | Pending |
| EMAIL-02 | Phase 19 | Pending |
| EMAIL-03 | Phase 19 | Pending |
| EMAIL-04 | Phase 19 | Pending |
| EMAIL-05 | Phase 19 | Pending |
| SMS-01 | Phase 20 | Pending |
| SMS-02 | Phase 20 | Pending |
| SMS-03 | Phase 20 | Pending |
| SMS-04 | Phase 20 | Pending |
| PAY-01 | Phase 21 | Pending |
| PAY-02 | Phase 21 | Pending |
| PAY-03 | Phase 21 | Pending |
| PAY-04 | Phase 21 | Pending |
| MON-01 | Phase 22 | Pending |
| MON-02 | Phase 22 | Pending |
| MON-03 | Phase 22 | Pending |
| MON-04 | Phase 22 | Pending |

**Coverage:**
- v1.1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---

_Requirements defined: 2026-02-15_
_Last updated: 2026-02-15 after initial definition_

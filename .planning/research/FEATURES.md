# Feature Landscape: Production Hardening for ScheduleBox v1.1

**Domain:** SaaS Booking Platform — Production Infrastructure
**Researched:** 2026-02-15
**Confidence:** HIGH

## Context

ScheduleBox v1.0 has core features BUILT but NOT production-ready:
- Notification worker exists (BullMQ queues) but no SMTP/Twilio configured
- Payment integration code exists (Comgate client) but no live credentials/testing
- Zero test coverage
- No production monitoring/alerting
- No email deliverability infrastructure (SPF/DKIM/DMARC)

This research focuses on PRODUCTION-READINESS features, not new business features.

---

## Table Stakes

Features users expect from a production SaaS. Missing = unprofessional/unreliable.

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|-----------|-------|
| **Transactional Email Delivery** | Booking confirmations, password resets MUST arrive | Medium | SPF/DKIM/DMARC setup, bounce handling, 98%+ deliverability target |
| **SMS Reminder Delivery** | 98% open rate expected, critical for no-show reduction | Medium | Twilio credentials, phone validation, delivery tracking |
| **Payment Retry Logic** | 25-50% revenue recovery from failed payments | Medium | Exponential backoff, 8 retries over 2 weeks standard |
| **Webhook Idempotency** | Payment/notification webhooks retry → must prevent duplicates | Low | Redis-based deduplication (already scaffolded) |
| **Payment Gateway Live Mode** | Comgate test mode → production merchant account | Low | Credential swap + gateway testing |
| **Bounce Rate Management** | ISPs expect <2% bounce rate, enforce list hygiene | Medium | Hard bounce = immediate unsubscribe, soft bounce tracking |
| **Unsubscribe Management** | Legal requirement (GDPR), ISPs block without it | Low | One-click unsubscribe, instant honor |
| **Basic Test Coverage** | 60-70% on critical paths = industry standard | High | Unit + integration + E2E for booking/payment flows |
| **Production Monitoring** | Real-time visibility into failures = table stakes | Medium | APM (latency, errors), alerting on critical failures |
| **Error Logging & Tracking** | Debugging production issues without logs = impossible | Low | Structured logs, error aggregation (already has audit_logs) |

---

## Differentiators

Features that set ScheduleBox apart from basic solutions. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| **Smart Retry Logic** | ML-based retry timing (vs fixed schedule) = higher recovery rate | High | Stripe's approach: analyze payment success patterns by time/day |
| **Multi-Channel Fallback** | Email bounces → auto-send SMS = 99%+ reach | Medium | Requires webhook integration between email/SMS providers |
| **Real-Time Delivery Tracking** | Dashboard shows "email opened 2 min ago" = transparency | Low | Already has webhook endpoints for open/click tracking |
| **Localized Currency & Language** | Auto-detect CZ/SK locale, format amounts correctly | Low | Already has i18n framework, just need VAT/address formatting |
| **Payment Link Expiration** | QR codes expire after use/time = security | Low | Already in QR payment flow, just need monitoring |
| **Proactive Failure Alerts** | "3 emails bounced in 5 min" → alert owner immediately | Medium | Requires threshold-based alerting on delivery metrics |
| **Customer Communication History** | Unified timeline: "Sent confirmation at 10:00, opened at 10:05" | Low | Already has notifications table, just need UI aggregation |
| **Test Coverage Dashboard** | Public badge showing 85% coverage = trust signal | Low | Badge generation from Jest/Vitest output |

---

## Anti-Features

Features to explicitly NOT build (scope creep risks).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Email Campaign Builder** | Not a marketing platform, just transactional | Use existing notification templates, link to Mailchimp/Sendinblue for campaigns |
| **Custom Email ESP** | Building SMTP server = massive complexity for zero value | Use proven providers (SendGrid, Postmark, Resend) |
| **SMS Marketing Blasts** | Out of scope, regulatory minefield | Stick to transactional only (booking confirmations, reminders) |
| **Payment Gateway Abstraction** | Multi-gateway support = 3x complexity, CZ market = Comgate dominant | Hardcode Comgate, document swap points for future |
| **100% Test Coverage** | Diminishing returns, slow CI/CD | Target 70-80% on critical paths, skip trivial getters/setters |
| **Custom Monitoring Stack** | Reinventing Datadog/Sentry = massive time sink | Use Railway metrics + external APM (Sentry free tier) |
| **Advanced Dunning UI** | Complex subscription recovery flows not needed for booking deposits | Simple retry logic + notification, manual intervention for edge cases |
| **Multi-Tenant Load Testing** | Premature optimization, <100 companies expected in v1.1 | Defer until 1000+ tenants, rely on database isolation tests |

---

## Feature Dependencies

Critical sequencing for implementation:

```
Email Infrastructure
  ├─ SPF/DKIM/DMARC DNS Setup (MUST be first, 24-48h DNS propagation)
  │  └─ Choose ESP (SendGrid/Postmark/Resend)
  │     └─ Configure SMTP credentials in notification worker
  │        └─ Bounce webhook handling
  │           └─ Unsubscribe management
  │
Payment Production
  ├─ Comgate merchant account approval (can take 2-5 business days)
  │  └─ Live credentials in .env
  │     └─ Webhook signature verification (MUST before live)
  │        └─ Idempotency testing (prevent double charges)
  │           └─ Payment retry logic
  │              └─ Timeout handling (15s Comgate limit)
  │
SMS Delivery
  ├─ Twilio account + phone number provisioning
  │  └─ Toll-free verification (NEW requirement in 2026, takes 1-2 weeks)
  │     └─ SMS credentials in notification worker
  │        └─ Delivery status webhooks
  │           └─ Phone number validation
  │
Testing Infrastructure
  ├─ Jest/Vitest setup for unit tests
  │  └─ Database test fixtures
  │     └─ Integration tests (API routes + DB)
  │        └─ E2E tests (Playwright for critical flows)
  │           └─ Multi-tenant isolation tests
  │
Monitoring
  ├─ Railway built-in metrics (latency, memory, errors)
  │  └─ Sentry error tracking
  │     └─ Custom alerts (email delivery rate, payment failures)
  │        └─ Runbook documentation
```

---

## Critical Edge Cases by Domain

### Email Delivery Edge Cases

| Edge Case | Impact | Mitigation | Source |
|-----------|--------|-----------|---------|
| **Hard bounce (invalid email)** | Deliverability score drops, ISP penalties | Immediate unsubscribe, remove from future sends | [CleverTap](https://clevertap.com/blog/email-bounce-rate/) |
| **Soft bounce (mailbox full)** | Repeated soft bounces → hard bounce after 3-5 attempts | Track soft bounces, auto-unsubscribe after 3 consecutive | [Iterable](https://support.iterable.com/hc/en-us/articles/207907633-Unsubscribing-Users-with-Email-Soft-Bounces) |
| **SPF lookup limit exceeded** | 100% delivery failure, silent | Keep SPF record <10 DNS lookups, use subdomains | [Skynet Hosting](https://skynethosting.net/blog/spf-dkim-dmarc-explained-2026/) |
| **DMARC policy conflict** | Legitimate emails quarantined | Start with p=none, monitor DMARC reports for 2 weeks before p=quarantine | [TrulyInbox](https://www.trulyinbox.com/blog/how-to-set-up-spf-dkim-and-dmarc/) |
| **Gmail/Yahoo bulk sender rules** | Emails blocked if no authentication | SPF + DKIM + DMARC MANDATORY since Feb 2024 | [Red Sift](https://redsift.com/guides/how-email-authentication-requirements-are-changing-business-communications-in-2026) |
| **Unsubscribe spam complaints** | Reputation damage, domain blacklisting | One-click unsubscribe, honor instantly (<1 sec) | [MailerLite](https://www.mailerlite.com/blog/understanding-soft-and-hard-bounced-emails) |

**Key Metrics:**
- Deliverability target: ≥98% (industry standard)
- Bounce rate target: <2% (ISP threshold)
- Open rate for transactional: ≥80% (below = UX problem)

### SMS Delivery Edge Cases

| Edge Case | Impact | Mitigation | Source |
|-----------|--------|-----------|---------|
| **Invalid phone number** | Wasted cost, failed delivery | Validate with carrier lookup before sending | [FalkonSMS](https://www.falkonsms.com/post/text-messages-not-delivering) |
| **Landline number** | SMS unsupported, silent failure | Carrier lookup to detect landline vs mobile | [SMS Tools](https://www.smstools.com/en/blog/175/appointment-scheduling-with-sms-the-perfect-combination) |
| **Deactivated number** | Delivery failure, no error in some cases | Retry once after 15 min, then mark invalid | [ClearOut](https://clearoutphone.io/blog/fix-sms-delivery-failure/) |
| **Carrier downtime** | Temporary delivery failure | Exponential backoff retry: 1 min, 5 min, 15 min | [MessageGears](https://messagegears.com/resources/blog/sms-delivery-failure/) |
| **Toll-free verification missing (2026)** | 100% delivery failure on toll-free numbers | Complete verification 1-2 weeks before launch | [Appointment Reminders](https://www.appointmentreminders.com/blog/toll-free-sms-verification-is-changing-in-2026/) |
| **Peak traffic congestion** | Delayed delivery (hours), message stale by arrival | Send during off-peak hours for non-urgent, include timestamp in message | [Phonexa](https://phonexa.com/blog/sms-deliverability/) |

**Key Metrics:**
- Open rate target: ≥95% (SMS standard)
- Read time: 90% within 3 minutes
- Deliverability target: ≥98%
- No-show reduction: 76% of customers expect SMS reminders

### Payment Edge Cases

| Edge Case | Impact | Mitigation | Source |
|-----------|--------|-----------|---------|
| **Card expiration** | Payment failure, revenue loss | Retry on different day, auto-send card update reminder | [PayPro Global](https://payproglobal.com/answers/what-is-saas-payment-retry-logic/) |
| **Insufficient funds** | Temporary failure, recoverable | Smart retry: avoid month-end, retry after payday patterns | [Stripe](https://docs.stripe.com/billing/revenue-recovery/smart-retries) |
| **3D Secure timeout** | User abandonment, lost revenue | Clear timeout messaging (15s Comgate limit), fallback to QR | ScheduleBox docs line 6639-6643 |
| **Duplicate webhook delivery** | Double payment processing, refund overhead | Idempotency key in Redis (7-day TTL) | [Medium - Sohail](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) |
| **Webhook signature spoofing** | Fraudulent payment confirmations | HMAC-SHA256 verification BEFORE processing | ScheduleBox docs line 6575-6589 |
| **Network timeout during payment** | Booking stuck in pending, poor UX | Expire pending bookings after 30 min, allow retry | ScheduleBox docs line 6645-6649 |
| **Currency mismatch** | User confusion, support tickets | Validate booking.currency matches payment.currency | Existing bug fix from git history |
| **Failed payment retry loop** | User frustration, support load | Max 8 retries over 2 weeks, then manual intervention | [ProsperStack](https://prosperstack.com/blog/subscription-dunning/) |
| **QR code expiration unclear** | User scans expired code, confusion | Clear expiry time in UI, invalidate after 1 use or 30 min | [Scanova](https://scanova.io/blog/how-long-does-qr-code-last/) |

**Key Metrics:**
- Payment retry recovery rate: 50-80% (industry benchmark)
- Default retry schedule: 8 attempts over 14 days
- Webhook acknowledgment: <200ms (must return 200 OK fast, process async)
- Gateway timeout handling: 15s max (Comgate limit from docs)

### Testing Edge Cases

| Edge Case | Impact | Mitigation | Source |
|-----------|--------|-----------|---------|
| **Tenant data leakage** | GDPR violation, reputation catastrophe | Cross-tenant tests: query tenant A with tenant B credentials, expect 404 | [AddWeb](https://www.addwebsolution.com/blog/multi-tenant-performance-crisis-advanced-isolation-2026) |
| **Test data pollution** | Flaky tests, CI failures | Isolated test DB, transaction rollback after each test | [TestGrid](https://testgrid.io/blog/multi-tenancy/) |
| **Async race conditions** | Intermittent failures, false positives | Use polling with timeout, avoid fixed sleeps | Common practice |
| **Database constraint violations** | Skipped in tests, break production | Integration tests MUST use real DB schema, not mocks | [Net Solutions](https://www.netsolutions.com/insights/multi-tenancy-testing-top-challenges-and-solutions/) |
| **BullMQ job timing** | Jobs processed before assertions run | Use queue.drain() or job.waitUntilFinished() in tests | BullMQ docs |
| **E2E test authentication** | Tests fail on JWT expiration | Use long-lived test tokens OR refresh automatically | Common practice |
| **Missing RLS enforcement** | Test passes, production leaks data | Verify every query includes company_id filter | [Propelius](https://propelius.ai/blogs/tenant-data-isolation-patterns-and-anti-patterns) |

**Key Metrics:**
- Critical path coverage: 60-70% (unit + integration)
- E2E coverage: 10-20% (happy path workflows only)
- Tenant isolation: 100% coverage on all multi-tenant tables
- API defect escape rate: <1% (production issues that passed tests)

---

## MVP Recommendation

**Prioritize in this order:**

### Phase 1: Email Infrastructure (CRITICAL PATH)
1. Choose ESP (SendGrid vs Postmark vs Resend)
2. SPF/DKIM/DMARC DNS setup (24-48h propagation time)
3. Configure notification worker SMTP credentials
4. Bounce webhook handling (hard bounce = unsubscribe)
5. Unsubscribe link + instant honor
6. Test transactional email: booking confirmation, password reset

**Why first:** Email is PRIMARY notification channel. Without working email, platform appears broken. DNS propagation takes 1-2 days, blocks everything else.

### Phase 2: Payment Production (REVENUE BLOCKER)
1. Comgate merchant account approval (2-5 business days)
2. Live credentials in environment variables
3. Webhook signature verification tests
4. Idempotency tests (prevent double charges)
5. Payment retry logic (exponential backoff, 8 retries)
6. Timeout handling (15s Comgate limit)
7. Test full payment flow: create → redirect → webhook → confirmed

**Why second:** No live payments = no revenue. Merchant approval has lead time, start ASAP.

### Phase 3: SMS Reminders (DIFFERENTIATION)
1. Twilio account + phone number
2. Toll-free verification (1-2 weeks lead time in 2026)
3. Configure notification worker Twilio credentials
4. Delivery status webhooks
5. Phone number validation (carrier lookup)
6. Test SMS reminder 24h before booking

**Why third:** SMS has highest open rate (98%) but longest setup time (toll-free verification). Can launch without it, adds value post-MVP.

### Phase 4: Testing Foundation (QUALITY GATE)
1. Jest/Vitest setup with TypeScript
2. Database test fixtures (seed data factory)
3. Unit tests: payment retry logic, webhook idempotency
4. Integration tests: POST /bookings → payment → confirmation email
5. Multi-tenant isolation tests (query tenant A as tenant B)
6. E2E test: complete booking flow (Playwright)

**Why fourth:** Can launch without tests (risky but viable), but MUST have tests before scaling. Blocks future velocity if skipped.

### Phase 5: Production Monitoring (OPERATIONAL READINESS)
1. Sentry error tracking integration
2. Railway metrics dashboard (latency, memory, errors)
3. Email deliverability alerts (<95% delivery rate)
4. Payment failure alerts (>5 failures in 1 hour)
5. Runbook documentation (what to do when alerts fire)

**Why fifth:** Can launch with manual monitoring (check logs), but automated alerts prevent outages from going unnoticed.

---

## Defer to v1.2+

These are valuable but NOT blocking for production launch:

- **Smart retry logic** (ML-based) — Use fixed retry schedule first, optimize later with data
- **Multi-channel fallback** (email → SMS) — Add after both channels stable
- **Test coverage dashboard** — Nice-to-have, focus on writing tests first
- **Advanced dunning UI** — Current retry logic sufficient for booking deposits
- **Multi-tenant load testing** — Defer until 100+ tenants, current RLS sufficient
- **Payment gateway abstraction** — Comgate hardcoded fine for CZ/SK market

---

## Complexity Breakdown

| Feature Category | Total Features | Low | Medium | High |
|-----------------|----------------|-----|--------|------|
| Table Stakes | 10 | 3 | 6 | 1 |
| Differentiators | 8 | 5 | 2 | 1 |
| **TOTAL** | **18** | **8** | **8** | **2** |

**High Complexity Items:**
1. Basic test coverage (60-70%) — Requires full test infrastructure, fixtures, CI integration
2. Smart retry logic — ML model for payment success prediction

**Medium Complexity Items:**
- Email infrastructure (SPF/DKIM/DMARC, bounce handling)
- Payment retry logic (exponential backoff, dunning)
- SMS delivery (Twilio, phone validation, toll-free verification)
- Production monitoring (APM, alerting, runbooks)
- Multi-channel fallback (cross-provider orchestration)
- Proactive failure alerts (threshold-based alerting)

**Low Complexity Items:**
- Webhook idempotency (Redis deduplication already scaffolded)
- Payment gateway live mode (credential swap)
- Unsubscribe management (one-click link + instant honor)
- Error logging (audit_logs table exists, just need aggregation)
- Real-time delivery tracking (webhook endpoints exist)
- Localized currency/language (i18n framework exists)
- Payment link expiration (QR code TTL already in flow)
- Customer communication history (notifications table query)

---

## Sources

### Email Deliverability
- [Moosend: Transactional Email Best Practices 2026](https://moosend.com/blog/transactional-email-best-practices/)
- [Mailtrap: Email Deliverability Tutorial 2026](https://mailtrap.io/blog/email-deliverability/)
- [Sidemail: Email Deliverability Best Practices](https://sidemail.io/articles/email-deliverability-best-practices/)
- [Skynet Hosting: SPF DKIM DMARC Explained 2026](https://skynethosting.net/blog/spf-dkim-dmarc-explained-2026/)
- [TrulyInbox: How to Set Up SPF, DKIM, and DMARC](https://www.trulyinbox.com/blog/how-to-set-up-spf-dkim-and-dmarc/)
- [Red Sift: Email Authentication Requirements 2026](https://redsift.com/guides/how-email-authentication-requirements-are-changing-business-communications-in-2026)
- [CleverTap: Email Bounce Rate Guide](https://clevertap.com/blog/email-bounce-rate/)
- [Iterable: Unsubscribing Users with Email Soft Bounces](https://support.iterable.com/hc/en-us/articles/207907633-Unsubscribing-Users-with-Email-Soft-Bounces)
- [MailerLite: Understanding Soft and Hard Bounced Emails](https://www.mailerlite.com/blog/understanding-soft-and-hard-bounced-emails)

### SMS Delivery
- [Omnisend: SMS Marketing Data 2026](https://www.omnisend.com/blog/sms-marketing-statistics/)
- [Atlas Communications: Why SMS Is Still the King of Open Rates](https://www.atlascommunications.co/2026/01/01/why-sms-is-still-the-king-of-open-rates-in-2025/)
- [SMS Tools: Appointment Scheduling with SMS](https://www.smstools.com/en/blog/175/appointment-scheduling-with-sms-the-perfect-combination)
- [Appointment Reminders: Toll-Free SMS Verification 2026](https://www.appointmentreminders.com/blog/toll-free-sms-verification-is-changing-in-2026/)
- [ClearOut: Fix SMS Delivery Failure](https://clearoutphone.io/blog/fix-sms-delivery-failure/)
- [MessageGears: SMS Message Delivery Failure](https://messagegears.com/resources/blog/sms-delivery-failure/)
- [Phonexa: SMS Marketing Data 2026](https://phonexa.com/blog/sms-deliverability/)
- [FalkonSMS: Text Messages Not Delivering](https://www.falkonsms.com/post/text-messages-not-delivering)

### Payment Processing
- [PayPro Global: What is SaaS Payment Retry Logic](https://payproglobal.com/answers/what-is-saas-payment-retry-logic/)
- [Stripe: Automate Payment Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- [ProsperStack: Subscription Dunning](https://prosperstack.com/blog/subscription-dunning/)
- [Medium (Sohail): Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)
- [Apidog: Payment Webhook Best Practices](https://apidog.com/blog/payment-webhook-best-practices/)
- [ChargeOver: Automating Retry Logic](https://chargeover.com/blog/billing-retry-dunning-automation)
- [Payroc: From Integration to Infrastructure SaaS Payments 2026](https://blog.payroc.com/from-integration-to-infrastructure-saas-payments-in-2026)
- [Scanova: How Long Does QR Code Last](https://scanova.io/blog/how-long-does-qr-code-last/)

### Testing & Quality
- [QASource: SaaS Testing Services 2026](https://www.qasource.com/saas-testing)
- [Testsigma: SaaS Testing Ultimate Guide](https://testsigma.com/blog/saas-testing/)
- [VirtuosoQA: End-to-End vs Integration Testing](https://www.virtuosoqa.com/post/end-to-end-vs-integration-testing)
- [BugBug: End-to-End Testing vs Integration Testing](https://bugbug.io/blog/software-testing/end-to-end-testing-vs-integration-testing/)
- [TestGrid: Multi-Tenancy Testing](https://testgrid.io/blog/multi-tenancy/)
- [AddWeb: Multi-Tenant Performance Crisis 2026](https://www.addwebsolution.com/blog/multi-tenant-performance-crisis-advanced-isolation-2026)
- [Net Solutions: Multi-Tenancy Testing Challenges](https://www.netsolutions.com/insights/multi-tenancy-testing-top-challenges-and-solutions/)
- [Propelius: Tenant Data Isolation Patterns](https://propelius.ai/blogs/tenant-data-isolation-patterns-and-anti-patterns)

### Monitoring & Production Readiness
- [OpenGov: Monitoring, Alerting, and Notification Blueprint](https://opengov.com/article/a-monitoring-alerting-and-notification-blueprint-for-saas-applications/)
- [ControlUp: Best SaaS Monitoring Tools 2026](https://www.controlup.com/resources/blog/top-saas-monitoring-tools-for-2026/)
- [Dotcom-Monitor: SaaS Monitoring Best Practices](https://www.dotcom-monitor.com/blog/saas-monitoring-best-practices/)
- [Comparitech: What is SaaS Monitoring](https://www.comparitech.com/net-admin/what-is-saas-monitoring/)

### Idempotency & Reliability
- [Medium (Arvind): Idempotency in Distributed Systems](https://medium.com/javarevisited/idempotency-in-distributed-systems-preventing-duplicate-operations-85ce4468d161)
- [Fyno: Idempotent Requests in Notification Infrastructure](https://www.fyno.io/blog/idempotent-requests-in-notification-infrastructure-cm4s7axck002x9jffvml6fx1y)
- [Operion: Idempotency Safe Retries](https://www.operion.io/learn/component/idempotency)

### Czech/Slovak Market Specific
- [Wikipedia: Comgate](https://en.wikipedia.org/wiki/Comgate)
- [GitHub: Comgate PHP SDK](https://github.com/comgate-payments/sdk-php)
- ScheduleBox Documentation (lines 6367-6844, 2227-5365)

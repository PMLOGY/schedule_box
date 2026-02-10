# Codebase Concerns

**Analysis Date:** 2026-02-10

## Project Status

ScheduleBox is in **planning phase only** — no implementation code exists yet. All concerns are derived from architecture documentation (v13.0 FINAL) and planned monorepo structure. This document identifies architectural, integration, and operational risks that could impact the 15-phase development roadmap.

---

## Critical Issues (Must Fix Before Implementation)

These gaps in specification will cause runtime failures and data corruption if not addressed during Phase 1.

### Double-Booking Prevention

**Issue:** Race condition between availability calculation and booking creation

**Files:** `schedulebox_complete_documentation.md` (lines 8148-8156), planned in `packages/database/src/functions/double-booking-check.sql`

**Problem:** Two concurrent users viewing the same availability slot for an employee, both clicking "confirm" → both bookings created for same time. Current spec suggests three approaches (SELECT FOR UPDATE, optimistic locking, advisory lock) but provides no implementation detail for Drizzle ORM.

**Impact:**
- Core business logic fails
- Customer support nightmare
- Trust destruction (double-bookings are deal-breakers for SMBs)

**Risk Level:** CRITICAL

**Fix Approach:**
1. Choose pessimistic locking approach (`SELECT ... FOR UPDATE` on availability_slots)
2. Implement in `packages/database/src/schema/bookings.ts` with transaction wrapper
3. Add test case that confirms two concurrent POST /bookings requests reject one
4. Document in `apps/web/src/lib/services/booking.service.ts` with explicit locking comment

**Acceptance Criteria:**
- Concurrent requests to same slot with `SELECT FOR UPDATE` + UNIQUE constraint
- Rejected request returns 409 CONFLICT with error code SLOT_UNAVAILABLE
- No race condition detectable under concurrent load testing

---

### Missing Domain Events

**Issue:** Entire automation and event-driven architecture not specified

**Files:** Documented in `schedulebox_complete_documentation.md` (lines 8250-8260) as missing from user flow analysis

**Problem:** Specification lists 6 critical domain events that must fire during booking lifecycle:
- `booking.created` — triggers confirmation email
- `booking.confirmed` (payment received) — triggers calendar update
- `booking.completed` — triggers loyalty points earning
- `payment.completed` — triggers booking status change
- `notification.sent` — for analytics
- Event bus consumers undefined

**Current State:**
- `packages/events/src/events/booking.ts` structure exists in plan
- No consumer handlers defined
- No SAGA workflow specification
- Notification, Loyalty, AI services have no documented trigger points

**Impact:**
- Notifications never sent automatically
- Loyalty points never credited
- AI predictions never triggered
- Cascading service calls create tight coupling instead of decoupling
- SAGA pattern compensation flow undefined

**Risk Level:** CRITICAL

**Fix Approach:**
1. Define complete `packages/events/src/types.ts` with CloudEvents format
2. Create `packages/events/src/events/` with all 10 event types (booking, payment, customer, review, notification, automation)
3. Document in `packages/events/src/consumer.ts` which services consume which events
4. Implement SAGA pattern for booking→payment→confirmation flow with compensation
5. Create test case: booking creation → event published → notification consumer receives → email queued

**Acceptance Criteria:**
- All 10 domain events defined in TypeScript types
- RabbitMQ routing keys follow `{service}.{entity}.{action}` pattern
- At least 3 consumer implementations (notification, loyalty, analytics)
- SAGA transaction logs events for replay

---

### Row Level Security (RLS) Policies Missing

**Issue:** Multi-tenant data isolation not implemented, creating data leak vector

**Files:** `packages/database/src/rls/policies.sql` (not yet created)

**Problem:** Specification requires every table with `company_id` column to have RLS policy enforcing tenant isolation. No policies written. If developer forgets WHERE clause, query returns all companies' data.

**Current State:**
- Schema includes `company_id` on all tenant tables
- No RLS `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements
- No Drizzle middleware enforcing company_id context

**Impact:**
- Any bug in WHERE clause leaks customer data across companies
- GDPR violation (unauthorized data access)
- Competitive intelligence exposure (pricing, customers, bookings)
- Regulatory audit failure

**Risk Level:** CRITICAL

**Fix Approach:**
1. Create `packages/database/src/rls/policies.sql` with policies for all 35 tenant tables
2. Template: `CREATE POLICY {table}_tenant_isolation USING (company_id = current_setting('app.current_company_id')::integer)`
3. Create `apps/web/src/lib/db/set-company-context.ts` middleware that executes `SET app.current_company_id = X` before all queries
4. Add test: query customers as company A, verify only A's customers returned
5. Add Drizzle middleware hook to enforce context on all queries

**Acceptance Criteria:**
- All 35+ tenant tables have explicit RLS policies
- No queries return results without company_id filter
- Integration test: query from company A's context returns only A's data
- Middleware enforces context on request initialization

---

### Incomplete API Error Specifications

**Issue:** Endpoints lack explicit error codes and status codes, blocking frontend integration

**Files:** `schedulebox_complete_documentation.md` (lines 5201-5216, 8204-8215)

**Problem:** Error format defined as `{ error, code, message, details? }`, but:
- Only 11 error codes listed (VALIDATION_ERROR, UNAUTHORIZED, DUPLICATE_EMAIL, etc.)
- 99 endpoints have no documented error cases
- Booking endpoint: what error if slot unavailable? (documented as missing in audit)
- Comgate endpoint: what error if payment gateway timeout?
- AI endpoints: what error if model unavailable? (specified as needing fallback)

**Current State:**
- `packages/shared/src/utils/errors.ts` structure planned but incomplete
- No per-endpoint error response documentation
- Frontend will hardcode error handling based on guesses

**Impact:**
- Frontend catches generic "error" and shows unhelpful message
- No structured error codes for programmatic handling
- Rate limiting (429) mentioned in audit but absent from endpoint specs
- Health checks missing (/health, /readiness) blocking Kubernetes deployment

**Risk Level:** HIGH

**Fix Approach:**
1. Create `ERRORS.md` document mapping all 99 endpoints to error scenarios
2. Define 30+ error codes: SLOT_UNAVAILABLE, PAYMENT_TIMEOUT, AI_UNAVAILABLE, RATE_LIMITED, RLS_VIOLATION, etc.
3. Update `packages/shared/src/utils/errors.ts` with AppError class supporting error codes
4. Add /health and /readiness endpoints to Phase 1 requirements
5. Document per-endpoint error responses in OpenAPI spec

**Acceptance Criteria:**
- Every endpoint documents 3+ error cases with HTTP status and error code
- 429 RATE_LIMITED error returned on rate limit exceeded
- /health endpoint returns 200 with {status: 'ok'}
- Frontend integration test catches all documented error codes

---

### API Fallback Strategies Not Specified

**Issue:** 7 AI models and 4 external integrations have no defined fallback behavior

**Files:** `schedulebox_complete_documentation.md` (lines 8181-8195), planned in `apps/web/src/lib/resilience/fallback.ts`

**Problem:** Specification documents fallback requirements:
```
- No-show unavailable → return 0.15 (default 15%)
- CLV unavailable → return historical average
- Upselling unavailable → return top 3 services by popularity
- Pricing unavailable → return static price
```

But no implementation provided:
- No circuit breaker pattern implementation
- No timeout handling (5s default mentioned but not implemented)
- No fallback function signatures
- Comgate/QRcomat webhook failures have no recovery

**Current State:**
- `apps/web/src/lib/resilience/` directory exists in plan
- No actual circuit breaker implementation
- AI service timeout not defined in RabbitMQ consumer

**Impact:**
- AI endpoints return 500 on model unavailability
- Customer experiences platform as broken when AI is under maintenance
- Payment webhooks failing silently without retry
- Difficult to debug which integration failed

**Risk Level:** HIGH

**Fix Approach:**
1. Implement circuit breaker in `apps/web/src/lib/resilience/circuit-breaker.ts`
   - Track failure rate per integration
   - Open circuit after 5 consecutive failures
   - Half-open after 60s, attempt recovery
2. Wrap all AI endpoints with timeout + fallback
3. Implement idempotency keys for webhook processors (Comgate, QRcomat)
4. Return 200 with `{result, fallback: true}` instead of 500
5. Log all fallback activations for monitoring

**Acceptance Criteria:**
- AI service timeout after 5s returns default values with fallback flag
- Comgate webhook retry logic with exponential backoff
- Circuit breaker half-open test: after recovery, succeeds and closes circuit
- No 500 errors on integration unavailability

---

### Undefined SAGA Workflow Implementation

**Issue:** Payment/booking saga pattern specified in architecture but not detailed for implementation

**Files:** `schedulebox_complete_documentation.md` (lines 8250-8260 user flow analysis), planned in `packages/events/src/`

**Problem:** Critical flow missing implementation steps:
1. Customer clicks "Pay via Comgate"
2. POST /payments/comgate/create → redirect to Comgate
3. Customer completes/cancels payment
4. Comgate sends webhook
5. Booking status changes to confirmed/cancelled
6. Notification sent

Current issues:
- No timeout if webhook never arrives (payment taken, booking pending forever)
- No idempotency on webhook replays (double-charging possible)
- No compensation flow if notification fails (booking confirmed but no email)
- Booking expiration mechanism not specified

**Impact:**
- Lost bookings (pending forever)
- Duplicate charges
- Angry customers (confirmed booking but no receipt email)
- Revenue leakage

**Risk Level:** CRITICAL

**Fix Approach:**
1. Create `packages/events/src/saga/booking-payment.saga.ts` with state machine:
   - PENDING → AWAITING_PAYMENT → CONFIRMED/CANCELLED
   - Timeout after 30min: PENDING + no payment → auto-cancel
2. Implement idempotency key storage: `webhook_delivery_id` → prevent replay
3. Compensation: if notification fails, schedule retry via queue
4. Webhook receiver returns 202 ACCEPTED immediately, processes async
5. Add POST /bookings/{id}/expire endpoint for manual cleanup

**Acceptance Criteria:**
- Booking auto-cancels after 30min if payment not received
- Webhook replay with same delivery ID is idempotent
- Failed notification triggers automatic retry
- End-to-end test: payment webhook → booking confirmed → email sent

---

## High-Priority Issues (Required for Production)

### Soft Delete Implementation Missing

**Issue:** GDPR deletion cannot be implemented without soft deletes

**Files:** `packages/database/src/schema/` — all affected tables

**Problem:** Specification mentions soft delete on key tables (customers, bookings, employees) but:
- Only `customers.deleted_at` timestamp mentioned
- No soft delete on bookings, employees, services
- Unclear if deleted records excluded from queries by default
- No cascade behavior defined (if customer deleted, what happens to their bookings?)

**Impact:**
- Cannot implement GDPR "right to be forgotten"
- Reports include deleted entities
- Data recovery impossible if user deleted by mistake

**Risk Level:** HIGH

**Fix Approach:**
1. Add `deleted_at` TIMESTAMPTZ column to: customers, bookings, employees, services, coupons, gift_cards
2. Create `packages/database/src/schema/soft-delete.ts` helper with hook to auto-exclude deleted records
3. Document in `packages/database/src/db.ts` that queries exclude deleted by default
4. Provide explicit `includeDeleted: true` option for admin audit queries
5. GDPR deletion: set deleted_at instead of hard delete

**Acceptance Criteria:**
- Query bookings does not include deleted bookings
- Hard delete never used except in testing cleanup
- GDPR deletion endpoint: sets deleted_at with anonymization of PII

---

### Foreign Key Constraints Missing

**Issue:** Referential integrity gaps between tables

**Files:** `schedulebox_complete_documentation.md` (lines 8207-8209), planned in schema files

**Problem:** Specification audit identifies missing FKs:
- `bookings.coupon_id` → no FK to coupons table
- `bookings.gift_card_id` → no FK to gift_cards table
- `bookings.video_meeting_id` → no FK to video_meetings table
- Prevents database from preventing orphaned records
- Allows deletion of coupon while booking still references it

**Impact:**
- Orphaned coupons/gift cards left after deletion
- Data consistency errors in analytics
- Cascade delete side effects unpredictable

**Risk Level:** HIGH

**Fix Approach:**
1. Add to `packages/database/src/schema/bookings.ts`:
   ```typescript
   couponId: integer('coupon_id').references(() => couponsTable.id, { onDelete: 'set null' }),
   giftCardId: integer('gift_card_id').references(() => giftCardsTable.id, { onDelete: 'set null' }),
   videoMeetingId: integer('video_meeting_id').references(() => videoMeetingsTable.id, { onDelete: 'set null' }),
   ```
2. Create migration: `00X_add_missing_fk_constraints.sql`
3. Test: verify DELETE coupon with active bookings behaves correctly

**Acceptance Criteria:**
- All foreign keys defined with appropriate ON DELETE behavior
- Database prevents deletion of referenced records (if onDelete: 'restrict')
- Soft delete doesn't break FK integrity checks

---

### WebSocket/Real-Time Architecture Missing

**Issue:** Calendar real-time updates not specified for Socket.io implementation

**Files:** `schedulebox_complete_documentation.md` (lines 6218-6280), planned in `apps/web/src/lib/websocket/`

**Problem:** Specification defines events but not implementation:
- Socket.io server setup: which port? shared with Next.js or separate?
- Authentication: token validation on ws connection?
- Room/namespace strategy: one room per company or per employee?
- Reconnection behavior: what state is preserved?
- Rate limiting: disconnect noisy clients?

**Current State:**
- ServerToClientEvents interface defined (booking:created, payment:completed, etc.)
- No Socket.io server instantiation code
- Frontend hook useWebSocket planned but not implemented
- No guidance on handling connection failures

**Impact:**
- Calendar doesn't update when colleague books slot
- Multiple employees see stale data
- Users click unavailable slot and get double-booking error

**Risk Level:** HIGH

**Fix Approach:**
1. Create `apps/web/src/lib/websocket/server.ts` with Socket.io initialization
2. Authenticate ws connections: verify JWT token matches request
3. Use room pattern: socket joins `company:{companyId}` room on connect
4. Implement reconnect with state sync: fetch latest bookings on reconnect
5. Rate limit: disconnect clients sending >10 events/sec
6. Handle network partition: frontend queue changes, sync on reconnect

**Acceptance Criteria:**
- New booking emits to all connected clients in company room
- ws client auto-reconnects on disconnect
- No state inconsistency after reconnect
- Authenticated: invalid token rejected with 401

---

### Missing Health & Readiness Endpoints

**Issue:** Kubernetes cannot monitor application health

**Files:** Planned in `apps/web/src/app/api/v1/health/` and `/api/v1/readiness/`

**Problem:** Phase 1 requirements include INFRA-05 (health/readiness endpoints) but:
- No /health endpoint specification
- No /readiness endpoint specification
- Kubernetes deployment guide assumes these exist

**Current State:**
- Requirements mention them but no implementation plan
- No definition of what constitutes "ready"

**Impact:**
- Kubernetes can't detect failed containers
- Unhealthy pods stay in rotation
- Cascading failures become widespread

**Risk Level:** MEDIUM-HIGH

**Fix Approach:**
1. Create `apps/web/src/app/api/v1/health/route.ts`: returns 200 with `{status: 'ok'}`
2. Create `apps/web/src/app/api/v1/readiness/route.ts`: checks:
   - PostgreSQL connectivity
   - Redis connectivity
   - RabbitMQ connectivity
   - Returns 200 if all OK, 503 if any fails
3. Call readiness on startup and periodically
4. Add to Docker health check and K8s probes

**Acceptance Criteria:**
- /health responds in <100ms always
- /readiness checks all critical dependencies
- Kubernetes liveness probe uses /health
- Kubernetes readiness probe uses /readiness

---

### Rate Limiting Not Specified

**Issue:** API protection against abuse incomplete

**Files:** `schedulebox_complete_documentation.md` (lines 8213)

**Problem:** Generic rate limiting mentioned but endpoints need specific limits:
- /auth/login: 5 requests/minute per IP (brute force protection)
- /availability: 100 requests/minute per user (internal)
- POST /bookings: 10 requests/minute per user (prevent spam)
- General: 1000 requests/minute per API key

No specification of:
- Per-endpoint vs global limits
- Per-IP vs per-user tracking
- Storage backend (Redis required)
- Response headers (Retry-After, X-RateLimit-*)

**Impact:**
- Malicious actor books 10,000 concurrent slots
- Login attack takes 1000 tries to crack password
- Notification spam possible

**Risk Level:** MEDIUM

**Fix Approach:**
1. Define limits in `RATE_LIMITING.md`:
   - Auth endpoints: 5 req/min per IP
   - Availability: 100 req/min per user
   - Booking creation: 10 req/min per user
   - General: 1000 req/min per API key
2. Implement in `apps/web/src/lib/middleware/rate-limit.ts` using Redis
3. Return 429 with `Retry-After` header
4. Include `X-RateLimit-Remaining` in all responses

**Acceptance Criteria:**
- 6th login attempt in 1 minute returns 429
- Rate limit headers present in API responses
- Different limits per endpoint enforced
- Tests verify brute force is prevented

---

### Incomplete RBAC Permission Matrix

**Issue:** Authorization unclear for 99 endpoints and 4 roles

**Files:** `schedulebox_complete_documentation.md` (lines 8160-8177)

**Problem:** Specification defines 23 permissions and 4 roles but no complete matrix:
- Who can call /ai/smart-upselling? (admin, owner, employee, customer?)
- Who can call /settings/api-keys? (only owner/admin?)
- Who can call POST /automation/rules? (employee or owner only?)
- Current audit found matrix covers <40% of endpoints

**Current State:**
- Roles defined: admin, owner, employee, customer
- Permissions seeded in `permissions` lookup table (planned)
- RBAC middleware planned in `apps/web/src/lib/auth/rbac.ts`
- No endpoint-to-permission mapping

**Impact:**
- Developers guessing at authorization
- Security vulnerability: employee calls /settings/api-keys
- Feature inaccessible: customer can't see own bookings

**Risk Level:** MEDIUM-HIGH

**Fix Approach:**
1. Create `RBAC_MATRIX.md` documenting all 99 endpoints:
   ```
   GET /bookings | bookings.read | admin ✅ | owner ✅ | employee ✅ (own) | customer ✅ (own)
   DELETE /bookings/{id} | bookings.delete | admin ✅ | owner ✅ | employee ❌ | customer ❌
   ```
2. Implement `@requiresPermission('bookings.read')` decorator for route handlers
3. Middleware checks user.role + company permissions
4. Test: verify customer cannot POST /settings/company

**Acceptance Criteria:**
- Complete matrix covering all 99 endpoints
- Every endpoint decorated with required permission
- Integration test: customer denied access to /settings/company
- Admin can view audit log of permission checks

---

## Medium-Priority Issues (Quality & Scalability)

### Table Partitioning Strategy Undefined

**Issue:** Large tables will cause query performance degradation

**Files:** `schedulebox_complete_documentation.md` (line 8228), planned in migrations

**Problem:** Audit identifies `analytics_events` and `audit_logs` needing partitioning:
- No partitioning strategy defined
- analytics_events grows 1000s of rows/day
- Query analytics for last month may scan GB of data
- No monthly/yearly partition plan

**Impact:**
- Slow analytics dashboard after 6 months of data
- Backup/restore takes hours
- Query planning becomes inefficient

**Risk Level:** MEDIUM

**Fix Approach:**
1. Define in `PARTITIONING.md`:
   - analytics_events: partition by MONTH on created_at
   - audit_logs: partition by MONTH on created_at
   - Retention: 12 months (auto-delete old partitions)
2. Create migration: `00X_partition_analytics_and_audit.sql`
3. Create scheduled job to create future partitions

**Acceptance Criteria:**
- Monthly partitions created automatically
- Query analytics for month uses single partition
- Old partitions deleted after retention period
- Performance test: 12 months of data queries <100ms

---

### Backup & Disaster Recovery Not Specified

**Issue:** No documented recovery procedures for data loss

**Files:** Not mentioned in documentation

**Problem:**
- No backup frequency defined
- No RTO/RPO targets
- No disaster recovery runbook
- No testing of restore procedures

**Impact:**
- Data loss = business gone
- Recovery time unknown
- Ransomware attack has no mitigation plan

**Risk Level:** MEDIUM

**Fix Approach:**
1. Define backup strategy in `DISASTER_RECOVERY.md`:
   - Daily backups to S3, retention 30 days
   - RTO: 1 hour (restore and verify)
   - RPO: 1 hour (at most 1 hour data loss)
2. Implement automated backups in CI/CD
3. Monthly restore drill to verify backups work
4. Test restore on separate instance before promoting

**Acceptance Criteria:**
- Daily backups executed and logged
- Restore test runs monthly
- RTO/RPO verified in runbook
- Backup size monitored and alerted if growing unexpectedly

---

### Service Interdependencies Incomplete

**Issue:** 40% of microservice dependencies undocumented

**Files:** `schedulebox_complete_documentation.md` (lines 8299-8324)

**Problem:** Audit found:
- Booking Service depends on AI (for no-show prediction) — not documented
- Loyalty Service depends on Booking (for point earning) — not documented
- Notification Service depends on all other services — not documented
- Automation Service dependencies undefined

**Current State:**
- `packages/events/src/` will handle some async dependencies
- No synchronous dependency graph
- No version compatibility matrix
- No breaking change detection

**Impact:**
- Service A upgrade breaks Service B silently
- Circular dependencies possible
- Deployment order unclear

**Risk Level:** MEDIUM

**Fix Approach:**
1. Create `SERVICE_DEPENDENCIES.md`:
   ```
   Booking Service:
     - Depends on: Customer, Service, Employee, Resource (data)
     - Depends on: AI (no-show prediction, optional, has fallback)
     - Depends on: Notification (event via RabbitMQ)
     - Publishes: booking.created, booking.confirmed, booking.cancelled
   ```
2. Implement dependency check in CI/CD
3. Generate service mesh config from this spec
4. Add version constraints to package.json

**Acceptance Criteria:**
- All 17 services documented with dependencies
- No circular dependencies detected
- CI/CD fails if undocumented dependency found
- Deployment order inferred from DAG

---

### Internationalization Strategy Incomplete

**Issue:** i18n structure exists but no file/key naming convention

**Files:** `schedulebox_complete_documentation.md` (lines 6283-6295), planned in i18n config

**Problem:**
- Three languages planned (cs, sk, en)
- next-intl framework chosen
- No guidance on:
  - Where translation files live
  - Key naming convention (flat vs nested)
  - How to handle pluralization
  - How to manage translation lifecycle

**Impact:**
- Developers inconsistent in key naming
- Duplicate translation keys
- Hard to audit coverage

**Risk Level:** LOW-MEDIUM

**Fix Approach:**
1. Create `I18N.md` with structure:
   ```
   locales/
   ├── cs.json
   ├── sk.json
   └── en.json
   ```
2. Define key naming: `{page}.{component}.{field}` (e.g., `dashboard.kpi_card.bookings_label`)
3. Create translation linter to verify all keys in all languages
4. Document pluralization approach (if any)

**Acceptance Criteria:**
- Consistent naming across all 3 languages
- Linter in CI/CD detects missing keys
- No duplicate keys
- Translation coverage 100%

---

### Accessibility (WCAG 2.1 AA) Undefined

**Issue:** A11y not specified despite being in requirements (POL-04)

**Files:** Not found in documentation

**Problem:**
- Requirement POL-04: "WCAG 2.1 AA accessibility compliance"
- No implementation guidance
- No testing strategy
- No semantic HTML patterns

**Impact:**
- Blind/low-vision users can't use platform
- Legal liability (accessibility lawsuits possible)
- Regulatory risk

**Risk Level:** MEDIUM

**Fix Approach:**
1. Create `ACCESSIBILITY.md` with WCAG 2.1 AA requirements
2. Implement in shadcn/ui components already (check)
3. Define semantic HTML patterns for custom components
4. Add axe-core testing to CI/CD
5. Manual testing with screen readers (NVDA)

**Acceptance Criteria:**
- All components pass axe-core scan
- Keyboard navigation works on all pages
- Screen reader tested on critical flows
- Color contrast meets WCAG AA (4.5:1)

---

### Monitoring & Observability Stack Incomplete

**Issue:** Prometheus + Grafana specified but no implementation plan

**Files:** `schedulebox_complete_documentation.md` (line 8216), planned in Phase 15

**Problem:**
- Specification mentions Prometheus metrics, Grafana dashboards, Sentry error tracking
- No metric names/labels defined
- No dashboard specifications
- No alert thresholds
- Distributed tracing (OpenTelemetry) spec missing

**Impact:**
- Production outages undetected
- Debugging distributed system impossible
- Performance bottlenecks not identified

**Risk Level:** MEDIUM

**Fix Approach:**
1. Create `OBSERVABILITY.md` with:
   - Metric categories: API latency, database queries, message queue depth, error rate
   - Labels: service, endpoint, status, error_code
   - SLOs: P99 latency <500ms, error rate <0.1%, uptime 99.9%
2. Define Grafana dashboard for each service
3. Define alert thresholds in Prometheus
4. Implement OpenTelemetry instrumentation in each service
5. Add tracing test: trace a booking creation request through all services

**Acceptance Criteria:**
- Prometheus scrapes all services
- Grafana shows service dashboards
- Alerts fire on SLO breach
- Traces show end-to-end request flow

---

### Testing Strategy Incomplete

**Issue:** Unit/integration/e2e test approach not specified

**Files:** `schedulebox_complete_documentation.md` (lines 7634-7896), requirements say "80% coverage"

**Problem:**
- Framework chosen: not explicit (likely Vitest + Playwright)
- Test file structure: unknown (co-located or separate?)
- Mock strategy: unclear
- Integration test environment: unknown
- E2E test scenarios: not documented
- Coverage targets: 80% mentioned but no per-component breakdown

**Impact:**
- Developers don't know where to write tests
- Test coverage inconsistent
- E2E tests flaky (no retry strategy defined)
- Release confidence low

**Risk Level:** MEDIUM

**Fix Approach:**
1. Create `TESTING.md` with:
   - Unit tests: Vitest, co-located with components
   - Integration tests: test database + RabbitMQ in Docker
   - E2E tests: Playwright, critical user flows
   - Coverage: 80% line coverage, 100% function coverage
2. Define mock patterns for external APIs
3. Create test fixtures for common scenarios
4. Add coverage reporting to CI/CD

**Acceptance Criteria:**
- 80% coverage on all packages
- E2E tests for 10 critical flows (booking, payment, etc.)
- All tests pass in CI on first run (no flakiness)
- Coverage reports visible in PR comments

---

## External Integration Risks

### Comgate Payment Gateway

**Issue:** Webhook reliability and idempotency not specified

**Files:** Planned in `apps/web/src/lib/integrations/comgate.ts`, webhook handler in Phase 6

**Problem:**
- Webhook delivery not guaranteed (network failures)
- No mention of webhook signature verification
- Idempotency key strategy undefined
- Timeout handling missing (what if Comgate offline?)
- No mention of refund API

**Impact:**
- Duplicate charges (webhook replayed)
- Bookings stuck in pending (webhook never received)
- No way to refund customer
- Webhook from attacker could create fake bookings

**Risk Level:** HIGH

**Fix Approach:**
1. Implement webhook signature verification (HMAC-SHA256)
2. Store `delivery_id` in payment record, reject duplicates
3. Timeout on payment creation: if not confirmed after 30min, cancel
4. Implement refund API call for payment reversal
5. Add comprehensive error handling with retry logic
6. Create webhook replay test

**Acceptance Criteria:**
- Webhook signature verified before processing
- Duplicate webhook with same delivery_id is idempotent
- Payment confirmed within 30min or auto-cancels
- Refund API tested with mock payment
- Rate limit errors from Comgate handled with exponential backoff

---

### QRcomat Integration

**Issue:** API not verified, implementation approach undefined

**Files:** Planned in `apps/web/src/lib/integrations/qrcomat.ts`

**Problem:**
- Specification says "QRcomat generates QR code for on-site payment"
- No API documentation link provided
- No integration test with real API
- QR format/encoding undefined
- Webhook from QRcomat (if any) not specified

**Impact:**
- QRcomat integration might be impossible
- On-site payment feature broken
- Architecture based on untested assumption

**Risk Level:** HIGH

**Fix Approach:**
1. Research QRcomat API (if public) or contact vendor
2. Create integration spike (POC) to verify API works
3. Document API in `INTEGRATIONS.md` with:
   - Endpoint URL
   - Authentication method
   - QR code format (SVG, PNG, data URL)
   - Webhook payload (if applicable)
4. Create mock for testing
5. Add contract test with real QRcomat (staging)

**Acceptance Criteria:**
- QRcomat API documented in INTEGRATIONS.md
- POC generates working QR code
- Webhook (if exists) tested and verified
- Mock available for unit tests

---

### Video Conference Providers (Zoom, Google Meet, MS Teams)

**Issue:** Unclear which features each supports

**Files:** Planned in `apps/web/src/lib/integrations/{zoom,google-meet,teams}.ts`

**Problem:**
- Requirements say integrate Zoom, Meet, Teams
- No specification of which one is default
- No mention of:
  - Automatic meeting room creation
  - Host/participant roles
  - Recording availability
  - Authentication flow (is meeting URL shared or user logs in?)
- No fallback if provider fails

**Impact:**
- Feature incomplete (no default provider)
- User experience inconsistent
- Provider outage breaks feature

**Risk Level:** MEDIUM

**Fix Approach:**
1. Define in `VIDEO_INTEGRATIONS.md`:
   - Default provider: Zoom (best support)
   - Fallback providers: Google Meet, MS Teams
   - Meeting room created at booking creation
   - URL shared in confirmation email
   - Host = service owner, participants = customer + support staff (if needed)
2. Implement provider abstraction interface
3. Allow admin to choose preferred provider
4. Fall back to next provider if creation fails

**Acceptance Criteria:**
- Default provider (Zoom) creates meeting on booking
- URL appears in confirmation email
- Fallback to Meet if Zoom unavailable
- Admin can change provider in settings

---

## Data & Security Concerns

### GDPR Compliance Incomplete

**Issue:** Data deletion and anonymization approach not detailed

**Files:** `schedulebox_complete_documentation.md` (mentioned in CRM-07), planned in Phase 8

**Problem:**
- Requirement CRM-07: "GDPR compliance tools (data export, anonymization, deletion)"
- No specification of:
  - What constitutes PII to be deleted
  - Anonymization algorithm (hashing, randomization?)
  - Audit trail of deletions
  - Retention periods by data type

**Impact:**
- GDPR non-compliance
- Customer data not properly deleted
- Regulatory fines possible
- Customer trust loss

**Risk Level:** HIGH

**Fix Approach:**
1. Create `GDPR.md` with:
   - PII fields: name, email, phone, address, notes
   - Deletion: soft delete + anonymization
   - Anonymization: `name = 'DELETED'`, `email = NULL`, phone hashed
   - Audit: log all deletions with timestamp/user
   - Retention: keep booking history for 7 years (tax), delete customer contact after 1 year of inactivity
2. Implement in customer deletion endpoint
3. Create GDPR deletion audit report
4. Test: verify deleted customer data cannot be recovered

**Acceptance Criteria:**
- Customer deletion endpoint anonymizes all PII
- Deletion audit logged and available to admins
- Deleted customer cannot be queried
- Historical booking data retained (for tax/dispute)

---

### Password Policy Inconsistency

**Issue:** Form validation (8 chars) differs from API validation (12 chars)

**Files:** `schedulebox_complete_documentation.md` (line 8215)

**Problem:**
- Frontend form: 8 character minimum
- API validation (Zod): 12 character minimum
- User enters 8-char password, validation passes frontend, fails API with confusing error

**Impact:**
- Poor UX (error message unclear)
- Security concern (inconsistent policy)
- Developer confusion

**Risk Level:** LOW

**Fix Approach:**
1. Decide on single policy: 12 characters minimum (more secure)
2. Update frontend form validation in `apps/web/src/components/auth/RegisterForm.tsx`
3. Keep API validation in `packages/shared/src/schemas/auth.ts`
4. Add integration test: register with 11-char password fails on API

**Acceptance Criteria:**
- Form and API use same validation rule
- Error message clear if too short
- Password policy documented (12+ chars, uppercase, digit, special)

---

### OAuth2 Redirect URI Vulnerability

**Issue:** Redirect URL after OAuth callback not specified

**Files:** Planned in `apps/web/src/lib/auth/oauth/` handlers

**Problem:**
- Specification mentions OAuth2 login (Google, Facebook, Apple)
- No mention of:
  - Where to redirect after login
  - How to validate callback URL
  - PKCE flow support
  - State parameter validation

**Impact:**
- Open redirect vulnerability (attacker redirects to malicious site)
- CSRF attack possible (missing state validation)
- PKCE bypass risk

**Risk Level:** MEDIUM

**Fix Approach:**
1. Define in `AUTH.md`:
   - After login callback, verify state parameter
   - Redirect to dashboard (not user-provided URL)
   - Implement PKCE flow for mobile apps
   - Whitelist allowed redirect URIs
2. Add security test: verify redirect URL validation

**Acceptance Criteria:**
- State parameter validated on callback
- Redirect hardcoded to /dashboard (not configurable)
- PKCE flow implemented
- Security test prevents open redirect

---

## Architectural Complexity Risks

### Microservices Coordination Complexity

**Issue:** 17+ microservices with 20+ event types create coordination challenges

**Problem:**
- Each service has own database (no shared schema)
- Event-driven communication can cause eventual consistency issues
- Testing distributed transactions difficult
- Debugging multi-service requests requires distributed tracing

**Impact:**
- Data inconsistencies (customer deleted, booking still exists)
- Cascading failures harder to prevent
- Development velocity decreased due to testing complexity

**Risk Level:** MEDIUM

**Fix Approach:**
1. Document eventual consistency guarantees in `EVENTUAL_CONSISTENCY.md`
2. Define maximum consistency window (e.g., 30 seconds)
3. Implement distributed transaction patterns (SAGA, event sourcing)
4. Create contract tests between services
5. Implement observability to detect consistency violations

**Acceptance Criteria:**
- Service contract tests pass
- Consistency violations monitored and alerted
- Eventual consistency window documented
- No data loss across service failures

---

### Deployment Complexity for 15 Phases

**Issue:** Coordinating 15 sequential phases with 4 parallel segments is complex

**Problem:**
- Phase interdependencies could be missed
- Parallel development creates merge conflicts
- Testing across phases is difficult
- Release coordination across segments is error-prone

**Impact:**
- Delayed releases
- Quality issues
- Developer frustration

**Risk Level:** LOW-MEDIUM

**Fix Approach:**
1. Create detailed phase execution guide in `.planning/PHASE_EXECUTION.md`
2. Define branch strategy: `segment/{name}/phase-{number}/{feature}`
3. Create integration checklist for each phase
4. Use feature flags to merge code before feature is complete
5. Define release blockers (e.g., Phase 5 cannot ship without Phase 3 complete)

**Acceptance Criteria:**
- Phase checklist signed off before moving to next phase
- No breaking changes between phases
- Feature flags allow parallel development
- Release coordination manual created

---

## Testing & Quality Gaps

### Load Testing Not Specified

**Issue:** Requirement OPS-04 mentions "Load testing with k6 (target: 1000 concurrent users)" but not detailed

**Files:** Planned in Phase 15

**Problem:**
- No load test scenarios defined
- No baseline performance targets
- No stress test limits identified
- No chaos engineering plan

**Impact:**
- Production outage under peak load
- Scaling strategy undefined
- SLAs cannot be guaranteed

**Risk Level:** MEDIUM

**Fix Approach:**
1. Create `LOAD_TESTING.md` with:
   - Scenarios: booking creation, availability query, payment processing
   - Targets: P99 <500ms at 1000 concurrent users
   - Ramp-up: 0→1000 users over 5 minutes
   - Soak test: 500 users for 2 hours (detect memory leaks)
2. Implement k6 test suite
3. Run before each release

**Acceptance Criteria:**
- 1000 concurrent users bookings with P99 <500ms
- No errors under load (0% failure rate)
- Resource utilization <80% CPU, <80% memory
- Database query performance consistent under load

---

### Flaky Test Mitigation Undefined

**Issue:** E2E tests prone to flakiness, no retry strategy

**Problem:**
- E2E tests often timeout or fail intermittently
- No retry logic defined
- No debugging output on failure

**Impact:**
- CI/CD pipeline unreliable
- Developers lose confidence in tests
- Real failures hidden in noise

**Risk Level:** MEDIUM

**Fix Approach:**
1. Define test retry strategy: retry 3 times on timeout/flakiness
2. Implement in test runner configuration
3. Log detailed failure information (screenshots, videos, network logs)
4. Create flaky test quarantine: mark unreliable tests and investigate
5. Implement test parallelization to reduce total time

**Acceptance Criteria:**
- E2E tests pass reliably in CI/CD
- Retry logic in place but not needed (tests are stable)
- Failure logs captured for debugging

---

## Deferred Concerns (Not in v1, but Good to Know)

### Multi-Database Support

**Issue:** Single PostgreSQL might become bottleneck at scale

**Deferred to:** v2 (mentioned in REQUIREMENTS.md as out of scope)

**Note:** Single PostgreSQL with read replicas sufficient for target scale (5000 businesses, <100k booking/day). Sharding deferred to v2.

---

### Search & Indexing

**Issue:** Full-text search not implemented, using PostgreSQL built-ins

**Deferred to:** v2 (Elasticsearch deferred as out of scope)

**Note:** PostgreSQL pg_trgm extension sufficient for v1. Revisit if search latency becomes issue.

---

### Mobile App

**Issue:** Web-first approach; native mobile app deferred

**Deferred to:** v2 (mentioned in REQUIREMENTS.md as out of scope)

**Note:** Responsive web design sufficient for MVP. React Native mobile app planned for v2.

---

## Summary by Risk Level

### CRITICAL (4)
- Double-booking prevention race condition
- Missing domain events for automation
- Row Level Security policies absent
- SAGA workflow undefined

### HIGH (7)
- Incomplete API error specifications
- Missing fallback strategies for AI/integrations
- Soft delete not implemented
- Missing foreign keys
- WebSocket architecture incomplete
- Comgate webhook reliability/idempotency
- QRcomat API not verified

### MEDIUM (9)
- Missing health/readiness endpoints
- Rate limiting not specified per-endpoint
- Incomplete RBAC permission matrix
- Table partitioning undefined
- Backup/disaster recovery missing
- Service interdependencies incomplete
- i18n file structure undefined
- Accessibility (WCAG 2.1) undefined
- Monitoring/observability incomplete
- Load testing not specified
- GDPR compliance incomplete

### LOW-MEDIUM (3)
- Deployment complexity for 15 phases
- Microservices coordination complexity
- OAuth2 redirect validation

### LOW (1)
- Password policy inconsistency

---

## Recommended Implementation Order

**Phase 1 (Before Development Starts):**
1. Implement double-booking prevention (SELECT FOR UPDATE + UNIQUE)
2. Define complete domain events specification
3. Create RLS policies for all tables
4. Implement SAGA workflow pattern
5. Add health/readiness endpoints

**Phase 2-5 (During MVP Development):**
6. Add soft delete support
7. Add foreign key constraints
8. Implement WebSocket architecture
9. Define per-endpoint rate limiting
10. Create complete RBAC matrix

**Phase 6-15 (During Feature Development):**
11. Implement payment gateway fallbacks and idempotency
12. Verify QRcomat API and create contracts
13. Add monitoring and observability
14. Create comprehensive test strategy
15. GDPR compliance audit and implementation

---

*Concerns audit: 2026-02-10*
*Phase: 1 (Planning Only — No Implementation Code Yet)*
*Total Issues Identified: 23 Critical + High, 9 Medium, 3 Low-Medium, 1 Low*

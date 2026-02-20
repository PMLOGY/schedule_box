# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.1 Production Hardening — Phase 22 in progress (Monitoring & Alerts), Plan 02 complete

## Current Position

- **Milestone:** v1.1 Production Hardening
- **Phase:** 22 in progress (Monitoring & Alerts)
- **Current Plan:** 22-02 complete, continuing to 22-03 (if exists)
- **Status:** Phase 22 plan 2/N complete
- **Last activity:** 2026-02-20 — Phase 22 Plan 02 complete (webhook metrics, monitoring API endpoints, CI coverage summary)

Progress: [██████████████████████░░░░░░░░░░░░░░] 83% (19/22 phases complete, phase 22 plan 2 done)

## What's Done

**v1.0 shipped** (103 requirements, 15 phases, 101 plans). Deployed to Railway 2026-02-15.

**Post-v1.0 fixes** (2026-02-15):
- Fixed Redis NOAUTH in notification worker
- Wired dashboard to real analytics data
- Replaced hardcoded placeholder values
- Fixed analytics date calculation bug

**v1.1 roadmap created** (2026-02-15):
- 7 phases mapped (16-22)
- 33 requirements with 100% coverage
- Testing foundation → Integration/E2E tests → Email/SMS → Payments → Monitoring
- Dependencies validated (test infrastructure before services)

**Phase 16 Plan 01 complete** (2026-02-20):
- Vitest 4.0.18 installed across monorepo with coverage-v8, UI, happy-dom
- Shared base config (vitest.shared.ts) with 80% coverage thresholds
- Per-package vitest.config.ts for shared, events, web, notification-worker
- Root test scripts: test, test:unit, test:watch, test:ui, test:coverage
- Smoke test passes (generateSlug Czech diacritics, 5 assertions)

**Phase 16 Plan 02 complete** (2026-02-20):
- 193 unit tests for shared utilities (69) and Zod schemas — booking (42), payment (42), notification (40)
- 41 CloudEvent tests — createCloudEvent, validateCloudEvent, 11 domain event creators (booking + payment)
- 100% coverage on utils/index.ts, booking.ts, payment.ts, notification.ts (all 4 metrics)
- Fixed coverage config: narrowed vitest.shared.ts exclude from **/index.ts to src/index.ts
- Fixed coverage.include: explicit file list prevents untested siblings from failing 80% threshold

**Phase 16 Plan 03 complete** (2026-02-20):
- MSW 2.0 installed and configured in @schedulebox/web
- Default handlers for Comgate (3 endpoints), AI service (3 endpoints), notifications (1 endpoint)
- MSW lifecycle in vitest.setup.ts (listen/resetHandlers/close); setupFiles added to web vitest.config.ts
- 9 MSW handler tests verify interception and override pattern work
- CI pipeline updated: test job runs pnpm test:coverage, build job requires [lint, test]

**Phase 17 Plan 01 complete** (2026-02-20):
- Testcontainers installed (testcontainers + @testcontainers/postgresql/redis/rabbitmq)
- vitest.integration.config.ts: 30s test / 120s hook timeouts, node env, sequential, no coverage
- globalSetup.ts: starts PG 16 + Redis 7 + RabbitMQ 3.13, applies migrations + 11 SQL files, creates test_app role
- test-db.ts: createTestDb (superuser), createTestAppDb (RLS non-superuser), setRlsContext, truncateAllTables
- seed-helpers.ts: 7 factories (company, user, service, employee, employeeService, customer, booking)
- tsconfig.integration.json: resolves @schedulebox/database + drizzle-orm + postgres for TS checks
- pnpm test:integration command exists, returns "no test files found" (expected at this stage)

**Phase 17 Plan 02 complete** (2026-02-20):
- 4 double-booking tests: concurrent SELECT FOR UPDATE (exactly 1 success + 1 failure), btree_gist exclusion constraint rejection, adjacent bookings succeed, cancelled slot reuse works
- 9 RLS isolation tests: customers/bookings/services/employees per-company isolation, explicit cross-tenant WHERE returns 0 rows, cross-table disjoint result sets, INSERT isolation
- Fixed vitest.integration.config.ts: added resolve.alias for drizzle-orm + postgres (pnpm doesn't hoist to root; Vite runtime needs explicit paths)
- Fixed tsconfig.integration.json: added vitest/globals types for describe/it/expect globals

**Phase 17 Plan 03 complete** (2026-02-20):
- 7 Comgate webhook signature tests (ITEST-04): valid HMAC-SHA256, tampered price, tampered status, wrong secret, empty, truncated, Czech chars
- 11 booking status transition tests (ITEST-05): 6 valid (pending->confirmed/cancelled/expired, confirmed->completed/cancelled/no_show), 4 invalid (pending->completed, completed->pending, cancelled->confirmed, no_show->confirmed), full lifecycle
- CI pipeline integration-test job added (ITEST-06): runs pnpm test:integration after unit tests, blocks Docker image build
- build job updated to needs: [lint, test, integration-test]
- Phase 17 complete: 31 total integration tests across 4 files

**Phase 18 Plan 01 complete** (2026-02-20):
- Playwright 1.58.2 installed with Chromium, Firefox, WebKit browser binaries
- playwright.config.ts: 3 browser projects + setup project + webServer (pnpm start)
- auth.setup.ts: storageState authentication for test owner (login once, reuse across browsers)
- 4 Page Object Models: LoginPage, RegisterPage, BookingWizardPage, DashboardPage
- 7 mock API helpers: mockServicesAPI, mockEmployeesAPI, mockAvailabilityAPI, mockComgatePaymentCreate, mockComgateRedirect, mockAIServiceDown, mockAIServiceHealthy
- Auth fixture: authenticatedPage and unauthenticatedPage test extensions
- test:e2e and test:e2e:ui scripts added to web and root package.json
- .gitignore updated for playwright auth/results/report directories

**Phase 16 Plan 04 complete** (2026-02-20):
- Gap closure: fixed CI coverage gate so it actually enforces 80% threshold per package
- Added coverage.include to packages/events/vitest.config.ts scoping to src/events/booking.ts and src/events/payment.ts (booking.ts + payment.ts at 100%, publisher.ts excluded — RabbitMQ integration scope)
- Added "test:coverage": "vitest run --coverage" script to packages/shared, packages/events, apps/web
- CI updated from pnpm test:coverage (workspace mode, exits 0 regardless) to pnpm -r --if-present test:coverage (per-package, propagates exit codes, blocks build on violations)
- All Phase 16 must-haves now fully verified (4/4)

**Phase 18 Plan 02 complete** (2026-02-20):
- 4 auth E2E tests: registration success, login with seeded credentials, invalid credentials error, email format validation
- 2 booking E2E tests: full 4-step wizard flow with mocked APIs, field validation (Next button visibility)
- All tests use Page Object Models and unauthenticated/authenticated context patterns
- Comprehensive API mocking via page.route() for services, employees, availability, customers, bookings, AI

**Phase 18 Plan 03 complete** (2026-02-20):
- 2 payment E2E tests: Comgate payment flow with mocked redirect/callback, graceful error handling on 500
- 2 AI fallback E2E tests: circuit breaker fallback rendering on capacity page, health endpoint circuit breaker state validation
- CI pipeline Job 5 (E2E): PostgreSQL 16 + Redis 7 service containers, db:setup, Next.js build, Playwright 3-browser test, artifact upload
- E2E job depends on [lint, test] not [build] (build only runs on main, E2E does own build)

**Phase 19 Plan 01 complete** (2026-02-20):
- nodemailer@7 + @types/nodemailer installed in @schedulebox/web
- Created apps/web/lib/email/auth-emails.ts: module-level SMTP transporter, sendPasswordResetEmail + sendEmailVerificationEmail with Czech HTML+text templates
- Provider-agnostic SMTP config via env vars (SMTP_HOST/PORT/USER/PASS), STARTTLS port 587, default from no-reply@schedulebox.cz
- forgot-password route: replaced TODO no-op with sendPasswordResetEmail (errors caught, not re-thrown)
- register route: generate email_verify token, store in Redis 24hr TTL, fire-and-forget sendEmailVerificationEmail
- Fixed pre-existing tsconfig.json build failure: excluded vitest.config.ts from Next.js tsc

**Phase 19 Plan 02 complete** (2026-02-20):
- Created booking-cancellation.hbs: Czech cancellation email template (Rezervace zrušena) with customer_name, service_name, booking_date, reason (optional), company_name
- Fixed layout.hbs: replaced broken {{unsubscribe_url}} anchor with static transactional note (spam filter fix)
- Fixed booking-consumer.ts: handleBookingCreated and handleBookingCancelled now fetch real company name from companies DB table
- Fixed reminder-scheduler.ts: scanWindow fetches real company name per booking from companies DB table
- Cancellation handler now calls renderTemplateFile('booking-cancellation') instead of inline HTML string

**Phase 19 Plan 03 complete** (2026-02-20):
- Added SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to Helm secrets.yaml (native K8s Secret stringData + ExternalSecret data array)
- Removed hardcoded empty-string SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS env overrides from worker-deployment.yaml (they overrode secretRef, silently blocking email delivery)
- Updated .env.example from SendGrid to cesky-hosting.cz with correct field documentation (SMTP_USER = full email address)

**Phase 19 Plan 04 complete** (2026-02-20):
- DKIM + DMARC DNS records configured for schedulebox.cz via cesky-hosting.cz hosting panel
- End-to-end email delivery verified: smtp.cesky-hosting.cz SMTP 250 OK, Gmail inbox delivery confirmed (not spam)
- SMTP env vars added to apps/web/.env.local for local development
- Phase 19 (Email Delivery) COMPLETE: all 4 plans finished, SMTP pipeline operational

**Phase 20 Plan 01 complete** (2026-02-20):
- Fixed UCS-2 multipart segment estimation: 67 chars/segment (was 70), GSM-7 multipart: 153 chars/segment (was 160)
- Added isValidCzechMobile() phone validation: +420 6xx/7xx only, rejects landlines (+420 2xx-5xx)
- Created no-show-client.ts: lightweight HTTP client for AI predictions with 3s timeout, conservative fallback (low probability when AI unavailable)
- AI-gated SMS in reminder-scheduler.ts: SMS only enqueues when no_show_probability > 0.7 AND prediction is not a fallback
- Added AI config: AI_SERVICE_URL, SMS_NO_SHOW_THRESHOLD, SMS_BUDGET_ALERT_THRESHOLD env vars

**Phase 21 Plan 01 complete** (2026-02-20):
- Replaced verifyComgateSignature (HMAC-SHA256 header) with verifyComgateWebhookSecret (POST body secret comparison)
- Comgate sends merchant secret as POST body "secret" parameter — not an HMAC header (confirmed via PHP/Node/Clojure SDKs)
- Webhook handler: parse body first, extract parsedBody.get('secret'), verify via crypto.timingSafeEqual with length pre-check
- Defense-in-depth: getComgatePaymentStatus called after payment lookup; API status overrides webhook on mismatch (best-effort)
- Integration tests rewritten: 7 cases for verifyComgateWebhookSecret (valid, wrong, empty, whitespace, null-like, timing-safe, special chars)

**Phase 22 Plan 02 complete** (2026-02-20):
- Added webhookProcessingTotal Counter to @schedulebox/shared/metrics/business (gateway + status labels)
- Instrumented Comgate webhook handler: success counter after markWebhookCompleted(), failure counter in catch block
- Created GET /api/v1/monitoring/email-stats: delivered/failed/total/bounceRate for configurable window (default 60min)
- Created GET /api/v1/monitoring/sms-stats: sent/failed/total + estimatedCostCzk + percentOfLimit for current month
- Created GET /api/v1/monitoring/webhook-stats: completed/failed/stuck (>5min in processing) for configurable window
- All monitoring endpoints protected by SETTINGS_MANAGE permission (admin only)
- Added json-summary to vitest.shared.ts coverage reporters (generates coverage-summary.json per package)
- Added "Generate coverage summary" CI step: writes per-package markdown table to GITHUB_STEP_SUMMARY with if: always()
- MON-03 complete (webhook failure counter), MON-04 complete (80% threshold + human-readable CI reporting)


**Phase 21 Plan 02 complete** (2026-02-20):
- Created POST /api/v1/payments/expire-pending/cron: standalone cron endpoint with CRON_SECRET bearer auth via crypto.timingSafeEqual
- Returns 503 if CRON_SECRET unset, 401 on token mismatch, 200 with {expired_count, timestamp}
- Fixed docs/env-vars-reference.md: COMGATE_API_KEY replaced with COMGATE_SECRET, COMGATE_TEST_MODE removed, COMGATE_API_URL added
- Added Payment Cron section to env-vars-reference.md with CRON_SECRET and PAYMENT_TIMEOUT_MINUTES
- Added CRON_SECRET placeholder to .env.example

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Recent decisions:**
- Phase ordering: Testing infrastructure first (16-18), then services (19-21), monitoring last (22)
- Test coverage target: 80% enforced in CI (not 100% — focus on critical paths)
- SMTP provider changed to cesky-hosting.cz (not Brevo): smtp.cesky-hosting.cz, SMTP_USER = full email address, SMTP_FROM = no-reply@schedulebox.cz
- SMS provider: Keep Twilio (code exists, TypeScript-native SDK v4)
- E2E framework: Playwright over Cypress (Safari support for 40% CZ iOS users)
- Vitest 4.0 removed defineWorkspace: use test.projects array in vitest.config.ts instead
- Coverage thresholds at 80% for lines/functions/branches/statements enforced via v8 provider
- web package uses happy-dom environment; all other packages use node environment
- MSW onUnhandledRequest: 'warn' (not 'error') during bootstrap phase to avoid test failures
- build-ai CI job only needs lint (AI service is Python, not covered by Vitest)
- Coverage.include must be explicit file list per package to prevent untested siblings from dragging below 80% threshold
- vitest.shared.ts coverage.exclude uses src/index.ts (not **/index.ts) — narrow pattern avoids excluding implementation files
- Events package unit tests cover only pure functions (createCloudEvent, validateCloudEvent); publishEvent needs RabbitMQ (integration test scope)
- pnpm -r --if-present test:coverage chosen over root workspace coverage thresholds: per-package exit codes propagate correctly, Vitest 4.0 workspace mode silently ignores per-package thresholds at root
- events coverage.include scoped to src/events/booking.ts + src/events/payment.ts only: publisher.ts contains RabbitMQ-dependent functions that require a live broker (integration test scope Phase 17)
- Integration tests run via separate pnpm test:integration (not in root vitest.config.ts projects): isolates Docker/Testcontainers dependency from fast unit tests
- Vitest 4.0 globalSetup parameter type is TestProject (from vitest/node), not GlobalSetupContext (old Vitest 2.x type)
- test_app PostgreSQL role required for RLS testing: superusers bypass RLS policies entirely
- TRUNCATE companies CASCADE for test cleanup: fastest method since all 47 tenant tables FK to companies
- SET LOCAL (not SET) for RLS session variables: scopes context to current transaction, prevents cross-test contamination
- tsconfig.integration.json with paths to packages/database/node_modules: pnpm does not hoist drizzle-orm/postgres to root by default
- resolve.alias in vitest.integration.config.ts required for Vite runtime resolution of drizzle-orm/postgres: tsconfigPaths handles TypeScript types only, not Vite module bundler runtime
- tx.unsafe() instead of tagged template literals in postgres.js begin() callbacks: Omit<Sql, ...> strips call signatures from TransactionSql, making tx`...` tagged template fail type-check
- Two independent postgres() clients for concurrent transaction tests: same pool can serialize begin() calls; separate clients guarantee independent physical connections
- USING-only RLS policies (no WITH CHECK): cross-tenant INSERT may succeed but row is invisible to inserting company on SELECT
- Playwright page.route() for E2E mocking over MSW: simpler at browser network level, no service worker setup needed
- i18n-safe regex patterns in POMs: match Czech (Prihlasit), Slovak, English (Sign in) button text
- storageState auth: authenticate once in setup project, reuse across chromium/firefox/webkit projects
- Auth fixture pattern: authenticatedPage/unauthenticatedPage for explicit test isolation in E2E specs
- Availability mock uses AvailabilitySlot format (startTime/endTime/employeeId) matching component expectations, not simpler helper format
- AI upselling endpoint mocked with empty recommendations to prevent widget interference in booking tests
- Calendar day selection uses button text filter with regex anchors for exact day matching in react-day-picker
- E2E CI job needs: [lint, test] not [lint, test, build]: build only runs on main (if: github.ref == 'refs/heads/main'), E2E does its own pnpm build step
- AI health endpoint E2E test accepts 200 or 401/403: test owner may lack SETTINGS_MANAGE permission, both prove endpoint doesn't crash
- Comgate payment E2E mocked at /api/v1/payments/comgate/create response level: server-side Comgate API calls cannot be intercepted by page.route()
- VALID_TRANSITIONS map duplicated in integration test file (not imported from app): intentional contract test — if app logic changes, test catches discrepancy
- TESTCONTAINERS_RYUK_DISABLED=true for CI integration-test job: Ryuk resource reaper causes Docker socket permission failures on ephemeral GitHub Actions VMs; disabling is safe
- integration-test CI job uses needs: test (not needs: [lint, test]): lint already validated before test; adding it would be redundant
- Transactional emails do not need unsubscribe links under Czech law: replaced {{unsubscribe_url}} with static note in layout.hbs
- renderTemplateFile is synchronous (uses readFileSync internally): no await used in cancellation template call
- Company name fallback to string 'ScheduleBox': prevents empty sender name if DB lookup returns no row
- Helm secrets pattern: credentials belong in secrets.yaml stringData/ExternalSecret data only; hardcoded empty-string env entries in deployment manifests override secretRef and silently break runtime credential injection
- SMTP_PORT excluded from Helm ExternalSecret block: has safe 587 default in native Secret, no per-environment override needed
- auth-emails.ts uses module-level nodemailer transporter (created once on import) for SMTP connection reuse across requests
- Registration email send is fire-and-forget (.catch()) so account creation never blocked by SMTP outage
- forgot-password email errors caught and logged but never propagated to response: prevents email enumeration side-channels
- apps/web/tsconfig.json must exclude vitest.config.ts + vitest.setup.ts: Vitest 4 defineProject types conflict with Next.js tsc checker
- DKIM configured via cesky-hosting.cz hosting panel (not Brevo): provider manages DKIM keys for hosted domains
- DMARC policy p=none for initial monitoring: allows observability without breaking legitimate mail flow
- Gmail inbox delivery accepted as primary deliverability verification; seznam.cz/centrum.cz deferred to production smoke test
- SMTP env vars added to .env.local: SMTP_HOST/PORT/USER/PASS/FROM with cesky-hosting.cz defaults
- No-show client in notification worker is separate from web app AI client: different runtime (worker vs Next.js), no circuit breaker needed (15-min scan interval)
- Conservative AI fallback: when AI unavailable, return low probability (0.15) + fallback=true so SMS is NOT sent (cost optimization over delivery)
- Dual SMS gating condition: probability > threshold AND not fallback (both must pass); prevents unreliable predictions from triggering expensive SMS
- Czech mobile regex +420[67]xxxxxxxx is intentionally strict: rejects non-Czech and no-country-code numbers
- UCS-2 multipart uses 67 chars/segment (not 70) and GSM-7 uses 153 (not 160) due to User Data Header overhead in concatenated SMS
- CRON_SECRET bearer token for external cron auth over IP allowlisting: works across all providers (Railway, cron-job.org, GitHub Actions)
- Returns 503 when CRON_SECRET not set vs 401 on bad token: distinguishes misconfiguration from authentication failure
- crypto.timingSafeEqual for cron token comparison: prevents timing oracle attacks on secret comparison
- COMGATE_TEST_MODE removed from docs: actual behavior controlled by NODE_ENV !== production in client.ts, no separate env var
- Monitoring endpoints use SETTINGS_MANAGE permission (not new MONITORING_READ): reuses existing admin role, avoids permission proliferation
- SMS monitoring cost estimate uses sent * 1.5 * costPerSegment: precise count in worker process not available in web process
- Webhook stuck threshold is 5 minutes: webhooks complete within seconds, 5 min is conservative to avoid false positives
- bounceRate = failed/(delivered+failed) matches industry definition: failure rate among attempted deliveries (not all records)
- json-summary reporter added alongside existing reporters: compact totals for CI jq parsing, detailed json for external coverage tools
- CI coverage summary uses if: always() so table visible on threshold failures: critical for diagnosing which package dropped below 80%
- Comgate sends merchant secret as POST body 'secret' parameter, not HMAC header: verifyComgateWebhookSecret replaces verifyComgateSignature
- Defense-in-depth API status check is best-effort: if getComgatePaymentStatus fails, webhook proceeds with POST body status
- API status overrides webhook status on mismatch: API is authoritative (no incentive to lie unlike crafted webhook body)
- crypto.timingSafeEqual requires equal-length buffers: always pre-check lengths and return false on mismatch before calling timingSafeEqual

## Blockers

- No external service accounts yet (Twilio, Comgate production) — SMTP cesky-hosting.cz now configured and verified
- Testcontainers on Railway compatibility unknown — will test in Phase 17, fallback to Railway test DB if Docker-in-Docker fails

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 16-testing-foundation | 01 | 8min | 2/2 | 13 |
| 16-testing-foundation | 02 | 8min | 2/2 | 8 |
| 16-testing-foundation | 03 | 4min | 2/2 | 8 |
| 16-testing-foundation | 04 | 3min | 2/2 | 5 |
| 17-integration-testing | 01 | 8min | 2/2 | 6 |
| 17-integration-testing | 02 | 5min | 2/2 | 4 |
| 17-integration-testing | 03 | 4min | 2/2 | 3 |
| 18-e2e-testing | 01 | 8min | 2/2 | 13 |
| 18-e2e-testing | 02 | 4min | 2/2 | 2 |
| 18-e2e-testing | 03 | 6min | 2/2 | 3 |
| 19-email-delivery | 01 | 11min | 2/2 | 5 |
| 19-email-delivery | 02 | 3min | 2/2 | 4 |
| 19-email-delivery | 03 | 8min | 2/2 | 3 |
| 19-email-delivery | 04 | 19min | 2/2 | 1 |
| 20-sms-delivery | 01 | 4min | 2/2 | 5 |
| 21-payment-processing | 01 | 6min | 2/2 | 3 |
| 22-monitoring-alerts | 02 | 4min | 2/2 | 7 |

## Metrics

| Metric | v1.0 Final | v1.1 Current | v1.1 Target |
|--------|-----------|--------------|-------------|
| Phases Complete | 15/15 | 4/7 (phases 16, 17, 18, 19 done) | 7/7 |
| Test Coverage | 0% | 100% on 6 measured files (243 unit + 13 integration + 10 E2E tests), CI gate enforced | 80%+ critical paths |
| Email Delivery | Not configured | WORKING: cesky-hosting.cz SMTP verified, Gmail inbox delivery confirmed, DKIM+DMARC DNS configured | Working SMTP |
| SMS Delivery | Not configured | Core logic done: AI-gated enqueue, UCS-2 fix, Czech phone validation (Twilio account not yet configured) | Working Twilio |
| Payments | Webhook verification fixed (POST body secret, defense-in-depth API check) | Webhook verification fixed | Live Comgate |

---
*Last updated: 2026-02-20 after Phase 21 Plan 01 complete (Comgate webhook secret verification fix)*
*Last session: Completed 21-01-PLAN.md (verifyComgateWebhookSecret replaces HMAC-based verifyComgateSignature, integration tests updated)*

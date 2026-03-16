# Feature Research: v3.0 Production Launch — Gap Closure

**Domain:** Production SaaS hardening — security, admin tooling, real-time, testing, observability, infrastructure
**Researched:** 2026-03-16
**Confidence:** HIGH for security/admin patterns (multiple authoritative sources), MEDIUM for Vercel-specific constraints (official docs + community), HIGH for testing stack (official docs verified)

---

## Context

ScheduleBox v1.4 shipped a complete, glassmorphism-styled booking SaaS. v3.0 is a gap-closure milestone: closing 32 documented gaps from a GAP analysis to reach 100% coverage of the v13.0 FINAL documentation and deploy to Vercel.

**What already exists (do NOT rebuild):**
- Complete booking flow, payments (Comgate + QR), CRM, loyalty, analytics
- Admin panel (basic — stats, activate/deactivate company, view users)
- Customer portal, employee view, auth (JWT+MFA+RBAC), i18n (cs/sk/en)
- Marketplace, reviews, notifications, templates, onboarding wizard
- 243 unit + 31 integration + 10 E2E tests (foundation exists)
- 7 AI models (no-show, CLV, health, upselling, pricing, capacity, voice)

**Vercel constraint:** No long-lived server processes. No RabbitMQ. No WebSockets. Must use serverless-compatible patterns (polling, SSE with timeout awareness, stateless functions).

**Target gaps:** Super-admin tooling, security hardening, real-time updates, missing pages, testing coverage to 80%, industry verticals, observability, infrastructure migration.

---

## Feature Landscape

### Table Stakes (Expected in Any Production SaaS at This Stage)

Features the platform must have to be considered production-ready and documentation-complete. Missing these = the product is not deployable or not trustworthy to enterprise/regulated customers.

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|------------|-------|
| **RabbitMQ removal / no-op publishEvent** | Vercel does not support long-lived broker connections. Current publishEvent calls will crash on Vercel cold starts. Blocking for deploy. | LOW | Replace with no-op function that logs in development, silently drops in production. Existing event consumers (notifications, audit) already have fallback logic. |
| **Sentry error tracking** | Every production SaaS captures unhandled exceptions in a central error tracker. Teams cannot debug production without it. | LOW | `@sentry/nextjs` wraps Next.js instrumentation hook. Sentry SDK auto-captures unhandled Promise rejections and React error boundaries. Vercel-compatible. |
| **PII encryption at rest (AES-256-GCM)** | Email and phone numbers in DB are PII under GDPR. Czech DPA requires encryption at rest for sensitive fields. Absence = compliance gap. | MEDIUM | Application-level encryption in Drizzle column transformations. IV + auth tag stored alongside ciphertext (base64 in `text` column). Key from `process.env.ENCRYPTION_KEY` (32-byte hex). `isomorphic-dompurify` pattern: encrypt on write, decrypt on read in the data layer. |
| **HIBP k-Anonymity password check** | NIST SP 800-63B requires checking passwords against known breach lists. Czech NUKIB guidelines align. Users expect this from any modern auth flow. | LOW | On registration and password change: SHA1 hash password, send first 5 chars to `api.pwnedpasswords.com/range/`, scan response locally. Zero password transmitted. Free API, no key needed. |
| **DOMPurify XSS sanitization** | Any user-supplied HTML (review text, company descriptions, automation templates) can contain XSS payloads. Production SaaS must sanitize before rendering. | LOW | Use `isomorphic-dompurify` (handles SSR + client). Sanitize on write in API routes AND on render for legacy data. Server-side via jsdom, client-side natively. |
| **CSRF tokens on state-mutating API routes** | State-mutating endpoints without CSRF protection are exploitable via cross-site form submissions. Standard production requirement. | MEDIUM | Use `@edge-csrf/nextjs` or custom double-submit cookie pattern. Apply to all POST/PUT/DELETE routes. Server Actions are exempt (Next.js handles them). Webhooks excluded (need raw access). |
| **SSRF protection on user-supplied URLs** | Webhooks, calendar integrations, and avatar URLs accept user-provided URLs. Without SSRF protection, users can probe internal network (localhost, metadata endpoints). | MEDIUM | Allowlist-based: resolve URL, reject if private IP range (RFC 1918, 169.254.x.x, ::1). Block file://, ftp://, custom schemes. Apply to webhook registration and any URL-fetching endpoints. |
| **Cookie policy page** | Required by Czech e-Privacy directive (implementing EU Cookie Directive). Landing page already has cookie consent banner — the policy page it links to must exist. | LOW | Static content page. Render as Next.js static route at `/[locale]/cookie-policy`. Czech + English content minimum. |
| **80% test coverage (Vitest unit)** | CI gate already configured for 80%. Current state: 243 unit tests but coverage may be below gate on new code. Production readiness = all tests passing CI gate. | HIGH | Requires coverage reporting on new security/admin code. Vitest `v8` provider already configured. Close gaps in auth, encryption, and admin routes specifically. |
| **Playwright E2E for critical flows** | Production SaaS must have automated E2E gating for the booking flow and payment flow. Current 10 E2E tests are a foundation but do not cover all P0 paths. | HIGH | Add E2E for: super-admin impersonation flow, public booking with payment, admin suspend/unsuspend flow. Playwright already in project. |
| **Environment variable validation on startup** | Production deployments silently fail or behave incorrectly when required env vars are missing. Explicit startup validation prevents invisible errors. | LOW | Already partially done (DEPLOY-03 in v2.0). Extend to cover new secrets: ENCRYPTION_KEY, SENTRY_DSN, HIBP_API_KEY (if used). Use `zod.parse(process.env)` on server startup. |

### Differentiators (Competitive Advantage for This Milestone)

Features that go beyond table stakes and significantly improve the product or developer confidence for production launch.

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|------------|-------|
| **Super-admin impersonation** | Allows platform team to debug user-reported issues without credential sharing. Standard in mature SaaS (Intercom, Stripe, Zendesk all offer this). Critical for support operations. | MEDIUM | Short-lived impersonation JWT (1-hour TTL) signed with admin identity preserved in claims (`impersonatedBy: adminId`). Blocked actions during impersonation: password change, MFA change, billing. All actions during session logged to platform audit log. Visual indicator in UI ("Viewing as [user]" banner). |
| **Feature flags (per-company, per-plan)** | Enables gradual feature rollouts, A/B testing, and tier gating without code deploys. Standard in SaaS with multiple tiers. | MEDIUM | DB table `feature_flags (key, enabled, company_id nullable, plan_tier nullable)`. Admin UI to toggle. Read at request time via middleware. No external service needed at this scale — simple DB-backed flags suffice over LaunchDarkly/Flagsmith. |
| **Platform broadcast messages** | Allows super-admin to send maintenance notices, upgrade prompts, or announcements to all companies / specific companies. | LOW-MEDIUM | `platform_messages` table. Displayed as dismissible banner in dashboard. Targets: all, specific tier, specific company. Expiry timestamp. Simple polling on dashboard load (no SSE needed). |
| **Maintenance mode** | Allows super-admin to take platform down gracefully for upgrades without 503 errors. Users see informative page. | LOW | Middleware check against `platform_config.maintenance_mode` flag in DB or Redis. Returns 503 with maintenance page if active. Super-admin bypass via special cookie. |
| **Suspend/unsuspend tenant** | Block access for non-paying or abusive tenants without deleting data. Required for SaaS billing enforcement. | LOW-MEDIUM | `companies.status` column already has `active/inactive`. Extend to `suspended`. Suspended tenants: all API calls return 403 with "account suspended" message. Login still works for billing resolution. |
| **Platform daily metrics** | Super-admin dashboard showing platform health: new signups today, active bookings, revenue, error rate. Operations visibility for platform team. | MEDIUM | Aggregate queries on existing tables. Cache in Redis with 5-minute TTL. Displayed on super-admin dashboard. No new tables needed — queries against existing data. |
| **Platform audit log** | Tracks all super-admin actions (impersonation start/stop, suspend, broadcast, flag changes). Compliance and accountability. | LOW | `platform_audit_logs (action, admin_id, target_id, target_type, metadata, created_at)`. Append-only. Read via admin UI with pagination. |
| **Real-time booking updates (polling)** | Owners need to see new bookings without page refresh. SSE is not reliably supported on Vercel (10s timeout on Hobby, 60s on Pro). Polling is the Vercel-safe approach. | LOW-MEDIUM | Client-side polling every 30 seconds using React Query's `refetchInterval`. No server changes needed — existing `/api/v1/bookings` endpoint serves the data. Indicator: "Updated X seconds ago" in calendar header. Consider SSE as enhancement on paid Vercel plans where 60s timeout is acceptable for a short-polling stream. |
| **Webhooks settings UI** | Companies can configure webhooks for external integrations (Zapier, custom apps). UI to manage webhook endpoints, test payloads, view delivery logs. Documentation gap: DB tables and API exist but UI is missing. | MEDIUM | Settings page section: add/edit/delete webhook endpoints, select event types, test button (sends sample payload), delivery log table (last 50 attempts with status). Existing webhooks API wired up. |
| **Video meetings UI** | Booking confirmation and detail pages show video meeting link (Zoom/Meet/Teams) when service has video enabled. DB field exists, UI is missing. | LOW | Booking detail card: show "Join Video Meeting" button when `bookings.meeting_url` is set. Service settings: toggle "Video meeting required" + meeting URL template or per-booking auto-generated URL. |
| **OpenTelemetry distributed tracing** | Next.js 13+ supports OpenTelemetry via the `instrumentation.ts` hook. Traces connect frontend requests to API routes to DB queries. Vercel exports via `@vercel/otel`. | MEDIUM | `instrumentation.ts` at project root. Use `@vercel/otel` for Vercel-native export or OTLP exporter for Grafana Cloud / Honeycomb. Sampling: 100% dev, 10% production. Auto-instruments all async server component operations. |
| **DB partitioning for bookings** | Bookings table will grow unbounded. Range partitioning by `scheduled_at` month enables O(1) partition pruning for calendar queries. Documented in v13.0 FINAL but not yet implemented. | HIGH | PostgreSQL declarative partitioning. Requires: (1) rename existing table, (2) create partitioned parent, (3) create initial partitions (current year + 1), (4) migrate data, (5) update Drizzle schema. Automated monthly partition creation via cron or DB trigger. Neon PostgreSQL (Vercel) supports partitioning. |
| **Industry vertical fields (medical/automotive)** | Medical businesses (clinics, dentists) need: appointment type, patient notes, insurance flag. Automotive needs: vehicle make/model/plate. Per-industry AI config controls which models run. Documentation specifies these fields; they are not yet implemented. | HIGH | `booking_industry_fields (booking_id, industry_type, field_key, field_value)` EAV table, or dedicated typed tables per vertical. Per-industry UI: field set shown in booking form based on `companies.industry`. Per-industry AI config: different feature weights for medical no-show vs automotive no-show. |
| **Storybook for component isolation** | Enables designers and developers to build/test UI components in isolation, catch regressions before integration. Standard in mature frontend codebases. | MEDIUM | Storybook 8 with `@storybook/nextjs` framework (Vite build). Key challenge: Server Components in App Router cannot be imported directly — extract pure presentational components. Cover: glass components, booking wizard steps, form components. |
| **Testcontainers integration tests** | Current integration tests use a shared test DB. Testcontainers provides isolated real PostgreSQL per test suite, eliminating test pollution and CI flakiness. | MEDIUM | `@testcontainers/postgresql` module. Each integration test suite spins up isolated container. Docker required in CI (GitHub Actions runners have Docker pre-installed). Local dev requires Docker — document as requirement in TESTING-GUIDE.md. |
| **Pact contract tests** | Frontend and backend evolve independently (different agents). Contract tests verify the API shape the frontend expects matches what the backend provides. Catches breaking changes before E2E. | HIGH | `@pact-foundation/pact` for consumer contract generation. Frontend tests define expected request/response shapes. CI publishes contracts to PactBroker or Pactflow. Backend verifies against published contracts. Complex setup but high value for multi-agent development. |

### Anti-Features (Avoid These)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|-----------------|-------------|
| **WebSocket-based real-time** | "Real-time" sounds better than polling | Vercel serverless functions have no persistent connection. WebSockets require a stateful server. Would require separate infrastructure (Pusher/Ably = cost, or self-hosted = complexity). | 30-second polling via React Query's `refetchInterval`. Adequate for booking dashboard. Shows "Updated X seconds ago" indicator for user confidence. |
| **SSE as primary real-time solution** | SSE is simpler than WebSockets | Vercel Hobby: 10s timeout on all serverless functions. Pro: 60s. Edge runtime allows long connections but cannot access DB. SSE requires persistent connection — fundamentally incompatible with pure Vercel serverless. | Polling for dashboard. If SSE is implemented, use Edge runtime with a DB-proxy pattern — but this adds significant complexity for marginal improvement over polling. |
| **LaunchDarkly / Flagsmith for feature flags** | Enterprise-grade feature flag service | For 32 features and ~100 companies, external flag service adds network latency on every request, vendor dependency, and $200+/month cost. Overkill for current scale. | DB-backed flags table with Redis cache. Achieves 95% of the value at zero cost. Revisit when platform has 1000+ companies. |
| **Per-tenant encryption keys** | Each company's data encrypted with their own key for isolation | Managing key rotation for 100 companies is operationally complex. Key loss = data loss. Adding per-tenant key derivation to every query adds latency. | Platform-level AES-256-GCM encryption key with GDPR-compliant key management. Per-tenant encryption is a v4.0 enterprise feature. |
| **Full Kubernetes deployment** | "Production grade" implies K8s | Platform is Vercel + Neon PostgreSQL + Upstash Redis. No container orchestration needed — Vercel handles scaling. Adding K8s brings unnecessary operational complexity for a 3-person team. | Vercel for Next.js (auto-scales). Neon for PostgreSQL (serverless Postgres). Upstash for Redis (serverless Redis). All managed, zero ops. |
| **Prometheus + Grafana stack** | Monitoring dashboards | Prometheus requires a persistent server. Vercel serverless cannot scrape metrics via pull model. Setting up self-hosted Grafana adds infrastructure cost and ops burden. | Sentry for error tracking (push model, Vercel-compatible). OpenTelemetry with Grafana Cloud OTLP export (push model). Together these replace Prometheus/Grafana for this scale. |
| **Elastic APM / New Relic** | APM completeness | Heavy SDK overhead (~5-10ms per request), high cost ($500+/month for this usage). Overkill for current scale. | OpenTelemetry with `@vercel/otel` — zero vendor lock-in, lightweight, integrates with any OTLP backend. |
| **Automated partition management trigger** | Ensure partitions exist without cron | DB triggers for DDL (CREATE TABLE PARTITION) are not supported in PostgreSQL. Triggers can only execute DML. A trigger-based approach would silently fail. | Monthly GitHub Actions cron job running a `create_partition_if_not_exists` SQL function. Simple, transparent, testable. |

---

## Feature Dependencies

```
[RabbitMQ Removal]
└──required before──> [Vercel Deploy]
└──required before──> [All tests pass in CI]

[PII Encryption]
└──requires──> [ENCRYPTION_KEY env var]
└──affects──> [customers.email, customers.phone, users.email in DB]
└──required before──> [GDPR compliance]

[HIBP Password Check]
└──enhances──> [Auth Registration]
└──enhances──> [Password Change flow]
└──independent of──> [PII Encryption]

[DOMPurify XSS]
└──applies to──> [Review content render]
└──applies to──> [Company description render]
└──applies to──> [Automation template render]
└──requires──> [isomorphic-dompurify npm package]

[CSRF Tokens]
└──applies to──> [All POST/PUT/DELETE API routes]
└──conflicts with──> [Webhook routes (must be excluded)]

[SSRF Protection]
└──applies to──> [Webhook registration endpoint]
└──applies to──> [Any URL-fetching API routes]

[Super-Admin Impersonation]
└──requires──> [Platform Audit Log]
└──requires──> [Short-lived JWT infrastructure]
└──enhances──> [Admin Panel]

[Feature Flags]
└──required by──> [Per-plan feature gating]
└──enhances──> [Industry Verticals rollout]
└──consumed by──> [Middleware flag check]

[Platform Broadcast Messages]
└──requires──> [platform_messages DB table]
└──displayed in──> [Dashboard layout]
└──independent of──> [Feature Flags]

[Maintenance Mode]
└──requires──> [Middleware check]
└──conflicts with──> [Super-Admin access (must bypass)]

[Industry Verticals]
└──requires──> [Schema additions (booking_industry_fields)]
└──requires──> [Per-industry UI label system]
└──requires──> [Per-industry AI config]
└──independent of──> [PII Encryption]
└──independent of──> [Super-Admin]

[OpenTelemetry]
└──requires──> [instrumentation.ts hook]
└──requires──> [OTEL_EXPORTER_OTLP_ENDPOINT env var]
└──enhances──> [Sentry (traces link to errors)]

[Sentry]
└──independent of──> [OpenTelemetry]
└──requires──> [SENTRY_DSN env var]

[DB Partitioning]
└──requires──> [Neon PostgreSQL (supports partitioning)]
└──blocks──> [Full production deploy if not done — queries degrade at scale]
└──independent of──> [All feature-level work above]

[Storybook]
└──requires──> [Glass component extraction into pure presentational components]
└──independent of──> [Backend features]

[Testcontainers]
└──requires──> [Docker in CI]
└──enhances──> [Existing integration test suite]

[Pact Contract Tests]
└──requires──> [PactBroker or Pactflow account]
└──requires──> [Consumer contract tests in frontend]
└──requires──> [Provider verification in backend]
```

### Dependency Notes

- **RabbitMQ removal must be P0:** Every other feature and the deploy itself depends on the codebase compiling and running on Vercel. PublishEvent calls fail at startup on Vercel without a broker connection.
- **PII encryption is a schema-breaking change:** Existing email/phone data in `customers` and `users` tables must be migrated. Encryption migration runs once via a script; subsequent reads/writes go through the Drizzle transform layer. Do this before adding more customer data.
- **CSRF tokens must exclude webhooks:** Webhook endpoints receive requests from external services (Comgate, third-party integrations) without CSRF tokens. Hardcoded exclusion list in middleware.
- **Super-admin impersonation requires audit log:** The audit log is the accountability mechanism that makes impersonation safe. Never ship impersonation without the audit trail.
- **Feature flags are a prerequisite for industry verticals rollout:** Industry fields should be gated behind flags for gradual rollout. Medical vertical for clinics first, automotive second.
- **DB partitioning is high-risk:** Schema migration on the bookings table with existing data. Must be done in a maintenance window or via blue-green migration. Test in staging (Neon branch) first.
- **Pact is the highest-complexity test item:** Requires infrastructure (PactBroker), workflow changes (CI publish step), and team discipline (contract must be updated when API changes). Consider simplifying to schema snapshot tests (TypeScript type exports) if Pact setup cost is prohibitive.

---

## v3.0 Implementation Order

### Phase 1: Infrastructure Prerequisites (P0 — Blockers)
Must complete before anything else can be tested or deployed.

- [ ] **RabbitMQ removal** — No-op publishEvent, clean up broker imports
- [ ] **Vercel deploy** — Vercel project config, Neon PostgreSQL, Upstash Redis
- [ ] **Sentry SDK** — Early error capture for all subsequent development
- [ ] **Environment variable validation** — Extend startup check to cover new secrets

### Phase 2: Security Hardening (P1 — Compliance)
Required for production readiness and GDPR compliance.

- [ ] **PII encryption** — AES-256-GCM on email/phone in DB, migration script
- [ ] **HIBP password check** — Registration + password change flows
- [ ] **DOMPurify XSS** — Sanitize all user-supplied HTML at write and render
- [ ] **CSRF tokens** — All state-mutating API routes
- [ ] **SSRF protection** — Webhook registration and URL-fetching endpoints

### Phase 3: Super-Admin Completion (P2 — Admin Ops)
Admin panel is documented but incompletely implemented.

- [ ] **Impersonation** — Short-lived JWT, UI banner, blocked dangerous actions
- [ ] **Feature flags** — DB table, admin toggle UI, middleware consumption
- [ ] **Suspend/unsuspend** — Extend company status, API enforcement
- [ ] **Broadcast messages** — platform_messages table, dashboard banner
- [ ] **Maintenance mode** — Middleware check, bypass for super-admin
- [ ] **Platform daily metrics** — Aggregate queries, Redis cache, admin dashboard
- [ ] **Platform audit log** — Append-only table, admin UI with pagination

### Phase 4: Missing Pages and Real-Time (P2 — UX Completeness)
Documented features with no UI implementation.

- [ ] **Cookie policy page** — Static content, linked from consent banner
- [ ] **Webhooks settings UI** — Add/edit/delete endpoints, test button, delivery log
- [ ] **Video meetings UI** — Meeting link in booking detail, service toggle
- [ ] **Real-time booking updates** — React Query polling (30s interval)

### Phase 5: Observability (P2 — Production Visibility)
Required to operate the platform confidently post-launch.

- [ ] **OpenTelemetry instrumentation** — instrumentation.ts, @vercel/otel, sampling
- [ ] **Structured logging** — Consistent log format across all API routes

### Phase 6: Testing to 80% (P3 — Quality Gate)
Expand existing test foundation to meet the CI gate.

- [ ] **Vitest coverage gap closure** — Unit tests for security functions, admin routes
- [ ] **Playwright E2E expansion** — Cover impersonation, payment, suspension flows
- [ ] **Testcontainers** — Isolated PostgreSQL per integration test suite
- [ ] **Storybook** — Component stories for glass primitives and booking wizard
- [ ] **Pact contract tests** — Consumer contracts for critical API shapes

### Phase 7: Industry Verticals (P3 — Market Expansion)
CZ/SK medical and automotive market expansion features.

- [ ] **Medical vertical** — booking_industry_fields schema, patient notes UI, insurance flag
- [ ] **Automotive vertical** — vehicle make/model/plate fields, service type labels
- [ ] **Per-industry AI config** — Feature weight adjustments per industry type
- [ ] **Per-industry UI labels** — "Appointment" vs "Booking" vs "Service call" based on industry

### Phase 8: Infrastructure Hardening (P3 — Scale Readiness)
Prepares the platform for production data volumes.

- [ ] **DB partitioning** — bookings table range partitioned by month, migration, cron
- [ ] **Monthly partition cron** — GitHub Actions workflow, SQL function

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| RabbitMQ removal | HIGH (deploy blocker) | LOW | P0 |
| Vercel deploy | HIGH (milestone goal) | MEDIUM | P0 |
| Sentry error tracking | HIGH | LOW | P1 |
| PII encryption | HIGH (GDPR) | MEDIUM | P1 |
| HIBP password check | MEDIUM | LOW | P1 |
| DOMPurify XSS | HIGH | LOW | P1 |
| CSRF tokens | HIGH | MEDIUM | P1 |
| SSRF protection | MEDIUM | MEDIUM | P1 |
| Super-admin impersonation | HIGH (support ops) | MEDIUM | P2 |
| Feature flags | MEDIUM | MEDIUM | P2 |
| Suspend/unsuspend | HIGH (billing enforcement) | LOW | P2 |
| Broadcast messages | MEDIUM | LOW | P2 |
| Maintenance mode | MEDIUM | LOW | P2 |
| Platform daily metrics | MEDIUM | MEDIUM | P2 |
| Platform audit log | HIGH (accountability) | LOW | P2 |
| Cookie policy page | HIGH (legal compliance) | LOW | P2 |
| Webhooks settings UI | MEDIUM | MEDIUM | P2 |
| Video meetings UI | LOW | LOW | P2 |
| Real-time (polling) | MEDIUM | LOW | P2 |
| OpenTelemetry | MEDIUM | MEDIUM | P2 |
| Vitest coverage gap | HIGH (CI gate) | HIGH | P3 |
| Playwright E2E expansion | HIGH | HIGH | P3 |
| Testcontainers | MEDIUM | MEDIUM | P3 |
| Storybook | MEDIUM | MEDIUM | P3 |
| Pact contract tests | LOW (high setup cost) | HIGH | P3 |
| Medical vertical | HIGH (market) | HIGH | P3 |
| Automotive vertical | MEDIUM (market) | HIGH | P3 |
| DB partitioning | HIGH (scale) | HIGH | P3 |

**Priority key:**
- P0: Blocks all other work — do first
- P1: Must have for production go-live
- P2: Should have — ships with v3.0
- P3: Nice to have — ships if time allows, else v3.1

---

## Complexity Assessment by Domain

### Low Complexity (1-2 days each)
- RabbitMQ no-op replacement
- HIBP password check (k-Anonymity API call in auth routes)
- Cookie policy page (static content)
- Video meetings UI (single field in booking detail)
- Broadcast messages (DB table + dashboard banner)
- Maintenance mode (middleware flag check)
- Platform audit log (append-only table + basic UI)
- Suspend/unsuspend (extend existing status column)

### Medium Complexity (3-5 days each)
- PII encryption (schema migration + Drizzle transforms + test coverage)
- DOMPurify (isomorphic package + sanitize call at each render point)
- CSRF tokens (middleware + exclusion logic)
- SSRF protection (IP resolution + allowlist)
- Super-admin impersonation (JWT, session management, UI banner)
- Feature flags (DB table, middleware, admin UI)
- Webhooks settings UI (CRUD + test button + delivery log)
- Real-time polling (React Query refetchInterval + UI indicator)
- Platform daily metrics (aggregate queries + Redis cache)
- OpenTelemetry (instrumentation.ts + sampling + OTLP export)
- Storybook (framework setup + stories for key components)
- Testcontainers (setup + migrate integration tests)

### High Complexity (1+ week each)
- Vitest coverage gap closure (must audit all new code paths)
- Playwright E2E expansion (new test scenarios requiring data setup)
- Industry verticals (schema + UI + AI config across all three layers)
- DB partitioning (zero-downtime migration on production data)
- Pact contract tests (PactBroker + consumer/provider workflow)

---

## Vercel-Specific Constraints (Confirmed)

| Feature | Constraint | Mitigation |
|---------|-----------|------------|
| SSE real-time | 10s timeout (Hobby), 60s (Pro). Edge runtime cannot access DB. | Use polling (React Query 30s interval). Adequate for booking dashboard. |
| RabbitMQ | No persistent broker connections in serverless | No-op publishEvent. Downstream consumers already have fallback logic. |
| Background workers | No long-running processes | Notification worker moves to Vercel Cron Jobs or is triggered inline at booking creation. |
| DB connections | Serverless = connection spikes | Use Neon serverless driver (`@neondatabase/serverless`) with connection pooling (PgBouncer on Neon). |
| Redis | Upstash Redis (HTTP-based) | Replace `ioredis` connection with `@upstash/redis` SDK. REST-based, no persistent connection. |
| File system | No writable file system | Ensure AI models are not loaded from disk at runtime — already handled (models baked into Railway image; Vercel uses API calls to Python service). |
| OpenTelemetry | Standard Node SDK does not work on Edge runtime | Use `@vercel/otel` for Vercel-compatible instrumentation. |

---

## Sources

- [HIBP Pwned Passwords API v3 documentation](https://haveibeenpwned.com/API/v3) — HIGH confidence (official)
- [Node.js AES-256-GCM example — AndiDittrich/gist](https://gist.github.com/AndiDittrich/4629e7db04819244e843) — MEDIUM confidence (community-verified pattern)
- [isomorphic-dompurify npm](https://www.npmjs.com/package/isomorphic-dompurify) — HIGH confidence (official package)
- [DOMPurify + Next.js SSR issue #46893](https://github.com/vercel/next.js/issues/46893) — HIGH confidence (official Next.js GitHub)
- [Next.js OpenTelemetry guide](https://nextjs.org/docs/app/guides/open-telemetry) — HIGH confidence (official docs)
- [Vercel SSE timeout discussion](https://github.com/vercel/next.js/discussions/48427) — HIGH confidence (official Vercel community)
- [SSE time limits on Vercel](https://community.vercel.com/t/sse-time-limits/5954) — MEDIUM confidence (Vercel community, consistent with official limits)
- [Testcontainers Node.js PostgreSQL](https://node.testcontainers.org/modules/postgresql/) — HIGH confidence (official docs)
- [oneuptime.com — Impersonation implementation patterns 2026](https://oneuptime.com/blog/post/2026-01-30-impersonation-implementation/view) — MEDIUM confidence (aligns with standard patterns)
- [TurboStarter — Complete Next.js security guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) — MEDIUM confidence
- [Storybook for Next.js official docs](https://storybook.js.org/docs/get-started/frameworks/nextjs) — HIGH confidence (official)
- [PostgreSQL declarative partitioning docs](https://www.postgresql.org/docs/current/ddl-partitioning.html) — HIGH confidence (official)
- [Handling tenant suspension in multi-tenant SaaS](https://sollybombe.medium.com/handling-tenant-suspension-and-reactivation-gracefully-in-multi-tenant-saas-0af58945545a) — MEDIUM confidence
- [Feature flags SaaS patterns 2026](https://designrevision.com/blog/saas-feature-flags-guide) — MEDIUM confidence

---

*Feature research for: v3.0 Production Launch & Gap Closure — ScheduleBox SaaS booking platform*
*Researched: 2026-03-16*

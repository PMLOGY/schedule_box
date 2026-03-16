# Project Research Summary

**Project:** ScheduleBox v3.0 — Production Launch & Gap Closure
**Domain:** SaaS booking platform — Railway → Vercel migration, security hardening, 32-gap closure
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

ScheduleBox v3.0 is not a new product build — it is a production readiness milestone that closes 32 documented gaps between the shipped v1.4 codebase and the v13.0 FINAL documentation spec, while simultaneously migrating the hosting platform from Railway (persistent Node.js) to Vercel (serverless). The central architectural challenge is that the existing stack was designed for a long-running process model: TCP-based PostgreSQL pooling (postgres.js), TCP-based Redis (ioredis), and a persistent RabbitMQ broker (amqplib). All three are incompatible with Vercel serverless. The migration path is clear and low-ambiguity: replace each with its serverless-native counterpart — Neon serverless driver, Upstash HTTP Redis, and a safe no-op publishEvent stub — before any other work proceeds.

The recommended approach follows a strict dependency-respecting layer order. Layer 0 (infrastructure migration) must land first because every other phase depends on the codebase compiling and connecting to Neon and Upstash on Vercel. Layer 1 (security hardening) follows immediately, as GDPR PII encryption involves a schema-breaking migration that should complete before more customer data accumulates. Layers 2-6 (observability, super-admin, missing pages, verticals, testing) can then proceed largely in parallel within each layer. The testing layer intentionally comes last so it validates the full feature set rather than partial implementations.

The key risks are: (1) treating publishEvent removal as a simple no-op without auditing SAGA-required call sites — which would silently drop payment charges; (2) the PII encryption migration corrupting data if not done via the expand-contract pattern with HMAC search indexes; (3) CVE-2025-29927 leaving all admin routes exposed if Next.js is below 14.2.25; and (4) the availability engine timing out on Vercel serverless due to 6 serial DB queries that need consolidation into a single CTE. All four risks are well-documented and preventable with the patterns specified in this research.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 14, Drizzle ORM, Tailwind CSS, shadcn/ui, Vitest, Playwright, TypeScript) is production-quality and does not need re-evaluation. The v3.0 changes are a targeted set of replacements and additions driven by the Vercel deployment constraint.

**Infrastructure migrations (required, no alternative choices):**

- `@neondatabase/serverless@1.0.2` — replaces postgres.js; HTTP transport for standard queries, WebSocket Pool only for `SELECT FOR UPDATE` (booking double-prevention)
- `@upstash/redis@1.37.0` — replaces ioredis; REST HTTP client, no persistent socket; same `get/set/del/setex` API surface covers all existing usage
- `packages/events publishEvent` no-op stub — replaces amqplib; preserves function signature so all 16 call sites remain unchanged; SAGA-required calls must be replaced with inline execution before removing the broker dependency
- Two `DATABASE_URL` variables required: pooled (app runtime, `@neondatabase/serverless`) and `DATABASE_URL_UNPOOLED` (drizzle-kit migrations only — Neon PgBouncer transaction pooling mode breaks session-scoped SQL)

**New runtime packages (6 total):**

- `@sentry/nextjs@10.43.0` — error tracking; auto-instruments App Router via `instrumentation.ts`; add `tunnelRoute: "/monitoring"` to bypass CZ/SK ad blockers (~30% browser blocking rate)
- `isomorphic-dompurify@3.3.0` — XSS sanitization; works in SSR + client; pin `jsdom@25.0.1` via pnpm overrides to avoid ESM breakage with jsdom@28
- `@vercel/otel@2.1.1` — OpenTelemetry; Edge-compatible; use instead of `@opentelemetry/sdk-node` which breaks Edge Runtime; use `SimpleSpanProcessor`, not `BatchSpanProcessor`
- `hibp@15.2.1` — k-Anonymity HIBP password breach check; no API key needed; server-side only
- AES-256-GCM PII encryption — Node.js built-in `crypto`; no new package; ~40x faster than `@noble/ciphers` on Node.js 20 LTS
- CSRF protection — `crypto.randomUUID()` + double-submit cookie; no package needed

**Dev/testing packages (5 total, not deployed):**

- `@storybook/nextjs@10.2.19` — component isolation with App Router support (`appDirectory: true`)
- `@pact-foundation/pact@16.3.0` — consumer contract tests; Rust FFI (~80MB); CI-only; consider TypeScript type exports as lower-cost alternative
- `testcontainers@11.12.0` + `@testcontainers/postgresql@11.12.0` — isolated real PostgreSQL per integration test suite; Docker required in CI (not available in local dev)

**What NOT to use (Vercel-incompatible):** ioredis, postgres.js TCP pool, amqplib, ws/socket.io, `@opentelemetry/sdk-node` direct on Edge routes, BullMQ self-hosted, Prometheus/Grafana self-hosted, LaunchDarkly/Flagsmith.

### Expected Features

**Must have — P0 blockers (deployment cannot proceed without these):**

- RabbitMQ removal (no-op publishEvent with SAGA audit) — publishEvent calls crash Vercel serverless on startup
- Neon + Upstash migration — TCP connections fail in serverless; all auth, rate limiting, and caching break
- Next.js >=14.2.25 patch — CVE-2025-29927 grants unauthenticated access to all admin routes below this version via a single request header
- Environment variable startup validation extended to new secrets (ENCRYPTION_KEY, SENTRY_DSN, Upstash tokens)

**Must have — P1 compliance (GDPR and security gate):**

- PII encryption at rest (AES-256-GCM on `customers.phone`, `customers.email`) — GDPR mandatory; expand-contract migration with HMAC search indexes
- HIBP password breach check on registration and password change — NIST SP 800-63B / Czech NUKIB guideline
- DOMPurify XSS sanitization on all user-supplied HTML (reviews, company descriptions, automation templates)
- CSRF tokens on all POST/PUT/DELETE routes (excluding webhooks — must be an explicit exclusion list)
- SSRF protection on webhook registration and any URL-fetching endpoints
- Sentry error tracking (tunnelRoute required for CZ/SK ad-blocker bypass)

**Should have — P2 production completeness:**

- Super-admin impersonation — 15-min non-renewable JWT with `token_type: 'impersonation'` + `actingAs` claims; `impersonation_sessions` table with `revoked_at`; persistent red banner; audit log required to ship simultaneously
- Feature flags — DB-backed `feature_flags` table with Upstash Redis cache (60s TTL); max ~10 flags; always enforce server-side in route handlers, never client-side only
- Tenant suspend/unsuspend — extend `companies.status`; suspended tenants get 403 but can still log in for billing resolution
- Platform broadcast messages with confirmation gate (require typing target count; rate-limit to 1 call/10 min to prevent $2,500+ SMS mistakes)
- Maintenance mode — Redis/DB flag in middleware; super-admin bypass cookie
- Platform daily metrics — aggregate queries with 5-min Redis cache on super-admin dashboard
- Platform audit log — append-only with paginated UI
- Cookie policy page — Czech e-Privacy directive compliance; static route at `/[locale]/cookie-policy`
- Webhooks settings UI — CRUD + test button + delivery log
- Video meetings UI — meeting link in booking detail card; service toggle
- Real-time booking updates — 30s React Query `refetchInterval` polling with "updated X ago" indicator; NOT SSE on Node.js runtime
- OpenTelemetry with `@vercel/otel` — `SimpleSpanProcessor`, 10% production sampling from day one

**Defer to v3.1 or later — P3:**

- Vitest coverage gap to 80% with per-module thresholds (do after all features land)
- Playwright E2E expansion (booking, payment, impersonation flows)
- Storybook component catalog
- Pact contract tests (highest setup cost — evaluate TypeScript type exports as alternative)
- Medical and automotive industry verticals — use `booking_metadata jsonb` column on bookings (inherits RLS automatically) rather than typed per-vertical columns
- DB partitioning — strongly defer: at <500 companies composite index on `(company_id, created_at)` is sufficient; Drizzle introspect conflicts with manual partition DDL make this high-risk maintenance debt

**Anti-features (explicitly avoid):**

- WebSocket real-time — requires persistent server; Vercel serverless terminates all persistent connections
- SSE on Node.js runtime — 60s hard timeout causes thundering herd reconnect storm when all clients reconnect simultaneously
- LaunchDarkly/Flagsmith — overkill at SMB scale; DB-backed flags with Redis cache achieve 95% of value at zero cost
- Per-tenant encryption keys — operational complexity (key rotation for 100 companies) with no benefit at current scale
- Kubernetes deployment — Vercel + Neon + Upstash is fully managed; K8s adds unnecessary ops burden for a 3-person team
- Prometheus/Grafana self-hosted — pull-model scraping is incompatible with Vercel serverless; Sentry + OTLP is correct

### Architecture Approach

The target architecture migrates from a Docker-based Railway deployment with persistent infrastructure connections to a Vercel serverless deployment with managed HTTP-based services. The Next.js monolith itself does not change in structure — all 179 API routes, the App Router layout, and the Drizzle schema remain intact. The delta is concentrated in four modified files (publisher.ts, db.ts, redis.ts, middleware.ts), three new utility files (encryption.ts, feature-flags.ts, lib/ssrf-guard.ts), a new `instrumentation.ts` at the project root, and a set of new admin API routes.

**Major components and v3.0 changes:**

1. `packages/events/src/publisher.ts` — no-op publishEvent body; all 16 call sites unchanged; SAGA-required calls inline-migrated before broker removal
2. `packages/database/src/db.ts` — Neon HTTP driver (`neon-http`) for standard queries; WebSocket Pool (`neon-serverless`) only for `SELECT FOR UPDATE` paths; `drizzle.config.ts` uses `DATABASE_URL_UNPOOLED`
3. `apps/web/lib/redis.ts` — `@upstash/redis` REST client; same `get/set/del/setex` call pattern; `ephemeralCache` omitted in Node.js serverless
4. `apps/web/lib/encryption.ts` — AES-256-GCM encrypt/decrypt using Node.js `crypto`; IV + auth tag + ciphertext packed in base64; separate `*_hmac` columns for searchable PII fields
5. `apps/web/middleware.ts` — maintenance mode flag check (Redis) + CSRF double-submit cookie validation added; webhook paths excluded from CSRF
6. `apps/web/instrumentation.ts` — `@vercel/otel` `registerOTel` + `@sentry/nextjs` initialization; `SimpleSpanProcessor`; Next.js 14 requires `experimental.instrumentationHook: true` in `next.config.ts`
7. `apps/web/app/api/v1/admin/impersonate|feature-flags|broadcast|maintenance/` — new super-admin routes
8. `apps/web/scripts/encrypt-pii-migration.ts` — one-shot expand-contract PII migration run before go-live

**Key architectural patterns:**

- Use `DATABASE_URL_UNPOOLED` in `drizzle.config.ts`; runtime code always uses pooled URL
- Use `SimpleSpanProcessor` for OTel; `BatchSpanProcessor` background timers prevent Vercel function freeze/thaw
- Store feature flags in PostgreSQL with Upstash Redis cache (60s TTL); never query DB on every API request
- 15-min non-renewable impersonation JWTs checked server-side via `impersonation_sessions.revoked_at`
- Replace SSE with `refetchInterval: 30_000` React Query polling for dashboard booking updates
- Add `export const maxDuration = 30` on availability and payment routes (requires Vercel Pro plan)
- Consolidate availability engine 6 serial queries into a single SQL CTE

### Critical Pitfalls

**Top 8 — ranked by severity and data loss/security risk:**

1. **publishEvent no-op silently drops SAGA steps** — Audit every `publishEvent` call site before removal. Classify as fire-and-forget (safe no-op with `console.warn`) vs. SAGA-required (must be replaced with direct inline function call, NOT a no-op). Failure mode: bookings confirmed with no payment charge; refunds acknowledged but not triggered.

2. **PII encryption migration corrupts data or breaks search** — Use expand-contract pattern: add `_encrypted` nullable columns, batch-migrate in 500-row chunks with 50ms sleep, verify row counts, then drop originals. Add HMAC-SHA256 index columns (`phone_hmac`, `email_hmac`) for searchable PII — AES-GCM random nonces make direct equality search impossible without HMAC. Failure mode: customer search returns 0 results; double-encryption produces unreadable gibberish; `AccessExclusiveLock` causes visible downtime on large tables.

3. **CVE-2025-29927 exposes all admin routes** — Upgrade Next.js to `>=14.2.25` before any deployment. Add CI check. Always add server-side auth checks in route handlers as a second layer — middleware alone is insufficient defense. Failure mode: unauthenticated attacker bypasses middleware with a single request header and accesses impersonation, suspend, and broadcast endpoints.

4. **Neon pooled URL used for migrations** — Maintain two env vars: `DATABASE_URL` (pooled, runtime) and `DATABASE_URL_UNPOOLED` (direct, drizzle-kit only). PgBouncer transaction pooling mode silently fails on `SET LOCAL`, advisory locks, and session-scoped SQL used by drizzle-kit. Failure mode: migrations appear to run but schema changes are not applied; booking double-prevention advisory locks hang indefinitely.

5. **Availability engine timeout on Vercel** — Consolidate 6 serial DB queries into a single SQL CTE. Add `export const maxDuration = 30`. Cache computed slot windows in Upstash Redis with 60s TTL. Failure mode: booking wizard shows "no availability" for popular businesses; 504 Gateway Timeout on `/api/v1/bookings/availability`.

6. **Impersonation JWT leakage** — Issue a purpose-specific token with `token_type: 'impersonation'` claim, 15-min hard expiry, no refresh, stored in separate `imp_token` HttpOnly cookie, revocable via `impersonation_sessions.revoked_at`, checked server-side on every impersonated request. Every action during impersonation writes `performed_by_admin_id` to audit_logs. Failure mode: leaked 7-day regular session token grants full account access with no revocation mechanism.

7. **Upstash ephemeral cache breaks rate limiting in Node.js serverless** — Omit `ephemeralCache: new Map()` in Node.js serverless routes (process memory does not persist between invocations). Move rate limiting to `middleware.ts` with `export const runtime = 'edge'` where Map cache persists correctly across requests within a region. Failure mode: rate limit bypassed; or first request to a cold function instance returns `LIMIT_EXCEEDED` incorrectly.

8. **OTel `BatchSpanProcessor` increases cold starts and billing** — Use `@vercel/otel` with `SimpleSpanProcessor`. Set `tracesSampleRate: 0.1` (10%) in production from day one. `BatchSpanProcessor` background timers prevent Vercel function freeze/thaw and increase billing. 100% sampling at 500 companies generates ~50,000+ spans/day at $0.50/GB Vercel Drains cost. Failure mode: cold start p99 increases 300-500ms; unexpected Vercel observability billing growth.

---

## Implications for Roadmap

Based on the dependency graph from ARCHITECTURE.md and the priority classifications from FEATURES.md, the following phase structure is recommended:

### Phase 1: Infrastructure Migration (P0 — Deploy Blocker)

**Rationale:** Everything else depends on this. The codebase does not compile cleanly for Vercel without removing the persistent connection dependencies. CVE-2025-29927 must be patched before any admin feature is built. This is the first commit block, not an optimization.
**Delivers:** Deployable Vercel project; Neon serverless driver in `db.ts`; Upstash Redis client in `redis.ts`; publishEvent no-op with all call sites classified and SAGA-required calls inlined; Next.js >=14.2.25; two DATABASE_URL env vars; environment variable startup validation extended; `.env.example` updated
**Addresses:** RabbitMQ removal, Neon driver swap, Upstash Redis swap, CVE-2025-29927 patch, env validation
**Avoids:** Pitfall 1 (publishEvent SAGA silent drop), Pitfall 4 (Neon pooled URL for migrations), Pitfall 5 (Upstash ephemeral cache), CVE-2025-29927
**Research flag:** Standard patterns — all migration code is fully specified in STACK.md and ARCHITECTURE.md; no additional research phase needed

### Phase 2: Security Hardening (P1 — GDPR and Compliance Gate)

**Rationale:** GDPR compliance requires PII encryption before more customer data enters the system. The schema migration is breaking — doing it early means no split-state tables with mixed plaintext/encrypted rows. CSRF and SSRF are required before any external webhook integration is used in production.
**Delivers:** AES-256-GCM PII encryption with HMAC search indexes (`phone_hmac`, `email_hmac`); expand-contract migration script; HIBP password check in registration and password change routes; DOMPurify XSS sanitization at API write + render points; CSRF double-submit cookie (webhook paths excluded); SSRF IP allowlist; Sentry with tunnelRoute
**Addresses:** PII encryption, HIBP, DOMPurify, CSRF, SSRF, Sentry
**Avoids:** Pitfall 2 (PII data corruption — expand-contract + HMAC + batched migration during maintenance window), Pitfall 3 (no plaintext PII appearing in logs during migration)
**Note:** Run PII migration during maintenance window (02:00-04:00 CET), 500-row batches with 50ms sleep; verify row counts and phone search before cutover; have rollback SQL ready
**Research flag:** Standard patterns — all libraries and migration patterns fully documented in STACK.md and PITFALLS.md; no additional research needed

### Phase 3: Observability (P2 — can run parallel with Phase 2)

**Rationale:** Sentry and OpenTelemetry are independent of security features. Early observability means all subsequent phases are debuggable from first deploy to Vercel.
**Delivers:** `instrumentation.ts` with `@vercel/otel` `registerOTel`; `SimpleSpanProcessor` (not Batch); `OTEL_TRACES_SAMPLER_ARG=0.1` set in Vercel production env; Sentry with `tunnelRoute: "/monitoring"` and `hideSourceMaps: true`; structured logging conventions across API routes
**Addresses:** OpenTelemetry instrumentation, Sentry error tracking, structured logging
**Avoids:** Pitfall 8 (OTel cold start — `@vercel/otel` + `SimpleSpanProcessor` + 10% sampling from day one)
**Research flag:** Standard patterns — official Vercel OTel and Sentry Next.js docs cover this completely

### Phase 4: Super-Admin Completion (P2 — depends on Phase 1)

**Rationale:** Admin tooling requires stable Neon + Upstash connectivity (Phase 1). Impersonation must ship simultaneously with the audit log — shipping impersonation without the trail is a security anti-pattern. Feature flags must be cached in Redis (60s TTL) to prevent N+1 DB queries at scale.
**Delivers:** Impersonation API (15-min token, `impersonation_sessions` table, server-side revocation check, red banner); feature flags (DB table + Redis cache + admin toggle UI + server-side enforcement in route handlers); tenant suspend/unsuspend (extend `companies.status`); platform broadcast with typing-confirmation gate and 1-call/10-min rate limit; maintenance mode (Redis flag + middleware + super-admin bypass cookie); platform daily metrics (aggregate queries, 5-min Redis cache); platform audit log (append-only, paginated)
**Addresses:** All P2 super-admin features listed in FEATURES.md
**Avoids:** Pitfall 6 (impersonation JWT leakage — separate `imp_token` cookie, `revoked_at` check), Pitfall 7 (feature flag N+1 — Upstash Redis cache layer with 60s TTL), broadcast SMS mistake (confirmation gate + rate limit)
**Research flag:** Standard patterns — feature designs are fully specified in FEATURES.md and ARCHITECTURE.md; no additional research needed

### Phase 5: Missing Pages and Real-Time (P2 — mostly independent)

**Rationale:** Largely frontend-only work independent of security features. The real-time approach (polling) deliberately avoids SSE complexity and Vercel timeout issues.
**Delivers:** Cookie policy page at `/[locale]/cookie-policy` (Czech + English); webhooks settings UI (CRUD + test button + delivery log); video meetings UI (meeting link in booking detail, service toggle); React Query 30s polling with "updated X ago" indicator on booking dashboard
**Addresses:** Cookie policy (legal compliance), webhooks UI, video UI, real-time booking updates
**Avoids:** Pitfall 7 (SSE timeout thundering herd — use `refetchInterval: 30_000` polling instead)
**Research flag:** Standard patterns — no novel integration requirements

### Phase 6: Industry Verticals (P3 — depends on Phases 1-2)

**Rationale:** Market expansion requiring stable DB and auth. The `booking_metadata jsonb` approach avoids RLS policy additions and schema proliferation while accommodating <10 industry types.
**Delivers:** Medical and automotive vertical fields via `booking_metadata jsonb` column on `bookings` (if not already present); per-industry UI label system via i18n key overrides (cs.json/sk.json/en.json); per-industry AI config extension; feature flag gate for gradual rollout (medical first, automotive second)
**Addresses:** Medical vertical, automotive vertical, per-industry AI config, per-industry UI labels
**Avoids:** Pitfall 13 (industry vertical RLS leak — jsonb on `bookings` inherits existing `company_id`-based RLS automatically; no new policy definitions needed)
**Research flag:** Phase planning should research the Python AI service config schema format before designing the per-industry config extension; UI and DB patterns are standard

### Phase 7: Testing Expansion (P3 — validate complete feature set last)

**Rationale:** Testing validates the full v3.0 feature set. Done last, coverage accurately reflects what shipped. Per-module thresholds in `vitest.config.ts` must be set before writing tests, not after, to prevent coverage washing via utility function tests.
**Delivers:** Vitest coverage to 80% with per-module thresholds (`availability-engine.ts` at 90% branches, `lib/payment/saga.ts` at 85% branches); Playwright E2E for booking + payment + impersonation flows; Testcontainers for isolated PostgreSQL per integration test suite (CI-only, document Docker requirement in TESTING-GUIDE.md); Storybook for glass components and booking wizard steps
**Addresses:** Vitest coverage gap, Playwright expansion, Testcontainers, Storybook
**Avoids:** Pitfall 11 (coverage on wrong modules — per-module thresholds set before writing tests)
**Note on Pact:** Defer Pact contract tests; TypeScript type exports from route handlers provide 80% of the type-safety benefit at near-zero setup cost. Revisit Pact if multi-agent development increases interface drift risk.
**Research flag:** Testcontainers requires Docker in CI; local dev environment lacks Docker (per project MEMORY) — document as CI-only constraint. Pact needs separate research if pursued.

### Phase Ordering Rationale

- Phase 1 must be first: Neon + Upstash migration is the prerequisite for the codebase to build and run on Vercel. CVE-2025-29927 patch must precede any admin feature build.
- Phase 2 must be early: PII encryption is a schema-breaking migration; doing it before more customer data accumulates minimizes migration scope and risk of split-state tables.
- Phases 3 and 4 can overlap: observability is fully independent of admin features; both require only Phase 1 to complete first.
- Phase 5 is largely frontend-only and can be parallelized with Phases 3-4.
- Phases 6 and 7 are P3 and can be deferred to v3.1 if the timeline is tight. The platform is production-deployable and compliant after Phase 5.
- DB partitioning is explicitly deferred indefinitely: composite index on `(company_id, created_at)` handles SMB-scale data volumes; Drizzle introspect conflict risk and migration complexity are not justified until row counts actually require it.

### Research Flags

Phases needing deeper research during planning:
- **Phase 6 (Industry Verticals):** The Python AI service (`services/ai-service`) config format for per-industry feature weight overrides is not documented in this research. Phase 6 planning must read the existing AI service config schema before designing the extension.
- **Phase 7 (Testing) — Pact only:** PactBroker/Pactflow account setup and CI workflow design need research if the team decides to pursue contract testing. Skip if TypeScript types are deemed sufficient.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure):** All migration patterns are from official Neon, Upstash, Vercel, and Next.js documentation; STACK.md and ARCHITECTURE.md contain the exact code patterns
- **Phase 2 (Security):** All security libraries and migration patterns are fully specified in STACK.md and PITFALLS.md
- **Phase 3 (Observability):** `@vercel/otel` and `@sentry/nextjs` are official Vercel integrations with complete published documentation
- **Phase 4 (Super-Admin):** All feature designs are fully specified in FEATURES.md and ARCHITECTURE.md
- **Phase 5 (Missing Pages):** Frontend-only work; webhooks and video meeting APIs already exist; no novel integration

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified on npm registry; integration patterns from official Neon, Upstash, Vercel, Sentry, and Next.js documentation; alternatives explicitly compared and rejected with documented rationale |
| Features | HIGH | Feature scope is gap-closure against the v13.0 FINAL documentation spec; P0/P1/P2/P3 classification based on Vercel deployment requirements, GDPR compliance obligations, and documented admin tooling gaps |
| Architecture | HIGH | Migration patterns from official Neon/Drizzle/Upstash/Vercel docs; data flow changes verified against existing codebase structure in ARCHITECTURE.md; MEDIUM confidence only for DB partitioning (Drizzle native support confirmed not shipped as of March 2026 via GitHub issue #2854) |
| Pitfalls | HIGH for Vercel/Neon/Upstash patterns (official docs + CVE advisories); MEDIUM for encryption migration complexity estimates and OTel sampling cost projections (based on Vercel billing documentation, not measured on this specific codebase) |

**Overall confidence: HIGH**

### Gaps to Address

- **Pact contract test infrastructure:** PactBroker/Pactflow account setup and CI publish workflow are not researched. If the team pursues Pact, research during Phase 7 planning. Recommend evaluating TypeScript type exports first — they catch breaking API shape changes with zero infrastructure overhead.
- **Python AI service config schema:** The `services/ai-service` config format for per-industry feature weight overrides is not covered in this research. Phase 6 planning must audit the existing AI service before designing the medical/automotive config extension.
- **Comgate recurring payments activation:** Project MEMORY notes manual merchant activation required (merchant 498621). This is outside v3.0 scope but affects payment flow E2E test setup in Phase 7.
- **Vercel plan tier assumption:** Research assumes Vercel Pro plan (`maxDuration: 30`, 60s function timeout). On Hobby plan (10s timeout), the availability engine CTE consolidation and Redis caching become critical blockers, not optimizations. Confirm plan tier before Phase 1 begins.
- **Sentry quota sizing:** The `tracesSampleRate: 0.2` and `profilesSampleRate: 0.1` recommended limits are calibrated for ~100 daily active users. At launch, lower to 0.1 and 0.05 respectively until actual traffic is measured.

---

## Sources

### Primary (HIGH confidence)

- [Sentry Next.js Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — @sentry/nextjs 10.43.0 App Router instrumentation
- [Upstash Redis + Next.js](https://upstash.com/docs/redis/tutorials/nextjs_with_redis) — @upstash/redis 1.37.0 integration patterns
- [Neon + Drizzle Docs](https://neon.com/docs/guides/drizzle) — @neondatabase/serverless 1.0.2, neon-http driver pattern
- [Drizzle + Neon Integration](https://orm.drizzle.team/docs/connect-neon) — drizzle-orm/neon-http and neon-serverless adapters
- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry) — @vercel/otel 2.1.1, instrumentation.ts
- [Vercel OTel Instrumentation](https://vercel.com/docs/tracing/instrumentation) — SimpleSpanProcessor, cold start guidance, billing
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) — pooled vs. unpooled URL requirements for PgBouncer transaction mode
- [Vercel Function Limits](https://vercel.com/docs/functions/limitations) — timeout tiers by plan
- [CVE-2025-29927 Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) — middleware bypass details, patched versions
- [NVD CVE-2025-29927](https://nvd.nist.gov/vuln/detail/CVE-2025-29927) — official CVE record confirming patch in Next.js 14.2.25
- [Drizzle Partition Issue #2854](https://github.com/drizzle-team/drizzle-orm/issues/2854) — confirms no native partition support in Drizzle schema DSL
- [Drizzle Column Encryption Issue #2098](https://github.com/drizzle-team/drizzle-orm/issues/2098) — confirms no native column encryption support
- [isomorphic-dompurify GitHub](https://github.com/kkomelin/isomorphic-dompurify) — v3.3.0, jsdom@25.0.1 pin workaround for ESM issue
- [hibp npm](https://www.npmjs.com/package/hibp) — 15.2.1, k-anonymity HIBP API, no API key for Pwned Passwords
- [HIBP API v3 Docs](https://haveibeenpwned.com/API/v3) — k-anonymity range query protocol
- [Node.js Crypto Docs](https://nodejs.org/api/crypto.html) — AES-256-GCM built-in, performance vs. userland alternatives
- [Testcontainers Node.js Docs](https://node.testcontainers.org/) — testcontainers 11.12.0, PostgreSQL module
- [Storybook Next.js Docs](https://storybook.js.org/docs/get-started/frameworks/nextjs) — @storybook/nextjs 10.2.19, appDirectory: true
- [Upstash ratelimit SDK](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) — ephemeral cache serverless behavior
- [Vercel Drains billing](https://vercel.com/docs/drains/reference/traces) — $0.50/GB trace cost for sampling decisions

### Secondary (MEDIUM confidence)

- [SSE time limits on Vercel community](https://community.vercel.com/t/sse-time-limits/5954) — timeout behavior per plan tier (10s Hobby, 60s Pro)
- [Next.js SSE discussion #48427](https://github.com/vercel/next.js/discussions/48427) — SSE limitations and workarounds confirmed by Vercel team
- [OTel on Vercel serverless (2026-02)](https://oneuptime.com/blog/post/2026-02-06-opentelemetry-vercel-serverless-functions/view) — cold start overhead measurements, SimpleSpanProcessor recommendation
- [Upstash ephemeral cache issue (#62178)](https://github.com/vercel/next.js/discussions/62178) — Node.js serverless Map persistence confirmed broken
- [RabbitMQ on Vercel discussion #69776](https://github.com/vercel/next.js/discussions/69776) — confirms AMQP broker not viable on Vercel serverless
- [Handling tenant suspension in SaaS](https://sollybombe.medium.com/handling-tenant-suspension-and-reactivation-gracefully-in-multi-tenant-saas-0af58945545a) — suspend/unsuspend UX patterns
- [TurboStarter Next.js security guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) — CSRF, SSRF implementation patterns
- [Feature flags SaaS patterns 2026](https://designrevision.com/blog/saas-feature-flags-guide) — DB-backed vs. external service tradeoffs
- [Node.js AES-256-GCM gist](https://gist.github.com/AndiDittrich/4629e7db04819244e843) — community-verified encryption pattern (corroborated by Node.js crypto docs)
- [PostgreSQL declarative partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html) — partition behavior that Drizzle cannot declare

---

_Research completed: 2026-03-16_
_Ready for roadmap: yes_

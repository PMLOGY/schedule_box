# Pitfalls Research

**Domain:** Adding 32 production gaps to existing Next.js 14 SaaS + migrating Railway → Vercel/Neon/Upstash
**Researched:** 2026-03-16
**Confidence:** HIGH (Vercel/Neon/Upstash official docs + CVE advisories), MEDIUM (encryption migration patterns, OTel sampling)

---

## Critical Pitfalls

Mistakes that cause data loss, security breaches, or full-feature rewrites.

---

### Pitfall 1: publishEvent no-op swallows errors silently — booking SAGA steps fail without a trace

**What goes wrong:**
The existing SAGA choreography (booking created → payment charged → confirmation sent) relies on `publishEvent()` to chain steps. If the no-op replacement returns `void` or `Promise.resolve()` unconditionally on every call, a booking can complete the HTTP response successfully while the downstream payment charge or refund trigger never executes. The silence looks like success. The failure surfaces days later via customer complaints, not logs.

**Why it happens:**
Developers treat "remove RabbitMQ" as "delete the connection + return early." They do not trace every call site to understand which events are fire-and-forget (analytics, notifications) versus which are required for the SAGA to proceed (payment confirmation, refund trigger, booking state machine transitions). The distinction is business-critical.

**How to avoid:**
Audit every `publishEvent()` call site before removing the broker. Classify each as:
- **Fire-and-forget** (notification, analytics event): safe no-op. Add `console.warn('[RabbitMQ removed] skipped event: booking.notification.send')` so the removal stays traceable in Vercel logs.
- **SAGA-required** (payment.charge, refund.trigger, booking.state.transition): must be replaced with a direct function call or inline async execution in the same request context. NOT a no-op.

The fire-and-forget vs. SAGA-required classification must be documented as an inline comment at each call site before the RabbitMQ code is deleted.

**Warning signs:**
- Bookings created but payment never charged
- Refunds confirmed in UI but balance not updated
- No entries in the notification send log after booking confirmation
- Booking status stuck in `pending` after the flow completes

**Phase to address:** P0 — RabbitMQ removal (must be the first phase, blocks all deployment)

---

### Pitfall 2: Neon pooled connection URL used for migrations — silent failures or lock errors

**What goes wrong:**
Neon's PgBouncer runs in **transaction pooling mode** on the pooled connection string. Any SQL that uses session-level state — `SET LOCAL`, `LISTEN/NOTIFY`, advisory locks, prepared statements outside a transaction, or `SET statement_timeout` — silently errors or hangs. Drizzle Kit migrations use `SET search_path` and other session-scoped commands. Running `drizzle-kit migrate` against the pooled URL either corrupts migration state or produces a hard-to-diagnose timeout.

**Why it happens:**
The pooled and direct Neon URLs look nearly identical — the only difference is `-pooler` in the hostname. Developers copy the "connection string" from the Neon dashboard without reading the footnote. CI/CD pipelines that run migrations share the same `DATABASE_URL` as the application.

**How to avoid:**
Use two environment variables from day one:
- `DATABASE_URL` — pooled connection string (for all runtime Drizzle queries in the application)
- `DATABASE_URL_UNPOOLED` — direct connection string (for `drizzle-kit migrate`, `drizzle-kit push`, seed scripts, and any SQL using session-scoped features)

In `drizzle.config.ts`, always reference `process.env.DATABASE_URL_UNPOOLED`. In `packages/database/src/index.ts`, use the neon-http or neon-serverless driver against `DATABASE_URL`. Neon's dashboard provides both strings — commit the env var names in `.env.example` so no one guesses.

**Warning signs:**
- `drizzle-kit push` hangs indefinitely against Neon
- `Error: prepared statement "s0" does not exist` in application logs
- Advisory lock operations hanging in booking double-prevention logic
- Migrations show as pending even after being run

**Phase to address:** Infrastructure — Vercel/Neon migration (must be resolved before any other phase runs migrations)

---

### Pitfall 3: Vercel function timeout kills the availability engine on popular slots

**What goes wrong:**
The `availability-engine.ts` runs 4-6 serial queries: working hours, employee assignments, existing bookings, resource locks, buffer rules, capacity limits. On popular businesses (50+ bookings/day, multiple employees), this serial pattern plus a Neon connection setup on a cold invocation can breach the 10s Hobby timeout or push the 60s Pro timeout under concurrent load. The customer sees "no availability" when slots exist.

**Why it happens:**
The availability engine was designed for Railway (persistent Node.js process, warm DB connection pool). On Vercel, Fluid Compute keeps a warm instance for >99% of requests, but the serial query pattern still accumulates latency. A single Neon query from Vercel US-East-1 to Neon takes 20-50ms; six serial queries add 120-300ms before business logic runs.

**How to avoid:**
1. Consolidate the 4-6 serial availability queries into a single SQL CTE that fetches all required data in one round-trip. This is the single highest-impact optimization.
2. Add `export const maxDuration = 30` to the availability route file (requires Vercel Pro plan).
3. Cache computed availability windows in Upstash Redis with a 60-second TTL — availability rarely changes mid-minute.
4. Test availability response time in staging by simulating 10 concurrent requests with Vitest's concurrent test runner before shipping.

**Warning signs:**
- Booking wizard step 2 (slot picker) takes >5s to load
- Vercel function duration logs showing >8s on the availability endpoint
- Sentry timeout errors on `GET /api/v1/bookings/availability`
- `504 Gateway Timeout` on the availability route during peak booking hours

**Phase to address:** Infrastructure — Vercel migration (availability optimization is a required sub-task, not optional polish)

---

### Pitfall 4: PII encryption migration corrupts existing data or blocks the database

**What goes wrong:**
Encrypting existing `phone`, `email`, and `notes` columns in production causes one or more of these failure modes:
1. **Double-encryption**: Migration encrypts existing plaintext, but the old deployed application code re-encrypts already-encrypted values on next write, producing unreadable gibberish.
2. **Table lock under load**: `UPDATE customers SET phone = encrypt(phone)` on a table with 50,000+ rows takes an `AccessExclusiveLock`. With the application still running, this blocks all reads and writes for minutes — visible downtime.
3. **Search breakage**: Existing queries `WHERE phone = $1` or customer search by phone stop working because the column now holds AES-GCM ciphertext. The search returns zero results for every query. This breaks the front desk workflow immediately.

**Why it happens:**
The migration and the code deploy are treated as independent steps rather than a coordinated cut-over. The developer writes a single `UPDATE` migration without thinking about: (a) the app still writing plaintext during the migration window, (b) lock duration on large tables, (c) search features that depend on plaintext comparison.

**How to avoid:**
Use the expand-contract pattern — never encrypt in-place on a live table:

1. **Expand**: Add `phone_encrypted bytea`, `email_encrypted bytea` nullable columns alongside the existing plaintext columns. Deploy app code that writes to both columns simultaneously (plaintext + encrypted).
2. **Migrate**: A background script encrypts existing rows in batches of 500 with a 50ms sleep between batches (`pg_sleep(0.05)`). No lock contention. Run during off-peak hours (02:00-04:00 CET).
3. **Verify**: Assert 100% of rows have non-null `phone_encrypted` before proceeding.
4. **Contract**: Remove old plaintext columns. Deploy code that reads only from encrypted columns.

For searchable fields (phone, email): store a deterministic HMAC-SHA256 tag alongside the encrypted value. Index the HMAC column. Queries become `WHERE phone_hmac = hmac($1, key)` for exact-match lookups. AES-GCM uses a random nonce per encryption — the same plaintext encrypts to different ciphertext each time — making it non-searchable without a HMAC companion.

**Warning signs:**
- Phone search returning 0 results after migration
- Base64-of-base64 values appearing in DB (double-encryption)
- `pg_stat_activity` showing long-running `UPDATE customers` with `AccessExclusiveLock`
- Customer search page broken immediately after migration deploy

**Phase to address:** P1 — Security hardening (PII encryption sub-task). Must complete before any other phase writes new customer data to avoid split-state tables.

---

### Pitfall 5: Upstash ephemeral in-memory cache breaks rate limiting across serverless invocations

**What goes wrong:**
The `@upstash/ratelimit` SDK uses an in-memory `Map` for caching the sliding-window counter to reduce HTTP round-trips. In Vercel serverless (Node.js runtime), each function invocation gets a fresh process — the `Map` is empty every time. In some SDK configurations, the stale empty Map causes the SDK to report "not rate limited" when the Upstash counter has actually been exceeded, creating a bypass. In other configurations, it causes redundant HTTP calls with no cache benefit.

**Why it happens:**
The SDK documentation shows `ephemeralCache: new Map()` as a usage example. Developers copy it without noticing it is documented for Edge Runtime and long-running environments, not Node.js serverless where process memory does not persist between invocations.

**How to avoid:**
- For Node.js serverless API routes: omit `ephemeralCache` entirely. Accept the extra Upstash HTTP call per rate-limit check (~5-10ms from Vercel US regions to Upstash US-East-1 — acceptable overhead for rate limiting).
- Move rate limiting to `middleware.ts` with `export const runtime = 'edge'`. Edge Runtime instances are long-lived within a region; the `Map` cache works correctly there. This is the architecturally correct placement for rate limiting — it runs before any API route, blocking malicious traffic before it consumes compute.
- Use `sliding-window` algorithm (not `fixed-window`) to prevent burst attacks at window reset boundaries.
- Use `@upstash/redis` HTTP client, not `ioredis` or the standard `redis` package — Upstash does not expose a TCP Redis port, only a REST API.

**Warning signs:**
- Rate limit bypassed in load testing (window reset allows burst of requests)
- Upstash dashboard showing 5-10x more requests than expected (no cache hit benefit)
- `Error: LIMIT_EXCEEDED` on the first request to a fresh serverless function instance
- `ioredis` or `redis` connection errors in Vercel function logs

**Phase to address:** Infrastructure — Vercel migration (Upstash setup sub-task)

---

### Pitfall 6: Super-admin impersonation issues a real user JWT — unrevokable, untraceable token

**What goes wrong:**
A naive impersonation implementation generates a real JWT for the target user and stores it in the admin's session cookie. If that token is forwarded (shared link, logs, copy-paste), the recipient has full access to the target user's account with no revocation mechanism. The JWT remains valid until its natural expiry (up to 7 days if using standard refresh token rotation). The audit trail shows the impersonated user acting — the admin's identity is invisible.

**Why it happens:**
Developers implement impersonation as "log in as user X" — generate their JWT, set cookie. This is the simplest path but creates an unrevokable, untraceable credential. The correct approach requires a separate, purpose-specific token type.

**How to avoid:**
Issue a short-lived (15-minute maximum) impersonation token distinct from regular session tokens:
1. Separate JWT type with claim `token_type: 'impersonation'` — cannot be used as a regular session token
2. Carries both `sub: targetUserId` AND `actingAs: adminUserId` in the payload
3. No refresh — expires hard in 15 minutes
4. Stored in a separate `impersonation_sessions` table with `revoked_at` column; checked server-side on every impersonated request
5. Every action during impersonation writes to `audit_logs` with `performed_by_admin_id` populated (never null)
6. Stored in a separate HttpOnly cookie (`imp_token`) — never merged with the admin's session cookie
7. A persistent non-dismissible red banner ("IMPERSONATION ACTIVE — acting as [company name]") visible on all pages during the session

**Warning signs:**
- `audit_logs` records showing actions from user X while admin was logged in at the same time, but no `admin_id` in the log record
- Impersonation token visible in browser dev tools network tab after session ends
- No `impersonation_sessions` table in the schema
- Admin's regular `Authorization` cookie contains the target user's `sub`

**Phase to address:** P2 — Super-Admin completion

---

### Pitfall 7: SSE connections time out on Vercel Node.js runtime after 60 seconds

**What goes wrong:**
Vercel's Node.js runtime enforces a hard function timeout: 10s on Hobby plan, 60s on Pro plan. SSE connections for live booking updates and dashboard calendar refresh require connections lasting minutes to hours. The connection closes silently at the timeout boundary. The browser `EventSource` API auto-reconnects — this creates a thundering herd on the SSE endpoint where all connected clients reconnect simultaneously every 60 seconds in production, spiking DB load.

**Why it happens:**
SSE works perfectly in local development (no timeout), so the Vercel timeout is not discovered until the first production deployment. The reconnect storm is not visible in development and appears suddenly at scale.

**How to avoid:**
Two approaches, in priority order:

**Option A — SWR polling (recommended for this project):**
Replace SSE with 15-second interval polling using `useSWR(url, fetcher, { refreshInterval: 15000 })`. At <500 companies with typical SMB booking volumes, 15-second stale data is acceptable. Booking confirmation page uses 3-second polling until status transitions to `confirmed`. This eliminates SSE complexity entirely and works correctly on all Vercel plans without any runtime configuration.

**Option B — Edge Runtime SSE (for future real-time requirements):**
Add `export const runtime = 'edge'` on the SSE route. Edge Runtime instances are long-lived and support streaming natively via Web Streams API. Replaces Node.js `res.write()` with `ReadableStream`. Constraint: Edge Runtime has no Node.js built-ins — no `fs`, no `require()`, no `process.env` dynamic access beyond `process.env.NEXT_PUBLIC_*`.

For v3.0 scale, Option A is correct. Option B is premature for <500 companies.

**Warning signs:**
- Browser console showing `EventSource` reconnecting every 60s
- Vercel function logs showing `504 Function Timeout` on the SSE endpoint
- Dashboard data showing a consistent 60-second stale window between updates
- Spike in Neon connection counts every 60 seconds (reconnect storm signature)

**Phase to address:** P2 — Real-time updates

---

### Pitfall 8: Next.js CVE-2025-29927 middleware bypass grants access to all admin routes if not patched

**What goes wrong:**
CVE-2025-29927 (disclosed 2025, patched in Next.js 14.2.25) allows any attacker to bypass Next.js middleware by sending `x-middleware-subrequest: middleware` in the HTTP request header. Since ScheduleBox's admin and super-admin route protection is implemented in `middleware.ts`, an unpatched deployment exposes every admin endpoint to unauthenticated access — including impersonation, suspend, broadcast, platform metrics, and user management.

**Why it happens:**
Next.js used the `x-middleware-subrequest` header internally to prevent infinite middleware recursion. External requests with this header were trusted the same way, bypassing all middleware checks. The fix strips the header from external requests.

**How to avoid:**
Verify `next` version in `package.json` is `>=14.2.25` before any deployment. This is a one-line package bump. Add a CI check: `node -e "const v = require('./node_modules/next/package.json').version; if (v < '14.2.25') process.exit(1)"`.

Additionally: do not rely solely on middleware for authorization. Apply server-side authorization checks in every API route handler as a second layer — middleware is a convenient first filter, not the only protection.

**Warning signs:**
- `next` version in `package.json` is below `14.2.25`
- Admin routes protected only by middleware with no server-side check in the route handler
- No Next.js version pin in CI that fails below the patched version

**Phase to address:** P1 — Security hardening (first security sub-task before any deployment)

---

## Moderate Pitfalls

---

### Pitfall 9: OpenTelemetry SDK initialization adds 200-500ms to cold starts

**What goes wrong:**
The OTel SDK initialization (creating TracerProvider, registering exporters, configuring instrumentations) runs synchronously on module load in Next.js `instrumentation.ts`. On Vercel serverless, this adds 200-500ms to every cold start. With Fluid Compute reducing cold starts to <1% of invocations on Pro, this is usually invisible, but it makes p99 latency look abnormal and can push the availability engine over the timeout limit on complex routes.

`BatchSpanProcessor` — the default in most OTel examples — keeps background timer intervals that prevent Vercel functions from freezing between invocations, which increases billing because functions stay warm longer than necessary.

**Why it happens:**
OTel examples and documentation target long-running Node.js servers, not serverless. Developers copy standard examples into `instrumentation.ts` without adapting for the serverless execution model.

**How to avoid:**
1. Use `@vercel/otel` (Vercel's first-party OTel wrapper) instead of raw `@opentelemetry/sdk-node` — it defers initialization, skips non-applicable instrumentations, and is tested against Fluid Compute.
2. Use `SimpleSpanProcessor` instead of `BatchSpanProcessor` — no background timers, function freezes correctly between invocations.
3. Set production sampling to 10%: `new ParentBasedSampler(new TraceIdRatioBased(0.1))`. Full 100% sampling at 500 companies with typical booking flows generates ~50,000+ spans/day minimum. Vercel Drains charges $0.50/GB — at 500 companies this cost compounds quickly.
4. Only instrument what will be queried: HTTP traces and DB spans. Skip file system, DNS, and process instrumentation.
5. Guard with `if (process.env.NEXT_RUNTIME === 'edge') return` — OTel SDK does not support Edge Runtime.

**Warning signs:**
- Cold start p99 increases by >300ms after adding OTel
- `BatchSpanProcessor` in any OTel setup code
- Vercel observability billing growing faster than user count
- OTel instrumentation code running in Edge Runtime (will throw)

**Phase to address:** P2 — Observability

---

### Pitfall 10: Drizzle ORM introspect conflicts with manually-partitioned tables

**What goes wrong:**
If `bookings` is partitioned by `created_at` range using raw SQL in a migration file (since Drizzle has no declarative partition API), `drizzle-kit introspect` pulls each partition as a separate table (`bookings_2025_q1`, `bookings_2025_q2`). Subsequent `drizzle-kit push` generates `ALTER TABLE` or `DROP TABLE` statements that conflict with partition constraints. The schema file permanently diverges from DB reality and all future migrations become unreliable.

**Why it happens:**
Drizzle's introspection does not understand the parent/child relationship of PostgreSQL table partitions. After manual DDL, running introspect is a destructive operation that corrupts the managed schema state.

**How to avoid:**
**Primary recommendation: do not partition tables in v3.0.** PostgreSQL handles 1-5 million rows efficiently with proper composite indexes on `(company_id, created_at)`. At <500 companies with SMB booking volumes (~50K-200K bookings/year total), partitioning provides no measurable benefit and significant maintenance cost. Defer to a future milestone when row counts justify it.

If partitioning is implemented: create partitioned tables via standalone raw-SQL migration files that Drizzle Kit treats as opaque. Define the parent table normally in `schema.ts` (Drizzle queries work transparently on partitioned tables). Never run `drizzle-kit introspect` after adding manual DDL.

**Warning signs:**
- Drizzle introspect generating tables like `bookings_2025_q1`
- Migration conflicts on `ALTER TABLE bookings` statements after adding partitions
- `drizzle-kit push` attempting to drop and recreate the bookings table

**Phase to address:** P3 — DB infrastructure (strongly recommend deferring partitioning entirely)

---

### Pitfall 11: Test coverage reaches 80% on metrics but critical booking paths remain at 20%

**What goes wrong:**
A global 80% line coverage gate is achieved by testing the easiest code — utility functions, formatters, type guards, simple validators. The availability engine, payment SAGA state machine, and booking state transitions — which are the actual production failure points — remain at 20-30% coverage because they require database fixtures and are time-consuming to mock correctly.

**Why it happens:**
Coverage is measured as a single aggregate number. Developers write tests for whatever raises the number fastest to unblock CI. Hard-to-test business logic (DB-heavy, multi-step flows) is deferred or skipped.

**How to avoid:**
Set per-module coverage thresholds rather than a single global threshold. In `vitest.config.ts`:
```ts
coverage: {
  thresholds: {
    'lib/booking/availability-engine.ts': { branches: 90, lines: 90 },
    'lib/payment/saga.ts': { branches: 85, lines: 85 },
    'lib/auth/**': { lines: 80 },
    'components/**': { lines: 60 },
    'lib/utils/**': { lines: 70 },
  }
}
```

Use Neon's database branching feature for integration tests — it creates a fresh database branch per test run in under 1 second, enabling real DB tests without mocking. This eliminates the "mock everything" trap that produces passing tests that don't reflect real behavior.

**Warning signs:**
- Global coverage at 80% but `availability-engine.ts` has red coverage lines
- All green tests concentrated in `lib/utils/` and `components/`
- Integration tests marked `.skip` or `.todo` in CI output
- No tests that exercise the booking → payment state machine end-to-end

**Phase to address:** P1 — Test coverage (set per-module thresholds before writing tests, not after)

---

### Pitfall 12: Feature flags stored in DB cause N+1 query on every API request

**What goes wrong:**
A naive feature flag implementation queries the `feature_flags` table on every API request to check if a flag is enabled for the current company. At 500 companies making 10 requests/second each, this adds 5,000 extra DB queries/second — a 3-5x increase in Neon connection load that saturates the pool and degrades all other queries.

**Why it happens:**
Feature flags seem trivially simple — a DB table with `company_id`, `flag_name`, `enabled`. Developers add `SELECT * FROM feature_flags WHERE company_id = ?` to the auth middleware without considering the call frequency.

**How to avoid:**
For <500 companies, the correct implementation is:
1. Cache flags in Upstash Redis as a hash per company with a 5-minute TTL: `HGETALL flags:company:${companyId}`.
2. On flag change (admin UI toggle), invalidate that company's Redis key.
3. Within a single request, check the flag once and pass the result as a function argument — never re-fetch within a request lifecycle.
4. Keep the flag set to a maximum of 10 flags. More than 10 flags for an SMB SaaS is premature infrastructure investment.
5. Do not evaluate flags client-side for subscription-tier gating — always server-side in API route handlers.

**Warning signs:**
- `feature_flags` table appearing in pg_stat_statements top-20 most-queried tables
- Redis hit rate below 80% on flag keys
- Performance regression after adding flag checks to middleware
- Feature flag checks bypassed by calling the API directly without the flag header

**Phase to address:** P2 — Super-Admin completion (feature flags sub-task)

---

### Pitfall 13: Industry verticals add per-vertical schema columns that bypass RLS

**What goes wrong:**
Adding `medical_notes`, `vehicle_vin`, or `appointment_type` as typed columns to `bookings` or `customers` tables — or a new `vertical_fields` table — requires updating Row Level Security policies. If new columns are added without reviewing the RLS `USING` clauses, data may be readable across tenant boundaries. Medical notes are PII under GDPR — a cross-tenant leak is a mandatory reporting incident under GDPR Article 33.

**Why it happens:**
RLS policies are tested thoroughly during initial feature development, but schema extensions are treated as "just adding a column" without re-running the RLS test suite.

**How to avoid:**
1. Store vertical-specific configuration in a `vertical_config jsonb NOT NULL DEFAULT '{}'` column on the `companies` table. Vertical fields inherit the existing `company_id`-based RLS without any new policy definitions.
2. For per-booking vertical data, use `booking_metadata jsonb` (add once if not present) rather than typed per-vertical columns — avoids schema proliferation for <10 industry types and keeps RLS coverage trivial.
3. Run the RLS test suite (`packages/database/tests/rls.test.ts`) after every schema change as a non-optional CI step.

**Warning signs:**
- New table added for vertical data without a `company_id` foreign key
- RLS test suite not run after schema migration
- Test user from company A can read records from company B after vertical schema change
- `medical_notes` column on `bookings` without a corresponding RLS policy

**Phase to address:** P3 — Industry verticals

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Full no-op for all `publishEvent` calls | Fast RabbitMQ removal | Payment SAGA steps silently skip — bookings without charges | Never — must classify each call site first |
| Single `DATABASE_URL` for both app runtime and migrations | Simpler env config | Migrations run against pooled connection — silent failures or hangs | Never — always use `DATABASE_URL_UNPOOLED` for migrations |
| Global 80% coverage target with no per-module thresholds | Easy CI gate to pass | Critical paths undertested; coverage provided by utility function tests | Never for booking-critical modules — set per-module thresholds |
| Raw OTel SDK with `BatchSpanProcessor` in `instrumentation.ts` | Standard OTel example code | 300-500ms cold start penalty; background timers prevent function freeze | Never on Vercel — use `@vercel/otel` with `SimpleSpanProcessor` |
| AES-GCM random nonce for all encrypted fields including searchable PII | Simpler encryption code | Phone/email search broken — AES-GCM nonce is random, ciphertext is unsearchable | Never for fields requiring exact-match queries — add HMAC index |
| Issuing a real user JWT for admin impersonation | Simple "log in as user" implementation | Unrevokable token, no audit trail, potential token leakage | Never — always use a separate short-lived impersonation token |
| SSE with Node.js runtime on Vercel | Works in local development | 60s hard timeout, thundering herd reconnect storm in production | Never — use Edge Runtime SSE or SWR polling |
| Querying `feature_flags` table on every API request | Simple, no caching layer | 5,000 extra DB queries/second at 500 companies | Never — cache in Upstash Redis with 5-minute TTL |
| PostgreSQL table partitioning in Drizzle schema | Type-safe schema definition | Introspect breaks, migration conflicts, permanent schema drift | Never — use raw SQL migration for partition DDL, or defer entirely |
| Encrypting PII in-place with a single `UPDATE` migration | Simple one-step migration | Table lock under load, double-encryption risk, search breakage | Never on a live database — always use expand-contract pattern |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Neon PostgreSQL | Using pooled URL (`-pooler` hostname) for `drizzle-kit migrate` | Use `DATABASE_URL_UNPOOLED` (direct connection) for all migration commands; pooled URL for runtime queries only |
| Neon PostgreSQL | Assuming connection limits match Railway's persistent pool | Neon free tier: 10 direct connections max. Always use pooled URL in the app; direct only for migrations |
| Neon PostgreSQL | Running `drizzle-kit introspect` after manual partition DDL | Never introspect after manual DDL — maintain `schema.ts` by hand for any table created with raw SQL |
| Upstash Redis | Using `ioredis` or `redis` npm package | Upstash requires `@upstash/redis` HTTP REST client — TCP Redis libraries cannot connect to Upstash |
| Upstash Redis | `ephemeralCache: new Map()` in Node.js serverless rate limiter | Omit `ephemeralCache` in Node.js serverless; the Map does not persist across invocations. Only use in Edge Middleware |
| Vercel SSE | `export const runtime = 'nodejs'` (default) on SSE route | Use `export const runtime = 'edge'` for SSE, or replace SSE with SWR polling |
| Vercel functions | No `maxDuration` export on slow availability/payment routes | Add `export const maxDuration = 30` on heavy routes (requires Vercel Pro plan) |
| OpenTelemetry | `BatchSpanProcessor` on any Vercel serverless route | Use `SimpleSpanProcessor` — batch processor background timer prevents Vercel function freeze/thaw cycle |
| Sentry + Next.js 14 | Deploying without `tunnelRoute` config | Without tunnel, Sentry is blocked by ad blockers on ~30% of CZ/SK browsers — add `tunnelRoute: "/monitoring"` to `sentry.client.config.ts` |
| HIBP password check | Calling HIBP API synchronously blocking form submission | Use debounced async check after 300ms typing pause; show warning non-blocking; never block form submit on HIBP response |
| Next.js middleware auth | Relying solely on middleware for admin route protection | Always add a second server-side authorization check in each API route handler — middleware is a filter, not the only gate |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 6 serial DB queries in availability engine | Slot picker >5s on popular businesses | Consolidate into single CTE query | Any business with >20 bookings/day on Vercel serverless |
| OTel 100% trace sampling | Vercel observability bill growing unexpectedly | Set `tracesSampleRate: 0.1` (10%) in production from day one | At ~50 active companies |
| Feature flag DB query per request | `feature_flags` in pg_stat_statements top queries | Upstash Redis cache per company, 5-min TTL | At ~50 concurrent users |
| Neon connection spikes from concurrent serverless invocations | `too many connections` errors during peak hours | Use pooled connection URL always; Neon pooler handles up to 10,000 clients | Any traffic spike >50 concurrent requests |
| PII decryption on every SELECT * | Customer list page slow (500ms+) | Decrypt only on display, not in the DB layer; cache decrypted values in request context | At >5,000 customer rows per company |
| Unsampled Sentry performance traces from booking wizard | Sentry quota exhausted mid-month | Set `tracesSampleRate: 0.2` and `profilesSampleRate: 0.1` in `sentry.client.config.ts` | At ~100 daily active users |
| SSE reconnect storm (all clients reconnect at 60s boundary) | Neon connection spike every 60s; booking list briefly stale | Replace SSE with SWR polling at 15s intervals | Immediately if using SSE on Node.js runtime in production |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Next.js version below 14.2.25 in production | CVE-2025-29927: any attacker bypasses all middleware auth with one request header — full admin access | Upgrade to `>=14.2.25` before any deployment; pin version in CI |
| Real user JWT issued for impersonation | Token leakage grants full account access; 7-day validity; no audit trail | Separate 15-minute impersonation token with `token_type: 'impersonation'` claim; revocable via DB |
| Plaintext PII appearing in logs during encryption migration | Log aggregators (Sentry, Vercel logs) capture customer phone/email in plaintext | Scrub all PII fields from log statements before the migration; use `[REDACTED]` placeholder |
| Encryption key in `DATABASE_URL` or single shared env var without rotation plan | Key compromise decrypts all historical PII | Store in Vercel environment secrets; derive per-tenant key using HKDF(`masterKey`, `companyId`) |
| Super-admin broadcast with no rate limit or confirmation gate | Admin typo sends SMS to all 50,000 customers at Twilio rates (~$2,500 mistake) | Require typing the target count to confirm broadcast; rate-limit broadcast API to 1 call per 10 minutes |
| CSRF tokens absent on impersonation, suspend, and broadcast endpoints | CSRF attack forces admin to perform destructive actions | Apply CSRF validation to all state-changing super-admin endpoints even behind admin auth |
| Feature flags enforced client-side only | Subscription tier bypass by direct API call with no flag header | Always enforce feature flags server-side in API route handlers; client check is UI convenience only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Booking wizard shows "no availability" during Neon cold start | Customer leaves and books with a competitor | Show loading skeleton for 3s before error; retry availability fetch once before showing failure state |
| SSE disconnect shows stale data with no visual indicator | Owner acts on an outdated booking status | Show "last updated X ago" timestamp; indicator goes gray when connection/polling has not refreshed recently |
| PII encryption migration causes blank customer search | Owner calls support; loses confidence in the platform | Full staging test with production data clone before live migration; have rollback SQL ready before the maintenance window |
| Feature flag silently disables feature for a paying customer | Customer reports bug that cannot be reproduced in admin | Log flag evaluation decisions to `audit_logs`; provide admin UI showing active flags per company |
| Super-admin impersonation session looks identical to normal login | Support agent makes changes thinking they are helping without realizing they are impersonating | Persistent red non-dismissible "IMPERSONATION ACTIVE — as [Company Name]" banner on all pages |
| Industry vertical labels show wrong terminology | Medical business sees "Appointment Notes" when they expect "Clinical Notes"; feels unpolished | Load per-industry i18n override keys that replace global terms; test with at least one real user per vertical before launch |

---

## "Looks Done But Isn't" Checklist

- [ ] **RabbitMQ removal**: Every `publishEvent` call site has a classification comment (fire-and-forget vs. SAGA-required) — verify with `grep -rn 'publishEvent'` that every result has an adjacent comment
- [ ] **Neon migration**: Two connection strings configured (`DATABASE_URL` pooled + `DATABASE_URL_UNPOOLED` direct) — verify `drizzle.config.ts` references `DATABASE_URL_UNPOOLED`
- [ ] **Next.js version**: `package.json` shows `next >= 14.2.25` — verify with `npm list next` in CI
- [ ] **PII encryption**: Expand-contract migration complete — old plaintext `phone` and `email` columns dropped (not merely nulled) — verify `\d customers` in psql shows no varchar phone column
- [ ] **PII search**: HMAC index column exists for each encrypted searchable field — verify `customers.phone_hmac` index in schema and in Neon table inspector
- [ ] **Upstash Redis**: `@upstash/redis` HTTP client used (not `ioredis`) — verify `grep -rn "ioredis\|require('redis')"` returns no results in the codebase
- [ ] **SSE timeout**: Vercel timeout tested in staging — hold SSE or polling connection for 65s on a Vercel Pro deployment; verify behavior is correct (not tested only locally)
- [ ] **Impersonation audit trail**: Run an action during impersonation session and confirm `audit_logs` record has non-null `performed_by_admin_id`
- [ ] **OTel sampling**: `OTEL_TRACES_SAMPLER_ARG=0.1` set in Vercel production environment variables (not 1.0)
- [ ] **Feature flags server-side**: Each feature flag check in a client component has a corresponding server-side enforcement in its API route — grep for flag names and verify each has both client and server checks

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| publishEvent no-op skipped payment charges | HIGH | Identify affected bookings via `bookings` table (status `confirmed` with no payment record); manually trigger payment via admin panel; add compensating transaction entries to audit log; hotfix the no-op classification |
| Neon pooled URL broke migrations | MEDIUM | Restore from Neon 7-day point-in-time restore to pre-migration state; re-run migrations using `DATABASE_URL_UNPOOLED`; validate with `drizzle-kit check` |
| PII encryption corrupted data (double-encrypted) | HIGH | Restore from Railway pre-migration backup (last known clean snapshot); re-run expand-contract migration; if plaintext was exposed in logs: GDPR Article 33 requires DPA notification within 72 hours |
| Availability timeout in production | LOW | Add `export const maxDuration = 30` immediately via env var or code change; merge CTE optimization; deploying a fix on Vercel takes <5 minutes |
| OTel billing spike | LOW | Set `OTEL_TRACES_SAMPLER_ARG=0.01` immediately via Vercel env var — no redeployment needed; billing drops within minutes |
| SSE thundering herd reconnect storm | MEDIUM | Switch to SWR polling as immediate fallback (`refreshInterval: 15000`) — implementable in <1 hour with no backend changes |
| Impersonation token leaked | HIGH | Set `revoked_at = now()` on all active `impersonation_sessions` rows; rotate JWT signing secret (`JWT_SECRET` env var) — invalidates all existing tokens; audit every action taken during the leaked session period |
| CVE-2025-29927 discovered post-deployment | HIGH | Upgrade `next` to `14.2.25+` immediately; redeploy; audit logs for `x-middleware-subrequest` header in Vercel request logs to detect exploitation attempts |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-----------------|--------------|
| publishEvent no-op breaks SAGA | P0: RabbitMQ removal | All call sites classified; booking + payment + notification E2E Playwright test passes end-to-end |
| Neon pooled URL used for migrations | Infrastructure: Vercel/Neon migration | `drizzle.config.ts` uses `UNPOOLED` var; `drizzle-kit migrate` CI step passes on first run |
| Availability engine timeout | Infrastructure: Vercel migration | Availability API p99 <2s under 10-concurrent-request load test in Vitest |
| PII encryption data corruption | P1: Security hardening | Row count before/after migration matches; phone search returns correct results; no plaintext phone column in schema |
| Upstash ephemeral cache breaks rate limiting | Infrastructure: Vercel migration | Load test: rate limiting holds across 100 concurrent requests from same IP; no bypass |
| CVE-2025-29927 Next.js patch | P1: Security hardening | `npm list next` shows `>=14.2.25` in CI; middleware bypass test request returns 403 |
| Impersonation token leakage | P2: Super-Admin | Playwright: impersonated action appears in `audit_logs` with non-null `admin_id`; token rejects after 15 min |
| SSE timeout on Vercel | P2: Real-time updates | 65-second SSE hold test in Vercel Pro staging confirms no silent 60s disconnects; or SWR polling implemented |
| OTel cold start overhead | P2: Observability | Cold start p99 <500ms after OTel addition; `OTEL_TRACES_SAMPLER_ARG=0.1` set in production |
| Drizzle partition introspect conflict | P3: DB infrastructure | Partitioning deferred OR schema.ts matches DB without running introspect after manual DDL |
| Industry vertical RLS leak | P3: Industry verticals | RLS test suite passes; company A cannot read company B vertical fields after schema change |
| Coverage on wrong modules | P1: Test coverage | `availability-engine.ts` branch coverage >90% in coverage report; not just global 80% |
| Feature flag N+1 query | P2: Super-Admin | `feature_flags` absent from pg_stat_statements top-20; Upstash Redis hit rate >95% on flag keys |

---

## Sources

- Vercel Fluid Compute (cold starts): https://vercel.com/docs/fluid-compute
- Vercel function timeout KB: https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out
- Vercel scale-to-one blog (Fluid): https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts
- Neon connection pooling docs: https://neon.com/docs/connect/connection-pooling
- Neon connection method selection: https://neon.com/docs/connect/choose-connection
- Neon serverless driver: https://neon.com/docs/serverless/serverless-driver
- Drizzle + Neon integration guide: https://neon.com/docs/guides/drizzle
- Drizzle connect-neon docs: https://orm.drizzle.team/docs/connect-neon
- Drizzle partition support discussion (GitHub #2093): https://github.com/drizzle-team/drizzle-orm/discussions/2093
- Drizzle partition feature issue (GitHub #2854): https://github.com/drizzle-team/drizzle-orm/issues/2854
- CVE-2025-29927 Vercel postmortem: https://vercel.com/blog/postmortem-on-next-js-middleware-bypass
- CVE-2025-29927 NVD entry (patched versions): https://nvd.nist.gov/vuln/detail/CVE-2025-29927
- Upstash ratelimit SDK: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- Upstash ephemeral cache serverless issue (Vercel Next.js discussion #62178): https://github.com/vercel/next.js/discussions/62178
- Vercel OTel instrumentation docs: https://vercel.com/docs/tracing/instrumentation
- OTel on Vercel serverless (oneuptime guide, 2026-02): https://oneuptime.com/blog/post/2026-02-06-opentelemetry-vercel-serverless-functions/view
- SSE time limits on Vercel (community): https://community.vercel.com/t/sse-time-limits/5954
- SSE on Vercel Next.js discussion (#48427): https://github.com/vercel/next.js/discussions/48427
- Vercel Drains trace billing ($0.50/GB): https://vercel.com/docs/drains/reference/traces

---

_Pitfalls research for: ScheduleBox v3.0 — 32 gaps closure + Railway → Vercel/Neon/Upstash migration_
_Researched: 2026-03-16_

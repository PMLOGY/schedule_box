# Architecture Research: v3.0 Integration Architecture

**Domain:** Next.js 14 SaaS monolith — infrastructure migration, security hardening, feature gap closure
**Researched:** 2026-03-16
**Confidence:** HIGH for migration patterns (official Neon/Upstash/Vercel docs); MEDIUM for DB partitioning
(Drizzle native support not yet shipped); HIGH for SSE/OTel (official Next.js docs)

---

## System Overview (Current → Target)

```
CURRENT (Railway / Docker)
┌─────────────────────────────────────────────────────────────────┐
│ Client Layer                                                     │
│  Next.js 14 App (apps/web) — UI + 179 API routes               │
├─────────────────────────────────────────────────────────────────┤
│ Infrastructure Layer                                             │
│  PostgreSQL 16  │  Redis 7  │  RabbitMQ 3.13                   │
├─────────────────────────────────────────────────────────────────┤
│ Sidecar Services                                                 │
│  Python FastAPI AI  │  Node.js Notification Worker              │
└─────────────────────────────────────────────────────────────────┘

TARGET (Vercel + Managed Services)
┌─────────────────────────────────────────────────────────────────┐
│ Client Layer                                                     │
│  Next.js 14 App (apps/web) — UI + 179 API routes               │
│  Vercel Serverless Functions (60s timeout on Pro)               │
├─────────────────────────────────────────────────────────────────┤
│ Managed Services Layer                                           │
│  Neon PostgreSQL (serverless + pooling)                         │
│  Upstash Redis (HTTP-based, serverless-native)                  │
│  [RabbitMQ REMOVED — safe no-op publishEvent]                   │
├─────────────────────────────────────────────────────────────────┤
│ Cross-Cutting (new in v3.0)                                      │
│  @vercel/otel → OpenTelemetry traces                            │
│  @sentry/nextjs → error capture                                 │
│  AES-256-GCM PII encryption layer (Node.js crypto)             │
│  SSE streaming routes for real-time updates                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities: New vs Modified

| Component | Status | Responsibility | Integration Point |
|-----------|--------|----------------|-------------------|
| `packages/events/src/publisher.ts` | **MODIFIED** | `publishEvent` becomes safe no-op — logs event type, returns immediately, never touches amqplib | Called from 16 files in apps/web |
| `packages/database/src/db.ts` | **MODIFIED** | Replace `pg` Pool with `@neondatabase/serverless` neon() HTTP driver | Every Drizzle query in API routes |
| `apps/web/lib/redis.ts` | **MODIFIED** | Replace ioredis client with `@upstash/redis` REST client | JWT blacklist, rate limit, cache hits |
| `apps/web/instrumentation.ts` | **NEW** | `@vercel/otel` registerOTel — instruments all App Router requests | Next.js 14 must set `experimental.instrumentationHook: true` in next.config |
| `apps/web/app/api/v1/stream/route.ts` | **NEW** | SSE endpoint using ReadableStream + `text/event-stream` content type | Dashboard real-time: booking status changes |
| `apps/web/lib/encryption.ts` | **NEW** | AES-256-GCM encrypt/decrypt using Node.js `crypto` module | Wraps DB read/write for PII columns |
| `apps/web/middleware.ts` | **MODIFIED** | Add maintenance mode check (Redis flag), CSRF token validation, SSRF block list | All inbound requests |
| `apps/web/app/api/v1/admin/impersonate/route.ts` | **NEW** | Super-admin issues impersonation JWT with `impersonatedBy` claim | Admin panel only |
| `apps/web/app/api/v1/admin/feature-flags/route.ts` | **NEW** | CRUD for feature flags stored in PostgreSQL (not Redis — persistence required) | Feature flag middleware |
| `apps/web/app/[locale]/(dashboard)/admin/` | **MODIFIED** | Add broadcast, maintenance-mode toggle, audit-log viewer, suspend company | Existing admin layout |
| PII migration script | **NEW** | One-shot Drizzle migration + Node script: read existing plaintext → encrypt → write back | Must run before app goes live on Vercel |
| DB partition migrations | **NEW** | Raw SQL in Drizzle migration file — `analytics_events`, `audit_logs` partitioned by month | Not expressible in Drizzle schema DSL |

---

## Recommended Project Structure (delta from current)

```
apps/web/
├── instrumentation.ts          # NEW — @vercel/otel init (root level, not in app/)
├── middleware.ts                # MODIFIED — add maintenance mode + CSRF
├── app/
│   └── api/v1/
│       ├── stream/
│       │   └── route.ts        # NEW — SSE endpoint for real-time booking updates
│       └── admin/
│           ├── impersonate/
│           │   └── route.ts    # NEW — super-admin impersonation JWT
│           ├── feature-flags/
│           │   └── route.ts    # NEW — feature flag CRUD
│           ├── broadcast/
│           │   └── route.ts    # NEW — broadcast message to all tenants
│           └── maintenance/
│               └── route.ts    # NEW — toggle maintenance mode flag
├── lib/
│   ├── encryption.ts           # NEW — AES-256-GCM PII column helpers
│   ├── redis.ts                # MODIFIED — swap ioredis → @upstash/redis
│   └── feature-flags.ts        # NEW — read feature flags with Redis cache layer
└── scripts/
    └── encrypt-pii-migration.ts # NEW — one-shot encrypt existing plaintext PII

packages/
├── events/
│   └── src/
│       └── publisher.ts        # MODIFIED — no-op publishEvent
└── database/
    └── src/
        ├── db.ts               # MODIFIED — Neon serverless driver
        └── schema/
            └── admin.ts        # NEW — feature_flags, broadcast_messages tables
```

---

## Architectural Patterns for v3.0

### Pattern 1: Safe No-Op publishEvent

**What:** Replace `publishEvent` in `packages/events/src/publisher.ts` with a function that logs the event type and returns `Promise<void>` without connecting to RabbitMQ. All 16 call sites remain unchanged — the function signature is preserved.

**Why this approach:** All 38 `publishEvent` calls are fire-and-forget (callers do not use the return value for flow control). The booking, payment, loyalty, and review flows continue to work because the downstream consumers (notification sending, loyalty points, analytics) were already refactored to synchronous DB writes in v2.0 for the Railway deployment. RabbitMQ was used for eventual consistency cross-service communication that no longer applies in the Next.js monolith where all logic is colocated.

**When to use:** Every call site — no conditional logic needed.

**Example:**

```typescript
// packages/events/src/publisher.ts — v3.0 replacement
export async function publishEvent<T>(event: CloudEvent<T>): Promise<void> {
  // RabbitMQ removed for Vercel deployment.
  // Event is logged for observability but not dispatched.
  // All downstream actions (notifications, loyalty, analytics) are
  // handled synchronously within the API route that creates the event.
  console.log('[events] no-op publish:', event.type, event.subject ?? '');
  return Promise.resolve();
}
```

**Trade-offs:** Loses eventual consistency and retryable delivery. Acceptable because: (a) this codebase runs as a single monolith where cross-service async is unnecessary, (b) the notification worker still sends email/SMS directly via SMTP/Twilio without needing RabbitMQ, and (c) analytics writes are already direct DB inserts.

---

### Pattern 2: Neon Serverless Driver — Connection Pooling

**What:** Replace `pg` Pool with `@neondatabase/serverless` neon() for HTTP transport. Use the WebSocket-based `neonConfig` only for interactive transactions (advisory locks, `SELECT FOR UPDATE`).

**Why this matters:** Vercel serverless functions cannot reuse TCP connections between invocations. The standard `pg` Pool will open a new connection on every cold start, exhausting Neon's connection limit at scale. Neon's HTTP driver routes each query over HTTP, eliminating connection state.

**When to use:** All Drizzle queries except those that require `SELECT FOR UPDATE` (double-booking prevention — these need WebSocket transport).

**Example:**

```typescript
// packages/database/src/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// For transactions requiring SELECT FOR UPDATE:
import { Pool } from '@neondatabase/serverless';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbTx = drizzleWs({ client: pool, schema });
```

**Trade-offs:** HTTP transport is 10-30ms slower per round-trip vs TCP. Acceptable at SMB scale (hundreds of bookings/day). Eliminates connection exhaustion on cold start.

---

### Pattern 3: Upstash Redis — HTTP Client

**What:** Replace `ioredis` with `@upstash/redis`, which communicates over REST/HTTP. The API surface is a subset of ioredis but covers all usage patterns in this codebase: `get`, `set`, `del`, `setex`, `incr`, `expire`, `sadd`, `smembers`.

**Why this matters:** ioredis uses persistent TCP sockets. Vercel serverless functions are stateless — a new socket opened per invocation is not released until the function cold-starts. Upstash uses HTTP, which is connection-less and compatible with serverless.

**Usage patterns in this codebase:**
- JWT blacklist: `set(tokenId, '1', { ex: 900 })` → direct replacement
- Rate limiting: `incr(key)` + `expire(key, 60)` → direct replacement
- Availability cache: `setex(key, 300, JSON.stringify(slots))` → use `set(key, data, { ex: 300 })`
- Booking counters (usage limits): `incr` + `get` → direct replacement

**Example:**

```typescript
// apps/web/lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

**NOT a 100% drop-in:** Upstash Redis does not support pub/sub (`subscribe`/`publish`), Lua scripts, or MULTI/EXEC transactions. This codebase does not use any of these — confirmed by grepping call sites in `apps/web`.

---

### Pattern 4: SSE for Real-Time Updates on Vercel

**What:** Use `ReadableStream` in an App Router API route to push booking status change events to the dashboard. The client polls or maintains an EventSource connection.

**Why SSE instead of WebSocket:** Vercel serverless does not support persistent bidirectional connections. SSE uses standard HTTP streaming and works within the 60s function timeout (Pro tier). For updates that occur less frequently than 60s, client reconnects automatically via `EventSource`.

**Required headers:**
```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no    ← prevents nginx/Vercel edge buffering
```

**Required route config:**
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**When to use:** Booking status updates on the owner dashboard. Not needed for data-dense pages (tables use TanStack Query polling with `refetchInterval: 30_000`).

**Trade-offs:** SSE is one-directional. For the dashboard use case (server pushes booking changes to owner), this is sufficient. The 60s timeout means long-lived SSE connections require client reconnect logic — `EventSource` handles this automatically.

---

### Pattern 5: PII Column Encryption

**What:** Wrap specific customer columns (`phone`, `email`, `full_name` for customers without accounts) with AES-256-GCM encrypt-on-write / decrypt-on-read at the application layer.

**Why application-layer, not DB-layer:** Drizzle ORM has no native column encryption as of March 2026 (open GitHub issue #2098, not yet implemented). PostgreSQL pgcrypto extension adds complexity on Neon. Node.js `crypto.createCipheriv('aes-256-gcm')` is synchronous, zero-dependency, and compatible with Vercel serverless.

**Affected columns (scope for v3.0):**
- `customers.phone`
- `customers.email` — store encrypted plaintext; a separate `email_hash` column (SHA-256, indexed) enables lookup by email without decrypting
- No change to `users.email` — used for auth, must remain plaintext for JWT/login flows

**Migration strategy for existing plaintext data:**
1. Add `_encrypted` suffix columns as nullable in a Drizzle migration
2. Run `scripts/encrypt-pii-migration.ts`: read all rows, encrypt values, write to `_encrypted` columns
3. Second migration: drop original columns, rename `_encrypted` → original names
4. This is a 3-step migration to avoid zero-downtime data loss

**Key management:** `PII_ENCRYPTION_KEY` env var (32-byte hex, set in Vercel env). Rotate by re-running migration script with new key.

**Example:**

```typescript
// apps/web/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.PII_ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encryptPII(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12):tag(16):ciphertext — base64 encoded
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPII(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
```

---

### Pattern 6: Super-Admin Impersonation JWT

**What:** Platform admin issues a short-lived JWT (15 min, non-renewable) with an additional `impersonatedBy` claim containing the admin's user_id. The impersonated user's regular claims populate the rest of the token.

**Storage:** The impersonation session is NOT stored in the Redis blacklist — it expires naturally. An audit log record is written to `audit_logs` on impersonation start and end.

**Middleware detection:**

```typescript
// apps/web/middleware.ts — impersonation banner injection
if (decoded.impersonatedBy) {
  request.headers.set('x-impersonation', 'true');
  request.headers.set('x-impersonated-by', decoded.impersonatedBy);
}
```

**Security constraints:**
- Only `role === 'platform_admin'` can call `POST /api/v1/admin/impersonate`
- Impersonation tokens cannot be refreshed (no refresh token issued)
- Impersonation cannot be nested (cannot impersonate while impersonating)
- Token duration: 15 min hard limit, embedded in JWT `exp` claim

---

### Pattern 7: Feature Flags Storage

**What:** Feature flags are stored in a `feature_flags` PostgreSQL table (not Redis) because they require persistence across deployments and support company-scoped overrides.

**Read path:** On every request, feature flags are read from Upstash Redis cache (TTL: 60s) with PostgreSQL as fallback. This avoids a DB query on every API route invocation.

**Schema:**
```sql
CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  flag_key VARCHAR(100) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  company_id INTEGER REFERENCES companies(id),  -- NULL = global
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Trade-offs:** Company-scoped overrides allow gradual rollout to specific tenants. Global flags apply to all companies when company_id is NULL. Redis cache prevents DB reads on hot paths.

---

### Pattern 8: OpenTelemetry Instrumentation

**What:** Use `@vercel/otel` package which provides an Edge-compatible SDK, exporting traces over HTTP to any OTLP-compatible collector (or Vercel's native telemetry dashboard).

**Setup:** Single `instrumentation.ts` file in the project root (not inside `app/`). For Next.js 14, requires `experimental.instrumentationHook: true` in `next.config.ts`.

```typescript
// instrumentation.ts (root level)
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'schedulebox-web' });
}
```

**What gets traced automatically:** All App Router `GET`/`POST` handler invocations, fetch calls made within handlers, middleware execution time.

**Manual spans for critical paths:** Booking creation, payment processing, PII encryption/decryption operations.

---

### Pattern 9: DB Partitioning via Raw SQL Migrations

**What:** Partition `analytics_events` and `audit_logs` by month (RANGE partitioning on `created_at`). Drizzle ORM does not support partition declaration in its schema DSL as of March 2026 — raw SQL in migration files is required.

**Migration approach:**
1. Drizzle migration: rename existing table to `_old` suffix
2. Raw SQL block in migration: `CREATE TABLE analytics_events (LIKE analytics_events_old) PARTITION BY RANGE (created_at)`
3. Raw SQL: create initial partitions for past 6 months + next 3 months
4. Raw SQL: `INSERT INTO analytics_events SELECT * FROM analytics_events_old`
5. Drizzle migration: drop `_old` table

**Partition naming convention:** `analytics_events_y2026m03` (year + month)

**Automation:** Monthly cron (Vercel Cron Jobs, free tier) creates the next month's partition 7 days in advance.

**Drizzle query compatibility:** Drizzle queries against the parent table `analytics_events` — PostgreSQL routes to the correct partition transparently. No Drizzle schema changes needed for querying.

---

## Data Flow Changes for v3.0

### Booking Creation Flow (Current → v3.0)

```
CURRENT:
POST /api/v1/bookings
  → Zod validate
  → SELECT FOR UPDATE (pg Pool)
  → INSERT booking
  → publishEvent(booking.created) → RabbitMQ → notification-worker → email

v3.0:
POST /api/v1/bookings
  → Zod validate
  → SELECT FOR UPDATE (Neon WebSocket driver for tx isolation)
  → INSERT booking
  → publishEvent(booking.created) → no-op log
  → sendNotificationDirectly(booking) → SMTP/Twilio inline
  → INSERT analytics_event inline
  → INSERT loyalty_transaction inline (if customer has card)
```

The notification, analytics, and loyalty writes were already inline in v2.0 based on the Railway deployment. The no-op publishEvent change formalizes this.

### PII Read/Write Flow (New in v3.0)

```
WRITE (customer create/update):
  Client → API route → Zod validate → encryptPII(phone, email) → Drizzle INSERT

READ (customer list/detail):
  Drizzle SELECT → decryptPII(phone, email) → return to client

SEARCH BY EMAIL:
  Hash email client-side (or in API) → query customers WHERE email_hash = $1
  → return row → decryptPII(email) for display
```

### Real-Time Booking Updates Flow (New in v3.0)

```
Booking status change (confirm/cancel/complete):
  POST /api/v1/bookings/[id]/status → DB update → write event to pending_sse_events table

Dashboard SSE connection:
  GET /api/v1/stream?company_id=X → ReadableStream
    → poll pending_sse_events WHERE company_id=X AND delivered=false every 5s
    → emit SSE data: event type + booking id
    → mark delivered=true
    → client EventSource receives → TanStack Query invalidate
```

Alternatively (simpler): dashboard uses `refetchInterval: 15000` on TanStack Query for booking lists. SSE is only needed if sub-5-second latency is a hard requirement.

---

## Integration Points: New Components

| New Component | Touches | Method | Notes |
|---------------|---------|--------|-------|
| `instrumentation.ts` | All API routes | Auto-instrumented by @vercel/otel | No manual changes to route files |
| `lib/encryption.ts` | `customers` API routes (GET, POST, PUT) | Explicit wrap at DB boundary | Must decrypt before returning to client |
| `lib/redis.ts` (Upstash) | JWT blacklist, rate limit, availability cache | Drop-in for get/set/del/setex | No pub/sub — confirmed not used |
| `packages/events/publisher.ts` (no-op) | 16 files across booking/payments/loyalty/reviews | No changes at call sites | Preserves function signature |
| `api/v1/admin/impersonate` | Admin panel → middleware → all routes | New JWT claim `impersonatedBy` | Middleware must check this claim |
| `api/v1/admin/feature-flags` | Admin panel, feature-flag middleware | PostgreSQL + Redis cache | Cache TTL 60s prevents hot-path DB reads |
| `api/v1/stream` | Dashboard client (EventSource) | ReadableStream SSE | Requires `runtime = 'nodejs'`, `dynamic = 'force-dynamic'` |
| DB partitioning migrations | `analytics_events`, `audit_logs` | Raw SQL in Drizzle migration file | Transparent to Drizzle queries post-migration |

---

## Integration Points: Modified Components

| Modified Component | What Changes | Backward Compatible? |
|--------------------|-------------|---------------------|
| `packages/events/src/publisher.ts` | No RabbitMQ connection, returns immediately | YES — same function signature |
| `packages/database/src/db.ts` | neon() driver instead of pg Pool | YES — Drizzle query API unchanged |
| `apps/web/lib/redis.ts` | @upstash/redis instead of ioredis | YES — same get/set/del/setex patterns |
| `apps/web/middleware.ts` | Maintenance mode check + CSRF header | Additive — no existing behavior removed |
| `next.config.ts` | `experimental.instrumentationHook: true` | YES — additive config flag |
| `customers` API routes | PII encrypt/decrypt at DB boundary | YES for output shape; migration required for stored data |

---

## Build Order (Dependency-Respecting)

The 32 gaps fall into the following dependency layers. Phases must respect this order:

### Layer 0 — Infrastructure (no dependencies)
Must happen first. Blocks everything else.

1. **RabbitMQ removal** — change `packages/events/src/publisher.ts` to no-op. This unblocks local development without RabbitMQ and is required before Vercel deployment.
2. **Neon driver swap** — change `packages/database/src/db.ts`. Required before any DB queries work on Vercel.
3. **Upstash Redis swap** — change `apps/web/lib/redis.ts`. Required before auth (JWT blacklist), rate limiting, and caching work on Vercel.
4. **Environment variable update** — `.env.example` updated with `DATABASE_URL` (Neon), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `PII_ENCRYPTION_KEY`, `NEXT_PUBLIC_SENTRY_DSN`.

### Layer 1 — Security Foundation (depends on Layer 0)
Builds on stable infra. Can run in parallel across security work items.

5. **PII encryption lib** — `lib/encryption.ts` (pure Node.js crypto, no deps)
6. **PII migration script** — encrypt existing customer data before going live
7. **CSRF middleware** — add to `middleware.ts` (reads existing cookie)
8. **SSRF protection** — `lib/ssrf-guard.ts` + apply to webhook URL validation
9. **HIBP password check** — new function called from auth registration route
10. **DOMPurify XSS** — add `isomorphic-dompurify` where HTML is rendered (notification templates)

### Layer 2 — Observability (depends on Layer 0)
Can run in parallel with Layer 1.

11. **OpenTelemetry** — `instrumentation.ts` + `next.config.ts` flag
12. **Sentry SDK** — `@sentry/nextjs` init in instrumentation file or `_app.tsx` equivalent

### Layer 3 — Super-Admin Features (depends on Layer 0 + Layer 1 security)
Needs stable auth and DB connectivity.

13. **Impersonation API** — `api/v1/admin/impersonate` + middleware claim
14. **Feature flags** — `admin.ts` schema + `api/v1/admin/feature-flags` + cache layer
15. **Maintenance mode** — Redis flag + middleware check
16. **Broadcast messages** — `api/v1/admin/broadcast` + schema
17. **Audit log viewer** — frontend component reading existing `audit_logs` table
18. **Company suspend** — extend existing company deactivation with suspension state

### Layer 4 — Real-Time & Missing Pages (depends on Layer 0)
Mostly independent of security features.

19. **SSE endpoint** — `api/v1/stream` route
20. **Dashboard EventSource client** — component subscribes to SSE
21. **Cookie policy page** — `/[locale]/cookie-policy` (frontend only)
22. **Webhooks settings UI** — `/[locale]/(dashboard)/settings/webhooks` (frontend only)
23. **Video meetings UI** — `/[locale]/(dashboard)/bookings/[id]/video` (frontend only)

### Layer 5 — Industry Verticals (depends on Layer 0 + DB schema)
Needs stable DB connection.

24. **Medical/automotive schema fields** — Drizzle migration adding nullable columns
25. **Per-industry UI labels** — i18n key additions (cs.json/sk.json/en.json)
26. **Per-industry AI config** — extend AI service config JSON

### Layer 6 — Testing & DB Optimization (depends on Layers 0-5)
Tests validate the above; partitioning is low-risk but complex.

27. **Vitest unit test coverage to 80%** — covers encryption, feature flags, impersonation
28. **Playwright E2E for critical flows** — booking, payment, admin impersonation
29. **Storybook component catalog** — independent of runtime
30. **Contract tests** — validate API response shapes
31. **DB partitioning migration** — raw SQL migration for analytics_events + audit_logs
32. **Integration tests** — Neon + Upstash compatibility verification

---

## Scaling Considerations

| Scale | Architecture Approach |
|-------|-----------------------|
| Current (100-1K users) | Vercel Hobby tier — 10s function timeout sufficient for most routes; move booking/payment to Pro for 60s timeout |
| 1K-10K users | Vercel Pro tier — 60s timeout; Neon connection pooling handles concurrent queries; Upstash free tier handles rate limiting |
| 10K+ users | Consider Vercel Fluid Compute (up to 800s, warm instances); Neon read replicas for analytics queries; separate analytics writes to dedicated partition |

**First bottleneck at SMB scale:** Availability engine queries (multiple JOINs for slot calculation). Mitigate with Redis cache for slot windows (already implemented in v1.0).

**Second bottleneck:** Analytics writes during peak booking hours. Mitigate with DB partitioning (Layer 6) which reduces index scan scope on `analytics_events`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Conditional publishEvent

**What people do:** Wrap every `publishEvent` call with `if (process.env.RABBITMQ_URL)` to make it optional.

**Why it's wrong:** Creates two code paths, complicates testing, and the condition will never be true on Vercel — making it permanent dead code.

**Do this instead:** Replace the `publishEvent` function body itself with a no-op. Call sites remain unchanged. The function contract (signature, return type) is preserved.

---

### Anti-Pattern 2: pg Pool for Vercel Serverless

**What people do:** Keep the existing `pg.Pool` and assume connection reuse works.

**Why it's wrong:** Vercel serverless functions are stateless. Each cold start opens a new TCP connection to Neon. Neon's default connection limit is 100; a traffic spike creates 100 simultaneous connections and every subsequent invocation fails with `too many connections`.

**Do this instead:** Use `@neondatabase/serverless` neon() for HTTP transport. Reserve WebSocket/Pool only for routes requiring `SELECT FOR UPDATE`.

---

### Anti-Pattern 3: Storing Impersonation State in Redis

**What people do:** Create a Redis session for impersonation to track active impersonations.

**Why it's wrong:** Redis session adds complexity, requires cleanup logic, and the TTL expiry approach on the JWT itself is simpler and more auditable.

**Do this instead:** Short-lived JWT (15 min) with `impersonatedBy` claim. No server-side state needed. Write audit log on issue; JWT expiry handles cleanup automatically.

---

### Anti-Pattern 4: Encrypting Email Used for Auth

**What people do:** Encrypt `users.email` as part of PII hardening.

**Why it's wrong:** `users.email` is used as the login identifier — the auth system must query `WHERE email = $1`. Encrypting it would require decrypting every row to find a match (full table scan) or maintaining a separate hash index.

**Do this instead:** Encrypt only `customers.phone`, `customers.email` (customer records separate from user accounts). For `customers.email` lookups by value, maintain a `customers.email_hash` column (SHA-256, indexed, non-reversible) for equality queries.

---

### Anti-Pattern 5: Drizzle Schema DSL for Partitioned Tables

**What people do:** Try to declare `PARTITION BY RANGE` in Drizzle schema TypeScript.

**Why it's wrong:** Drizzle ORM does not support partition declarations in schema DSL as of March 2026 (GitHub issue #2854 open, not merged). Using `drizzle-kit push` or `drizzle-kit generate` on a partitioned table will generate incorrect DDL.

**Do this instead:** Declare the parent table in Drizzle schema as a normal table (for type inference). Create the actual partitioned table and its child partitions via raw SQL in a migration file using Drizzle's `sql` template tag or a separate `.sql` file included in the migration sequence.

---

## External Service Integration Points

| Service | Integration Pattern | Vercel Constraint | Notes |
|---------|--------------------|--------------------|-------|
| Neon PostgreSQL | `@neondatabase/serverless` HTTP driver | No persistent TCP | Use WebSocket driver for SELECT FOR UPDATE only |
| Upstash Redis | REST HTTP via `@upstash/redis` | No persistent connections | Does not support pub/sub or Lua scripts |
| Comgate Payments | HTTP webhook POST to `/api/v1/webhooks/comgate` | 60s function timeout sufficient | Webhook must respond within 30s — well within limit |
| Twilio SMS | HTTP API call within API route | No background workers | Called synchronously inside booking confirmation route |
| SMTP Email | Nodemailer SMTP call within API route | 60s timeout, watch for cold start | Consider Resend or SendGrid HTTP API to avoid SMTP auth latency |
| OpenAI API | HTTP call to AI service | 60s timeout may be tight for complex prompts | Add `maxDuration: 60` to AI prediction routes; use streaming where possible |
| @vercel/otel | OTLP HTTP export | Native Vercel integration | Zero configuration if using Vercel Observability dashboard |
| Sentry | `@sentry/nextjs` SDK | Native Vercel integration | Wrap API routes with Sentry.wrapApiHandlerWithSentry |

---

## Sources

- [Neon Serverless Driver Docs](https://neon.com/docs/serverless/serverless-driver) — HIGH confidence (official)
- [Drizzle + Neon Integration](https://orm.drizzle.team/docs/connect-neon) — HIGH confidence (official)
- [Upstash Redis for Vercel](https://vercel.com/marketplace/upstash) — HIGH confidence (official)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) — HIGH confidence (official)
- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry) — HIGH confidence (official)
- [Next.js Instrumentation Guide](https://nextjs.org/docs/pages/guides/instrumentation) — HIGH confidence (official)
- [Drizzle PostgreSQL Partition Feature Request](https://github.com/drizzle-team/drizzle-orm/issues/2854) — HIGH confidence (confirms no native support)
- [Drizzle Column Encryption Feature Request](https://github.com/drizzle-team/drizzle-orm/issues/2098) — HIGH confidence (confirms no native support)
- [SSE Streaming in Next.js/Vercel](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) — MEDIUM confidence (community)
- [RabbitMQ on Vercel Discussion](https://github.com/vercel/next.js/discussions/69776) — HIGH confidence (confirms RabbitMQ not viable on Vercel)

---

_Architecture research for: ScheduleBox v3.0 Production Launch & 100% Documentation Coverage_
_Researched: 2026-03-16_

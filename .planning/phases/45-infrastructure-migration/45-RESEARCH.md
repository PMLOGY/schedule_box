# Phase 45: Infrastructure Migration - Research

**Researched:** 2026-03-16
**Domain:** Vercel deployment, Neon PostgreSQL, Upstash Redis, RabbitMQ removal, CVE patch, billing bug fix
**Confidence:** HIGH (all migration patterns verified against official Neon/Upstash/Vercel docs in prior milestone research; code findings verified by direct file inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- RabbitMQ full cleanup: remove amqplib package, delete consumer.ts, neutralize publisher.ts body as no-op
- All 38 publishEvent call sites remain unchanged — only publisher.ts body changes
- Database: @vercel/postgres / @neondatabase/serverless for production; local PostgreSQL for dev; Drizzle ORM stays
- Two connection modes: pooled for runtime queries, direct/unpooled for drizzle-kit migrations
- Redis: @upstash/redis directly (not Vercel KV); same Upstash instance for dev and prod; swap ioredis in apps/web/lib/redis/client.ts
- Next.js must be >=14.2.25 for CVE-2025-29927 patch
- Bug fix: settings/billing/page.tsx line 385 hardcoded maxBookingsPerMonth: 0 must be fixed via formatFeatureValue() rendering Infinity as "Unlimited"
- Vercel deploy: auto-deploy on push to main, schedulebox.vercel.app, env vars in Vercel dashboard
- AI inference: move to Vercel Python functions; model training stays in GitHub Actions
- Notification-worker: Claude decides simplest path (remove or convert to Vercel Cron)
- Export existing local DB to Vercel Postgres (pg_dump + import)

### Claude's Discretion
- Exact Upstash Redis client initialization pattern (REST vs SDK)
- How to handle Drizzle ORM driver swap (conditional import vs environment detection)
- Vercel build configuration (output: standalone, env validation)
- Whether to keep services/notification-worker or remove it entirely
- Whether to use @vercel/python for AI inference or another approach
- Silent no-op vs console.log stub for publishEvent

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | publishEvent becomes safe no-op — app boots without RabbitMQ | publisher.ts fully mapped: replace entire function body, preserve signature, remove amqplib, delete consumer.ts |
| INFRA-02 | PostgreSQL migrated to Neon serverless (pooled + direct URLs) | db.ts uses postgres.js with max:10 TCP pool — swap to neon() HTTP driver; drizzle.config.ts uses DATABASE_URL (needs UNPOOLED variant) |
| INFRA-03 | Redis migrated to Upstash (HTTP transport, drop-in for get/set/incr/expire) | client.ts uses ioredis TCP — swap to @upstash/redis; 9 call sites confirmed compatible (get/set/del/setex/incr/expire only) |
| INFRA-04 | App deployed to Vercel with production env vars and DNS | next.config.mjs already has output: 'standalone'; serverExternalPackages needs ioredis removed, amqplib removed |
| INFRA-05 | Next.js patched to >=14.2.25 (CVE-2025-29927 middleware bypass fix) | package.json shows ^15.5.10 — already exceeds minimum; INFRA-05 is ALREADY SATISFIED, needs verification only |
| FIX-01 | AI-Powered plan shows unlimited bookings capacity (not 0) | formatFeatureValue() at line 312 already handles Infinity correctly; bug is in fallback object at line 385 with hardcoded maxBookingsPerMonth: 0 |
</phase_requirements>

---

## Summary

Phase 45 is a focused infrastructure swap: three package migrations (amqplib → no-op, postgres.js → @neondatabase/serverless, ioredis → @upstash/redis), a Vercel deployment configuration, and one UI bug fix. The codebase is already structured to make these swaps surgical — each infrastructure concern is isolated in a single file.

The most critical finding is that **INFRA-05 is already satisfied**: the package.json shows `^15.5.10` which far exceeds the `>=14.2.25` CVE-2025-29927 minimum. The task becomes verification, not upgrade. The bug fix (FIX-01) is similarly minimal: `formatFeatureValue()` already handles `Infinity` correctly at line 312, but the fallback object at line 385 hardcodes `maxBookingsPerMonth: 0` when the API has not loaded — so the AI-Powered plan shows "0" when plans are still fetching. The fix is a one-line change.

The RabbitMQ removal requires understanding the call site classification: the architecture research confirms all 16 files with publishEvent calls are fire-and-forget (analytics, notifications, loyalty points, payment saga status logging). The actual payment charging and booking state transitions happen synchronously in DB writes — they do not depend on RabbitMQ delivery. The no-op is safe.

**Primary recommendation:** Execute migrations in order — publisher.ts no-op first (unblocks build), then db.ts Neon swap, then redis client.ts Upstash swap, then Vercel deploy config, then FIX-01.

---

## Standard Stack

### Core Migration Packages

| Library | Version | Purpose | Install Location |
|---------|---------|---------|-----------------|
| @neondatabase/serverless | 1.0.2 | Neon HTTP + WebSocket driver for serverless Postgres | packages/database |
| drizzle-orm/neon-http | (bundled with drizzle-orm 0.36.4) | Drizzle adapter for Neon HTTP transport | packages/database |
| @upstash/redis | 1.37.0 | HTTP REST Redis client for serverless | apps/web |

### Packages to Remove

| Package | Location | Why Removed |
|---------|----------|-------------|
| amqplib | packages/events | RabbitMQ replaced with no-op |
| ioredis | apps/web | TCP socket incompatible with Vercel serverless |
| postgres | packages/database | TCP pool replaced by Neon HTTP driver |

### Already Satisfied (No Action)

| Requirement | Status | Evidence |
|------------|--------|---------|
| INFRA-05 (CVE patch) | Already done | apps/web/package.json `"next": "^15.5.10"` — exceeds 14.2.25 minimum |
| output: standalone | Already set | apps/web/next.config.mjs line 11 |
| formatFeatureValue Infinity handling | Already correct | billing/page.tsx line 312 checks `v === Infinity \|\| v > 99999` |

### Installation

```bash
# Add Neon driver to packages/database
pnpm --filter @schedulebox/database add @neondatabase/serverless@1.0.2
pnpm --filter @schedulebox/database remove postgres

# Add Upstash Redis to apps/web
pnpm --filter @schedulebox/web add @upstash/redis@1.37.0
pnpm --filter @schedulebox/web remove ioredis

# Remove amqplib from packages/events
pnpm --filter @schedulebox/events remove amqplib
```

---

## Architecture Patterns

### Recommended Project Structure (delta only)

```
packages/
├── events/src/
│   ├── publisher.ts          MODIFIED — amqplib removed, publishEvent = no-op
│   ├── consumer.ts           DELETED — RabbitMQ consumer no longer needed
│   └── index.ts              MODIFIED — remove consumer exports
└── database/src/
    └── db.ts                 MODIFIED — postgres.js → @neondatabase/serverless

apps/web/
├── lib/redis/
│   └── client.ts             MODIFIED — ioredis → @upstash/redis
├── next.config.mjs           MODIFIED — remove ioredis from serverExternalPackages
└── app/api/readiness/
    └── route.ts              MODIFIED — remove RABBITMQ_URL check, update REDIS_URL check

.env.example                  MODIFIED — add Upstash vars, rename REDIS_URL → UPSTASH_REDIS_REST_URL

packages/database/
└── drizzle.config.ts         MODIFIED — use DATABASE_URL_UNPOOLED for migrations
```

---

### Pattern 1: Safe No-Op publishEvent

**What:** Replace the entire body of `publishEvent()` in `packages/events/src/publisher.ts`. Keep the function signature identical (`<T>(event: CloudEvent<T>): Promise<void>`). Remove all amqplib imports, singleton connection/channel variables, retry logic, and `getChannel()`.

**Why safe:** All 16 call sites across the codebase are fire-and-forget. The payment SAGA handlers (booking-payment-handlers.ts, payment-timeout.ts) call publishEvent after their synchronous DB writes have already committed — the events were logging signals to RabbitMQ consumers that have been replaced by inline logic in v2.0. Confirmed by architecture research: "The notification, analytics, and loyalty writes were already inline in v2.0 based on the Railway deployment."

**Also update:** `packages/events/src/index.ts` must remove consumer exports (`createConsumerConnection`, `consumeMessages`, `gracefulShutdown`) since consumer.ts is being deleted. The CloudEvent type exports, domain event factory functions, and `createCloudEvent` utility can remain.

**Example:**
```typescript
// packages/events/src/publisher.ts
import { randomUUID } from 'node:crypto';
import type { CloudEvent } from './types';

export async function publishEvent<T>(event: CloudEvent<T>): Promise<void> {
  // RabbitMQ removed for Vercel deployment.
  // All downstream actions (notifications, loyalty, analytics) are
  // handled synchronously within the API route that creates the event.
  console.log('[events] no-op publish:', event.type, event.subject ?? '');
  return Promise.resolve();
}

export function createCloudEvent<T>(
  type: string,
  source: string,
  data: T,
  subject?: string,
): CloudEvent<T> {
  return {
    specversion: '1.0',
    type,
    source,
    id: randomUUID(),
    time: new Date().toISOString(),
    subject,
    datacontenttype: 'application/json',
    data,
  };
}

export async function closeConnection(): Promise<void> {
  return Promise.resolve();
}

export function createEventPublisher() {
  return { publishEvent, createCloudEvent, closeConnection };
}

export function validateCloudEvent<T>(event: CloudEvent<T>): string | null {
  if (!event) return 'Event is null or undefined';
  if (event.specversion !== '1.0') return `Invalid specversion: ${event.specversion}`;
  if (!event.type) return 'Missing event type';
  if (!event.source) return 'Missing event source';
  if (!event.id) return 'Missing event id';
  return null;
}
```

---

### Pattern 2: Neon Serverless DB Driver

**What:** Replace `postgres.js` + `drizzle-orm/postgres-js` in `packages/database/src/db.ts` with `@neondatabase/serverless` + `drizzle-orm/neon-http`. Maintain the lazy Proxy pattern already in place.

**Two transport modes are needed:**
- `neon()` + `drizzle-orm/neon-http` — for all standard queries (HTTP, stateless, zero connection overhead)
- `Pool` from `@neondatabase/serverless` + `drizzle-orm/neon-serverless` — for routes requiring `SELECT FOR UPDATE` (booking double-booking prevention in booking-service.ts)

**Critical: drizzle.config.ts must use `DATABASE_URL_UNPOOLED`** — Neon's PgBouncer pooler runs in transaction mode and does not support session-scoped SQL that drizzle-kit uses during migrations. The current `drizzle.config.ts` reads `process.env.DATABASE_URL` — this must change to `DATABASE_URL_UNPOOLED`.

**Example:**
```typescript
// packages/database/src/db.ts
import { neon, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _dbTx: ReturnType<typeof drizzleWs<typeof schema>> | null = null;

function getConnectionUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is required');
  return url;
}

// Standard queries — HTTP transport
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const sql = neon(getConnectionUrl());
      _db = drizzle(sql, { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});

// Transaction queries requiring SELECT FOR UPDATE — WebSocket transport
export const dbTx = new Proxy({} as ReturnType<typeof drizzleWs<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_dbTx) {
      const pool = new Pool({ connectionString: getConnectionUrl() });
      _dbTx = drizzleWs({ client: pool, schema });
    }
    return Reflect.get(_dbTx, prop, receiver);
  },
});

export type Database = ReturnType<typeof drizzle<typeof schema>>;
```

Note: `getMigrationClient()` export can be removed since migrations now use `DATABASE_URL_UNPOOLED` through drizzle.config.ts directly.

---

### Pattern 3: Upstash Redis HTTP Client

**What:** Replace `ioredis` with `@upstash/redis` in `apps/web/lib/redis/client.ts`. The current file uses a lazy Proxy pattern — maintain it.

**API compatibility:** All 9 call sites use `get`, `set`, `del`, `setex`, `incr`, `expire` — all supported identically by `@upstash/redis`. The key difference:
- ioredis: `redis.setex(key, ttl, value)`
- @upstash/redis: `redis.set(key, value, { ex: ttl })` — setex maps to set with `{ ex }` option

Check each call site for `setex` — if any exists, it needs to change to `set(key, value, { ex: ttl })`.

**No `process.on('beforeExit')` cleanup needed** — HTTP connections have no persistent socket to close.

**Environment variable change:** `REDIS_URL` → `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Update `.env.example` and readiness route.

**Example:**
```typescript
// apps/web/lib/redis/client.ts
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

function createRedisClient(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    if (!_redis) {
      _redis = createRedisClient();
    }
    return Reflect.get(_redis, prop, receiver);
  },
});
```

---

### Pattern 4: next.config.mjs Updates for Vercel

**What changes:** Remove `ioredis` from `serverExternalPackages`. Remove `amqplib` and any other RabbitMQ-related packages. The existing `output: 'standalone'` is correct for Vercel.

**Do NOT add `experimental.instrumentationHook: true`** — that was needed for Next.js 14; Next.js 15 supports instrumentation.ts natively without the flag.

**Verify `@opentelemetry/sdk-node` in serverExternalPackages** — it is currently listed. This is correct — keep it to prevent edge runtime bundling errors.

After changes:
```javascript
serverExternalPackages: [
  'pdfkit',
  '@react-pdf/renderer',
  'argon2',
  // 'ioredis', ← REMOVE
  'jsonwebtoken',
  'otplib',
  'opossum',
  'handlebars',
  'google-auth-library',
  'passkit-generator',
  'drizzle-orm',
  '@schedulebox/database',
  '@opentelemetry/sdk-node',
  '@opentelemetry/api',
  '@opentelemetry/instrumentation',
  'require-in-the-middle',
  '@neondatabase/serverless', // ADD — native module, prevent bundling issues
],
```

---

### Pattern 5: FIX-01 — Billing Page Fallback Bug

**Root cause confirmed:** `formatFeatureValue()` at line 312 correctly handles `Infinity`:
```typescript
if (v === Infinity || v > 99999) {
  return t('features.unlimited');
}
```

The bug is in the **fallback object** at lines 378-391. When the plans API has not yet loaded but `plans` is truthy (partially populated), and a plan is not found in the API response, the code creates a stub object with `maxBookingsPerMonth: 0`. When the AI-Powered plan is the missing one, it renders "0" instead of "Unlimited".

**Fix strategy:** The fallback object should use `PLAN_CONFIG` values instead of hardcoded zeros. Import `PLAN_CONFIG` from `@schedulebox/shared` in the billing page and use it for the fallback:

```typescript
import { PLAN_CONFIG } from '@schedulebox/shared';

// Replace fallback object at line 378:
plans.find((p) => p.key === key) || {
  key,
  name: PLAN_CONFIG[key as SubscriptionPlan]?.name ?? key,
  price: PLAN_CONFIG[key as SubscriptionPlan]?.price ?? 0,
  priceAnnual: PLAN_CONFIG[key as SubscriptionPlan]?.priceAnnual ?? 0,
  currency: 'CZK',
  features: PLAN_CONFIG[key as SubscriptionPlan]?.features ?? {
    maxBookingsPerMonth: 0,
    maxEmployees: 0,
    maxServices: 0,
    aiFeatures: false,
  },
},
```

This ensures the AI-Powered plan's `Infinity` value flows through `formatFeatureValue()` correctly.

---

### Pattern 6: Readiness Route Update

**Current state:** The readiness route checks `REDIS_URL` and `RABBITMQ_URL` env vars. After migration:
- Replace `REDIS_URL` check with `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` checks
- Remove the RabbitMQ check entirely (or convert to a no-op informational check)
- Consider adding an actual Neon query ping (e.g., `SELECT 1`) to properly verify DB connectivity

---

### Pattern 7: Notification Worker Decision

**Recommendation: Remove `services/notification-worker/` entirely for this phase.**

Rationale:
1. Architecture research confirms notifications are already sent inline via synchronous API route calls (v2.0 change)
2. The notification-worker relied on RabbitMQ queue consumption — without RabbitMQ there is nothing to consume
3. Phase 47 (Notifications) will wire email/SMS directly as inline calls — this is the proper replacement
4. Keeping the dead service creates maintenance confusion

**AI Service:** `services/ai/` — defer Vercel Python functions migration to a separate sub-task or Phase 49. For Phase 45, the AI service can remain as a standalone service (not deployed to Vercel) or be disabled. The primary Vercel deployment goal does not require the AI service to be on Vercel in Phase 45.

---

### Anti-Patterns to Avoid

- **Conditional publishEvent by env var**: Do not add `if (process.env.RABBITMQ_URL)` guards. Replace the function body entirely.
- **Pooled URL for drizzle-kit migrations**: Never use `DATABASE_URL` (pooled, with `-pooler` hostname) for `drizzle-kit migrate`. Always `DATABASE_URL_UNPOOLED`.
- **Keeping ioredis in serverExternalPackages**: It must be removed from both `package.json` and `serverExternalPackages` — it will fail at Vercel build otherwise.
- **ephemeralCache in rate limiter**: If any rate-limiting code uses `new Map()` as cache, remove it — the Map does not persist between serverless invocations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serverless Redis | Custom HTTP Redis wrapper | @upstash/redis | Full Redis command coverage, typed, maintained |
| Neon HTTP queries | Raw fetch() to Neon HTTP API | @neondatabase/serverless | Connection management, query building, error handling |
| CloudEvent no-op | Complex feature flag system | Simple console.log stub | All call sites are fire-and-forget; stub is sufficient |

---

## Common Pitfalls

### Pitfall 1: Pooled URL Used for Drizzle Migrations
**What goes wrong:** Neon's PgBouncer (pooled URL) runs in transaction pooling mode. `drizzle-kit migrate` uses session-scoped SQL commands that fail silently or hang against the pooled connection.
**How to avoid:** `drizzle.config.ts` must reference `DATABASE_URL_UNPOOLED`. Commit `.env.example` with both vars documented.
**Warning signs:** `drizzle-kit push` hangs; `prepared statement does not exist` errors; migrations show pending after running.

### Pitfall 2: ioredis Not Fully Purged
**What goes wrong:** Vercel build fails with native module errors if `ioredis` is still in `package.json` or `serverExternalPackages`.
**How to avoid:** Remove from both `apps/web/package.json` AND `apps/web/next.config.mjs`'s `serverExternalPackages` array. Run `pnpm --filter @schedulebox/web remove ioredis`.
**Warning signs:** Vercel build error mentioning `ioredis`, `hiredis`, or native `.node` module loading.

### Pitfall 3: setex Call Sites Broken After Upstash Migration
**What goes wrong:** `@upstash/redis` does not have a `setex()` method. Calling `redis.setex(key, ttl, value)` throws at runtime.
**How to avoid:** Grep for `setex` across all 9 Redis call sites. Replace `redis.setex(key, ttl, val)` with `redis.set(key, val, { ex: ttl })`.
**Warning signs:** `redis.setex is not a function` runtime error in auth routes.

### Pitfall 4: consumer.ts Exports Break Build After Deletion
**What goes wrong:** `packages/events/src/index.ts` exports `createConsumerConnection`, `consumeMessages`, `gracefulShutdown` from `./consumer`. If consumer.ts is deleted without updating index.ts, the package build fails.
**How to avoid:** Update index.ts to remove all consumer-related exports before or simultaneously with deleting consumer.ts.
**Warning signs:** TypeScript error "Cannot find module './consumer'" during build.

### Pitfall 5: INFRA-05 Verification Confusion
**What goes wrong:** The requirement says "patch Next.js to >=14.2.25" but the codebase is already at ^15.5.10. Someone might try to downgrade, or mark as incomplete because no code change was made.
**How to avoid:** INFRA-05 requires verification, not upgrade. Confirm `npm list next` in the deployed Vercel build shows >=14.2.25. Add a build step note documenting this.
**Warning signs:** Time spent "upgrading" an already-patched version.

### Pitfall 6: next.config.mjs output: standalone Conflict with Vercel
**What goes wrong:** Vercel automatically handles Next.js deployment — the `output: 'standalone'` mode generates a self-contained Node.js server suitable for Docker, not Vercel's native deployment. Vercel may still work with it but it creates unnecessary bundling overhead.
**How to avoid:** For Vercel-native deployment, remove `output: 'standalone'` from next.config.mjs. Vercel detects Next.js automatically and builds it correctly without standalone output mode. Standalone is needed for Docker/self-hosted only.
**Warning signs:** Vercel build producing a `.next/standalone/` directory with unusually large bundle sizes; deployment warnings about output mode.

---

## Code Examples

### Verified: Publisher No-Op Pattern
```typescript
// Source: ARCHITECTURE.md Pattern 1 — confirmed safe for all 16 call sites
export async function publishEvent<T>(event: CloudEvent<T>): Promise<void> {
  console.log('[events] no-op publish:', event.type, event.subject ?? '');
  return Promise.resolve();
}
```

### Verified: Neon HTTP Driver (Standard Queries)
```typescript
// Source: official Neon + Drizzle docs (neon.com/docs/guides/drizzle)
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Verified: Neon WebSocket Pool (Transactions / SELECT FOR UPDATE)
```typescript
// Source: drizzle-orm/docs/connect-neon — for interactive transactions
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbTx = drizzle({ client: pool, schema });
```

### Verified: Upstash Redis HTTP Client
```typescript
// Source: upstash.com/docs/redis/tutorials/nextjs_with_redis
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### Verified: drizzle.config.ts with UNPOOLED URL
```typescript
// Source: PITFALLS.md Pitfall 2 — must use direct connection for migrations
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!, // NOT DATABASE_URL (pooled)
  },
  verbose: true,
  strict: true,
});
```

---

## Environment Variables

### Required New Variables

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint | Upstash dashboard → REST API tab |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token | Upstash dashboard → REST API tab |
| `DATABASE_URL` | Neon pooled connection string (runtime queries) | Neon dashboard → Connection string (pooled, `-pooler` hostname) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string (migrations only) | Neon dashboard → Connection string (direct, no `-pooler`) |

### Variables to Remove/Deprecate

| Variable | Reason |
|----------|--------|
| `REDIS_URL` | Replaced by Upstash vars |
| `RABBITMQ_URL` | RabbitMQ removed |

### Variables That Stay the Same

All existing JWT secrets, Comgate keys, SMTP config, Google OAuth, etc. remain unchanged.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| postgres.js TCP pool (max: 10) | @neondatabase/serverless HTTP | Eliminates connection exhaustion on cold start |
| ioredis TCP socket | @upstash/redis HTTP REST | Works in serverless without persistent connections |
| amqplib persistent AMQP connection | No-op function stub | Vercel-compatible; app boots without any external broker |
| Railway Docker deployment | Vercel serverless + Neon + Upstash | Managed infra, zero ops, auto-deploy on push |

**Already current:**
- Next.js 15.5.10 (exceeds CVE-2025-29927 fix requirement)
- output: 'standalone' (already set, may need removal for Vercel-native)
- formatFeatureValue Infinity handling (already implemented correctly)

---

## Open Questions

1. **Should `output: 'standalone'` be removed for Vercel-native deployment?**
   - What we know: Vercel deploys Next.js natively without needing standalone output; standalone is for Docker/self-hosted
   - What's unclear: Whether Vercel's build pipeline handles standalone correctly or adds overhead
   - Recommendation: Remove `output: 'standalone'` from next.config.mjs for the Vercel deployment; it was needed for the Railway Docker deployment but is not needed (and may be counterproductive) for Vercel-native

2. **AI service migration scope for Phase 45**
   - What we know: services/ai/ is a Python FastAPI service; Vercel supports Python functions via serverless
   - What's unclear: Whether Phase 45 should scope AI migration or defer to Phase 49
   - Recommendation: Defer AI service migration. Phase 45 goal is "app deploys to Vercel" — the AI service can remain as an optional external call. Mark AI_SERVICE_URL env var as optional in the readiness route.

3. **setex usage in Redis call sites**
   - What we know: @upstash/redis does not have setex(); current client uses ioredis setex() signature
   - What's unclear: Which of the 9 call sites use setex vs set
   - Recommendation: Grep for `redis.setex` across the codebase before writing the redis client replacement. Found sites need `set(key, val, { ex: ttl })` translation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected via vitest.config.ts) |
| Config file | apps/web/vitest.config.ts |
| Quick run command | `pnpm --filter @schedulebox/web test run` |
| Full suite command | `pnpm --filter @schedulebox/web test run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | publishEvent returns void without throwing | unit | `pnpm --filter @schedulebox/events test run` | ❌ Wave 0 |
| INFRA-01 | App builds without RABBITMQ_URL | build smoke | `pnpm build` in apps/web with no RABBITMQ_URL | manual |
| INFRA-02 | DB queries execute against Neon | integration | manual — requires Neon credentials | manual |
| INFRA-02 | drizzle.config.ts uses UNPOOLED var | unit/lint | grep check in CI | ❌ Wave 0 |
| INFRA-03 | Redis get/set/del/incr work via Upstash | integration | manual — requires Upstash credentials | manual |
| INFRA-04 | Vercel deployment succeeds, API routes 200 | e2e/smoke | manual post-deploy | manual |
| INFRA-05 | next version >= 14.2.25 | CI check | `node -e "require('next/package.json').version"` | manual |
| FIX-01 | AI-Powered plan shows "Unlimited" not "0" | unit | `pnpm --filter @schedulebox/web test run -- billing` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @schedulebox/web build` (build must pass)
- **Per wave merge:** Full test suite + build verification
- **Phase gate:** App deploys to Vercel with all API routes returning 200 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/events/src/__tests__/publisher.test.ts` — unit test that publishEvent no-op returns void without throwing, covers INFRA-01
- [ ] `apps/web/app/[locale]/(dashboard)/settings/billing/__tests__/billing.test.tsx` — unit test that formatFeatureValue renders Infinity as "Unlimited", covers FIX-01
- [ ] CI script: verify `DATABASE_URL_UNPOOLED` referenced in drizzle.config.ts — covers INFRA-02 migration safety

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `packages/events/src/publisher.ts` — full amqplib implementation mapped
- Direct file inspection: `packages/database/src/db.ts` — postgres.js lazy proxy pattern confirmed
- Direct file inspection: `apps/web/lib/redis/client.ts` — ioredis lazy proxy pattern confirmed
- Direct file inspection: `apps/web/next.config.mjs` — output:standalone confirmed, serverExternalPackages mapped
- Direct file inspection: `packages/shared/src/types/billing.ts` — PLAN_CONFIG.ai_powered.maxBookingsPerMonth = Infinity confirmed
- Direct file inspection: `apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx` — bug at line 385 confirmed; formatFeatureValue handles Infinity correctly at line 312
- Direct file inspection: `apps/web/package.json` — Next.js ^15.5.10 confirmed
- Direct file inspection: `packages/database/drizzle.config.ts` — uses DATABASE_URL (needs UNPOOLED)
- `.planning/research/STACK.md` — @upstash/redis 1.37.0, @neondatabase/serverless 1.0.2 versions, migration patterns — HIGH
- `.planning/research/ARCHITECTURE.md` — no-op pattern, Neon driver patterns, all 16 publishEvent files fire-and-forget classification — HIGH
- `.planning/research/PITFALLS.md` — pooled URL migration trap, ioredis purge, rate limiter ephemeralCache — HIGH

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` sources: Neon + Drizzle official docs, Upstash + Vercel integration docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages and versions verified, existing code patterns read directly
- Architecture: HIGH — all critical files read, patterns confirmed against prior research
- Pitfalls: HIGH — directly tied to observed code state (e.g., INFRA-05 already satisfied, drizzle.config.ts uses DATABASE_URL not UNPOOLED)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (Neon/Upstash APIs stable; @vercel/postgres pattern stable)

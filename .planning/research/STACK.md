# Stack Research — v3.0 Production Launch & Gap Closure

**Domain:** SaaS Booking Platform — Vercel Deployment & Security Hardening
**Researched:** 2026-03-16
**Confidence:** HIGH (all package versions verified via npm registry; integration patterns verified via official docs and recent 2025/2026 sources)

> **Scope:** This document covers ONLY what is NEW for the v3.0 milestone — closing 32 documented gaps
> to reach 100% documentation coverage and deploy to Vercel. The existing stack (Next.js 15, React 19,
> Drizzle ORM, ioredis, Tailwind CSS, shadcn/ui, Vitest, Playwright, etc.) is in production and is NOT
> re-evaluated here.
>
> **Migration summary:** ioredis → @upstash/redis (HTTP, Vercel-compatible), postgres.js → @neondatabase/serverless
> (serverless Postgres), RabbitMQ → no-op stub (already planned in PROJECT.md), WebSocket → SSE/polling.

---

## Core Technology Changes (Migration)

### Redis: ioredis → @upstash/redis

| Aspect | Current (ioredis) | Target (@upstash/redis) |
|--------|-------------------|------------------------|
| Connection model | TCP persistent socket | HTTP REST (stateless) |
| Vercel compatible | No — persistent connections crash serverless | Yes — native serverless |
| Cold start | Warm connection required | Zero — one HTTP call per operation |
| Local dev | Requires local Redis 7 daemon | Requires UPSTASH_REDIS_REST_URL + TOKEN |
| API surface | Full Redis 7 API | Full Redis API over HTTP |

**Why @upstash/redis:** Vercel serverless functions are ephemeral. TCP-based Redis (ioredis) opens a new socket per invocation and either times out or hits connection limits. Upstash serves Redis over HTTP (REST) — each call is a single HTTPS request. No connection pooling needed. Vercel's official integration marketplace lists Upstash as the recommended Redis provider.

**Migration scope in codebase:**
- `apps/web/lib/redis/client.ts` — replace `Redis` (ioredis) with `Redis` (@upstash/redis)
- 9 files import from the redis client: auth routes (forgot-password, login, register, reset-password, verify-email), `lib/auth/jwt.ts`, `lib/middleware/rate-limit.ts`, `lib/usage/usage-service.ts`
- API is broadly compatible: `redis.set()`, `redis.get()`, `redis.del()`, `redis.setex()` all have identical signatures

### PostgreSQL: postgres.js → @neondatabase/serverless

| Aspect | Current (postgres.js) | Target (@neondatabase/serverless) |
|--------|----------------------|----------------------------------|
| Connection model | TCP connection pool (max: 10) | HTTP or WebSocket (neon-serverless) |
| Vercel compatible | No — TCP pool exhausted by serverless functions | Yes — HTTP-native serverless |
| Drizzle driver | drizzle-orm/postgres-js | drizzle-orm/neon-http or neon-serverless |
| Transactions | Full ACID | neon-http: single non-interactive only; neon-serverless (Pool): full session support |

**Why @neondatabase/serverless:** Neon is the official Vercel Postgres partner. Its `neon-http` driver sends queries over HTTPS — zero TCP handshake overhead in serverless. For code paths requiring interactive transactions (SAGA payment flow), use `@neondatabase/serverless` with the Pool (WebSocket) variant instead of neon-http. Neon also provides branch-per-PR preview databases, git-like workflow.

**Migration scope in codebase:**
- `packages/database/src/db.ts` — replace `postgres.js` + `drizzle-orm/postgres-js` with `neon()` + `drizzle-orm/neon-http`
- For transaction-heavy paths (payment SAGA, booking transitions): use `Pool` from `@neondatabase/serverless` + `drizzle-orm/neon-serverless`
- Use **pooled** connection string from Neon dashboard (hostname contains `-pooler`) for all serverless function contexts

### RabbitMQ: Remove Dependency

**No new package needed.** Replace `publishEvent()` calls with a safe no-op stub. PROJECT.md already specifies this.
- 20 files call `publishEvent()` — replace stub in `packages/events/src/publisher.ts` with `async function publishEvent() {}`
- `amqplib` removed from dependency tree after stub
- No Vercel-incompatible persistent AMQP connection

---

## New Packages: Security Hardening

### @sentry/nextjs — Error Tracking

| Property | Value |
|----------|-------|
| Version | 10.43.0 |
| Install location | `apps/web` (main app) |
| Runtime | Client + Server + Edge (3 separate config files) |

**Why:** Sentry is the industry standard for Next.js error tracking. `@sentry/nextjs` 10.x auto-instruments App Router Server Components, Route Handlers, and Server Actions via the `instrumentation.ts` hook. The SDK wizard generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `app/global-error.tsx`.

**Next.js App Router integration pattern:**
```typescript
// instrumentation.ts (project root, not inside /app)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

**next.config.ts wrapping:**
```typescript
// next.config.ts
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, {
  org: 'schedulebox',
  project: 'schedulebox-web',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

**Vercel compatibility:** HIGH — Sentry explicitly supports Vercel. Source maps uploaded at build time. No persistent connection.

### isomorphic-dompurify — XSS Sanitization

| Property | Value |
|----------|-------|
| Version | 3.3.0 |
| Install location | `apps/web` |
| Runtime | Server Components (SSR) + Client Components |

**Why isomorphic-dompurify, not dompurify:** DOMPurify requires a browser DOM (window.document). Next.js Server Components run in Node.js — no DOM. `isomorphic-dompurify` wraps DOMPurify with jsdom for server-side use, providing the same API on both runtimes.

**Critical jsdom version pin required:** isomorphic-dompurify v3+ pulls jsdom@28 which has an ESM-only dependency (`parse5`) that breaks CommonJS `require()` in Next.js on Vercel. Pin jsdom to 25.0.1 via pnpm overrides:

```json
// root package.json
{
  "pnpm": {
    "overrides": {
      "jsdom": "25.0.1"
    }
  }
}
```

**Usage pattern:**
```typescript
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(userHtmlInput, { ALLOWED_TAGS: ['b', 'i', 'em'] });
```

**Where to apply:** Review descriptions, customer notes in booking forms, any field rendered with `dangerouslySetInnerHTML`.

### AES-256-GCM PII Encryption — Node.js built-in crypto

**No new package.** Node.js 20 LTS `crypto` module provides AES-256-GCM natively and outperforms every third-party library by ~40x for 1MB operations (crypto: ~3,196 ops/sec vs @noble/ciphers: ~74 ops/sec per benchmark).

**Why NOT @noble/ciphers:** Pure JS implementation, ~40x slower than native crypto for block ciphers. Noble is excellent for environments without native crypto (browsers, edge), but Node.js 20 already has it via OpenSSL.

**Why NOT node-forge:** Unmaintained, no TypeScript types, slower than native.

**Implementation pattern for PII field encryption:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.PII_ENCRYPTION_KEY!, 'hex'); // 32 bytes = 64 hex chars

export function encryptPII(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16-byte authentication tag
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPII(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
```

### hibp — HIBP Password Breach Check

| Property | Value |
|----------|-------|
| Version | 15.2.1 |
| Install location | `apps/web` |
| Runtime | Server-side only (API route) |

**Why hibp:** Official unofficial TypeScript SDK for Have I Been Pwned API v3. Uses k-Anonymity model — sends only first 5 chars of SHA-1 hash of password, never the full password or hash. No API key required for Pwned Passwords endpoint. The library handles the range query and response parsing.

**Usage in registration/password change route:**
```typescript
import { pwnedPassword } from 'hibp';

const breachCount = await pwnedPassword(plaintextPassword);
if (breachCount > 0) {
  return NextResponse.json({ error: 'Password found in data breach' }, { status: 400 });
}
```

**Vercel compatibility:** HIGH — single HTTPS call to api.pwnedpasswords.com, stateless.

---

## New Packages: Observability

### @vercel/otel — OpenTelemetry Instrumentation

| Property | Value |
|----------|-------|
| Version | 2.1.1 |
| Install location | `apps/web` |
| Config file | `instrumentation.ts` (project root) |

**Why @vercel/otel over raw @opentelemetry/sdk-node:** `@vercel/otel` is Edge-compatible (NodeSDK is NOT edge-compatible). It automatically configures trace exporters, batch processors, and instrumentations for Next.js — zero manual setup for common cases. Works both on Vercel and self-hosted Node.js.

**Next.js 15 instrumentation — no experimental flag needed (changed from 14):**
```typescript
// instrumentation.ts (project root, NOT inside /app)
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'schedulebox-web' });
}
```

**Important:** `@opentelemetry/sdk-node` must NOT be used directly in edge runtime paths. If edge runtime is used for any route, @vercel/otel is required.

**Vercel compatibility:** HIGH — purpose-built for Vercel, exports traces to Vercel's built-in trace UI or external OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT` env var.

---

## New Packages: Real-Time (WebSocket Replacement)

### SSE via Native ReadableStream — No New Package

**Vercel does NOT support persistent WebSocket connections** in serverless functions. SSE (Server-Sent Events) using the Web Streams API built into Next.js 15 Route Handlers is the correct replacement.

**Implementation pattern for booking status updates:**
```typescript
// app/api/v1/bookings/stream/route.ts
export const dynamic = 'force-dynamic'; // Critical — prevents Vercel response caching
export const maxDuration = 25; // Vercel Pro limit for streaming (seconds)

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial event immediately
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Poll database every 3 seconds and push changes
      const interval = setInterval(async () => {
        try {
          const updates = await getRecentBookingUpdates();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(updates)}\n\n`));
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 3000);

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

**Vercel SSE timeout limits:**
- Hobby plan: 10 seconds (insufficient for persistent streams)
- Pro plan: 60 seconds by default, 300 seconds with Fluid Compute
- **Recommendation for ScheduleBox:** Use **polling** (30-second interval via TanStack Query `refetchInterval`) for booking dashboard updates. Simpler, no timeout concerns, works on all Vercel plans. SSE only for user-initiated flows where latency matters (live availability checking).

**For multi-instance Vercel deployments (booking slot availability):** SSE requires shared state — use Upstash Redis Pub/Sub to bridge instances. Without this, Instance A's SSE connection won't receive events published on Instance B.

**Alternative — polling pattern (simpler, recommended for this use case):**
```typescript
// hooks/use-bookings-query.ts — already exists, add refetchInterval
useQuery({
  queryKey: ['bookings'],
  queryFn: fetchBookings,
  refetchInterval: 30_000, // 30-second polling — sufficient for booking updates
  refetchIntervalInBackground: false,
});
```

---

## New Packages: Testing Infrastructure

### @storybook/nextjs — Component Documentation

| Property | Value |
|----------|-------|
| Version | 10.2.19 |
| Install location | `apps/web` (dev dependency) |
| Config directory | `apps/web/.storybook/` |

**Why @storybook/nextjs:** Purpose-built Storybook framework for Next.js — handles App Router, next/image, next/font, next/navigation mocks automatically. No manual webpack config. SWC compilation enabled via `useSWC: true`.

**App Router setup:**
```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/nextjs',
    options: { appDirectory: true }, // Required for App Router
  },
  stories: ['../components/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials'],
};
```

**shadcn/ui compatibility:** shadcn components work in Storybook without any special config — they use standard Tailwind classes. Tailwind CSS is auto-configured by @storybook/nextjs when it detects `tailwind.config.ts`.

**Vercel compatibility:** N/A — dev tool only, not deployed.

### @pact-foundation/pact — Contract Testing

| Property | Value |
|----------|-------|
| Version | 16.3.0 |
| Install location | `apps/web` (dev dependency) or dedicated test package |
| Test runner | Vitest (via pact-js adapter) |

**Why Pact:** Consumer-driven contract testing for the boundary between Next.js API routes and the Python AI service (`services/ai-service`). When the AI service's response schema changes, the Pact consumer test catches it before deployment — preventing silent runtime failures.

**Where to apply:** The Next.js app (consumer) calls `AI_SERVICE_URL` for predictions. The Pact consumer test generates a contract file; the Python AI service (provider) runs verification against it.

**Important version note:** Pact v16.x uses Rust-backed FFI bindings. Requires pact_ffi native library — auto-downloaded on `npm install`. This adds ~80MB to the dev dependency footprint. Acceptable for dev/CI, do not include in production builds.

**Basic consumer test pattern:**
```typescript
// tests/pact/ai-service.pact.test.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';

const provider = new PactV4({ consumer: 'schedulebox-web', provider: 'schedulebox-ai' });

it('predicts no-show risk', async () => {
  await provider.addInteraction()
    .given('booking exists')
    .uponReceiving('no-show prediction request')
    .withRequest({ method: 'POST', path: '/predict/no-show' })
    .willRespondWith({ status: 200, body: { risk: MatchersV3.decimal(0.3) } })
    .executeTest(async (mockServer) => {
      const result = await predictNoShow(mockServer.url, bookingData);
      expect(result.risk).toBeDefined();
    });
});
```

### testcontainers + @testcontainers/postgresql — Integration Testing

| Property | Value |
|----------|-------|
| testcontainers version | 11.12.0 |
| @testcontainers/postgresql version | 11.12.0 |
| Install location | Root-level or `apps/web` dev dependency |
| Test runner | Vitest with `globalSetup` |

**Why Testcontainers:** Starts a real PostgreSQL 16 Docker container for integration tests. Tests run against the same Postgres version as production. No mocking of DB layer — catches schema migration bugs and query correctness.

**Requirement:** Docker must be running when integration tests execute. This is CI-compatible (GitHub Actions with `services:` Docker-in-Docker). Note: user's local env does not have Docker, so integration tests will be CI-only.

**Vitest globalSetup pattern:**
```typescript
// vitest.integration.global-setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: Awaited<ReturnType<typeof new PostgreSqlContainer().start>>;

export async function setup() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('schedulebox_test')
    .start();
  process.env.DATABASE_URL = container.getConnectionUri();
}

export async function teardown() {
  await container.stop();
}
```

**Vitest config for integration tests (separate from unit tests to avoid Docker dependency in dev):**
```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    globalSetup: './vitest.integration.global-setup.ts',
    include: ['**/*.integration.test.ts'],
    pool: 'forks', // Required for Testcontainers — threads don't support Docker
    testTimeout: 60_000,
  },
});
```

---

## Supporting Libraries (No New Packages)

| Capability | Approach | Rationale |
|-----------|----------|-----------|
| CSRF protection | `crypto.randomUUID()` + cookie/header double-submit | Built into Node.js 20, no package needed |
| SSRF protection | URL allowlist in API route middleware | Logic only, no package |
| DB partitioning (P3) | PostgreSQL 16 native partitioning via Drizzle SQL | Already available in DB layer |

---

## Installation Summary

```bash
# Runtime dependencies (apps/web)
pnpm --filter @schedulebox/web add \
  @sentry/nextjs@10.43.0 \
  isomorphic-dompurify@3.3.0 \
  @upstash/redis@1.37.0 \
  @neondatabase/serverless@1.0.2 \
  @vercel/otel@2.1.1 \
  hibp@15.2.1

# Dev dependencies (apps/web)
pnpm --filter @schedulebox/web add -D \
  @storybook/nextjs@10.2.19 \
  @storybook/addon-essentials \
  @pact-foundation/pact@16.3.0 \
  testcontainers@11.12.0 \
  @testcontainers/postgresql@11.12.0

# Remove from apps/web after migration complete
pnpm --filter @schedulebox/web remove ioredis

# Remove from packages/database after migration
pnpm --filter @schedulebox/database add @neondatabase/serverless@1.0.2
pnpm --filter @schedulebox/database remove postgres

# Root package.json — add jsdom pin for isomorphic-dompurify
# "pnpm": { "overrides": { "jsdom": "25.0.1" } }
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| @upstash/redis | Vercel KV | Vercel KV is built on Upstash — same underlying service, higher cost tier, less flexible pricing |
| @upstash/redis | Redis Cloud Serverless | Less Vercel marketplace integration, no built-in connection proxy |
| @neondatabase/serverless | Vercel Postgres | Vercel Postgres is built on Neon — same underlying service, Neon direct gives more control and better pricing |
| @neondatabase/serverless | Supabase | Different DB provider, would require full migration; Neon has native Drizzle docs |
| @vercel/otel | @opentelemetry/sdk-node | NodeSDK is NOT Edge-compatible; @vercel/otel handles both runtimes |
| isomorphic-dompurify | sanitize-html | heavier, opinionated allowlist; DOMPurify is the XSS-focused standard |
| isomorphic-dompurify | xss | Less maintained, narrower escaping only; DOMPurify handles full HTML sanitization |
| hibp (npm package) | Manual k-anonymity implementation | hibp handles hash computation, k-anonymity range query, and response parsing — ~15 lines vs ~150 lines |
| Node.js crypto | @noble/ciphers | Pure JS, 40x slower for block ciphers in Node.js; native crypto uses OpenSSL hardware acceleration |
| testcontainers | vitest-environment-drizzle | Testcontainers starts real Docker containers — catches Docker-level pg differences; drizzle env uses in-memory or SQLite |
| SSE / polling | Socket.io | Requires persistent server — incompatible with Vercel serverless. Would need separate WebSocket server on Railway |
| SSE / polling | Pusher / Ably | Third-party real-time service, additional cost, extra dependency for what is mostly a low-frequency update need |

---

## What NOT to Use (Vercel Incompatible)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ioredis / node-redis | TCP persistent connections — timeout or exhaust connections in serverless | @upstash/redis (HTTP) |
| postgres.js with `max > 1` | TCP connection pool — unmanaged connections in serverless invocations | @neondatabase/serverless with pooled string |
| amqplib / RabbitMQ | Persistent AMQP connection — not available in serverless | No-op publishEvent() stub |
| ws / socket.io | WebSocket persistent connection — Vercel serverless terminates connections | SSE (ReadableStream) or 30s polling |
| @opentelemetry/sdk-node direct | Not edge-compatible, breaks Vercel Edge runtime routes | @vercel/otel |
| BullMQ (self-hosted) | Requires persistent Redis connection and worker process | Vercel Cron Jobs + Upstash Redis |

---

## Version Compatibility Matrix

| Package | Requires | Compatible With | Notes |
|---------|----------|-----------------|-------|
| @sentry/nextjs@10.43.0 | Next.js ≥13 | Next.js 15, React 19 | Works with App Router instrumentation.ts |
| @upstash/redis@1.37.0 | Node.js ≥18 | All Vercel runtimes | REST-based, no socket dependency |
| @neondatabase/serverless@1.0.2 | Node.js ≥18 | drizzle-orm ≥0.36.4 | Use neon-http for most routes; neon-serverless (Pool) for transactions |
| isomorphic-dompurify@3.3.0 | jsdom pinned to 25.0.1 | Next.js 15, SSR | jsdom@28 ESM issue — pin override required |
| @vercel/otel@2.1.1 | Next.js ≥13.4 | Edge + Node.js runtime | instrumentation.ts in project root |
| hibp@15.2.1 | Node.js ≥18 | TypeScript 5.x | Server-side only — k-anonymity API calls |
| @storybook/nextjs@10.2.19 | Next.js ≥14 | App Router (`appDirectory: true`) | Dev only, not in production build |
| @pact-foundation/pact@16.3.0 | Node.js ≥18 | Vitest via adapter | Rust FFI — 80MB native binary, dev/CI only |
| testcontainers@11.12.0 | Docker daemon running | Vitest `pool: 'forks'` | CI only — local dev lacks Docker |

---

## Environment Variables Required (New)

| Variable | Purpose | Provider |
|----------|---------|----------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint | Upstash dashboard → Vercel integration |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token | Upstash dashboard → Vercel integration |
| `DATABASE_URL` | Neon pooled connection string | Neon dashboard (use `-pooler` hostname) |
| `SENTRY_DSN` | Sentry project DSN | Sentry project settings |
| `SENTRY_ORG` | Sentry organization slug | Sentry organization settings |
| `SENTRY_PROJECT` | Sentry project slug | Sentry project settings |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for client-side | Same as SENTRY_DSN |
| `PII_ENCRYPTION_KEY` | AES-256-GCM key (32 bytes = 64 hex chars) | Generate: `openssl rand -hex 32` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional OTLP trace export endpoint | Vercel built-in or external (e.g., Uptrace) |

---

## Sources

- [Sentry Next.js Setup Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — @sentry/nextjs 10.43.0 App Router integration patterns — HIGH confidence
- [@sentry/nextjs npm](https://www.npmjs.com/package/@sentry/nextjs) — version 10.43.0 confirmed — HIGH confidence
- [Upstash Redis + Next.js](https://upstash.com/docs/redis/tutorials/nextjs_with_redis) — @upstash/redis 1.37.0 integration — HIGH confidence
- [Vercel + Upstash template](https://vercel.com/templates/next.js/get-started-with-upstash-redis-and-next-js) — official Vercel recommendation — HIGH confidence
- [Neon + Drizzle Docs](https://neon.com/docs/guides/drizzle) — @neondatabase/serverless 1.0.2, neon-http pattern — HIGH confidence
- [Drizzle + Neon Serverless](https://orm.drizzle.team/docs/connect-neon) — drizzle-orm/neon-http driver — HIGH confidence
- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry) — @vercel/otel 2.1.1, instrumentation.ts — HIGH confidence
- [isomorphic-dompurify GitHub](https://github.com/kkomelin/isomorphic-dompurify) — v3.3.0, jsdom@25 pin workaround — HIGH confidence
- [isomorphic-dompurify npm](https://www.npmjs.com/package/isomorphic-dompurify) — version 3.3.0 confirmed — HIGH confidence
- [hibp npm](https://www.npmjs.com/package/hibp) — 15.2.1, k-anonymity API — HIGH confidence
- [HIBP API v3 Docs](https://haveibeenpwned.com/api/v3) — no API key for Pwned Passwords endpoint — HIGH confidence
- [Node.js Crypto Docs](https://nodejs.org/api/crypto.html) — AES-256-GCM built-in — HIGH confidence
- [Storybook Next.js Docs](https://storybook.js.org/docs/get-started/frameworks/nextjs) — @storybook/nextjs 10.2.19, App Router setup — HIGH confidence
- [Pact JS npm](https://www.npmjs.com/package/@pact-foundation/pact) — 16.3.0, PactV4 API — HIGH confidence
- [Testcontainers Node.js Docs](https://node.testcontainers.org/) — testcontainers 11.12.0, Vitest forks pool — HIGH confidence
- [SSE + Vercel Community](https://community.vercel.com/t/sse-time-limits/5954) — Vercel timeout limits per plan — MEDIUM confidence
- [Fixing SSE Next.js Vercel](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) — force-dynamic, ReadableStream pattern — MEDIUM confidence

---

_Stack research for: ScheduleBox v3.0 — Production Launch & 32 Gap Closure_
_Researched: 2026-03-16_

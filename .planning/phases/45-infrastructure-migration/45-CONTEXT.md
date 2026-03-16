# Phase 45: Infrastructure Migration - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate ScheduleBox from local/Railway deployment to Vercel. Replace RabbitMQ with no-op, swap postgres.js for @neondatabase/serverless, swap ioredis for @upstash/redis, patch CVE-2025-29927, fix AI-Powered plan capacity bug. App must be fully functional on Vercel — no external services except Upstash Redis.

</domain>

<decisions>
## Implementation Decisions

### RabbitMQ Removal

- Claude's discretion on no-op approach (silent no-op vs console.log stub — pick what's best for Vercel serverless)
- Full cleanup: remove amqplib package, delete consumer.ts, clean up all RabbitMQ connection code from packages/events/
- Notification-worker service: Claude decides whether to remove entirely (wire notifications directly in Phase 47) or convert to Vercel Cron — pick the simplest path
- AI service: inference migration to Vercel Python functions deferred to Phase 49 (Observability & Verticals) — Phase 45 focuses on web app infrastructure only. AI service continues running separately until then.
- All 38 publishEvent call sites across 16 files remain unchanged — only publisher.ts body changes

### Database Migration

- Use @neondatabase/serverless (supersedes initial @vercel/postgres decision — research showed Neon direct driver has better Drizzle ORM integration, supports both HTTP and WebSocket transports for transactions, and works with standard DATABASE_URL env var)
- Local PostgreSQL stays for development (user has it installed locally, no Docker)
- Vercel Postgres for production — set up via Vercel dashboard
- Production data: export existing local data (pg_dump) and import to Vercel Postgres — preserve test companies and demo data for showcase
- Drizzle ORM stays — just swap the driver in packages/database/src/db.ts
- Two connection modes: pooled for runtime queries, direct/unpooled for drizzle-kit migrations

### Redis Swap

- Use Upstash Redis directly (not Vercel KV) — higher free tier (10k req/day), more control
- Upstash for both development AND production — same instance, simple config
- Swap ioredis → @upstash/redis in apps/web/lib/redis/client.ts
- Only 9 call sites using get/set/del/setex/incr/expire — all supported by Upstash HTTP API
- No local Redis needed anymore

### Deploy & Environment

- Vercel account connected to GitHub (PMLOGY/schedule_box repo)
- Auto-deploy on push to main — preview deploys on PRs
- Domain: schedulebox.vercel.app (free Vercel subdomain for now, custom domain later)
- Env vars configured in Vercel dashboard (DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, JWT secrets, Comgate keys, etc.)
- Next.js must be >= 14.2.25 for CVE-2025-29927 patch

### Plan Capacity Bug Fix (FIX-01)

- AI-Powered plan PLAN_CONFIG already has `maxBookingsPerMonth: Infinity` in shared/types/billing.ts
- Bug is in UI: settings/billing/page.tsx line 385 has hardcoded `maxBookingsPerMonth: 0`
- Fix: ensure `formatFeatureValue()` correctly renders Infinity as "Unlimited" for all plan displays

### Claude's Discretion

- Exact Upstash Redis client initialization pattern (REST vs SDK)
- How to handle Drizzle ORM driver swap (conditional import vs environment detection)
- Vercel build configuration (output: standalone, env validation)
- Whether to keep services/notification-worker or remove it entirely
- Whether to use @vercel/python for AI inference or another approach

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `packages/events/src/publisher.ts`: Single file controls all 38 publishEvent calls — change body to no-op
- `packages/database/src/db.ts`: Single file controls DB connection — swap postgres.js driver here
- `apps/web/lib/redis/client.ts`: Single file controls Redis — swap ioredis to @upstash/redis here
- `apps/web/lib/usage/plan-limits.ts`: Uses PLAN_CONFIG from shared — already has `isUnlimited()` helper
- `packages/shared/src/types/billing.ts`: PLAN_CONFIG.ai_powered.maxBookingsPerMonth already = Infinity

### Established Patterns

- Lazy Proxy pattern: Both db and redis use `new Proxy()` for lazy initialization — maintain this
- Environment-based config: DATABASE_URL, REDIS_URL read from process.env
- packages/events exports: publishEvent, createCloudEvent, closeConnection — all need neutralizing

### Integration Points

- `apps/web/next.config.mjs`: Build config changes needed for Vercel output
- `.env.example`: Needs Vercel-specific env var additions (UPSTASH_*, POSTGRES_*)
- `apps/web/app/api/readiness/route.ts`: Health check that tests Redis + DB connectivity — must work with new drivers
- `docker/docker-compose.prod.yml`: Will become irrelevant for Vercel but keep for local dev reference
- `settings/billing/page.tsx:385`: Hardcoded `maxBookingsPerMonth: 0` — the bug source

</code_context>

<specifics>
## Specific Ideas

- User wants 100% Vercel — no external services except Upstash Redis
- AI inference endpoints should be Vercel Python functions if possible
- Model training stays in GitHub Actions
- Export existing local database to Vercel Postgres (pg_dump + import) — not starting fresh
- GitHub already connected to Vercel

</specifics>

<deferred>
## Deferred Ideas

- AI inference migration to Vercel Python functions — deferred to Phase 49 (Observability & Verticals). AI service continues running on current host until then.

</deferred>

---

_Phase: 45-infrastructure-migration_
_Context gathered: 2026-03-16_

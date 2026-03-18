---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Production Launch & 100% Documentation Coverage
status: active
stopped_at: Completed 50-testing-hardening 50-02-PLAN.md
last_updated: "2026-03-18T21:23:35.252Z"
last_activity: 2026-03-16 — v3.0 roadmap created, 6 phases defined, 47 requirements mapped
progress:
  total_phases: 12
  completed_phases: 11
  total_plans: 35
  completed_plans: 33
---

---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Production Launch & 100% Documentation Coverage
status: active
stopped_at: Phase 50 planned (5 plans, 3 waves)
last_updated: "2026-03-18T21:12:19.714Z"
last_activity: 2026-03-16 — v3.0 roadmap created, 6 phases defined, 47 requirements mapped
progress:
  total_phases: 12
  completed_phases: 11
  total_plans: 35
  completed_plans: 30
  percent: 96
---

---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Production Launch & 100% Documentation Coverage
status: active
stopped_at: Completed 47-notifications-super-admin 47-01-PLAN.md
last_updated: "2026-03-18T15:14:55.432Z"
last_activity: 2026-03-16 — v3.0 roadmap created, 6 phases defined, 47 requirements mapped
progress:
  [██████████] 96%
  completed_phases: 8
  total_plans: 22
  completed_plans: 18
  percent: 97
---

---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Production Launch & 100% Documentation Coverage
status: active
stopped_at: null
last_updated: "2026-03-16T00:00:00.000Z"
last_activity: 2026-03-16 — v3.0 roadmap created, 6 phases (45-50), 47 requirements mapped
progress:
  [██████████] 97%
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** Milestone v3.0 — Phase 45: Infrastructure Migration

## Current Position

Phase: 45 of 50 (Infrastructure Migration)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-16 — v3.0 roadmap created, 6 phases defined, 47 requirements mapped

Progress: [░░░░░░░░░░] 0%

## What's Done

**v1.0 shipped** (15 phases, 101 plans — 2026-02-12)
**v1.1 shipped** (7 phases, 22 plans — 2026-02-21)
**v1.2 shipped** (5 phases, 20 plans — 2026-02-24)
**v1.3 shipped** (5 phases, 21 plans — 2026-02-25)
**v1.4 shipped** (6 phases, 11 plans — 2026-03-12): glassmorphism redesign
**v2.0 shipped** (6 phases, 11 plans — 2026-03-16): full functionality, all 4 views working, 12 sections manual QA passed

## Decisions

See `.planning/PROJECT.md` Key Decisions section (decisions 1-20 logged there).

v3.0 decisions:
- Vercel deployment (not VPS/Kubernetes) — simplicity, free tier, CDN
- Upstash Redis (not self-hosted) — Vercel-native, free tier
- Neon PostgreSQL (not self-hosted) — serverless, Vercel integration
- RabbitMQ removed — not supported on Vercel, publishEvent becomes safe no-op
- 30s TanStack Query polling (not SSE/WebSocket) — Vercel serverless 60s timeout; SSE causes thundering herd reconnect
- DB partitioning deferred to Phase 50 — composite index sufficient at <500 companies; Drizzle introspect conflict risk
- GAP analysis (GAP-ANALYZA.md) drives all v3.0 requirements — 47 requirements across 11 categories
- [Phase 45-infrastructure-migration]: All db.transaction() calls use dbTx — Neon HTTP transport cannot run interactive transactions
- [Phase 45-infrastructure-migration]: postgres.js kept in devDependencies for local dev scripts needing raw SQL
- [Phase 45-infrastructure-migration]: Upstash redis.set() with { ex } replaces ioredis setex() — different API surface
- [Phase 45-infrastructure-migration]: PLAN_CONFIG imported from @schedulebox/shared/types subpath to prevent prom-client/fs leaking into client bundles
- [Phase 45-infrastructure-migration]: booking-completed-consumer.ts handleBookingCompleted kept for direct API invocation, startBookingCompletedConsumer made no-op (RabbitMQ removed)
- [Phase 45-infrastructure-migration]: output: standalone removed from next.config.mjs — Vercel-native deployment handles file tracing natively
- [Phase 45-infrastructure-migration]: @neondatabase/serverless added to serverExternalPackages — prevents WebSocket driver bundling into edge functions
- [Phase 45-infrastructure-migration]: notification-worker deleted — RabbitMQ consumer with no queue after publishEvent became no-op; Phase 47 handles notifications
- [Phase 46-security-hardening]: Expand-contract migration: plaintext email/phone columns retained; contract phase drops them after back-fill verified
- [Phase 46-security-hardening]: PII encryption: AES-256-GCM with key derivation from single ENCRYPTION_KEY env var; HMAC-SHA256 for searchable index without plaintext exposure
- [Phase 46-security-hardening]: isomorphic-dompurify for XSS sanitization: server-safe DOMPurify wrapper, OWASP-recommended over regex-stripping
- [Phase 46-security-hardening]: HIBP fail-open policy: network errors from HIBP silently return false — third-party failure must not block registration
- [Phase 46-security-hardening]: SSRF validated at creation time via hostname regex; DNS rebinding attack deferred to Phase 49/50 hardening
- [Phase 46-security-hardening]: isomorphic-dompurify and jsdom added to serverExternalPackages — prevents webpack bundling jsdom CSS file reads (fs.readFileSync) which breaks when __dirname is the webpack chunks dir
- [Phase 46-security-hardening]: Sentry autoInstrument* disabled — Sentry 10.43 webpack wrappers conflict with Next.js 15.5 build; SDK init via instrumentation.ts + onRequestError hook is sufficient
- [Phase 47-notifications-super-admin]: Platform schema DDL applied via postgres superuser (not drizzle-kit push) because schedulebox user lacks CREATE privilege; grants issued to schedulebox after table creation
- [Phase 47-notifications-super-admin]: crypto.randomUUID().slice(0,16) used as requestId fallback in writeAuditLog() to avoid nanoid dependency
- [Phase 47-notifications-super-admin]: Fire-and-forget email pattern: email calls outside DB transactions, failure never rolls back booking
- [Phase 47-notifications-super-admin]: SMS reminder row created at booking time (scheduledAt = startTime - 24h), delivered by Vercel Cron
- [Phase 47-notifications-super-admin]: sessionStorage for impersonation banner: HttpOnly imp_token not JS-readable; POST response body carries display data
- [Phase 47-notifications-super-admin]: Login 403 COMPANY_SUSPENDED: structured code field enables frontend to detect and handle suspension specifically
- [Phase 47-notifications-super-admin]: Upstash REST HTTP in middleware instead of SDK import to avoid heavy Edge bundle
- [Phase 47-notifications-super-admin]: Maintenance middleware fail-open policy: Redis errors never block users
- [Phase 47-notifications-super-admin]: confirmCount gate: POST /broadcast requires exact target count to prevent accidental mass email
- [Phase 47-notifications-super-admin]: Cron caps: max 5 broadcasts + 100 emails per invocation to prevent Vercel 30s timeout
- [Phase 47-notifications-super-admin]: apiErrorRate placeholder null: Sentry integration deferred to Phase 49
- [Phase 48-marketplace-ux]: refetchInterval: 30_000 matches staleTime to avoid window-focus redundant refetches
- [Phase 48-marketplace-ux]: BookingDetailPanel keeps panel open after action via query invalidation, no onClose()
- [Phase 48-marketplace-ux]: animate-glow-blue uses CSS keyframes (not framer-motion) — simpler, no JS
- [Phase 48-marketplace-ux]: OpenStreetMap iframe (not Leaflet) for map embed — zero npm install, sufficient UX for location display
- [Phase 48-marketplace-ux]: sanitizeImageUrl validates http/https-only protocol to block XSS via javascript:/data: URIs in user image arrays
- [Phase 48-marketplace-ux]: custom_meeting_url column on companies table (not video_meetings table) — avoids CHECK provider constraint issue
- [Phase 48-marketplace-ux]: company_slug via LEFT JOIN companies in both route branches, featured sort added to sortByEnum
- [Phase 48-marketplace-ux]: Webhook tables applied via raw SQL (postgres superuser) because schedulebox user lacks CREATE privilege; consistent with Phase 47 pattern
- [Phase 48-marketplace-ux]: Webhook retry scheduling via DB records (not RabbitMQ): two pending delivery records at failure time, cron processes scheduled_at <= now
- [Phase 48-marketplace-ux]: HMAC secret: randomBytes(32).hex() encrypted with AES-256-GCM (Phase 46 module), plaintext returned once on creation, never stored in DB
- [Phase 49-observability-verticals]: Industry labels are NOT i18n translations — domain terminology per vertical stored as TypeScript constants (medical = Pacient, auto = Vozidlo)
- [Phase 49-observability-verticals]: bookingMetadata validation at Zod API layer only, no DB CHECK constraint — allows future verticals without DDL changes
- [Phase 49-observability-verticals]: ALTER TABLE booking_metadata applied via postgres superuser consistent with Phase 47/48 pattern
- [Phase 49-observability-verticals]: @vercel/otel registerOTel called without NEXT_RUNTIME guard — handles both nodejs and edge runtimes internally
- [Phase 49-observability-verticals]: @schedulebox/shared/logger subpath export added to packages/shared/package.json to expose logInfo/logError without bundling winston into main index
- [Phase 49-observability-verticals]: OTEL_TRACES_SAMPLER=parentbased_traceidratio + OTEL_TRACES_SAMPLER_ARG=0.1 via env vars; set in Vercel project settings for production 10% sampling
- [Phase 49-observability-verticals]: Step3CustomerInfo reads company industryType from useCompanySettingsQuery; metadata spoofing prevented by validating industry_type match in public booking API
- [Phase 49-observability-verticals]: Upselling gate uses fail-open pattern: DB errors never block upselling compute; UpsellingSuggestions uses retry:false to avoid auth errors in public booking flow
- [Phase 50-testing-hardening]: db.query.* relational API mocked as vi.fn() on query namespace; db.select() chain mocked with makeSelectChain() helper; drizzle-orm operators mocked entirely; date-fns and buffer-time.ts run real
- [Phase 50-testing-hardening]: @storybook/react-vite used instead of @storybook/nextjs — nextjs framework causes webpack5 tap() error with Next.js 15 bundled webpack
- [Phase 50-testing-hardening]: Storybook installed at monorepo root — storybook/internal/preview/runtime resolution fails when binary only in apps/web and config-dir is at repo root
- [Phase 50-testing-hardening]: vite pinned to ^5.4.0 — storybook builder-vite 8.x peer requires ^4 or ^5; vite 8 was installed but incompatible
- [Phase 50-testing-hardening]: .storybook/ excluded from ESLint projectService — storybook config files not included in any app tsconfig, exclusion is correct fix
- [Phase 50-testing-hardening]: Mock db.select() chains inline per test rather than shared helpers to avoid state bleed
- [Phase 50-testing-hardening]: callCount pattern in dbTx.transaction for multi-step query chains in rescheduleBooking

## Blockers

- **[ACTIVE]** Phase 45 must land before all other v3.0 phases — codebase does not compile for Vercel without Neon/Upstash migration
- **[ACTIVE]** PII encryption (SEC-03) requires maintenance window — expand-contract migration, 500-row batches, have rollback SQL ready before running
- **[ACTIVE]** Verify Vercel plan tier (Pro vs Hobby) before Phase 45 — `maxDuration: 30` requires Pro; availability engine CTE consolidation critical on Hobby
- **[DEFERRED]** Comgate recurring activation — code complete (Phase 28), live recurring requires contacting Comgate support for merchant 498621
- Real testimonials needed for landing page social proof — placeholder content in place

## Performance Metrics

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 15 | 101 | 2 days |
| v1.1 | 7 | 22 | 5 days |
| v1.2 | 5 | 20 | 4 days |
| v1.3 | 5 | 21 | 1 day |
| v1.4 | 6 | 11 | 16 days |
| v2.0 | 6 | 11 | 3 days |
| Phase 45-infrastructure-migration P02 | 39 | 2 tasks | 40 files |
| Phase 45-infrastructure-migration P01 | 45 | 2 tasks | 13 files |
| Phase 45-infrastructure-migration P03 | 15 | 1 tasks | 45 files |
| Phase 46-security-hardening P03 | 25 | 2 tasks | 8 files |
| Phase 46-security-hardening P01 | 14min | 2 tasks | 17 files |
| Phase 46-security-hardening P02 | 47min | 2 tasks | 14 files |
| Phase 47-notifications-super-admin P01 | 16min | 2 tasks | 7 files |
| Phase 47-notifications-super-admin P02 | 20min | 2 tasks | 7 files |
| Phase 47-notifications-super-admin P03 | 14min | 2 tasks | 12 files |
| Phase 47-notifications-super-admin P04 | 15min | 2 tasks | 15 files |
| Phase 47-notifications-super-admin P05 | 10min | 2 tasks | 10 files |
| Phase 48-marketplace-ux P03 | 10min | 2 tasks | 7 files |
| Phase 48-marketplace-ux P02 | 5min | 1 tasks | 5 files |
| Phase 48-marketplace-ux P04 | 7 | 1 tasks | 9 files |
| Phase 48-marketplace-ux P01 | 20min | 2 tasks | 4 files |
| Phase 48-marketplace-ux P05 | 18min | 3 tasks | 22 files |
| Phase 49-observability-verticals P02 | 24min | 2 tasks | 9 files |
| Phase 49-observability-verticals P01 | 33min | 2 tasks | 9 files |
| Phase 49-observability-verticals P03 | 11min | 2 tasks | 10 files |
| Phase 50-testing-hardening P01 | 15min | 2 tasks | 2 files |
| Phase 50-testing-hardening PP03 | 20min | 2 tasks | 10 files |
| Phase 50-testing-hardening P02 | 8min | 2 tasks | 3 files |

## Session Continuity

Last session: 2026-03-18T21:23:35.248Z
Stopped at: Completed 50-testing-hardening 50-02-PLAN.md
Resume file: None

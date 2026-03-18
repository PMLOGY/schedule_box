---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Production Launch & 100% Documentation Coverage
status: active
stopped_at: Completed 47-notifications-super-admin 47-02-PLAN.md
last_updated: "2026-03-18T15:25:45.791Z"
last_activity: 2026-03-16 — v3.0 roadmap created, 6 phases defined, 47 requirements mapped
progress:
  total_phases: 12
  completed_phases: 8
  total_plans: 22
  completed_plans: 18
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

## Session Continuity

Last session: 2026-03-18T15:25:45.786Z
Stopped at: Completed 47-notifications-super-admin 47-02-PLAN.md
Resume file: None

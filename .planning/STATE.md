# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** Phase 3 Complete — Ready for Phase 4

## Position

- **Milestone:** v1.0
- **Phase:** 5 of 15 — Booking MVP
- **Status:** In Progress
- **Current Plan:** 05-04 (Next plan after 05-03)
- **Plans Executed:** 30

## What's Done

- [x] Documentation complete (v13.0 FINAL, 9785 lines)
- [x] GSD planning artifacts created (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, config.json)
- [x] 103 requirements defined across 17 categories
- [x] 15 phases mapped across 4 milestones
- [x] Plan 01-a: Root monorepo scaffold (3 tasks, 3 commits)
- [x] Plan 01-b: Workspace packages stub (2 tasks, 2 commits)
- [x] Plan 01-c: Next.js 14 app setup (2 tasks, 1 commit)
- [x] Plan 01-d: Docker environment (2 tasks, 2 commits)
- [x] Plan 01-e: Developer tooling configuration (3 tasks, 3 commits)
- [x] Plan 01-f: GitHub Actions CI/CD pipeline (2 tasks, 2 commits)
- [x] Plan 01-g: Health endpoints and monorepo validation (2 tasks, 2 commits)
- [x] Plan 02-01: Drizzle ORM infrastructure setup (2 tasks, 2 commits)
- [x] Plan 02-02: Auth & Tenancy schema (2 tasks, 2 commits)
- [x] Plan 02-03: Core Entity schemas (2 tasks, 2 commits)
- [x] Plan 02-04: Bookings & Payments schema (2 tasks, 2 commits)
- [x] Plan 02-05: Business Features schema (2 tasks, 2 commits)
- [x] Plan 02-06: Platform Tables schema (2 tasks, 1 commit - merged with parallel plans)
- [x] Plan 02-07: Row Level Security policies (1 task, 1 commit)
- [x] Plan 02-09: Database Functions & Constraints (2 tasks, 2 commits)
- [x] Plan 02-08: Database Integration & Seed Data (2 tasks, 2 commits)
- [x] Plan 03-01: Error Handling & API Response Foundation (2 tasks, 2 commits)
- [x] Plan 03-02: JWT & Token Management (2 tasks, 2 commits)
- [x] Plan 03-03: Auth Middleware & Validation (2 tasks, 2 commits)
- [x] Plan 03-04: Auth Endpoints (2 tasks, 3 commits)
- [x] Plan 03-05: MFA, OAuth2 Scaffolds, API Key Management (2 tasks, 3 commits)
- [x] Plan 03-06: Customer CRUD with Tags & GDPR Export (2 tasks, 4 commits)
- [x] Plan 03-07: Service & Employee CRUD with Working Hours (2 tasks, 3 commits)
- [x] Plan 03-08: Resource CRUD & Settings (2 tasks, 2 commits)
- [x] Plan 04-01: Design System Foundation (3 tasks, 3 commits)
- [x] Plan 04-02: State Management & API Client (2 tasks, 2 commits)
- [x] Plan 04-03: Internationalization Setup (2 tasks, 2 commits)
- [x] Plan 05-01: Booking & Availability Schemas and Types (2 tasks, 2 commits)
- [x] Plan 05-02: RabbitMQ Event Infrastructure (2 tasks, 2 commits)
- [x] Plan 05-03: Availability Engine & Public API (2 tasks, 2 commits)

## What's Next

Phase 1: Complete ✅
Phase 2: Complete ✅ — All schemas, RLS policies, functions, views, relations, and seed data ready
Phase 3: Complete ✅ — JWT/RBAC auth, 37 API routes, CRUD for all core entities
Phase 4: In Progress — Plans 04-01, 04-02, 04-03 complete (Phase 4 Plan 04 pending)
Phase 5: In Progress — Plans 05-01, 05-02, 05-03 complete (Availability engine and public API ready)

Next: Phase 5 Plan 04 — Booking CRUD API Routes

## Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 monorepo | App Router + API routes + standalone microservices for AI/notifications | Implemented (01-c) |
| Drizzle ORM over Prisma | Better SQL control, migration flexibility, lighter weight | Implemented (02-01) |
| RabbitMQ over Kafka | Simpler for target scale (5000 businesses), sufficient throughput | -- Pending |
| Cloudflare R2 over AWS S3 | Cost-effective, S3-compatible API | -- Pending |
| PostgreSQL full-text search | Simpler than Elasticsearch, sufficient for v1 | -- Pending |
| Choreography SAGA | Event-driven, decoupled, fits RabbitMQ architecture | -- Pending |
| 4 parallel segments | DATABASE, BACKEND, FRONTEND, DEVOPS for parallel development | -- Pending |
| pnpm@9.15.4 package manager | Fast, strict workspace resolution, disk-efficient | Implemented (01-a) |
| ESM-first (type: module) | Modern tooling support (ESLint flat config, Vite) | Implemented (01-a) |
| TypeScript strict mode base | Catch type errors early across all packages | Implemented (01-a) |
| shamefully-hoist=false | Strict dependency isolation between packages | Implemented (01-a) |
| Docker Compose v3.8 | Stable spec with health check support | Implemented (01-d) |
| Alpine-based images | Minimal size, fast startup, security-focused | Implemented (01-d) |
| Multi-stage Dockerfile | Separate dev/prod concerns, minimal production image | Implemented (01-d) |
| Non-root user in production | Security best practice, reduces attack surface | Implemented (01-d) |
- [Phase 01-e]: ESLint 9 flat config with TypeScript strict rules established as code quality baseline
- [Phase 01-e]: Conventional Commits with segment-based scopes enforced via commitlint
- [Phase 01-e]: Pre-commit hooks run lint-staged for automatic code quality enforcement
- [Phase 01-f]: GitHub Actions CI/CD pipeline validates every push/PR with lint and type-check
- [Phase 01-f]: Docker images built on main branch only and pushed to ghcr.io with Trivy security scanning
- [Phase 01-f]: Dependency review workflow denies copyleft licenses (AGPL, GPL) for SaaS compatibility
- [Phase 01-g]: Health endpoint provides liveness probe for Docker and Kubernetes
- [Phase 01-g]: Readiness endpoint checks service connectivity with per-service status
- [Phase 01-g]: Phase 1 readiness checks only env var presence, actual connections added in Phase 2
- [Phase 02-01]: Drizzle ORM with postgres driver (ESM-compatible) configured with connection pooling
- [Phase 02-01]: Separate migration client (max: 1) and query client (max: 10) for transactional safety
- [Phase 02-01]: Runtime DATABASE_URL validation instead of non-null assertions for better error messages
- [Phase 02-02]: Auth & tenancy schema uses unique() for (email, company_id) multi-tenancy
- [Phase 02-02]: PostgreSQL text[] array type for API key scopes with default empty array
- [Phase 02-03]: Soft delete pattern via deletedAt column on customers, services, and employees tables
- [Phase 02-03]: Working hours support both company-level defaults (employeeId NULL) and per-employee overrides
- [Phase 02-03]: Resource quantity tracking supports fractional allocation via quantity_needed field
- [Phase 02-03]: AI-computed fields added to customers (health_score, clv_predicted, no_show_count)
- [Phase 02-04]: Deferred FK pattern for coupon_id, gift_card_id, video_meeting_id allows parallel Wave 2 execution
- [Phase 02-04]: Booking pricing snapshots capture price, currency, discount at booking time for audit trail
- [Phase 02-04]: Payment gateway composite index (gateway, gateway_transaction_id) enables idempotency checks
- [Phase 02-04]: Invoice unique constraint (company_id, invoice_number) enforces per-company numbering
- [Phase 02-05]: Integer array type for applicable_service_ids instead of junction table for flexibility
- [Phase 02-05]: NULL maxUses/maxRedemptions means unlimited rather than requiring large numbers
- [Phase 02-05]: Single loyalty program per company enforced via UNIQUE(company_id) constraint
- [Phase 02-05]: Dual points_balance and stamps_balance on cards for flexible program types
- [Phase 02-05]: JSONB benefits field for extensible tier configuration in loyalty programs
- [Phase 02-06]: varchar(45) for IP addresses instead of inet type (Drizzle ORM compatibility)
- [Phase 02-06]: ai_model_metrics as global table without company_id for system-wide ML metrics
- [Phase 02-06]: audit_logs.company_id nullable to preserve audit trail after company deletion
- [Phase 02-06]: Partial index on notifications.scheduled_at WHERE status='pending' for queue efficiency
- [Phase 02-06]: DESC index on marketplace.average_rating for featured listing optimization
- [Phase 02-07]: RLS enabled on 29 tables with company_id for database-level multi-tenant isolation
- [Phase 02-07]: Junction tables and global tables skip RLS (accessed through parent FK or system-wide)
- [Phase 02-07]: Session variable-based RLS using current_company_id(), current_user_role(), current_user_id()
- [Phase 02-07]: Dual policy pattern (tenant_isolation + admin_bypass) for all RLS-enabled tables
- [Phase 02-07]: Customer self-access policy allows customers to SELECT their own bookings via user_id match
- [Phase 02-09]: btree_gist exclusion constraint for double-booking prevention (defense in depth)
- [Phase 02-09]: Partial indexes on deleted_at IS NULL optimize soft-delete queries (deleted_at columns in Drizzle)
- [Phase 02-09]: Dynamic trigger application via DO $$ loop for updated_at columns
- [Phase 02-09]: Audit trail triggers on 5 critical tables (bookings, customers, services, employees, payments)
- [Phase 02-08]: pgView used for v_daily_booking_summary and v_customer_metrics with query builder syntax
- [Phase 02-08]: Comprehensive Drizzle relations for all 46 tables enabling type-safe nested queries
- [Phase 02-08]: apply-sql.ts script executes SQL files in dependency order (RLS functions -> triggers -> policies)
- [Phase 02-08]: Czech/Slovak locale seed data via @faker-js/faker with realistic names, addresses, services
- [Phase 02-08]: Fixed password hash (password123) for all development users for easy testing
- [Phase 02-08]: Three industry-specific companies (beauty salon, barbershop, fitness gym) to showcase verticals
- [Phase 03-01]: AppError base class with 7 error subclasses for consistent error handling across API
- [Phase 03-01]: ERROR_CODES constant with 19 predefined error codes matching API documentation
- [Phase 03-01]: Security-first validation errors never include raw input values (prevents password leaks)
- [Phase 03-01]: Standard response utilities (successResponse, errorResponse, paginatedResponse) ensure consistent API format
- [Phase 03-02]: JWT generation using jsonwebtoken with 15-min access tokens and 30-day refresh tokens
- [Phase 03-02]: Refresh token rotation with SELECT FOR UPDATE prevents race conditions
- [Phase 03-02]: Redis blacklist for immediate JWT invalidation on logout
- [Phase 03-02]: Password hashing with Argon2id (OWASP parameters) and 5-password history tracking
- [Phase 03-03]: createRouteHandler factory is THE single composable pattern for all protected API endpoints
- [Phase 03-03]: PERMISSIONS constant defines all 23 system permissions for RBAC checks
- [Phase 03-03]: findCompanyId helper resolves user UUID to company ID for tenant-scoped queries
- [Phase 03-03]: Password complexity enforced via Zod regex (min 12 chars + uppercase + lowercase + number + special)
- [Phase 03-06]: Customer soft delete (sets deletedAt) for GDPR compliance and audit trail
- [Phase 03-06]: Atomic tag replacement pattern (DELETE + INSERT) for PUT /customers/{id}/tags
- [Phase 03-06]: Customer export endpoint provides full GDPR data portability (customer + bookings + payments + tags)
- [Phase 03-06]: Customer list supports pagination, search (name/email/phone ILIKE), tag filter (JOIN), and multi-field sorting
- [Phase 03-05]: TOTP MFA uses otplib functional API (generateSecret, generateURI, verifySync) for cleaner implementation
- [Phase 03-05]: MFA setup generates TOTP secret, QR code data URL, and 10 backup codes (nanoid)
- [Phase 03-05]: OAuth2 endpoints return 501 Not Implemented (full PKCE flow deferred to integration phase)
- [Phase 03-05]: API keys use SHA-256 hashing and sb_live_ prefix, full key returned only once on creation
- [Phase 03-05]: API key deletion is soft delete (isActive=false) for audit trail preservation
- [Phase 03-05]: NotImplementedError class added for 501 responses (auto-fixed Rule 2 deviation)
- [Phase 03-08]: Resource CRUD with hard delete and FK constraint handling (deactivate via is_active flag)
- [Phase 03-08]: Resource types are company-scoped with left join for optional type assignment
- [Phase 03-08]: Company settings partial update maps snake_case request to camelCase database columns
- [Phase 03-08]: Company working hours bulk replace pattern (delete + insert) for company-level defaults (employeeId IS NULL)
- [Phase 03-04]: Register creates company + user in single transaction with slug generation (name + nanoid suffix)
- [Phase 03-04]: Login handles MFA challenge flow (returns mfa_required + mfa_token for Redis-based temporary auth)
- [Phase 03-04]: Refresh token accepts from body OR httpOnly cookie for flexibility
- [Phase 03-04]: Forgot password NEVER reveals email existence (always returns success message)
- [Phase 03-04]: Reset password disables MFA and revokes all sessions (security best practice)
- [Phase 03-04]: Profile endpoint (GET/PUT /me) returns company UUID, never internal SERIAL ID
- [Phase 03-07]: Service CRUD with category filtering, is_active filtering, and soft delete
- [Phase 03-07]: Employee service assignment uses atomic delete + insert (replace all pattern)
- [Phase 03-07]: Working hours bulk update replaces all hours for employee or company
- [Phase 03-07]: Schedule overrides create per-date exceptions (day off or modified hours)
- [Phase 04-01]: shadcn/ui design system chosen for consistency and accessibility compliance
- [Phase 04-01]: CSS variables for theming (light/dark mode) instead of direct Tailwind color tokens
- [Phase 04-01]: ScheduleBox brand colors defined: primary #3B82F6, secondary #22C55E, destructive #EF4444
- [Phase 04-01]: Inter font family set as default sans-serif for clean modern look
- [Phase 04-01]: 16 shadcn/ui components created (8 simple atoms, 8 complex Radix-based)
- [Phase 04-01]: ESM import for tailwindcss-animate (not require() to comply with ESM-first project)
- [Phase 04-02]: Zustand stores with selective persistence (auth persists user only, UI persists sidebar, calendar no persist)
- [Phase 04-02]: API client singleton with automatic auth header injection and 401 token refresh retry
- [Phase 04-02]: TanStack Query created in useState for RSC safety (prevents cross-request sharing)
- [Phase 04-03]: Middleware-based i18n (next-intl) instead of [locale] route segments to avoid app directory restructuring
- [Phase 04-03]: Czech (cs) as default locale with as-needed prefix (no /cs in URLs, but /sk and /en for other languages)
- [Phase 04-03]: Comprehensive translation coverage (70+ keys) created before component development to prevent hardcoded text
- [Phase 04-02]: Safe circular dependency pattern between auth.store and apiClient (both use lazy getState())
- [Phase 04-02]: i18n locale type issue fixed with fallback to 'cs' (blocking type-check error)
- [Phase 05-02]: Callback-based amqplib API used for better TypeScript type support over promise-based API
- [Phase 05-02]: Fire-and-forget event publishing for MVP (reliable delivery with retry deferred to Phase 7)
- [Phase 05-02]: Topic exchange (schedulebox.events) with routing key derivation (com.schedulebox.booking.created → booking.created)
- [Phase 05-01]: Schema-only exports from schemas/ files, types inferred in types/ files to avoid TS module conflicts
- [Phase 05-01]: z.coerce.number() for query parameters enables automatic string-to-number conversion
- [Phase 05-01]: Dual .refine() validation on availability date range for specific error messages (date_to >= date_from, max 31 days)
- [Phase 05-03]: Buffer times applied ONLY to existing bookings (expand blocked range), NOT to new slots - prevents double-buffering
- [Phase 05-03]: Single-pass availability calculation (one query per employee+date) avoids N+1 query anti-pattern
- [Phase 05-03]: Working hours override priority - check overrides first, fall back to regular hours if no override exists
- [Phase 05-03]: 15-minute slot intervals for availability generation (industry standard, prevents excessive slot count)

## Blockers

None — Phase 4 in progress.

## Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Requirements | 103 | ~35 implemented (infra + database + auth + core entities) |
| Phases | 15 | 3 complete, ready for Phase 4 |
| DB Tables | 47 | 47 (all schemas + views + relations complete) |
| API Endpoints | 99 | ~39 (auth, customers, services, employees, resources, settings, tags, health) |
| Frontend Components | 32+ | 0 |
| Test Coverage | 80% | 0% |

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files | Commits |
|------------|----------|-------|-------|---------|
| 01-a | 89s | 3 | 9 | 3 |
| 01-b | 115s | 2 | 18 | 2 |
| 01-c | 114s | 2 | 8 | 1 |
| 01-d | 81s | 2 | 2 | 2 |
| 01-e | 116s | 3 | 7 | 3 |
| 01-f | 46s | 2 | 2 | 2 |
| 01-g | 203s | 2 | 5 | 2 |
| 02-02 | 240s | 2 | 2 | 2 |
| 02-03 | 139s | 2 | 5 | 2 |
| 02-04 | 328s | 2 | 3 | 2 |
| 02-05 | 444s | 2 | 4 | 2 |
| 02-06 | 485s | 2 | 9 | 1 |
| 02-07 | 146s | 1 | 2 | 1 |
| 02-09 | 113s | 2 | 8 | 2 |
| 02-08 | 640s | 2 | 9 | 2 |
| 03-01 | 175s | 2 | 7 | 2 |
| 03-03 | 220s | 2 | 5 | 2 |
| 03-05 | 426s | 2 | 12 | 1 |
| 03-06 | 335s | 2 | 10 | 2 |
| 03-02 | 340s | 2 | 5 | 2 |
| 03-04 | 420s | 2 | 9 | 3 |
| 03-07 | 313s | 2 | 11 | 3 |
| 03-08 | 233s | 2 | 7 | 2 |
| 04-01 | 596s | 3 | 19 | 3 |
| 04-02 | 368s | 2 | 9 | 2 |
| 04-03 | 471s | 2 | 8 | 2 |
| 05-02 | 273s | 2 | 6 | 2 |
| 05-01 | 200s | 2 | 6 | 2 |
| 05-03 | 500s | 2 | 3 | 2 |

## Session Info

**Last session:** 2026-02-11
**Stopped at:** Completed Plan 05-03 — Availability Engine & Public API

---
*Last updated: 2026-02-11 after completing Plan 05-03*

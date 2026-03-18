# Phase 50: Testing & Hardening - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Achieve 80% Vitest unit test coverage on critical business logic, expand Playwright E2E to cover admin impersonation and marketplace flows, ensure Testcontainers integration tests run cleanly in CI (graceful skip local without Docker), set up Storybook 8 for glass design system component catalog, and implement DB partitioning (bookings, notifications, audit_logs by month) with reversible migrations.

</domain>

<decisions>
## Implementation Decisions

### Test Coverage Strategy

- Priority order: 1) availability-engine (≥90% branch), 2) payment saga (≥85% branch), 3) booking-service, 4) booking-transitions/expiration
- Mock external dependencies (Neon DB, Upstash Redis, Twilio) in unit tests — integration tests cover real DB via Testcontainers
- CI fails build if coverage drops below 80% (already configured in vitest.shared.ts)
- Testcontainers: CI-only with graceful skip locally (user doesn't have Docker)

### E2E Test Scope

- Add admin impersonation E2E flow (required by TEST-02)
- Add marketplace search/booking E2E flow (covers newest feature)
- E2E database: Claude's discretion (Neon branch vs CI PostgreSQL service — success criterion says "Neon test database", CI already configures PG service)
- Existing 5 specs stay (auth, booking, payment, AI fallback, widget visual)

### Storybook Setup

- Storybook 8 with Vite builder (fastest)
- Stories colocated next to components (e.g., Button.stories.tsx)
- Visual documentation only — no interaction testing (covered by Playwright)
- Components to document: Button, Card, Dialog, Badge, DataTable — all CVA glass variants
- Deployment: Claude's discretion (dev-only recommended for small team)

### DB Partitioning

- Conservative migration: create partitioned table → migrate data in batches → swap with RENAME → keep rollback script
- All three tables: bookings (by month), notifications (by month), audit_logs (by month)
- Partition range: Claude's discretion (all historical data + pre-create future months)
- Test on Neon branch before production
- Raw SQL migration (not Drizzle — Drizzle doesn't support native PG partitioning)

### Claude's Discretion

- E2E database choice (Neon branch vs CI PostgreSQL service)
- Storybook deployment model
- Partition range (how many months back/ahead)
- Which additional lib/ files to cover for 80% target beyond the 4 priority files
- Auto-partition creation strategy (Vercel Cron or manual)

</decisions>

<specifics>
## Specific Ideas

- Test the double-booking prevention path heavily — it's the most critical business logic
- Payment saga idempotency should have explicit test cases (duplicate webhook callbacks)
- Storybook should show the glassmorphism variants clearly — glass-surface, glass-surface-heavy, etc.
- DB partitioning rollback script is mandatory — Neon doesn't support time-travel for DDL changes

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `vitest.config.ts`: Root config with 5 project workspaces, 80% thresholds
- `vitest.shared.ts`: Shared config (happy-dom, v8 coverage, global thresholds)
- `vitest.integration.config.ts`: Testcontainers setup with 30s timeout, globalSetup
- `apps/web/e2e/playwright.config.ts`: Multi-browser (Chrome, Firefox, Safari), visual regression projects
- `apps/web/e2e/auth.setup.ts`: Authenticated storage state for E2E
- `.github/workflows/ci.yml`: Full pipeline — lint → unit → integration → build → E2E
- 11 existing unit tests (security libs, schemas, utils)
- 5 existing E2E specs (auth, booking, payment, AI fallback, widget)
- 5 existing integration tests (double-booking, RLS, status transitions, payment webhook, location switch)

### Established Patterns

- Unit tests: `*.test.ts` colocated with source, happy-dom environment for React
- E2E tests: `apps/web/e2e/tests/*.spec.ts`, Playwright projects with auth setup dependency
- Integration tests: `tests/integration/**/*.test.ts`, serial execution, 120s hook timeout
- Coverage: v8 provider, thresholds per package in vitest configs
- Mocking: MSW handlers in `apps/web/__tests__/msw-handlers.test.ts`

### Integration Points

- `apps/web/lib/booking/booking-service.ts`: Core booking CRUD with double-booking prevention — needs unit tests
- `apps/web/app/api/v1/payments/saga/booking-payment-handlers.ts`: Payment state machine — needs unit tests
- `apps/web/lib/booking/booking-transitions.ts`: Status transition logic — needs unit tests
- `apps/web/lib/booking/booking-expiration.ts`: Booking expiry logic — needs unit tests
- `packages/database/src/schema/bookings.ts`: Partition target — raw SQL migration alongside Drizzle schema
- `packages/database/src/schema/platform.ts`: audit_logs partition target
- `packages/database/src/schema/notifications.ts`: notifications partition target
- `apps/web/components/ui/`: Button, Card, Dialog, Badge — Storybook targets
- `apps/web/components/shared/data-table.tsx`: DataTable — Storybook target

</code_context>

<deferred>
## Deferred Ideas

- Per-company payment gateway configuration (businesses plug in their own Comgate/Stripe merchant account instead of platform-level credentials) — significant feature, own phase
- Component interaction testing in Storybook (play functions) — unnecessary while Playwright covers interactions
- Visual regression testing in Storybook via Chromatic — evaluate after team grows

</deferred>

---

_Phase: 50-testing-hardening_
_Context gathered: 2026-03-18_

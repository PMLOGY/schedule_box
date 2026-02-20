---
phase: 17-integration-testing
plan: 01
subsystem: testing
tags: [testcontainers, postgresql, redis, rabbitmq, vitest, drizzle-orm, rls, integration-tests]

requires:
  - phase: 16-testing-foundation
    provides: Vitest 4.0 installed, vitest.shared.ts base config, test:coverage scripts in CI

provides:
  - Testcontainers infrastructure for PostgreSQL 16, Redis 7, RabbitMQ 3.13
  - vitest.integration.config.ts with 30s test / 120s hook timeouts, sequential execution
  - globalSetup.ts that starts containers, runs migrations + 11 SQL files, creates test_app RLS role
  - test-db.ts with superuser and non-superuser DB access, setRlsContext, truncateAllTables
  - seed-helpers.ts factories for company, user, service, employee, junction, customer, booking
  - pnpm test:integration script for running integration tests in isolation
  - tsconfig.integration.json for monorepo path resolution in integration tests

affects:
  - 17-integration-testing/17-02 (DB/RLS integration tests)
  - 17-integration-testing/17-03 (booking flow integration tests)
  - Any future phase needing Testcontainers or live DB for testing

tech-stack:
  added:
    - testcontainers@11.12.0
    - '@testcontainers/postgresql@11.12.0'
    - '@testcontainers/redis@11.12.0'
    - '@testcontainers/rabbitmq@11.12.0'
  patterns:
    - GlobalSetup pattern: containers start once per test suite, not per test
    - RLS testing pattern: superuser role for seeding, test_app non-superuser for policy enforcement
    - TRUNCATE companies CASCADE pattern: fastest cleanup since all tables FK to companies
    - SET LOCAL pattern: RLS context scoped to transaction, not session

key-files:
  created:
    - vitest.integration.config.ts
    - tests/integration/globalSetup.ts
    - tests/integration/helpers/test-db.ts
    - tests/integration/helpers/seed-helpers.ts
    - tsconfig.integration.json
  modified:
    - package.json (added test:integration script and testcontainers devDependencies)

key-decisions:
  - 'testcontainers@11.12.0 with @testcontainers/postgresql/redis/rabbitmq: separate typed packages per container type'
  - 'GlobalSetup receives TestProject (not GlobalSetupContext): Vitest 4 changed the parameter type'
  - 'vitest.integration.config.ts is NOT added to root vitest.config.ts projects array: integration tests run separately via pnpm test:integration to isolate Docker dependency from unit tests'
  - 'test_app non-superuser role created in PG: superusers bypass RLS so a regular role is required for RLS policy testing'
  - 'TRUNCATE companies CASCADE for cleanup: fastest method since all tenant tables ultimately FK to companies'
  - 'SET LOCAL (not SET) for RLS context: scopes session variables to current transaction only, preventing cross-test contamination'
  - 'tsconfig.integration.json with explicit paths to packages/database/node_modules: drizzle-orm and postgres are not hoisted to root node_modules in pnpm'
  - 'Date.now() suffix on seed emails: prevents unique constraint violations when factories called multiple times in same test run'

patterns-established:
  - 'Container lifecycle: start all 3 in parallel via Promise.all, teardown in parallel'
  - 'Schema setup order: Drizzle migrations first, then SQL files in fixed order (RLS functions, DB functions, composite indexes, RLS policies)'
  - 'Connection provision: DATABASE_URL (superuser) + DATABASE_URL_APP (test_app) + REDIS_URL + RABBITMQ_URL via project.provide/inject'
  - 'Seed factory pattern: each factory takes db + params with companyId required, returns full row via .returning()'

duration: 8min
completed: 2026-02-20
---

# Phase 17 Plan 01: Integration Testing Infrastructure Summary

**Testcontainers setup with PostgreSQL 16, Redis 7, and RabbitMQ 3.13 — full schema (migrations + RLS + triggers + indexes) applied in globalSetup, with superuser/non-superuser DB helpers and entity seed factories**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T18:06:14Z
- **Completed:** 2026-02-20T18:14:13Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- Testcontainers installed (testcontainers + 3 typed @testcontainers packages) as root devDependencies
- globalSetup.ts starts 3 containers in parallel, applies Drizzle migrations + all 11 SQL files, creates test_app RLS role, provides 4 connection strings
- test-db.ts provides createTestDb (superuser), createTestAppDb (non-superuser for RLS), setRlsContext (SET LOCAL), truncateAllTables (TRUNCATE companies CASCADE)
- seed-helpers.ts provides 7 factories: seedCompany, seedUser, seedService, seedEmployee, seedEmployeeService, seedCustomer, seedBooking
- vitest.integration.config.ts: separate from root config, 30s test timeout, 120s hook timeout, node environment, sequential execution

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Testcontainers and create integration test config** - `188665d` (chore)
2. **Task 2: Create globalSetup, test-db helpers, and seed helpers** - `03df39c` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `vitest.integration.config.ts` - Separate Vitest config for integration tests: node env, 30s/120s timeouts, sequential, no coverage
- `tests/integration/globalSetup.ts` - Container lifecycle (PG 16, Redis 7, RabbitMQ 3.13), schema setup, provides 4 connection strings
- `tests/integration/helpers/test-db.ts` - DB connection factories + RLS context setter + table truncation
- `tests/integration/helpers/seed-helpers.ts` - Entity factories for all 7 required entity types
- `tsconfig.integration.json` - Monorepo path resolution for integration test TypeScript compilation
- `package.json` - Added testcontainers devDependencies + test:integration script

## Decisions Made

- Vitest 4 changed globalSetup parameter type from `GlobalSetupContext` (old) to `TestProject` (Vitest 4) — used `TestProject` from `vitest/node`
- Integration tests run via separate `pnpm test:integration` script, NOT in root `vitest.config.ts` projects array — isolates Docker dependency from fast unit test runs
- `SET LOCAL` (not `SET`) for RLS context variables — scopes context to transaction only, prevents cross-test contamination
- Non-superuser `test_app` role is required because PostgreSQL superusers bypass RLS policies entirely
- `TRUNCATE companies CASCADE` is the fastest cleanup approach since all 47 tables ultimately reference companies via foreign keys
- `tsconfig.integration.json` uses paths pointing to `packages/database/node_modules/drizzle-orm` and `postgres` — pnpm does not hoist these to root node_modules by default

## Deviations from Plan

None - plan executed exactly as written.

One discovery handled without deviation: `GlobalSetupContext` from `vitest/node` does not exist in Vitest 4.0 — the correct type is `TestProject`. This was corrected immediately during Task 2 implementation without changing the plan's intent.

## Issues Encountered

- Vitest 4.0 renamed `GlobalSetupContext` to `TestProject` — plan referenced the old type name. Fixed by checking vitest/node exports directly and using `TestProject` instead.
- `drizzle-orm` and `postgres` are not hoisted to root node_modules by pnpm — added `tsconfig.integration.json` with explicit paths to resolve these for TypeScript compilation checks.

## User Setup Required

None - no external service configuration required. Testcontainers pulls Docker images automatically when tests run.

**Note:** Docker must be running on the host machine for `pnpm test:integration` to work. Testcontainers requires Docker to start containers.

## Next Phase Readiness

- Infrastructure complete: Plans 17-02 and 17-03 can now write `.test.ts` files that use globalSetup, createTestDb, and seed helpers
- `pnpm test:integration` command exists and returns "No test files found" (expected — tests added in 17-02 and 17-03)
- TypeScript compiles cleanly for all integration test infrastructure files via `tsconfig.integration.json`

---

_Phase: 17-integration-testing_
_Completed: 2026-02-20_

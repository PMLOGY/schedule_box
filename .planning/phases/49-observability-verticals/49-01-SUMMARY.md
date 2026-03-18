---
phase: 49-observability-verticals
plan: 01
subsystem: infra
tags: [opentelemetry, otel, vercel, tracing, logging, observability, winston, structured-logs]

# Dependency graph
requires:
  - phase: 45-infrastructure-migration
    provides: Vercel/Neon deployment base this observability layer targets
  - phase: 46-security-hardening
    provides: instrumentation.ts Sentry registration that OTel must coexist with
provides:
  - '@vercel/otel registered in instrumentation.ts with serviceName=schedulebox'
  - 'route-logger helper: logRouteComplete + getRequestId for structured JSON logs'
  - 'Request ID generated in middleware (crypto.randomUUID), propagated via X-Request-Id header'
  - '10% trace sampling documented and configured via OTEL env vars'
  - 'OTEL custom spans on 3 critical routes: auth/login, bookings GET/POST, public booking POST'
affects: [50-testing-hardening, observability-dashboard, sentry-integration]

# Tech tracking
tech-stack:
  added:
    - '@vercel/otel (OTEL registration for Vercel deployment)'
    - '@opentelemetry/api (trace.getTracer, span APIs)'
    - '@opentelemetry/sdk-logs'
    - '@opentelemetry/api-logs'
    - '@opentelemetry/instrumentation'
  patterns:
    - 'registerOTel called unconditionally at top of instrumentation.ts register() — no runtime guard'
    - 'Custom spans via trace.getTracer("schedulebox").startActiveSpan()'
    - 'logRouteComplete called on every exit path (success, MFA challenge, suspension, error)'
    - 'x-request-id header lowercase for API routes, X-Request-Id canonical for HTTP clients'

key-files:
  created:
    - apps/web/lib/logger/route-logger.ts
    - apps/web/lib/logger/__tests__/route-logger.test.ts
  modified:
    - apps/web/instrumentation.ts
    - apps/web/middleware.ts
    - apps/web/app/api/v1/auth/login/route.ts
    - apps/web/app/api/v1/bookings/route.ts
    - apps/web/app/api/v1/public/company/[slug]/bookings/route.ts
    - apps/web/package.json
    - packages/shared/package.json
    - .env.example

key-decisions:
  - '@vercel/otel registerOTel called without NEXT_RUNTIME guard — @vercel/otel handles both runtimes internally'
  - '@schedulebox/shared/logger subpath export added to packages/shared/package.json to expose logInfo/logError without bundling winston into main index'
  - 'Public booking handler extracted to _handlePublicBookingCreate() to avoid naming collision between reqStartTime tracking and booking startTime variable'
  - 'startActiveSpan used instead of startSpan — startActiveSpan sets active context for child spans automatically'
  - 'OTEL_TRACES_SAMPLER=parentbased_traceidratio + OTEL_TRACES_SAMPLER_ARG=0.1 via env vars (documented in .env.example); set in Vercel project settings for production'

patterns-established:
  - 'Route instrumentation pattern: const startTime = Date.now(); const requestId = getRequestId(req); + span + logRouteComplete in finally'
  - 'Span naming: schedulebox.{domain}.{action} (e.g. schedulebox.auth.login, schedulebox.booking.create)'
  - 'No PII in span attributes — auth spans only carry success/failure/suspension boolean attrs'

requirements-completed: [OBS-01, OBS-02]

# Metrics
duration: 33min
completed: 2026-03-18
---

# Phase 49 Plan 01: Observability — OTEL Tracing + Structured Logging Summary

**@vercel/otel registered with 10% sampling, route-logger helper with structured JSON + request ID correlation, custom spans on auth/login and booking creation/listing**

## Performance

- **Duration:** 33 min
- **Started:** 2026-03-18T20:13:57Z
- **Completed:** 2026-03-18T20:46:54Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- `@vercel/otel` installed and `registerOTel({ serviceName: 'schedulebox' })` called unconditionally at the top of `instrumentation.ts` `register()`, before any Sentry runtime guards
- `apps/web/lib/logger/route-logger.ts` created with `logRouteComplete` and `getRequestId` — produces structured JSON log entries compatible with Vercel log drain
- Request ID generation added to `middleware.ts` via `crypto.randomUUID()`, attached as `X-Request-Id` and `x-request-id` headers on all responses including redirects
- 10% trace sampling configured via `OTEL_TRACES_SAMPLER=parentbased_traceidratio` + `OTEL_TRACES_SAMPLER_ARG=0.1` documented in `.env.example` for Vercel project settings
- Custom OTEL spans on 3 critical routes: `schedulebox.auth.login`, `schedulebox.booking.list`, `schedulebox.booking.create`
- Unit tests: 4 test cases in `route-logger.test.ts` — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @vercel/otel + register + request ID middleware + route-logger + sampling config** - `4a77005` (feat)
2. **Task 2: Add custom spans + route logging to critical API routes** - `a980071` (feat)

## Files Created/Modified

- `apps/web/lib/logger/route-logger.ts` — logRouteComplete (structured JSON) + getRequestId helper
- `apps/web/lib/logger/__tests__/route-logger.test.ts` — 4 unit tests (vi.mock @schedulebox/shared/logger)
- `apps/web/instrumentation.ts` — registerOTel added before Sentry runtime guards
- `apps/web/middleware.ts` — crypto.randomUUID() request ID, X-Request-Id on all response types
- `apps/web/app/api/v1/auth/login/route.ts` — schedulebox.auth.login span + logRouteComplete on all exit paths
- `apps/web/app/api/v1/bookings/route.ts` — schedulebox.booking.list span for GET and POST
- `apps/web/app/api/v1/public/company/[slug]/bookings/route.ts` — schedulebox.booking.create span
- `apps/web/package.json` — added @vercel/otel + opentelemetry packages
- `packages/shared/package.json` — added ./logger subpath export
- `.env.example` — OTEL_TRACES_SAMPLER + OTEL_TRACES_SAMPLER_ARG documented

## Decisions Made

- `registerOTel` called without `NEXT_RUNTIME` guard — per @vercel/otel documentation, it handles both nodejs and edge runtimes internally. Wrapping it in a runtime guard would prevent edge instrumentation.
- Added `./logger` subpath export to `@schedulebox/shared/package.json` because `logInfo`/`logError` were only available via `@schedulebox/shared/logger` subpath (excluded from main index to prevent winston bundling into client bundles).
- Public booking handler extracted to `_handlePublicBookingCreate()` standalone function to resolve naming collision between `startTime` (request timing) and `startTime` (booking start Date object).
- `startActiveSpan` chosen over `startSpan` — sets the new span as active context so any nested spans (DB calls etc.) are automatically parented.
- No PII in span attributes (auth route) — boolean flags only: `auth.login_success`, `auth.mfa_required`, `auth.company_suspended`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added ./logger subpath export to @schedulebox/shared package.json**

- **Found during:** Task 1 (route-logger.ts creation)
- **Issue:** Plan said `import { logInfo, logError } from '@schedulebox/shared'` but main index explicitly excludes logger (comment says "heavy OpenTelemetry SDK — import directly via subpath"). Build failed with "Module has no exported member 'logInfo'".
- **Fix:** Added `"./logger": { "types": "./src/logger/index.ts", "default": "./src/logger/index.ts" }` to packages/shared/package.json exports; updated route-logger.ts and test to use `@schedulebox/shared/logger` subpath.
- **Files modified:** packages/shared/package.json, apps/web/lib/logger/route-logger.ts, apps/web/lib/logger/__tests__/route-logger.test.ts
- **Verification:** Build passes, tsc --noEmit clean, tests pass
- **Committed in:** 4a77005 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed naming collision in public booking handler**

- **Found during:** Task 2 (public booking route instrumentation)
- **Issue:** Both the timing parameter (`startTime: number`) and the existing booking logic (`const startTime = new Date(body.start_time)`) used the same identifier, causing TS2300 duplicate identifier error and TS2339 `.getTime()` on number.
- **Fix:** Renamed timing parameter to `reqStartTime` and passed it as `reqStartTime: startTime` from the span wrapper.
- **Files modified:** apps/web/app/api/v1/public/company/[slug]/bookings/route.ts
- **Verification:** tsc --noEmit clean, build passes
- **Committed in:** a980071 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed inline import() type annotation rejected by ESLint**

- **Found during:** Task 2 (public booking route)
- **Issue:** `span: import('@opentelemetry/api').Span` in function signature violated `@typescript-eslint/consistent-type-imports` ESLint rule.
- **Fix:** Added `import { type Span, trace } from '@opentelemetry/api'` at file top, replaced inline import() with `span: Span`.
- **Files modified:** apps/web/app/api/v1/public/company/[slug]/bookings/route.ts
- **Verification:** Build passes cleanly
- **Committed in:** a980071 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep. Plan delivered exactly as specified.

## Issues Encountered

- Linter (Husky + lint-staged) reverted instrumentation.ts and middleware.ts on first commit attempt — re-wrote files and staged correctly on second attempt.
- Build interrupted due to 120s timeout on first build attempt — cleared .next cache, ran successfully on second attempt.

## User Setup Required

To activate 10% trace sampling in production, set these in **Vercel project settings → Environment Variables**:

```
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

Without these, all traces are sampled (100%) which is fine for development but expensive in production.

## Next Phase Readiness

- OTEL tracing foundation is live — future routes can add spans using the same `trace.getTracer('schedulebox').startActiveSpan(...)` pattern
- `logRouteComplete` helper available for all API routes via `@/lib/logger/route-logger`
- Remaining 49-observability-verticals plans can build on this infrastructure

---

_Phase: 49-observability-verticals_
_Completed: 2026-03-18_

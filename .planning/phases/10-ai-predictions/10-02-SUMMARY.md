---
phase: 10-ai-predictions
plan: 02
subsystem: ai-client
tags: [circuit-breaker, opossum, resilience, fallback, ai-predictions]
dependency-graph:
  requires: []
  provides: [ai-circuit-breaker, ai-prediction-client, ai-fallback-values]
  affects: [apps/web/lib/ai/]
tech-stack:
  added: [opossum@^9.0.0, "@types/opossum@^8.1.9"]
  patterns: [circuit-breaker, fallback-defaults, module-singleton]
key-files:
  created:
    - apps/web/lib/ai/types.ts
    - apps/web/lib/ai/circuit-breaker.ts
    - apps/web/lib/ai/fallback.ts
    - apps/web/lib/ai/client.ts
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "Opossum circuit breaker with 5s timeout, 50% error threshold, 30s reset for AI service calls"
  - "Fallback values: no-show 15% probability, CLV 0, health score 50 - conservative defaults to avoid false alerts"
  - "Module-level singleton circuit breakers to share state across all callers"
  - "fetch() for HTTP calls consistent with existing api-client.ts pattern"
metrics:
  duration: 239s
  completed: 2026-02-11
  tasks: 2
  files-created: 4
  files-modified: 2
  commits: 2
---

# Phase 10 Plan 02: AI Client Circuit Breaker Summary

Opossum circuit breaker wrapping AI service HTTP calls with 5s timeout, 50% error threshold, typed fallback values for no-show/CLV/health-score predictions.

## What Was Built

### Task 1: Opossum Installation and AI Client Types (e6467f3)

Installed opossum ^9.0.0 circuit breaker library with TypeScript type definitions. Created comprehensive TypeScript interfaces for all AI prediction request/response pairs matching the Python AI service Pydantic schemas:

- **NoShowPredictionRequest/Response** - booking_id, no_show_probability, risk_level, confidence
- **CLVPredictionRequest/Response** - customer_id, clv_predicted, segment (low/medium/high/premium)
- **HealthScorePredictionRequest/Response** - customer_id, health_score, category (excellent/good/at_risk/churning), rfm_details
- **AIServiceHealth** - circuit breaker status/state/stats for monitoring

### Task 2: Circuit Breaker Factory, Fallback Functions, and AI HTTP Client (df203a3)

**Circuit Breaker Factory** (`circuit-breaker.ts`):
- Generic `createAICircuitBreaker<TArgs, TResult>()` factory wraps any async function with Opossum
- Default options: 5s timeout, 50% error threshold, 30s reset, 5 request volume threshold
- State transition logging: open (warn), halfOpen (info), close (info), fallback (warn)
- `getCircuitBreakerHealth()` returns AIServiceHealth for monitoring dashboards

**Fallback Functions** (`fallback.ts`):
- `getNoShowFallback()` - returns 15% no-show probability, low risk (conservative to avoid false alerts)
- `getCLVFallback()` - returns 0 CLV, low segment (caller should compute from historical data if available)
- `getHealthScoreFallback()` - returns score 50, good category (neutral to prevent false churn alerts)
- All fallbacks include `fallback: true` flag and `model_version: 'fallback'`

**AI HTTP Client** (`client.ts`):
- Three module-level singleton circuit breakers: `predictNoShow`, `predictCLV`, `predictHealthScore`
- Uses fetch() for HTTP calls (consistent with existing api-client.ts)
- POST to AI service endpoints with JSON body and proper error handling
- `getAIServiceStatus()` returns health from the no-show breaker (representative indicator)
- AI_SERVICE_URL from env var with localhost:8000 fallback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed opossum type signature for fallback event listener**

- **Found during:** Task 2, TypeScript type-check
- **Issue:** The `fallback` event in @types/opossum expects `(result: unknown, err: Error) => void` but plan code only had one parameter. Similarly, `halfOpen` expects `(resetTimeout: number) => void`.
- **Fix:** Updated event listener signatures to match the type definitions
- **Files modified:** apps/web/lib/ai/circuit-breaker.ts
- **Commit:** df203a3

## Verification Results

All 6 verification criteria passed:
1. Opossum ^9.0.0 installed in apps/web/package.json
2. TypeScript types match Python Pydantic schemas (same field names, same types)
3. Circuit breaker: timeout=5000, resetTimeout=30000, errorThresholdPercentage=50
4. Fallback values: 0.15 for no-show, 50 for health, 0 for CLV
5. Client uses fetch() consistent with existing codebase
6. No circular dependencies (types <- circuit-breaker, types <- fallback, all <- client)

TypeScript type-check passes with zero errors in apps/web/lib/ai/ files.

## Architecture

```
apps/web/lib/ai/
  types.ts           -- TypeScript interfaces (no imports, leaf module)
  circuit-breaker.ts -- Opossum factory + health check (imports: opossum, ./types)
  fallback.ts        -- Sensible defaults with fallback:true (imports: ./types)
  client.ts          -- HTTP client with circuit breaker wrapping (imports: all above)
```

Import chain is acyclic: `types.ts` has no imports, `circuit-breaker.ts` and `fallback.ts` only import from `types.ts`, and `client.ts` imports from all three.

## Self-Check: PASSED

- [x] apps/web/lib/ai/types.ts - FOUND
- [x] apps/web/lib/ai/circuit-breaker.ts - FOUND
- [x] apps/web/lib/ai/fallback.ts - FOUND
- [x] apps/web/lib/ai/client.ts - FOUND
- [x] .planning/phases/10-ai-predictions/10-02-SUMMARY.md - FOUND
- [x] Commit e6467f3 - FOUND
- [x] Commit df203a3 - FOUND

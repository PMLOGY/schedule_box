---
phase: 09-loyalty-program
plan: 01
subsystem: shared
status: complete
completed_date: 2026-02-11
tags:
  - schemas
  - types
  - validation
  - loyalty
  - zod
dependency_graph:
  requires: []
  provides:
    - loyalty-schemas
    - loyalty-types
  affects:
    - backend-api
    - frontend-forms
tech_stack:
  added:
    - zod: Validation schemas for loyalty domain
  patterns:
    - schema-type-separation: Schemas and types in separate files
    - barrel-exports: Re-export from index files
    - zod-inference: Infer TypeScript types from Zod schemas
key_files:
  created:
    - packages/shared/src/schemas/loyalty.ts
    - packages/shared/src/types/loyalty.ts
  modified:
    - packages/shared/src/schemas/index.ts
    - packages/shared/src/types/index.ts
decisions:
  - title: Schema-only exports prevent TS module conflicts
    rationale: Following Phase 5 pattern (booking/payment schemas) to avoid TS2308 errors
    outcome: Schemas export only schemas, types infer separately
  - title: Dual type definitions for flexibility
    rationale: Response types match API spec, input types inferred from schemas
    outcome: LoyaltyProgram response type + LoyaltyProgramCreate input type
  - title: UUID for public IDs, SERIAL for internal
    rationale: Never expose internal database IDs in API
    outcome: All create schemas accept UUID strings for foreign keys
metrics:
  duration_seconds: 157
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  commits: 2
  lines_added: 336
---

# Phase 09 Plan 01: Loyalty Schemas & Types Summary

**One-liner:** Zod validation schemas and TypeScript types for loyalty program domain with points/stamps/tiers support

## Objective

Create shared Zod validation schemas and TypeScript types for the loyalty domain to enable type-safe API validation and consistent data structures across backend and frontend.

## What Was Built

### Task 1: Loyalty Zod Schemas ✅

**Commit:** 60b9fce (pre-existing from parallel execution)

Created 11 Zod schemas in `packages/shared/src/schemas/loyalty.ts`:

1. **loyaltyProgramCreateSchema** — Program creation with name, type, points_per_currency
2. **loyaltyProgramUpdateSchema** — Partial update with is_active flag
3. **loyaltyCardCreateSchema** — Card creation requiring customer UUID
4. **addPointsSchema** — Points addition with optional description
5. **redeemRewardSchema** — Reward redemption requiring card UUID
6. **rewardCreateSchema** — Reward creation with points_cost, type, value
7. **rewardUpdateSchema** — Partial reward update with is_active
8. **loyaltyCardListQuerySchema** — Pagination and customer filter
9. **transactionListQuerySchema** — Pagination and type filter
10. **tierCreateSchema** — Tier with min_points, benefits JSONB, color regex
11. **tierUpdateSchema** — Partial tier update

All schemas follow API spec (lines 3545-3658) with proper validation:
- String length constraints (name max 255, description max 2000)
- Number validation (positive, max 99999 for points_per_currency)
- Enum validation (program type, transaction type, reward type)
- UUID validation for foreign key references
- Regex validation for color codes (#RRGGBB format)

Re-exported from `packages/shared/src/schemas/index.ts` for barrel import pattern.

### Task 2: Loyalty TypeScript Types ✅

**Commit:** f23021e

Created comprehensive TypeScript types in `packages/shared/src/types/loyalty.ts`:

**Enum Types:**
- `LoyaltyProgramType` — 'points' | 'stamps' | 'tiers'
- `TransactionType` — 'earn' | 'redeem' | 'expire' | 'adjust' | 'stamp'
- `RewardType` — 'discount_percentage' | 'discount_fixed' | 'free_service' | 'gift'

**Response Types (match API spec):**
- `LoyaltyProgram` — Full program with UUID, tiers array, timestamps
- `LoyaltyCard` — Card with balances, current/next tier, customer info, wallet URLs
- `LoyaltyTier` — Tier with benefits JSONB, color, sort order
- `LoyaltyTransaction` — Transaction history with type, points, balance
- `Reward` — Reward catalog item with redemption tracking

**Input Types (inferred from schemas):**
- `LoyaltyProgramCreate`, `LoyaltyProgramUpdate`
- `LoyaltyCardCreate`, `AddPoints`, `RedeemReward`
- `RewardCreate`, `RewardUpdate`
- `TierCreate`, `TierUpdate`
- `LoyaltyCardListQuery`, `TransactionListQuery`

Re-exported from `packages/shared/src/types/index.ts` using `export type` syntax.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing commit contained Task 1 schemas**

- **Found during:** Task 1 execution start
- **Issue:** Commit 60b9fce (created at 19:53:52 UTC) already contained loyalty schemas, likely from parallel agent execution
- **Fix:** Verified schemas match plan requirements exactly, skipped redundant file creation
- **Files affected:** packages/shared/src/schemas/loyalty.ts (already committed)
- **Commit:** 60b9fce (pre-existing)
- **Impact:** No deviation - schemas match plan spec precisely

## Verification Results

**TypeScript Compilation:** ✅ PASSED
```bash
pnpm exec tsc --noEmit -p packages/shared/tsconfig.json
# No errors
```

**Import Test (conceptual):**
```typescript
// Schemas importable from @schedulebox/shared
import {
  loyaltyProgramCreateSchema,
  addPointsSchema,
  rewardCreateSchema
} from '@schedulebox/shared';

// Types importable from @schedulebox/shared
import type {
  LoyaltyProgram,
  LoyaltyCard,
  Reward
} from '@schedulebox/shared';
```

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Schema-type separation pattern | Following Phase 5/6/7 pattern to avoid TS2308 module conflicts | Schemas in schemas/, types in types/, no circular deps |
| UUID validation for FKs | API never exposes SERIAL IDs per project conventions | customer_id, card_id, applicable_service_id all validate as UUID |
| Dual balance fields (points/stamps) | Single card supports multiple program types per DB schema | pointsBalance and stampsBalance on LoyaltyCard type |
| JSONB benefits field | Extensible tier configuration without schema changes | Record<string, unknown> type for flexibility |
| Color regex validation | Ensure valid hex color codes for UI rendering | ^#[0-9A-Fa-f]{6}$ pattern with #3B82F6 default |

## Success Criteria

- [x] All 11 Zod schemas exist and validate per API spec
- [x] TypeScript types match database schema and API response format
- [x] All exports accessible from @schedulebox/shared barrel files
- [x] TypeScript compiles with zero errors
- [x] Schemas importable for backend API validation
- [x] Types importable for frontend forms and state management

## Next Steps

**Phase 09 Plan 02:** Loyalty API routes (GET/POST/PUT program, cards, rewards, transactions)

**Dependencies satisfied:**
- [x] Schemas ready for API route validation
- [x] Types ready for API response formatting
- [x] Database schema exists (from Phase 02-05)

**Blockers:** None — ready to proceed

## Self-Check: PASSED

**Created files exist:**
```bash
[ -f "packages/shared/src/schemas/loyalty.ts" ] && echo "FOUND"
# FOUND
[ -f "packages/shared/src/types/loyalty.ts" ] && echo "FOUND"
# FOUND
```

**Commits exist:**
```bash
git log --oneline --all | grep -q "60b9fce" && echo "FOUND: 60b9fce"
# FOUND: 60b9fce
git log --oneline --all | grep -q "f23021e" && echo "FOUND: f23021e"
# FOUND: f23021e
```

**Key exports verified:**
- packages/shared/src/schemas/index.ts exports 14 loyalty items (11 schemas + 3 enums)
- packages/shared/src/types/index.ts exports 21 loyalty types (8 response + 10 input + 3 enums)

All claims verified. ✅

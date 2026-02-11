---
phase: 09-loyalty-program
plan: 07
subsystem: frontend
status: complete
completed_date: 2026-02-11
tags:
  - loyalty
  - dashboard
  - admin-pages
  - tanstack-query
  - zustand
  - shadcn-ui
dependency_graph:
  requires:
    - loyalty-crud-api
    - loyalty-points-endpoints
    - wallet-api-endpoints
    - loyalty-schemas
    - loyalty-types
  provides:
    - loyalty-admin-dashboard
    - loyalty-query-hooks
    - loyalty-ui-store
  affects:
    - admin-navigation
    - customer-engagement-workflow
tech_stack:
  added: []
  patterns:
    - TanStack Query hooks with mutation invalidation
    - Zustand store for UI dialog state
    - shadcn/ui admin dashboard pages with pagination
key_files:
  created:
    - apps/web/hooks/use-loyalty-queries.ts
    - apps/web/stores/loyalty.store.ts
    - apps/web/app/[locale]/(dashboard)/loyalty/page.tsx
    - apps/web/app/[locale]/(dashboard)/loyalty/rewards/page.tsx
    - apps/web/app/[locale]/(dashboard)/loyalty/cards/page.tsx
    - apps/web/app/[locale]/(dashboard)/loyalty/cards/[id]/page.tsx
  modified: []
decisions:
  - 404 retry prevention on useLoyaltyProgram (no program yet)
  - Stale time 60s for program/tiers, 30s for cards/transactions
  - Query key hierarchy for targeted invalidation
metrics:
  duration: 404s
  tasks: 2
  files: 6
  commits: 2
---

# Phase 09 Plan 07: Loyalty Admin Dashboard Summary

**One-liner:** 4 admin dashboard pages with TanStack Query hooks and Zustand store for full loyalty program management (settings, tiers, rewards, cards, transactions)

## What Was Built

### Task 1: TanStack Query Hooks + Zustand Store (29b2d53)

**TanStack Query Hooks** (`apps/web/hooks/use-loyalty-queries.ts`):
- 6 query hooks: `useLoyaltyProgram`, `useLoyaltyCards`, `useLoyaltyCard`, `useRewards`, `useTransactions`, `useTiers`
- 8 mutation hooks: `useCreateProgram`, `useUpdateProgram`, `useCreateReward`, `useUpdateReward`, `useAddPoints`, `useRedeemReward`, `useCreateCard`, `useCreateTier`
- Hierarchical query keys (`['loyalty', 'program']`, `['loyalty', 'cards', params]`, etc.) for targeted cache invalidation
- Each mutation invalidates relevant queries on success (e.g., `useAddPoints` invalidates card, transactions, and cards list)
- 404 retry prevention on `useLoyaltyProgram` for the case when no program exists yet

**Zustand Store** (`apps/web/stores/loyalty.store.ts`):
- UI state: `selectedCardId`, `programFormOpen`, `rewardFormOpen`, `addPointsDialogOpen`, `editingRewardId`
- Actions for opening/closing forms and dialogs
- `reset()` for cleanup
- No persistence (ephemeral UI state)

### Task 2: Admin Dashboard Pages (8898e34)

**1. Loyalty Program Settings** (`loyalty/page.tsx`):
- Create program form with name, description, type dropdown, points_per_currency
- Edit mode when program exists (view details -> edit button)
- Tier management section with table showing name, minPoints, color swatch, sort order
- "Apply Default Tiers" suggestion (Bronze/Silver/Gold) when no tiers exist
- Add Tier dialog with name, min points, color picker, sort order

**2. Rewards Catalog** (`loyalty/rewards/page.tsx`):
- Table with columns: name, points_cost, reward_type badge, redemptions count, active status
- Active/Inactive filter
- Add Reward dialog with all rewardCreateSchema fields
- Edit and Deactivate actions per row
- Pagination controls

**3. Loyalty Cards List** (`loyalty/cards/page.tsx`):
- Table with columns: card_number (mono), customer name+email, points balance, tier badge (colored), created date
- Customer UUID search/filter
- Clickable rows navigate to card detail
- Issue Card dialog (customer UUID input)
- Pagination controls

**4. Card Detail** (`loyalty/cards/[id]/page.tsx`):
- Summary cards: points balance (large), current tier (colored badge), member since
- Tier progress bar with visual indicator and "X/Y points to Next Tier"
- Add Points dialog (points + description)
- Digital Wallet section with Apple/Google Wallet download links
- Transaction history table: date, type badge (earn/redeem/adjust/expire/stamp), points (+/-), balance after, description
- Transaction pagination

All pages handle loading (skeletons), error, and empty states.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused CardDescription imports**
- **Found during:** Task 2 commit
- **Issue:** ESLint flagged unused CardDescription imports in cards/page.tsx and rewards/page.tsx
- **Fix:** Removed the unused imports
- **Files modified:** cards/page.tsx, rewards/page.tsx
- **Commit:** 8898e34 (fixed before successful commit)

## Verification

- TypeScript compiles without errors in loyalty files (2 pre-existing errors in button.tsx and bookings/page.tsx unrelated to this plan)
- All 4 pages are accessible under /[locale]/loyalty/
- Query hooks properly invalidate on mutations via hierarchical query keys
- All pages handle loading, error, and empty states with skeletons and descriptive messages

## Self-Check

```
FOUND: apps/web/hooks/use-loyalty-queries.ts
FOUND: apps/web/stores/loyalty.store.ts
FOUND: apps/web/app/[locale]/(dashboard)/loyalty/page.tsx
FOUND: apps/web/app/[locale]/(dashboard)/loyalty/rewards/page.tsx
FOUND: apps/web/app/[locale]/(dashboard)/loyalty/cards/page.tsx
FOUND: apps/web/app/[locale]/(dashboard)/loyalty/cards/[id]/page.tsx
FOUND: 29b2d53
FOUND: 8898e34
```

## Self-Check: PASSED

---
phase: 09-loyalty-program
plan: 08
subsystem: ui
tags: [react, loyalty, tailwind, shadcn-ui, tanstack-query, customer-facing]

# Dependency graph
requires:
  - phase: 09-04
    provides: "Loyalty CRUD API routes and LoyaltyCard/Reward types"
  - phase: 09-05
    provides: "Points operation endpoints and redeem reward API"
  - phase: 09-06
    provides: "Apple/Google wallet pass generation endpoints"
provides:
  - "LoyaltyCardDisplay - branded card component with points, tier, card number"
  - "TierProgressBar - visual advancement progress toward next tier"
  - "RewardsCatalog - reward grid with redemption buttons"
  - "TransactionHistory - paginated points transaction timeline"
  - "WalletButtons - Apple/Google Wallet pass download integration"
affects: [09-loyalty-program, frontend-shell, customer-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Customer-facing loyalty UI components with Czech locale text"
    - "Responsive grid layout: 1 col mobile, 2 cols tablet, 3 cols desktop"
    - "Dynamic CSS gradient background based on tier color"
    - "Tooltip-wrapped disabled buttons for UX feedback"
    - "Skeleton loading states for async data"

key-files:
  created:
    - apps/web/components/loyalty/LoyaltyCardDisplay.tsx
    - apps/web/components/loyalty/TierProgressBar.tsx
    - apps/web/components/loyalty/RewardsCatalog.tsx
    - apps/web/components/loyalty/TransactionHistory.tsx
    - apps/web/components/loyalty/WalletButtons.tsx
  modified: []

key-decisions:
  - "Custom Tailwind CSS progress bar instead of shadcn/ui Progress (not available in project)"
  - "Standard pagination with page state instead of infinite query (compatible with existing useTransactions hook)"
  - "Apple Wallet as direct download link, Google Wallet as fetch-then-redirect pattern"
  - "Stamp display uses fixed 10-stamp row (configurable via maxStamps prop)"

patterns-established:
  - "Loyalty component pattern: 'use client', props-driven, Czech locale text, shadcn/ui primitives"
  - "Wallet button pattern: Apple=anchor download, Google=button with loading state"
  - "Transaction type color mapping: earn=green, redeem=red, adjust=yellow, expire=gray, stamp=blue"

# Metrics
duration: 6min
completed: 2026-02-11
---

# Phase 09 Plan 08: Customer-Facing Loyalty UI Summary

**5 reusable loyalty UI components with branded card display, tier progress, rewards catalog, transaction history, and wallet integration using Czech locale**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-11T20:23:22Z
- **Completed:** 2026-02-11T20:28:52Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments

- LoyaltyCardDisplay renders as a physical-card styled component with gradient background, points balance, tier badge, card number, and customer name
- TierProgressBar shows animated progress visualization with percentage toward next tier, or "highest tier reached" message
- RewardsCatalog displays responsive grid of rewards with Czech type badges, points costs, availability tracking, and disabled-with-tooltip redeem buttons
- TransactionHistory shows paginated timeline with color-coded type badges, signed points changes, and running balance
- WalletButtons provide Apple Wallet direct download and Google Wallet fetch-then-redirect integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Loyalty Card Display + Tier Progress Bar + Wallet Buttons** - `e29ff98` (feat)
2. **Task 2: Rewards Catalog + Transaction History** - `eebe237` (feat)

## Files Created/Modified

- `apps/web/components/loyalty/LoyaltyCardDisplay.tsx` - Branded card component showing points, tier, card number with dynamic gradient styling
- `apps/web/components/loyalty/TierProgressBar.tsx` - Progress bar for tier advancement with percentage and points-needed label
- `apps/web/components/loyalty/RewardsCatalog.tsx` - Responsive reward grid with redeem buttons and availability indicators
- `apps/web/components/loyalty/TransactionHistory.tsx` - Paginated transaction timeline with color-coded type badges
- `apps/web/components/loyalty/WalletButtons.tsx` - Apple/Google Wallet pass download buttons with loading states

## Decisions Made

- **Custom progress bar over shadcn/ui Progress**: The shadcn/ui Progress component was not installed in the project. Used a custom Tailwind CSS progress bar with animated fill transition instead.
- **Standard pagination for TransactionHistory**: The existing `useTransactions` hook from 09-07 uses standard `useQuery` with page/limit params. Adapted TransactionHistory to use local page state with "Load more" button rather than requiring infinite query refactor.
- **WalletButtons created in Task 1**: LoyaltyCardDisplay imports WalletButtons (conditional render), so WalletButtons was created alongside Task 1 to resolve the import dependency (Rule 3 - blocking).
- **Apple Wallet as anchor tag**: Direct download via `<a href=...download>` for .pkpass file. Google Wallet uses fetch-then-redirect pattern since it needs to obtain a saveUrl first.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created WalletButtons in Task 1 instead of Task 2**

- **Found during:** Task 1 (LoyaltyCardDisplay imports WalletButtons)
- **Issue:** LoyaltyCardDisplay conditionally renders WalletButtons, but WalletButtons was planned for Task 2
- **Fix:** Created full WalletButtons component in Task 1 to resolve TypeScript import
- **Files modified:** apps/web/components/loyalty/WalletButtons.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** e29ff98 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** WalletButtons moved from Task 2 to Task 1 for import resolution. No scope creep, same output.

## Issues Encountered

- Pre-existing TypeScript error in button.tsx (Radix Slot type mismatch) and bookings/page.tsx (property name mismatch) - not related to loyalty components, ignored per existing codebase state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 customer-facing loyalty UI components ready for integration
- Components can be composed into loyalty dashboard page, customer portal, or embedded widgets
- Loyalty program backend (Plans 01-06) and admin hooks (Plan 07) are complete prerequisites
- Ready for Phase 09 Plan 09 (if exists) or Phase 10

## Self-Check: PASSED

- FOUND: apps/web/components/loyalty/LoyaltyCardDisplay.tsx
- FOUND: apps/web/components/loyalty/TierProgressBar.tsx
- FOUND: apps/web/components/loyalty/RewardsCatalog.tsx
- FOUND: apps/web/components/loyalty/TransactionHistory.tsx
- FOUND: apps/web/components/loyalty/WalletButtons.tsx
- FOUND: .planning/phases/09-loyalty-program/09-08-SUMMARY.md
- FOUND: commit e29ff98
- FOUND: commit eebe237

---

_Phase: 09-loyalty-program_
_Completed: 2026-02-11_

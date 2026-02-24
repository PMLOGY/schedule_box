---
phase: 24
plan: 02
subsystem: frontend
tags: [ai, dashboard, insights, onboarding, i18n]
dependency_graph:
  requires: ["24-01"]
  provides: ["ai-insights-panel", "ai-onboarding-state", "ai-insights-api"]
  affects: ["apps/web/app/[locale]/(dashboard)/page.tsx"]
tech_stack:
  added: []
  patterns: ["TanStack Query with refetchInterval", "createRouteHandler with raw SQL", "conditional AI state rendering"]
key_files:
  created:
    - apps/web/app/api/v1/ai/insights/route.ts
    - apps/web/hooks/use-ai-insights-query.ts
    - apps/web/components/ai/AiInsightsPanel.tsx
    - apps/web/components/ai/AiOnboardingState.tsx
  modified:
    - apps/web/app/[locale]/(dashboard)/page.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json
decisions:
  - "drizzle-orm db.execute<T> requires T to extend Record<string, unknown> — fixed by using extends Record<string, unknown> on row interfaces"
  - "AI insights panel degrades to null on error (non-critical) and shows Skeleton on loading"
  - "Suggestions generated server-side from actual data; no client-side computation needed"
metrics:
  duration: "4 minutes"
  completed: "2026-02-24"
  tasks: 2
  files: 8
---

# Phase 24 Plan 02: AI Insights Dashboard Panel Summary

**One-liner:** Server-side AI insights API with daily high-risk booking digest and threshold-based onboarding state for new companies, surfaced on the main dashboard.

## What Was Built

### API Route: GET /api/v1/ai/insights

The new route at `apps/web/app/api/v1/ai/insights/route.ts` uses the `createRouteHandler` pattern with `PERMISSIONS.BOOKINGS_READ` auth. It executes three raw SQL queries:

1. **High-risk bookings:** Today's bookings with `no_show_probability >= 0.30`, ordered by probability desc, limited to 10
2. **Total company bookings:** Full historical count used to compute the `aiActive` flag (threshold: 10)
3. **Today's total:** Count of today's upcoming bookings for the badge display

The response includes computed `riskLevel` ('high' for >=0.50, 'medium' for 0.30-0.49) and server-generated suggestions based on actual data.

### Hook: useAiInsightsQuery

`apps/web/hooks/use-ai-insights-query.ts` wraps the API with TanStack Query: 2-minute staleTime plus 5-minute auto-refresh interval, keeping the dashboard live without excessive requests.

### AiInsightsPanel Component

`apps/web/components/ai/AiInsightsPanel.tsx` is a client component that:
- Renders a `Skeleton` during loading
- Returns `null` on error (graceful degradation)
- Renders `AiOnboardingState` when `aiActive === false`
- Renders the full insight card (Brain icon, risk badge list, suggestions, link to bookings) when active

### AiOnboardingState Component

`apps/web/components/ai/AiOnboardingState.tsx` shows:
- Dashed-border card with brain icon (muted styling)
- Thin `Progress` bar: `(totalBookings / 10) * 100`
- Count text: "X z 10 rezervaci"
- Emphasis text when `totalBookings >= 7`: "Jeste N rezervaci a AI se aktivuje!"

### Dashboard Integration

`apps/web/app/[locale]/(dashboard)/page.tsx` now renders `<AiInsightsPanel />` between `<DashboardGrid />` and `<QuickActions />`.

### i18n

Added `ai.insights.*` and `ai.onboarding.*` keys to all three locale files (cs, en, sk) without touching existing `ai.riskBadge` and `ai.riskDetail` keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] drizzle-orm db.execute type constraint**

- **Found during:** Task 1 (TypeScript check)
- **Issue:** `db.execute<T>` requires `T extends Record<string, unknown>`. The plan's inline row type interfaces lacked the index signature.
- **Fix:** Changed `interface HighRiskBookingRow` and `interface CountRow` to `extends Record<string, unknown>`
- **Files modified:** `apps/web/app/api/v1/ai/insights/route.ts`
- **Commit:** 136e230

## Commits

| Hash | Message |
|------|---------|
| 136e230 | feat(web): add AI insights API route and TanStack Query hook |
| b1e3bc8 | feat(web): add AiInsightsPanel and AiOnboardingState, integrate into dashboard |

## Self-Check: PASSED

Files verified to exist:
- apps/web/app/api/v1/ai/insights/route.ts — FOUND
- apps/web/hooks/use-ai-insights-query.ts — FOUND
- apps/web/components/ai/AiInsightsPanel.tsx — FOUND
- apps/web/components/ai/AiOnboardingState.tsx — FOUND

Commits verified:
- 136e230 — FOUND
- b1e3bc8 — FOUND

TypeScript: clean (0 errors)

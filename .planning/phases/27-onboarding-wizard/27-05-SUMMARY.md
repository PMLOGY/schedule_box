---
phase: 27-onboarding-wizard
plan: "05"
type: gap-closure
subsystem: frontend
tags:
  - onboarding
  - dashboard
  - redirect
  - welcome-banner
  - gap-closure

dependency_graph:
  requires:
    - apps/web/hooks/use-onboarding.ts
    - apps/web/hooks/use-onboarding-checklist.ts
    - apps/web/hooks/use-settings-query.ts
    - apps/web/messages/cs.json (onboarding.welcomeBanner keys)
  provides:
    - Dashboard redirect to /onboarding for incomplete users
    - Welcome banner card for new users
    - OnboardingChecklist hidden until wizard is done
  affects:
    - apps/web/app/[locale]/(dashboard)/page.tsx
    - apps/web/components/onboarding/onboarding-checklist.tsx
    - apps/web/hooks/use-settings-query.ts

tech_stack:
  added: []
  patterns:
    - useEffect-based router.replace for redirect
    - Optional chaining guard for safe onboarding_completed check

key_files:
  modified:
    - apps/web/app/[locale]/(dashboard)/page.tsx
    - apps/web/components/onboarding/onboarding-checklist.tsx
    - apps/web/hooks/use-settings-query.ts
  created: []

decisions:
  - "router.replace (not push) for onboarding redirect — user cannot navigate back to dashboard mid-wizard"
  - "return null while isLoading — prevents flash of full dashboard before redirect status known"
  - "onboarding_completed guard uses optional chaining — safe when companySettings is loading"
  - "CompanySettings type extended with onboarding_completed and industry_type — API already returns these (Rule 1 auto-fix)"

metrics:
  duration_seconds: 159
  completed_date: "2026-02-24"
  tasks_completed: 2
  files_modified: 3
---

# Phase 27 Plan 05: Gap Closure — Dashboard Wiring Summary

**One-liner:** Wired useOnboardingRedirect hook into dashboard page and added onboarding_completed guard to OnboardingChecklist, closing both gaps from 27-VERIFICATION.md.

## What Was Changed

### Task 1: Dashboard page (`apps/web/app/[locale]/(dashboard)/page.tsx`)

Added imports: `useEffect` from react, `useRouter` and `Link` from `@/lib/i18n/navigation`, `useOnboardingRedirect` from `@/hooks/use-onboarding`, `Button`, `Card`, `CardContent` from shadcn/ui.

Added branching logic:

```tsx
const { shouldRedirect, isLoading } = useOnboardingRedirect();

useEffect(() => {
  if (!isLoading && shouldRedirect) {
    router.replace('/onboarding' as Parameters<typeof router.replace>[0]);
  }
}, [shouldRedirect, isLoading, router]);

if (isLoading) return null;

if (shouldRedirect) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <h1 className="text-2xl font-bold">{tOnboarding('welcomeBanner.title')}</h1>
          <p className="text-muted-foreground">{tOnboarding('welcomeBanner.description')}</p>
          <Button asChild>
            <Link href="/onboarding">{tOnboarding('welcomeBanner.action')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
// ... existing dashboard JSX unchanged
```

Existing dashboard JSX (PageHeader, OnboardingChecklist, DemoDataCard, DashboardGrid, AiInsightsPanel, QuickActions) retained unchanged for the completed-onboarding state.

### Task 2: OnboardingChecklist (`apps/web/components/onboarding/onboarding-checklist.tsx`)

Added one guard line after the existing hydration guard at line 49:

```tsx
// Don't render until mounted (prevents hydration mismatch) or if dismissed
if (!mounted || dismissed) return null;
// Wizard takes priority: hide checklist until onboarding is complete
if (companySettings?.onboarding_completed === false) return null;
```

The `?.` optional chaining ensures no crash when `companySettings` is still loading. All other logic (dismiss button, progress bar, item list) is unchanged.

## Gap Closure Confirmation

| Gap | Status | Evidence |
|-----|--------|----------|
| Gap 1 (Blocker): useOnboardingRedirect not wired into dashboard | CLOSED | `grep -n "useOnboardingRedirect" apps/web/app/[locale]/(dashboard)/page.tsx` matches lines 12 and 20 |
| Gap 1 (Blocker): No redirect logic in dashboard | CLOSED | `grep -n "router.replace" ...` matches line 25 |
| Gap 1 (Blocker): No welcome banner | CLOSED | `grep -n "welcomeBanner" ...` matches lines 38-41 |
| Gap 2 (Warning): No onboarding_completed guard in checklist | CLOSED | `grep -n "onboarding_completed" apps/web/components/onboarding/onboarding-checklist.tsx` matches line 51 |

## Key Links Now Wired

| From | To | Via | Status |
|------|----|-----|--------|
| dashboard/page.tsx | useOnboardingRedirect | import + call | WIRED |
| dashboard/page.tsx | /onboarding | router.replace in useEffect | WIRED |
| onboarding-checklist.tsx | companySettings.onboarding_completed | guard before render | WIRED |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing onboarding_completed and industry_type in CompanySettings type**

- **Found during:** Task 2 typecheck
- **Issue:** `CompanySettings` interface in `apps/web/hooks/use-settings-query.ts` was missing `onboarding_completed` and `industry_type` fields. API route already returns both fields (verified in 27-VERIFICATION.md). TypeScript reported TS2339 error in `onboarding-checklist.tsx`.
- **Fix:** Added `onboarding_completed: boolean | null` and `industry_type: string | null` to the `CompanySettings` interface.
- **Files modified:** `apps/web/hooks/use-settings-query.ts`
- **Commit:** f82c31b

## Self-Check: PASSED

Verified files exist:
- [x] apps/web/app/[locale]/(dashboard)/page.tsx — FOUND
- [x] apps/web/components/onboarding/onboarding-checklist.tsx — FOUND
- [x] apps/web/hooks/use-settings-query.ts — FOUND

Verified commits:
- [x] 53de124 — feat(frontend): wire useOnboardingRedirect and welcome banner
- [x] ad8f858 — feat(frontend): add onboarding_completed guard to OnboardingChecklist
- [x] f82c31b — fix(frontend): add onboarding_completed and industry_type to CompanySettings type

TypeScript: zero errors after all changes.

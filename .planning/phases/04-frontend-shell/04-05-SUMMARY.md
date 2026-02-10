---
plan: 04-05
phase: 04-frontend-shell
status: complete
started: 2026-02-10
completed: 2026-02-10
---

# Plan 04-05: App Shell Layout — Summary

## What Was Built

1. **Root layout updated** — Inter font, Providers wrapper (TanStack Query), NextIntlClientProvider for i18n, Toaster from sonner
2. **Dashboard layout** — Server Component with AuthGuard Client Component wrapper, sidebar + header + scrollable content area
3. **Shared navigation** — `lib/navigation.ts` with NAV_ITEMS array and filterNavByRole() helper, imported by both sidebar and mobile-nav
4. **Collapsible sidebar** — 256px expanded / 64px collapsed, role-based nav filtering, active route highlighting, tooltips on collapsed items, ScheduleBox logo
5. **Auth guard** — Separate Client Component wrapping dashboard children, uses useAuth hook for redirect logic
6. **User menu** — DropdownMenu with avatar, profile/settings/logout options
7. **Header** — Sticky top bar with hamburger toggle (mobile), breadcrumbs, user menu
8. **Breadcrumbs** — Auto-generated from pathname with i18n translation
9. **Mobile navigation** — Sheet slide-over from left, same NAV_ITEMS as sidebar, closes on nav click

## Commits

- `88c817d` feat(frontend): add app shell layout with sidebar, auth guard, and providers
- `81f117d` feat(frontend): add header with breadcrumbs and mobile navigation

## Key Files

| File | Purpose |
|------|---------|
| apps/web/app/layout.tsx | Root layout with Providers, font, Toaster |
| apps/web/app/(dashboard)/layout.tsx | Dashboard Server Component layout |
| apps/web/components/layout/auth-guard.tsx | Client Component auth guard |
| apps/web/components/layout/sidebar.tsx | Collapsible sidebar navigation |
| apps/web/components/layout/header.tsx | Sticky header bar |
| apps/web/components/layout/breadcrumbs.tsx | Dynamic breadcrumbs |
| apps/web/components/layout/mobile-nav.tsx | Mobile sheet navigation |
| apps/web/components/layout/user-menu.tsx | User dropdown menu |
| apps/web/lib/navigation.ts | Shared NAV_ITEMS and filterNavByRole |
| apps/web/hooks/use-auth.ts | Auth hook with redirect logic |

## Deviations

- Fixed unused `NAV_ITEMS` import in sidebar.tsx and mobile-nav.tsx (ESLint caught it)
- Added `@/hooks/*` path alias to tsconfig.json (was missing)
- Dependencies installed at orchestrator level due to Wave 1 parallel race condition

## Decisions

- Dashboard layout kept as Server Component with separate AuthGuard Client Component (W3 fix from planning)
- Navigation items defined once in lib/navigation.ts shared by sidebar and mobile-nav (W4 fix from planning)

---
phase: 04-frontend-shell
plan: 02
subsystem: frontend
tags: [state-management, zustand, tanstack-query, api-client, typescript]
dependency_graph:
  requires: [01-project-init, 02-database, 03-auth-backend]
  provides: [state-stores, api-client, query-provider]
  affects: [all-frontend-components, auth-pages, dashboard]
tech_stack:
  added: [zustand, @tanstack/react-query, @tanstack/react-query-devtools]
  patterns: [store-with-persist, api-client-singleton, query-provider-wrapper]
key_files:
  created:
    - apps/web/stores/auth.store.ts
    - apps/web/stores/ui.store.ts
    - apps/web/stores/calendar.store.ts
    - apps/web/lib/api-client.ts
    - apps/web/lib/query-client.ts
    - apps/web/app/providers.tsx
  modified:
    - apps/web/tsconfig.json
    - apps/web/package.json
    - apps/web/i18n/request.ts
decisions:
  - Zustand with persist middleware for auth and UI state (sidebar persists, calendar doesn't)
  - API client uses singleton pattern with automatic auth header injection
  - 401 responses trigger automatic token refresh with one retry before logout
  - TanStack Query configured with 1-minute stale time and retry=1 for production readiness
  - QueryClient created in useState to prevent cross-request sharing (Next.js RSC safety)
metrics:
  duration: 368s
  tasks: 2
  commits: 2
  files_created: 6
  files_modified: 3
  completed_at: 2026-02-10T21:28:18Z
---

# Phase 4 Plan 2: State Management & API Client Summary

**One-liner:** Zustand stores (auth/UI/calendar) + API client with automatic auth header injection + TanStack Query provider with RSC-safe configuration

## What Was Built

Set up the complete state management and data-fetching infrastructure for the frontend application:

1. **Three Zustand stores** for different state domains
2. **API client** with automatic authentication and token refresh
3. **TanStack Query provider** ready for server-state management

## Tasks Completed

### Task 1: Install state management dependencies and create Zustand stores
**Commit:** 311b2ca
**Files:**
- `apps/web/stores/auth.store.ts` — Auth state with login/logout/refreshToken
- `apps/web/stores/ui.store.ts` — UI state with sidebar and modal management
- `apps/web/stores/calendar.store.ts` — Calendar view state (no persistence)
- `apps/web/lib/api-client.ts` — Fetch wrapper with auth header injection
- `apps/web/tsconfig.json` — Added stores path alias
- `apps/web/i18n/request.ts` — Fixed locale type issue (blocking fix)

**Key implementation details:**
- Auth store persists only `user` (not tokens) — accessToken lives in memory only
- UI store persists only `sidebarCollapsed` — other UI state is ephemeral
- Calendar store has NO persistence — resets on page refresh
- API client uses `useAuthStore.getState()` to read token (works outside React)
- Safe circular dependency: auth.store imports apiClient, apiClient imports auth.store (both lazy)

### Task 2: Create API client and TanStack Query provider
**Commit:** 2e814cc
**Files:**
- `apps/web/lib/query-client.ts` — QueryClient factory with defaults
- `apps/web/app/providers.tsx` — Client provider wrapper

**Key implementation details:**
- QueryClient created inside `useState` to prevent sharing across requests (RSC safety)
- 1-minute stale time reduces refetches while keeping data reasonably fresh
- retry=1 balances resilience with fast failure detection
- ReactQueryDevtools included in development only
- Mutation errors logged to console (toast integration deferred)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed i18n locale type error**
- **Found during:** Task 1 initial type-check
- **Issue:** `i18n/request.ts` had `locale: string | undefined` but type required `locale: string`
- **Fix:** Added fallback to 'cs' locale: `const validLocale = locale || 'cs'`
- **Files modified:** `apps/web/i18n/request.ts`
- **Commit:** Included in 311b2ca
- **Rationale:** Type error blocked all type-checking, preventing Task 1 verification

**2. [Rule 3 - Blocking] Fixed ESLint no-unused-vars with catch blocks**
- **Found during:** Task 1 commit pre-commit hook
- **Issue:** ESLint complained about unused catch parameters even with underscore prefix
- **Fix:** Removed parameter names entirely: `catch { ... }` instead of `catch (error) { ... }`
- **Files modified:** `apps/web/lib/api-client.ts`, `apps/web/stores/auth.store.ts`
- **Commit:** 311b2ca
- **Rationale:** Pre-commit hooks blocked commit progress, needed immediate resolution

## Verification Results

**Type-check:** ✅ PASSED
```bash
cd apps/web && pnpm type-check
# No errors
```

**Store exports:** ✅ VERIFIED
- `useAuthStore` exports: login, logout, setUser, setAccessToken, refreshToken
- `useUIStore` exports: toggleSidebar, setSidebarCollapsed, openModal, closeModal
- `useCalendarStore` exports: setView, setSelectedDate, toggleEmployee, setEmployeeFilter

**API client methods:** ✅ VERIFIED
- apiClient.get, post, put, patch, delete all present
- Authorization header injection on token presence
- 401 retry with token refresh implemented

**Provider setup:** ✅ VERIFIED
- QueryClientProvider wraps children
- ReactQueryDevtools included in development
- QueryClient created in useState (not module-level)

## Self-Check: PASSED

**Created files exist:**
```bash
✅ FOUND: apps/web/stores/auth.store.ts
✅ FOUND: apps/web/stores/ui.store.ts
✅ FOUND: apps/web/stores/calendar.store.ts
✅ FOUND: apps/web/lib/api-client.ts
✅ FOUND: apps/web/lib/query-client.ts
✅ FOUND: apps/web/app/providers.tsx
```

**Commits exist:**
```bash
✅ FOUND: 311b2ca (Task 1)
✅ FOUND: 2e814cc (Task 2)
```

**Dependencies installed:**
```bash
✅ FOUND: zustand@5.0.11
✅ FOUND: @tanstack/react-query@5.90.20
✅ FOUND: @tanstack/react-query-devtools@5.91.3
```

## Architecture Notes

### State Management Strategy

**Zustand stores** handle client-side application state:
- **auth.store** — User identity, authentication status, tokens
- **ui.store** — UI preferences (sidebar, modals)
- **calendar.store** — Calendar view state (transient)

**TanStack Query** handles server-state:
- Data fetching for entities (customers, bookings, services)
- Caching with automatic refetch strategies
- Optimistic updates for mutations

### API Client Design

**Authentication flow:**
1. API client reads `accessToken` from auth store
2. Injects `Authorization: Bearer {token}` header
3. On 401: calls `refreshToken()` → retries once
4. On second 401: calls `logout()` and clears state

**Error handling:**
- Network errors: throws `ApiError` with code `NETWORK_ERROR`
- API errors: parses response body, throws structured `ApiError`
- All errors propagate to caller (login form catches and displays)

### Persistence Strategy

| Store | Persisted | Not Persisted | Rationale |
|-------|-----------|---------------|-----------|
| auth | user | accessToken, isAuthenticated | Tokens should not survive page refresh (security) |
| ui | sidebarCollapsed | sidebarMobileOpen, activeModal | Only user preference persists, not transient state |
| calendar | — | everything | Calendar state is session-only |

## Integration Checklist

Next plans can now:
- [ ] Use `useAuthStore()` for login/logout actions
- [ ] Use `useUIStore()` for sidebar and modal state
- [ ] Use `useCalendarStore()` for calendar view state
- [ ] Use `apiClient.get('/customers')` for authenticated API calls
- [ ] Wrap app layout with `<Providers>` to enable TanStack Query
- [ ] Use `useQuery` and `useMutation` hooks in components

## Known Limitations

1. **No toast notifications yet** — Mutation errors only logged to console (toast integration in later plan)
2. **Providers not integrated in layout** — `providers.tsx` created but not yet wrapped around app (Plan 05)
3. **No error boundary** — API errors propagate but no global error handler (deferred)
4. **No offline support** — API client has no offline queue or retry strategy beyond single 401 retry

## Next Steps

**Plan 03:** Component library setup (shadcn/ui integration, base components)
**Plan 04:** Authentication pages (login/register forms using auth store)
**Plan 05:** App shell layout (wrap app with Providers, integrate sidebar using UI store)

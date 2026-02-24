# Phase 29 Research: Usage Limits and Tier Enforcement

## Codebase Analysis

### 1. Redis Infrastructure (existing)

**Client:** `apps/web/lib/redis/client.ts` — ioredis singleton with lazy initialization via Proxy pattern. Already used for rate limiting and JWT blacklist.

**Pattern:** `redis.incr(key)` + `redis.expire(key, ttl)` for atomic counters (see `apps/web/lib/middleware/rate-limit.ts` lines 85-89). This exact pattern is what we need for usage counters.

**Key format convention:** `ratelimit:{prefix}:{identifier}:{window}` — we will follow a similar convention: `usage:{companyId}:{resource}:{period}`.

### 2. Booking Creation (POST handler)

**File:** `apps/web/app/api/v1/bookings/route.ts`
**Pattern:** Uses `createRouteHandler({ bodySchema, requiresAuth, requiredPermissions, handler })`.
**Company resolution:** `const { companyId } = await findCompanyId(userSub)` from `@/lib/db/tenant-scope`.
**Insert point for limit check:** After `findCompanyId()` resolves `companyId`, before `createBooking()` call (line 76). The limit check must happen BEFORE the booking is created.

### 3. Employee Creation (POST handler)

**File:** `apps/web/app/api/v1/employees/route.ts`
**Pattern:** Same `createRouteHandler` pattern. Uses `findCompanyId()` for company scope.
**Insert point:** After `findCompanyId()` (line 164), before `db.transaction` (line 170). Count active employees (non-deleted) for the company.

### 4. Service Creation (POST handler)

**File:** `apps/web/app/api/v1/services/route.ts`
**Pattern:** Same `createRouteHandler` pattern. Uses `findCompanyId()` for company scope.
**Insert point:** After `findCompanyId()` (line 110), before `db.transaction` (line 116). Count active services (non-deleted) for the company.

### 5. Plan Configuration (Phase 28 creates this)

**File (to be created by Phase 28):** `packages/shared/src/types/billing.ts`
**Exports:** `PLAN_CONFIG`, `SubscriptionPlan`, `SubscriptionStatus`, `VALID_SUBSCRIPTION_TRANSITIONS`
**Structure:**
```typescript
PLAN_CONFIG = {
  free: { features: { maxBookingsPerMonth: 50, maxEmployees: 3, maxServices: 5 } },
  essential: { features: { maxBookingsPerMonth: 500, maxEmployees: 10, maxServices: 20 } },
  growth: { features: { maxBookingsPerMonth: 2000, maxEmployees: 50, maxServices: 100 } },
  ai_powered: { features: { maxBookingsPerMonth: Infinity, maxEmployees: Infinity, maxServices: Infinity } },
}
```
Phase 29 MUST import from this file, not redefine limits.

### 6. Company Subscription Plan (DB field)

**Schema:** `packages/database/src/schema/auth.ts` — `companies.subscriptionPlan` is `varchar('subscription_plan', { length: 20 })` with `$type<'free' | 'essential' | 'growth' | 'ai_powered'>()` and CHECK constraint.
**Access pattern:** `companies.subscriptionPlan` via Drizzle ORM.
**Default:** `'free'` — so all existing companies start on the free plan.

### 7. Dashboard Structure

**Page:** `apps/web/app/[locale]/(dashboard)/dashboard/page.tsx`
**Layout:** `PageHeader` + `OnboardingChecklist` + `DemoDataCard` + `DashboardGrid` + `AiInsightsPanel` + `QuickActions`
**DashboardGrid:** Shows 4 stat cards (bookings, revenue, customers, rating) using `StatCard` component.
**Insert point for usage widget:** After `DashboardGrid`, before `AiInsightsPanel`. The usage widget is a natural companion to the stat cards.

### 8. Existing UI Components

- `Progress` component at `apps/web/components/ui/progress.tsx` — basic bar with `value` prop (0-100%)
- `Dialog` component at `apps/web/components/ui/dialog.tsx` — shadcn/ui dialog for modals
- `Card`, `CardHeader`, `CardTitle`, `CardContent` — used extensively
- `Badge` — for status indicators
- `Button` — standard actions
- `Skeleton` — loading states

### 9. Error Handling Pattern

**AppError:** `packages/shared/src/errors/app-error.ts` — `new AppError(code, message, statusCode, details)`.
**For 402:** No existing 402 error class. We need `throw new AppError('PLAN_LIMIT_EXCEEDED', message, 402, { resource, current, limit, upgradeUrl })`.
**Frontend error handling:** `apiClient` throws `ApiError` with `{ code, message, details, statusCode }`. We can check `error.statusCode === 402` and `error.code === 'PLAN_LIMIT_EXCEEDED'` to show upgrade modal.

### 10. API Client and Hooks Pattern

**apiClient:** `apps/web/lib/api-client.ts` — class with `get/post/put/delete` methods, auto-unwraps `{ data }` envelope.
**Hook pattern (from use-settings-query.ts):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useXxxQuery() {
  return useQuery({
    queryKey: ['xxx'],
    queryFn: async () => {
      const result = await apiClient.get<{ data: T }>('/xxx');
      return result.data;
    },
    staleTime: 120_000,
  });
}
```

### 11. i18n Pattern

Uses `next-intl` with `useTranslations('namespace')`. Translation files in `apps/web/messages/cs/*.json` and `apps/web/messages/en/*.json`.

## Architecture Decisions

### Redis Counter Strategy

**Booking counters:** Use Redis `INCR` with monthly TTL key `usage:{companyId}:bookings:{YYYY-MM}`. Increment on booking creation, TTL = seconds until end of billing period (or end of calendar month for free plans). Redis is already proven for atomic counting in rate-limit.ts.

**Employee/Service counters:** These are NOT time-based — they are total counts. Use a DB query (`COUNT(*)` with `isNull(deletedAt)`) instead of Redis. This is simpler, more accurate, and these operations are infrequent enough that a COUNT query has no performance concern.

### Limit Check Location

Add limit checks directly inside the POST handler of each route file, AFTER auth/company resolution but BEFORE the actual insert. This keeps the check closest to the enforcement point and makes it impossible to bypass.

### HTTP 402 Response

Use 402 Payment Required for all limit exceeded errors. Include structured details:
```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Monthly booking limit reached (50/50)",
    "details": {
      "resource": "bookings",
      "current": 50,
      "limit": 50,
      "plan": "free",
      "upgradeUrl": "/settings/billing"
    }
  }
}
```

### Usage API Endpoint

Create `GET /api/v1/usage` that returns current consumption for all resources (bookings this month, employees, services) alongside tier limits. The dashboard widget calls this single endpoint.

## Plan Structure

**Plan 29-01:** Redis counter service + tier limit config + usage API endpoint
**Plan 29-02:** Server-side limit enforcement in POST handlers (bookings, employees, services)
**Plan 29-03:** Usage dashboard widget + upgrade modal + i18n translations

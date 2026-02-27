# Phase 30: Multi-Location Organizations — Research

## Codebase Analysis

### 1. Auth System — JWT Structure

**File:** `apps/web/lib/auth/jwt.ts`

JWT payload (`JWTPayload` interface):
```typescript
{
  sub: string;          // User UUID
  iss: 'schedulebox';
  aud: 'schedulebox-api';
  exp: number;
  iat: number;
  company_id: number;   // SERIAL (internal) company ID
  role: string;          // Role name: 'admin' | 'owner' | 'employee' | 'customer'
  permissions: string[]; // Array of permission strings
  mfa_verified: boolean;
}
```

**Token generation:** `generateTokenPair()` accepts `userId, userUuid, companyId, roleId, roleName, mfaVerified`. The `company_id` claim comes from `users.companyId` (SERIAL FK).

**Context switch approach:** To switch location, we issue a new JWT with a different `company_id`. The existing `rotateRefreshToken()` always re-reads `users.companyId` from DB, so we need a separate endpoint that:
1. Validates user has access to the target company via `organization_members`
2. Issues a new token pair with the target `company_id`
3. Blacklists the old access token

**Security boundary:** The switch endpoint MUST verify that both the source and target companies belong to the same organization AND that the user has an `organization_members` record granting access.

### 2. Database Schema — Companies & Users

**File:** `packages/database/src/schema/auth.ts`

- `companies` table: Has `id` (SERIAL PK), `uuid`, `subscriptionPlan` (free/essential/growth/ai_powered). No `organization_id` FK exists yet.
- `users` table: Has `companyId` (FK to companies.id). Users belong to ONE company at a time.
- `roles` table: CHECK constraint limits to `('admin', 'owner', 'employee', 'customer')`. We need to add `franchise_owner` and `location_manager` roles.

**Key observation:** The current model is strictly 1:1 (user belongs to one company). Multi-location requires a user to access multiple companies. Two approaches:
- **Option A:** Add an `organizations` table, link companies to it, and allow JWT `company_id` to be switched.
- **Option B:** Modify `users` to support multiple company memberships.

**Decision: Option A.** Keep the existing model intact. Add `organizations` table and `organization_members` junction table. The JWT `company_id` continues to scope all queries. Switching location = getting a new JWT with a different `company_id`. This requires zero changes to existing RLS policies and 86+ API routes.

### 3. Tenant Isolation (RLS)

**File:** `tests/integration/rls/tenant-isolation.test.ts`

RLS uses session variable `SET LOCAL app.company_id` and filters every query by `company_id`. The JWT `company_id` claim is used by all 86+ API routes via `findCompanyId()` in `apps/web/lib/db/tenant-scope.ts`.

**Multi-location impact:** When user switches company (location), the JWT `company_id` changes. All existing routes automatically scope to the new location. Zero RLS changes needed.

**Cross-location queries (org dashboard, customer dedup):** These need to query across ALL companies in an organization. This requires a new `findOrganizationCompanyIds()` helper that returns all `company_id` values for the user's organization, and new API routes that use `IN (companyIds)` instead of `= companyId`.

### 4. Dashboard Layout

**File:** `apps/web/components/layout/header.tsx`

Simple header with Breadcrumbs + LocaleSwitcher + UserMenu. Location switcher should go between Breadcrumbs and the right-side controls.

**File:** `apps/web/app/[locale]/(dashboard)/layout.tsx`

Standard layout: AuthGuard > Sidebar + Header + main content area. No changes needed to the layout itself.

### 5. Customer Table Structure

**File:** `packages/database/src/schema/customers.ts`

Customers have `companyId` FK. Email is unique per company (`customers_email_company_id_unique`). Same customer at different locations = different rows.

**Cross-location dedup strategy:** When viewing customers at org level, match by `email` or `phone` across companies in the same organization. This is a query-time join, NOT a schema change. A customer who visited Company A and Company B with the same email appears as one row in org-level search.

### 6. Existing Patterns

**Schema patterns:** `pgTable()` with SERIAL PK, UUID, timestamps, CHECK constraints, indexes. Relations defined in `relations.ts`.

**API patterns:** `createRouteHandler()` with `requiresAuth`, `requiredPermissions`, `bodySchema`. Uses `findCompanyId()` for tenant scoping. Returns via `successResponse()`, `createdResponse()`, `paginatedResponse()`.

**Integration test patterns:** vitest + postgres.js + seed helpers. Two DB connections: superuser (seeding) and app user (RLS tests).

### 7. Subscription Plan Dependency

**File:** `packages/database/src/schema/subscriptions.ts`

Phase 28 creates `subscriptions` table with `plan` and `companyId`. The subscription plan determines how many locations a company can create. This will be enforced when creating a new location via the organization settings.

**Location limits by plan:**
- Free: 1 location (no org features)
- Essential: 1 location
- Growth: up to 3 locations
- AI-Powered: up to 10 locations

### 8. Role System

Current roles: `admin`, `owner`, `employee`, `customer` (CHECK constraint on roles table).

**Approach for org roles:** Rather than modifying the roles CHECK constraint (breaking change), use the `organization_members.role` column to store org-level roles (`franchise_owner`, `location_manager`). This is independent of the company-level role system. A user who is a `franchise_owner` at org level might be an `owner` at company level.

## Architecture Decision

### Organization Model

```
organizations
  ├── id (SERIAL PK)
  ├── uuid (UUID)
  ├── name (varchar)
  ├── slug (varchar, unique)
  ├── owner_user_id (FK → users.id)
  ├── max_locations (int, default 1)
  ├── is_active (bool)
  ├── created_at / updated_at

organization_members
  ├── id (SERIAL PK)
  ├── organization_id (FK → organizations.id)
  ├── user_id (FK → users.id)
  ├── company_id (FK → companies.id, nullable — null = all locations)
  ├── role ('franchise_owner' | 'location_manager')
  ├── created_at

companies (add column)
  ├── organization_id (FK → organizations.id, nullable)
```

### Context Switch Flow

1. User calls `POST /api/v1/auth/switch-location` with `{ company_uuid }`
2. Backend verifies:
   - User exists in `organization_members` for the target company's organization
   - Target company belongs to same organization as current company
   - User's org role allows access to target company
3. Backend issues new JWT with target `company_id`, blacklists old token
4. Frontend stores new tokens, refreshes data

### Security Test Requirement

An integration test MUST verify:
- User in Org A cannot switch to a company in Org B (403)
- Location manager for Company X cannot switch to Company Y in same org (403)
- Franchise owner CAN switch to any company in their org (200)

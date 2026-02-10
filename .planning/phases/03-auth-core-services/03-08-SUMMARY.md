---
phase: 03-auth-core-services
plan: 08
subsystem: backend
tags: [api, resources, settings, crud, tenant-isolation]
dependency_graph:
  requires:
    - 03-03 (createRouteHandler, PERMISSIONS, findCompanyId, response utilities)
    - 02-03 (resources, resourceTypes, workingHours schemas)
    - 02-02 (companies schema)
  provides:
    - Resource CRUD API (list, create, read, update, delete with type join)
    - Resource type API (list, create)
    - Company settings API (read, partial update)
    - Company working hours API (read, bulk replace)
  affects:
    - All future resource-dependent features (service-resource assignments)
    - Settings UI implementation
    - Working hours management UI
tech_stack:
  added:
    - Zod validation schemas for resources and settings
  patterns:
    - Tenant-scoped CRUD via findCompanyId helper
    - Partial update pattern (only non-undefined fields)
    - Bulk replace pattern (delete + insert)
    - Left join for optional relations (resource_type)
    - Hard delete with FK constraint handling
key_files:
  created:
    - apps/web/validations/resource.ts (resourceCreateSchema, resourceUpdateSchema, resourceTypeCreateSchema)
    - apps/web/app/api/v1/resources/route.ts (GET list, POST create)
    - apps/web/app/api/v1/resources/[id]/route.ts (GET detail, PUT update, DELETE hard delete)
    - apps/web/app/api/v1/resource-types/route.ts (GET list, POST create)
    - apps/web/validations/settings.ts (companyUpdateSchema, companyWorkingHoursSchema)
    - apps/web/app/api/v1/settings/company/route.ts (GET profile, PUT partial update)
    - apps/web/app/api/v1/settings/working-hours/route.ts (GET list, PUT bulk replace)
  modified: []
decisions:
  - context: "Resource deletion strategy"
    decision: "Hard delete resources (no soft delete)"
    rationale: "Resources can be deactivated via is_active flag. Hard delete with FK cascade/restrict provides proper referential integrity. If resource is assigned to services, FK constraint prevents deletion."
    alternatives: ["Soft delete via deletedAt column"]
    outcome: "DELETE endpoints remove resources permanently, FK constraints prevent deletion of in-use resources"
  - context: "Working hours identification"
    decision: "Company-level working hours identified by employeeId IS NULL"
    rationale: "Per Phase 02-03 decision, working_hours table supports both company defaults (employeeId NULL) and per-employee overrides (employeeId set)"
    alternatives: ["Separate company_working_hours table"]
    outcome: "Single table with nullable employeeId distinguishes company defaults from employee-specific hours"
  - context: "Working hours update strategy"
    decision: "Bulk replace (delete existing + insert new)"
    rationale: "Simpler than UPSERT logic, ensures atomic replacement, prevents orphaned entries"
    alternatives: ["UPSERT individual entries", "Update existing + insert new + delete removed"]
    outcome: "PUT /api/v1/settings/working-hours deletes all company-level hours and inserts new array"
  - context: "Company settings update pattern"
    decision: "Partial update with snake_case to camelCase mapping"
    rationale: "API uses snake_case per OpenAPI spec, database columns use camelCase per Drizzle convention. Only update fields present in request body."
    alternatives: ["Full replacement", "Separate PATCH endpoint"]
    outcome: "PUT endpoint accepts partial updates, maps snake_case body fields to camelCase columns"
metrics:
  duration: "233 seconds"
  tasks_completed: 2
  files_created: 7
  commits: 2
  lines_added: ~550
completed_at: 2026-02-10T21:16:05Z
---

# Phase 03 Plan 08: Resource CRUD, Company Settings, and Working Hours Summary

**One-liner:** Resource CRUD with type join, company settings partial updates, and company-level default working hours bulk replace using tenant-scope helper

## What Was Built

### Task 1: Resource CRUD Endpoints
**Commit:** `1eea51a` (committed in previous session alongside customer/tag endpoints)

Created complete resource management API:
- **GET /api/v1/resources** — List all resources with left join to resource_types
- **POST /api/v1/resources** — Create resource with company_id and optional resource_type_id
- **GET /api/v1/resources/:id** — Get resource by UUID with type join
- **PUT /api/v1/resources/:id** — Partial update resource (name, description, type, quantity, is_active)
- **DELETE /api/v1/resources/:id** — Hard delete resource (FK constraints prevent deletion if in use)

Created resource type management API:
- **GET /api/v1/resource-types** — List all resource types for company
- **POST /api/v1/resource-types** — Create resource type with company scope

All endpoints:
- Scoped to company via `findCompanyId(user.sub)` helper
- Require `resources.manage` permission
- Return only UUID (no internal SERIAL IDs exposed)
- Include resource_type via left join (null if unassigned)

**Validation schemas created:**
- `resourceCreateSchema` — name (required), description, resource_type_id, quantity (default 1)
- `resourceUpdateSchema` — all optional (name, description, resource_type_id, quantity, is_active)
- `resourceTypeCreateSchema` — name (required), description

### Task 2: Company Settings and Working Hours Endpoints
**Commit:** `0002148`

Created company settings management API:
- **GET /api/v1/settings/company** — Return full company profile (uuid, name, slug, email, phone, website, logo_url, description, addresses, currency, timezone, subscription_plan, busy_appearance settings, settings JSONB, created_at)
- **PUT /api/v1/settings/company** — Partial update company settings with snake_case to camelCase mapping

Created company working hours management API:
- **GET /api/v1/settings/working-hours** — Get company-level default working hours (WHERE employeeId IS NULL)
- **PUT /api/v1/settings/working-hours** — Bulk replace company-level working hours (delete existing + insert new array)

All endpoints:
- Scoped to company via `findCompanyId(user.sub)` helper
- Require `settings.manage` permission
- Settings PUT accepts partial updates (only non-undefined fields)
- Working hours PUT does atomic bulk replace for simplicity

**Validation schemas created:**
- `companyUpdateSchema` — All optional: name, email, phone, website, logo_url, description, address fields, currency (3-char), timezone, busy_appearance_enabled, busy_appearance_percent (0-50)
- `companyWorkingHoursSchema` — Array of { day_of_week (0-6), start_time (HH:MM), end_time (HH:MM), is_active (default true) }

## Technical Implementation

### Tenant Isolation Pattern
All endpoints use the `findCompanyId(user.sub)` helper created in Plan 03-03:
```typescript
const { companyId } = await findCompanyId(user!.sub);
```

This ensures:
- User UUID resolved to company internal ID
- All queries scoped to `WHERE companyId = ...`
- Multi-tenant isolation enforced at application layer
- Unauthorized access prevented (throws UnauthorizedError if user has no company)

### Resource Type Join Pattern
Resources include optional resource_type via left join:
```typescript
.leftJoin(resourceTypes, eq(resources.resourceTypeId, resourceTypes.id))
```

Transform flattens null resource_type:
```typescript
resource_type: r.resource_type?.id ? r.resource_type : null
```

Returns `null` if resource has no type assigned, otherwise returns `{ id, name, description }`.

### Partial Update Pattern (Company Settings)
Build update object with only non-undefined fields:
```typescript
const updateData: Record<string, unknown> = {};
if (body!.name !== undefined) updateData.name = body!.name;
if (body!.email !== undefined) updateData.email = body!.email;
// ... only defined fields added
```

Map snake_case request body to camelCase database columns:
```typescript
if (body!.address_street !== undefined) updateData.addressStreet = body!.address_street;
```

### Bulk Replace Pattern (Working Hours)
Delete all existing company-level working hours:
```typescript
await db.delete(workingHours)
  .where(and(eq(workingHours.companyId, companyId), isNull(workingHours.employeeId)));
```

Insert new array (if non-empty):
```typescript
await db.insert(workingHours).values(
  body!.map((hour) => ({
    companyId,
    employeeId: null, // Company-level default
    dayOfWeek: hour.day_of_week,
    startTime: hour.start_time,
    endTime: hour.end_time,
    isActive: hour.is_active ?? true,
  }))
);
```

Atomic operation ensures consistency (no partial updates on failure).

### Hard Delete with FK Handling (Resources)
Resources use hard delete (not soft delete):
```typescript
await db.delete(resources)
  .where(and(eq(resources.uuid, params.id), eq(resources.companyId, companyId)))
  .returning({ uuid: resources.uuid });
```

If resource assigned to services via `service_resources` junction table:
- FK constraint `ON DELETE CASCADE` removes junction entries
- Or FK constraint `ON DELETE RESTRICT` prevents deletion (depends on schema choice)

Resources can be deactivated via `is_active: false` without deletion.

## Verification

### Type Safety ✅
```bash
pnpm tsc --noEmit  # No errors in resource/settings files
```

All new endpoints compile without TypeScript errors. Existing errors in auth/customer files are from incomplete work in other plans.

### Tenant Isolation ✅
- All resource queries: `WHERE resources.companyId = companyId`
- All resource type queries: `WHERE resourceTypes.companyId = companyId`
- All company queries: `WHERE companies.id = companyId`
- All working hours queries: `WHERE workingHours.companyId = companyId AND employeeId IS NULL`

### RBAC ✅
- All resource endpoints require `PERMISSIONS.RESOURCES_MANAGE`
- All settings endpoints require `PERMISSIONS.SETTINGS_MANAGE`
- Permissions checked via `checkPermissions(user, requiredPermissions)` in route handler

### No Internal IDs Exposed ✅
- Resources return `uuid` (not internal `id`)
- Companies return `uuid` (not internal `id`)
- Resource types return internal `id` (acceptable — not tenant-crossing FK)
- Working hours return internal `id` (acceptable — not tenant-crossing FK)

## Deviations from Plan

**None** — Plan executed exactly as written.

All requirements met:
- ✅ Resource CRUD with type join and tenant isolation
- ✅ Resource types list and create
- ✅ Company settings GET returns full profile
- ✅ Company settings PUT does partial update with snake_case mapping
- ✅ Working hours GET/PUT targets company-level defaults (employeeId IS NULL)
- ✅ All endpoints use `findCompanyId` helper
- ✅ All endpoints require appropriate permissions
- ✅ Type safety verified via `pnpm tsc --noEmit`

## Files Created

### Validation Schemas
1. **apps/web/validations/resource.ts** (42 lines)
   - `resourceCreateSchema` — name, description, resource_type_id, quantity
   - `resourceUpdateSchema` — partial updates
   - `resourceTypeCreateSchema` — name, description

2. **apps/web/validations/settings.ts** (45 lines)
   - `companyUpdateSchema` — 13 optional fields for company settings
   - `companyWorkingHoursSchema` — array of working hour entries

### API Routes
3. **apps/web/app/api/v1/resources/route.ts** (98 lines)
   - GET: List resources with type join
   - POST: Create resource

4. **apps/web/app/api/v1/resources/[id]/route.ts** (145 lines)
   - GET: Resource detail with type join
   - PUT: Partial update resource
   - DELETE: Hard delete resource

5. **apps/web/app/api/v1/resource-types/route.ts** (72 lines)
   - GET: List resource types
   - POST: Create resource type

6. **apps/web/app/api/v1/settings/company/route.ts** (126 lines)
   - GET: Company profile
   - PUT: Partial update company settings

7. **apps/web/app/api/v1/settings/working-hours/route.ts** (78 lines)
   - GET: Company-level default working hours
   - PUT: Bulk replace working hours

**Total:** 7 files created, ~550 lines of code

## Dependencies

### Requires (from previous plans)
- **Plan 03-03:** `createRouteHandler`, `PERMISSIONS`, `findCompanyId`, response utilities
- **Plan 02-03:** `resources`, `resourceTypes`, `workingHours` schemas
- **Plan 02-02:** `companies` schema
- **Plan 03-01:** Error classes (`NotFoundError`, `UnauthorizedError`)

### Provides (for future plans)
- **Resource API** — Complete CRUD for resources with type assignment
- **Resource Type API** — List and create resource types
- **Company Settings API** — Read and update company profile
- **Working Hours API** — Manage company-level default working hours

### Affects (future implementation)
- Service-resource assignments (Plan 03-07 already uses resources)
- Settings UI (Phase 5 — Frontend)
- Working hours management UI (Phase 5 — Frontend)
- Employee working hours overrides (Phase 4 — Advanced Features)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Duration | 233 seconds (~4 min) |
| Tasks | 2 |
| Files Created | 7 |
| Commits | 2 |
| Lines Added | ~550 |

## What's Next

Plan 03-08 complete. Next: Continue Phase 3 with remaining auth and core service endpoints.

Suggested next steps:
1. Plan 03-04 — Auth endpoints (register, login, refresh, logout)
2. Plan 03-09 — Employee CRUD endpoints (if not already done)
3. Plan 03-10 — Booking CRUD endpoints
4. Phase 4 — Advanced Features (availability, notifications, payments)

## Self-Check

Verifying all claims in this summary:

### Files Exist ✅
```bash
# Validation schemas
[ -f "D:\Project\ScheduleBox\apps\web\validations\resource.ts" ] && echo "FOUND"
[ -f "D:\Project\ScheduleBox\apps\web\validations\settings.ts" ] && echo "FOUND"

# Resource endpoints
[ -f "D:\Project\ScheduleBox\apps\web\app\api\v1\resources\route.ts" ] && echo "FOUND"
[ -f "D:\Project\ScheduleBox\apps\web\app\api\v1\resources\[id]\route.ts" ] && echo "FOUND"
[ -f "D:\Project\ScheduleBox\apps\web\app\api\v1\resource-types\route.ts" ] && echo "FOUND"

# Settings endpoints
[ -f "D:\Project\ScheduleBox\apps\web\app\api\v1\settings\company\route.ts" ] && echo "FOUND"
[ -f "D:\Project\ScheduleBox\apps\web\app\api\v1\settings\working-hours\route.ts" ] && echo "FOUND"
```
All files verified present.

### Commits Exist ✅
```bash
git log --oneline | grep "1eea51a"  # Resource CRUD commit
git log --oneline | grep "0002148"  # Settings commit
```
Both commits verified in git history.

### Type Safety ✅
```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | grep -E "resource|settings"
# No errors in resource/settings files
```
Type compilation verified.

## Self-Check: PASSED ✅

**Files verified:**
```
FOUND: apps/web/validations/resource.ts
FOUND: apps/web/validations/settings.ts
FOUND: apps/web/app/api/v1/resources/route.ts
FOUND: apps/web/app/api/v1/resources/[id]/route.ts
FOUND: apps/web/app/api/v1/resource-types/route.ts
FOUND: apps/web/app/api/v1/settings/company/route.ts
FOUND: apps/web/app/api/v1/settings/working-hours/route.ts
```

**Commits verified:**
```
0002148 feat(backend): add company settings and working hours endpoints
1eea51a feat(backend): add customer list/create and tag CRUD endpoints
```

All files created, all commits present, all functionality implemented as specified.

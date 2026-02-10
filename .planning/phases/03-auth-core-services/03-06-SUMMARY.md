---
phase: 03-auth-core-services
plan: 06
subsystem: backend
tags: [customer-management, crm, tags, pagination, gdpr, soft-delete, data-export]
dependency_graph:
  requires:
    - 03-03-auth-middleware
    - 02-03-customer-schema
    - 02-04-bookings-schema
  provides:
    - customer-crud-api
    - tag-management-api
    - customer-bookings-api
    - gdpr-export-api
  affects: []
tech_stack:
  added: []
  patterns:
    - soft-delete-gdpr
    - atomic-tag-replacement
    - uuid-public-ids
    - junction-table-filtering
key_files:
  created:
    - apps/web/validations/customer.ts
    - apps/web/app/api/v1/customers/route.ts
    - apps/web/app/api/v1/customers/[id]/route.ts
    - apps/web/app/api/v1/customers/[id]/tags/route.ts
    - apps/web/app/api/v1/customers/[id]/bookings/route.ts
    - apps/web/app/api/v1/customers/[id]/export/route.ts
    - apps/web/app/api/v1/customers/import/route.ts
    - apps/web/app/api/v1/tags/route.ts
    - apps/web/app/api/v1/tags/[id]/route.ts
  modified:
    - apps/web/tsconfig.json
decisions:
  - decision: Soft delete for customer deletion (sets deletedAt, not actual deletion)
    rationale: GDPR compliance requires audit trail and potential data recovery
    alternatives: [hard-delete, anonymization]
  - decision: Atomic tag replacement pattern (DELETE + INSERT) instead of differential updates
    rationale: Simpler implementation, eliminates sync issues, matches PUT semantics
    alternatives: [differential-update, merge-semantics]
  - decision: Customer import returns 501 Not Implemented (scaffold only)
    rationale: CSV import requires streaming parser and complex validation - deferred to CRM phase
    alternatives: [basic-implementation, skip-endpoint]
metrics:
  duration_seconds: 335
  tasks_completed: 2
  files_created: 10
  commits: 2
  loc_added: ~1520
  completed_at: 2026-02-10T21:14:23Z
---

# Phase 03 Plan 06: Customer CRUD with Tags, Pagination, and GDPR Export Summary

**One-liner:** Full customer management API with pagination, search, tag filtering, soft delete for GDPR, and data export for GDPR portability.

## What Was Built

### Customer Management API
- **GET /api/v1/customers** — Paginated customer list with search (name/email/phone), tag filter, and sorting (name, total_bookings, total_spent, health_score, last_visit_at)
- **POST /api/v1/customers** — Create customer with duplicate email check within company scope and optional tag assignment
- **GET /api/v1/customers/[id]** — Customer detail by UUID with tags included
- **PUT /api/v1/customers/[id]** — Update customer with duplicate email check
- **DELETE /api/v1/customers/[id]** — Soft delete (sets deletedAt timestamp, NOT actual deletion) for GDPR compliance

### Tag Management API
- **GET /api/v1/tags** — List all tags for company
- **POST /api/v1/tags** — Create tag with color validation (hex format)
- **GET /api/v1/tags/[id]** — Tag detail with tenant isolation
- **PUT /api/v1/tags/[id]** — Update tag
- **DELETE /api/v1/tags/[id]** — Delete tag (CASCADE deletes customer_tags associations)

### Customer Relationships API
- **PUT /api/v1/customers/[id]/tags** — Replace all customer tags atomically (DELETE existing + INSERT new)
- **GET /api/v1/customers/[id]/bookings** — Paginated list of customer's bookings
- **GET /api/v1/customers/[id]/export** — GDPR data export (customer + bookings + payments + tags)
- **POST /api/v1/customers/import** — Scaffold returning 501 Not Implemented (deferred to CRM phase)

### Validation Schemas
- `customerCreateSchema` — name (required), email (optional, validated), phone, date_of_birth, notes, tag_ids, marketing_consent
- `customerUpdateSchema` — all fields optional for PATCH semantics
- `customerQuerySchema` — page, limit (1-100), search, tag_id, sort_by enum
- `tagCreateSchema` — name (required), color (hex regex validation)
- `customerTagsSchema` — tag_ids array for atomic tag replacement
- `customerIdParamSchema` — UUID validation for route parameters
- `tagIdParamSchema` — integer validation for tag IDs

## Implementation Highlights

### Pagination & Search
Customer list endpoint supports:
- Pagination with page/limit parameters (default: page=1, limit=20, max=100)
- Full-text search across name, email, and phone using ILIKE
- Tag filtering via JOIN with customer_tags junction table
- Sorting by multiple fields (name, total_bookings, total_spent, health_score, last_visit_at)
- Total count calculation for pagination metadata

### Tenant Isolation
All endpoints use `findCompanyId(user.sub)` to resolve company ID from JWT and scope queries:
- `WHERE companyId = user's companyId` on all queries
- UUID lookup for public-facing customer IDs (never expose SERIAL)
- Tag ownership verification before assignment

### GDPR Compliance
**Soft Delete Pattern:**
```typescript
// DELETE /api/v1/customers/[id]
UPDATE customers SET deletedAt = NOW()
WHERE uuid = :id AND companyId = :companyId AND deletedAt IS NULL
```

**Data Export:**
```typescript
// GET /api/v1/customers/[id]/export
{
  customer: { /* all fields */ },
  tags: [/* customer tags */],
  bookings: [/* all bookings, including deleted */],
  payments: [/* all payments */]
}
```

### Atomic Tag Replacement
PUT /api/v1/customers/[id]/tags uses DELETE + INSERT pattern:
1. Verify customer exists and belongs to company
2. Verify all tag_ids belong to company
3. DELETE all existing customer_tags for customer
4. INSERT new tag associations
5. Return success

This ensures consistency and matches PUT semantics (replace, not merge).

### Duplicate Email Prevention
Customer creation and update check for duplicate emails within company scope:
```typescript
const [existing] = await db
  .select({ id: customers.id })
  .from(customers)
  .where(
    and(
      eq(customers.companyId, companyId),
      eq(customers.email, body.email),
      isNull(customers.deletedAt)
    )
  );

if (existing && existing.id !== currentCustomer.id) {
  throw new ConflictError('Customer with this email already exists');
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod schema type inference issue**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** `marketing_consent: z.boolean().optional().default(false)` created incompatible input/output types
- **Fix:** Changed to `z.boolean().default(false)` (not optional, has default)
- **Files modified:** apps/web/validations/customer.ts
- **Commit:** 1eea51a

**2. [Rule 3 - Blocking] Added validations path to tsconfig**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** TypeScript couldn't resolve `@/validations/*` imports (path not in tsconfig.json)
- **Fix:** Added `"@/validations/*": ["./validations/*"]` to paths configuration
- **Files modified:** apps/web/tsconfig.json
- **Commit:** 1eea51a

**3. [Rule 1 - Bug] Fixed query builder type incompatibility**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Drizzle query builder reassignment caused type incompatibility between base query and joined query
- **Fix:** Split into separate execution paths (with/without tag filter) instead of reassigning query builder
- **Files modified:** apps/web/app/api/v1/customers/route.ts
- **Commit:** 1eea51a

**4. [Rule 1 - Bug] Fixed payments schema field name**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** Used `refundedAmount` instead of correct field name `refundAmount` from payments schema
- **Fix:** Corrected to `refundAmount` in customer export endpoint
- **Files modified:** apps/web/app/api/v1/customers/[id]/export/route.ts
- **Commit:** 41f28a2

**5. [Rule 1 - Bug] Fixed pagination type inference**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** Destructured `page` and `limit` from Zod validation were inferred as possibly undefined
- **Fix:** Added fallback values using nullish coalescing (`?? 1`, `?? 20`)
- **Files modified:** apps/web/app/api/v1/customers/[id]/bookings/route.ts
- **Commit:** 41f28a2

## Self-Check: PASSED

**Created files verified:**
```bash
✓ apps/web/validations/customer.ts
✓ apps/web/app/api/v1/customers/route.ts
✓ apps/web/app/api/v1/customers/[id]/route.ts
✓ apps/web/app/api/v1/customers/[id]/tags/route.ts
✓ apps/web/app/api/v1/customers/[id]/bookings/route.ts
✓ apps/web/app/api/v1/customers/[id]/export/route.ts
✓ apps/web/app/api/v1/customers/import/route.ts
✓ apps/web/app/api/v1/tags/route.ts
✓ apps/web/app/api/v1/tags/[id]/route.ts
```

**Commits verified:**
```bash
✓ 1eea51a: feat(backend): add customer list/create and tag CRUD endpoints
✓ 41f28a2: feat(backend): add customer detail, tags, bookings, export endpoints
```

**TypeScript compilation:**
```bash
✓ pnpm tsc --noEmit passes with no customer/tag errors
```

## Success Criteria Verification

- [x] Full customer CRUD with pagination, search, sort, tag filter
- [x] Soft delete for GDPR compliance (sets deletedAt, not actual deletion)
- [x] Tag management (CRUD + assignment to customers)
- [x] Data export for GDPR portability (customer + bookings + payments + tags)
- [x] UUID in all public-facing responses (never expose SERIAL IDs)
- [x] All endpoints check proper permissions and enforce tenant isolation
- [x] Customer list supports pagination (page/limit), search (name/email/phone), tag filter, sorting
- [x] Tag assignment replaces all tags atomically (DELETE + INSERT pattern)
- [x] Duplicate email check within company scope on create and update

## Next Steps

1. **Plan 03-07:** Service CRUD with categories, employees, and availability rules
2. **Plan 03-08:** Booking CRUD with double-booking prevention and availability checks
3. **CRM Phase:** Implement full CSV import with streaming parser for customer import endpoint

## Notes

- **Import scaffold:** POST /api/v1/customers/import returns 501 Not Implemented. Full CSV import requires streaming parser (papaparse), batch validation, duplicate detection, and comprehensive error reporting. Deferred to dedicated CRM phase where bulk operations will be prioritized.

- **Performance:** Customer list query with tag filter performs INNER JOIN on customer_tags junction table. For companies with >10k customers and heavy tag usage, consider adding composite index on (customerId, tagId) if not already present (it is via primary key).

- **GDPR export:** Includes ALL customer data (even deleted bookings) for complete portability. This is intentional for GDPR compliance ("right to data portability" Article 20). Production deployments should stream large exports rather than loading all data into memory.

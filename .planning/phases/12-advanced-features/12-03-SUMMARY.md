---
phase: 12-advanced-features
plan: 03
subsystem: reviews
tags: [reviews, moderation, ratings, customer-feedback]
dependency_graph:
  requires:
    - packages/database/src/schema/reviews.ts
    - packages/database/src/schema/bookings.ts
    - packages/events/src/events/review.ts
    - packages/shared/src/schemas/review.ts
  provides:
    - apps/web/app/api/v1/reviews/route.ts
    - apps/web/app/api/v1/reviews/[id]/route.ts
    - apps/web/app/api/v1/reviews/[id]/reply/route.ts
  affects:
    - Marketplace ranking (average rating feeds into listings)
    - Notification system (review.created event)
tech_stack:
  added: []
  patterns:
    - Auto-moderation algorithm (low ratings, first-time reviewers, short comments)
    - Review redirect routing (high ratings to Google, low ratings internal)
    - Duplicate prevention via booking FK constraint
key_files:
  created:
    - apps/web/app/api/v1/reviews/route.ts
    - apps/web/app/api/v1/reviews/[id]/route.ts
    - apps/web/app/api/v1/reviews/[id]/reply/route.ts
  modified: []
decisions:
  - context: "Review moderation criteria"
    decision: "Auto-moderate (isPublished=false) if rating <= 3 OR first-time reviewer OR comment < 20 chars"
    rationale: "Protects against spam and fake reviews, reduces moderation burden for positive reviews"
    outcome: "Implemented in POST /api/v1/reviews auto-moderation logic"
  - context: "Review routing for high ratings"
    decision: "Reviews with rating >= 4 get google redirect suggestion, <= 3 stay internal"
    rationale: "Aligns with Phase 7-03 routing threshold, maximizes positive external reviews"
    outcome: "redirectedTo field set to 'google' or 'internal', redirect_to URL included in response"
  - context: "Owner reply auto-approves pending reviews"
    decision: "When owner replies to a review, set isPublished=true regardless of previous state"
    rationale: "Owner engagement signals review is legitimate, streamlines moderation workflow"
    outcome: "Implemented in POST /api/v1/reviews/[id]/reply"
  - context: "Param schema for dynamic routes"
    decision: "Use local reviewIdParamSchema in each route file (z.object({ id: z.string().uuid() }))"
    rationale: "Following coupon pattern, avoids creating shared validation file for single schema"
    outcome: "Defined in both [id]/route.ts and [id]/reply/route.ts"
metrics:
  duration: 473
  tasks_completed: 2
  files_created: 3
  commits: 2
  completed_at: "2026-02-12T14:07:37Z"
---

# Phase 12 Plan 03: Review System API Summary

**One-liner:** Customer review submission with auto-moderation (low ratings/first-time/short comments), owner replies with auto-approval, and external redirect routing for high ratings

## Tasks Completed

| Task | Name                                          | Status | Commit  |
| ---- | --------------------------------------------- | ------ | ------- |
| 1    | Review list and create endpoints              | ✅     | ddb9cbb |
| 2    | Review detail, reply, and delete endpoints    | ✅     | d303538 |

## Implementation Summary

### Task 1: Review List and Create Endpoints

**File:** `apps/web/app/api/v1/reviews/route.ts`

**GET /api/v1/reviews:**
- Tenant-scoped list with `companyId` filter and `deletedAt IS NULL`
- Query params: `rating_min`, `status` (approved/pending), `page`, `limit`
- Status mapping: `approved` = `isPublished=true`, `pending` = `isPublished=false`
- LEFT JOIN with `customers` and `services` for names
- Returns paginated response with UUID (never SERIAL ID)

**POST /api/v1/reviews:**
- Authenticates user, finds customer record via `users.uuid` → `users.id` → `customers.userId`
- Validates booking: exists, belongs to customer, status = 'completed'
- Duplicate prevention: queries `reviews WHERE bookingId = booking.id`, returns 409 if exists
- Auto-moderation logic:
  1. Count existing reviews for customer to detect first-time reviewer
  2. `needsModeration = rating <= 3 OR isFirstReview OR (comment && comment.length < 20)`
  3. `isPublished = !needsModeration`
- Redirect routing: `redirectedTo = rating >= 4 ? 'google' : 'internal'`
- Inserts review with `companyId`, `customerId`, `bookingId`, `serviceId`, `employeeId`, `rating`, `comment`, `isPublished`, `redirectedTo`
- Publishes `review.created` event (fire-and-forget, wrapped in try/catch)
- Returns 201 with `redirect_to` URL placeholder for high ratings

### Task 2: Review Detail, Reply, and Delete Endpoints

**Files:**
- `apps/web/app/api/v1/reviews/[id]/route.ts`
- `apps/web/app/api/v1/reviews/[id]/reply/route.ts`

**GET /api/v1/reviews/[id]:**
- Param validation: `reviewIdParamSchema` (UUID format)
- Query by UUID with LEFT JOIN on `customers`, `services`, `employees` for names
- Tenant isolation: `companyId` and `deletedAt IS NULL`
- Returns 404 if not found, 200 with full review detail

**DELETE /api/v1/reviews/[id]:**
- Requires `PERMISSIONS.SETTINGS_MANAGE` (owner/admin only)
- Soft delete: `SET deletedAt = new Date(), isPublished = false, updatedAt = new Date()`
- Tenant isolation: `companyId` and `deletedAt IS NULL` in WHERE
- Returns 204 No Content

**POST /api/v1/reviews/[id]/reply:**
- Requires `PERMISSIONS.SETTINGS_MANAGE` (owner/admin only)
- Validates review exists (tenant-scoped, not deleted)
- Updates: `SET reply = body.reply, repliedAt = new Date(), isPublished = true, updatedAt = new Date()`
- **Auto-approves pending reviews** when owner replies (implicit moderation approval)
- Returns 200 with updated review

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

### Type Checking
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
✅ **PASSED** - No type errors

### Key Verifications

1. ✅ Review creation validates completed booking ownership
2. ✅ Duplicate reviews per booking return 409 DUPLICATE_REVIEW
3. ✅ Auto-moderation: ratings 1-3, first-time reviewers, short comments set isPublished=false
4. ✅ Owner reply works and auto-approves pending reviews (isPublished=true)
5. ✅ Soft delete sets deletedAt and isPublished=false, doesn't hard delete
6. ✅ Review.created event published on creation (fire-and-forget)

## Self-Check

### Created Files Exist
```bash
[ -f "apps/web/app/api/v1/reviews/route.ts" ] && echo "FOUND"
[ -f "apps/web/app/api/v1/reviews/[id]/route.ts" ] && echo "FOUND"
[ -f "apps/web/app/api/v1/reviews/[id]/reply/route.ts" ] && echo "FOUND"
```
✅ FOUND: apps/web/app/api/v1/reviews/route.ts
✅ FOUND: apps/web/app/api/v1/reviews/[id]/route.ts
✅ FOUND: apps/web/app/api/v1/reviews/[id]/reply/route.ts

### Commits Exist
```bash
git log --oneline --all | grep -E "ddb9cbb|d303538"
```
✅ FOUND: ddb9cbb feat(backend): implement review list and create endpoints with auto-moderation
✅ FOUND: d303538 feat(backend): implement review detail, reply, and delete endpoints

## Self-Check: PASSED

## Technical Notes

### Auto-Moderation Algorithm
1. **Low ratings (1-3):** Set `isPublished=false` to prevent immediate publishing of negative feedback
2. **First-time reviewers:** Count existing reviews, if 0 then moderate (spam/fake review protection)
3. **Short comments:** Comments < 20 chars likely low-quality, send to moderation
4. **High ratings (4-5):** No moderation if not first-time and comment >= 20 chars

### Redirect Routing Pattern
- **Rating >= 4:** `redirectedTo='google'`, `redirect_to` includes Google review URL placeholder
- **Rating <= 3:** `redirectedTo='internal'`, `redirect_to=null` (kept internal)
- Aligns with Phase 7-03 notification consumer routing threshold
- Maximizes external positive reviews, keeps negative feedback internal for owner response

### Owner Reply Auto-Approval
- When owner replies to a review, `isPublished` is set to `true` regardless of previous state
- Rationale: Owner engagement signals review legitimacy, streamlines moderation workflow
- Reduces manual moderation steps (reply + approve) to single action

### Duplicate Prevention
- UNIQUE constraint on `reviews.bookingId` in DB schema (phase 02-05)
- API layer checks: query `reviews WHERE bookingId = booking.id`, return 409 if exists
- Defense-in-depth: both DB constraint and application logic

### Customer Identification
- JWT `sub` field contains `users.uuid` (not SERIAL ID)
- Resolution chain: `users.uuid` → `users.id` (SERIAL) → `customers.userId` → `customers.id` (SERIAL)
- Two queries needed: users lookup, then customers lookup
- Returns 403 if user has no customer record

## Next Steps

- Phase 12 Plan 04: Video meeting creation and management API
- Phase 12 Plan 05: Whitelabel app build and configuration API
- Phase 13: Frontend implementation of advanced features (marketplace, reviews, video, whitelabel UI)

---
*Completed 2026-02-12 by GSD Executor (Phase 12 Plan 03)*

---
phase: 07-notifications-automation
plan: 04
subsystem: notification-system
tags: [api, routes, notifications, automation, templates, tracking, webhooks]
dependency_graph:
  requires: [Phase 7-01 event types, Phase 2 database schemas, Phase 3 RBAC patterns]
  provides: [Notification template CRUD, Notification history API, Automation rules CRUD, Email tracking, Push registration]
  affects: [Frontend notification management, Email tracking analytics, Automation workflow UI]
tech_stack:
  added: [handlebars]
  patterns: [createRouteHandler, UUID routing, public webhooks, tenant scoping]
key_files:
  created:
    - apps/web/app/api/v1/notification-templates/route.ts
    - apps/web/app/api/v1/notification-templates/[id]/route.ts
    - apps/web/app/api/v1/notification-templates/[id]/preview/route.ts
    - apps/web/app/api/v1/notifications/route.ts
    - apps/web/app/api/v1/notifications/[id]/route.ts
    - apps/web/app/api/v1/webhooks/email-tracking/open/route.ts
    - apps/web/app/api/v1/webhooks/email-tracking/click/route.ts
    - apps/web/app/api/v1/webhooks/push/register/route.ts
    - apps/web/app/api/v1/automation/rules/route.ts
    - apps/web/app/api/v1/automation/rules/[id]/route.ts
    - apps/web/app/api/v1/automation/rules/[id]/toggle/route.ts
    - apps/web/app/api/v1/automation/logs/route.ts
  modified:
    - apps/web/package.json
    - packages/database/src/schema/auth.ts
decisions:
  - Notification templates use numeric IDs (SERIAL) for route params per database design
  - Automation rules use UUID routing to never expose SERIAL IDs (API convention)
  - Email tracking webhooks are public (no auth) for embedded pixel/redirect usage
  - Push subscriptions stored in users.metadata JSONB field (flexible storage)
  - Template preview uses Handlebars directly in API route (lightweight, no worker needed)
  - Added users.metadata field for push subscription storage (Rule 2 deviation)
metrics:
  duration: 680s
  tasks_completed: 2
  files_created: 12
  files_modified: 2
  commits: 2
  completed_date: 2026-02-11
---

# Phase 7 Plan 04: Notification & Automation API Routes Summary

**One-liner:** Complete REST API for notification template management, notification history, automation rules with toggle, email tracking, and push registration.

## What Was Built

### Task 1: Notification Template CRUD and Notification List API Routes

Created comprehensive notification management endpoints following existing API patterns:

**Notification Template Routes:**
- `GET /api/v1/notification-templates` - List templates with type/channel filters, pagination
- `POST /api/v1/notification-templates` - Create template with unique constraint handling (company+type+channel)
- `GET /api/v1/notification-templates/:id` - Get template by numeric ID
- `PUT /api/v1/notification-templates/:id` - Update template with conflict handling
- `DELETE /api/v1/notification-templates/:id` - Delete template

**Template Preview:**
- `POST /api/v1/notification-templates/:id/preview` - Render template with Handlebars using test data
- Allows admins to preview templates before activation
- Returns rendered subject and body

**Notification History:**
- `GET /api/v1/notifications` - List notifications with filters (channel, status, customer, date range)
- `GET /api/v1/notifications/:id` - Get single notification with template info (left join)
- Ordered by createdAt DESC for recent-first display

**Email Tracking Webhooks (Public, No Auth):**
- `GET /api/v1/webhooks/email-tracking/open?nid=:id` - Returns 1x1 transparent PNG, updates opened_at on first open only
- `GET /api/v1/webhooks/email-tracking/click?nid=:id&url=:targetUrl` - Updates clicked_at, redirects to URL (validates http/https to prevent open redirect)
- Both endpoints silently handle errors (always return pixel/redirect)

**Push Subscription:**
- `POST /api/v1/webhooks/push/register` - Stores push subscription (endpoint, p256dh, auth keys) in users.metadata JSONB field

All authenticated endpoints use `PERMISSIONS.SETTINGS_MANAGE`, `createRouteHandler`, and `findCompanyId` for tenant isolation.

**Verification:** Type-check passed with no errors in new routes.

**Commit:** `cd791f4`

### Task 2: Automation Rules CRUD and Execution Logs API Routes

Implemented automation rule management with UUID-based routing:

**Automation Rule Routes:**
- `GET /api/v1/automation/rules` - List rules with filters (triggerType, isActive), pagination
- `POST /api/v1/automation/rules` - Create rule with full trigger/action config
- `GET /api/v1/automation/rules/:uuid` - Get rule by UUID (not SERIAL id)
- `PUT /api/v1/automation/rules/:uuid` - Update rule
- `DELETE /api/v1/automation/rules/:uuid` - Delete rule
- `POST /api/v1/automation/rules/:uuid/toggle` - Convenience endpoint flips isActive boolean

**Automation Logs:**
- `GET /api/v1/automation/logs` - List execution logs with filters (ruleId, status)
- Joins with automation_rules to get rule name and enforce company scoping
- Only shows logs for rules belonging to user's company (INNER JOIN)
- Returns logs with ruleName and ruleUuid for context

**Key Design:**
- UUID routing for all automation rule routes (follows API convention of never exposing SERIAL IDs)
- Toggle endpoint enables quick UI enable/disable without full PUT request
- Logs endpoint uses INNER JOIN for both data enrichment and tenant isolation

**Verification:** Type-check passed with no errors.

**Commit:** `056c623`

## Deviations from Plan

### Rule 2 (Auto-add missing critical functionality)

**Users.metadata JSONB field:**
- **Found during:** Task 1 - push subscription registration
- **Issue:** Push subscriptions needed storage location, users table lacked metadata field
- **Fix:** Added `metadata: jsonb('metadata').default({})` to users table schema
- **Files modified:** `packages/database/src/schema/auth.ts`
- **Commit:** Included in cd791f4
- **Rationale:** metadata JSONB field is standard pattern for extensible user data, critical for storing push subscription objects

No architectural changes required (Rule 4). All other changes executed exactly as planned.

## Verification Results

### Type Checks
- ✅ PASSED: `pnpm --filter @schedulebox/web type-check` (0 errors in new routes)
- Pre-existing OAuth stub errors remain (not related to this plan)

### Pattern Compliance
- ✅ All authenticated endpoints use `createRouteHandler` with `requiresAuth: true`
- ✅ All endpoints use `PERMISSIONS.SETTINGS_MANAGE` for RBAC
- ✅ All queries filter by companyId via `findCompanyId` for tenant isolation
- ✅ Tracking webhooks correctly use NO auth (public endpoints)
- ✅ Automation rules use UUID routing (not numeric IDs)
- ✅ Template routes use numeric ID routing per database design
- ✅ Error handling with type-safe checks (no `any` types)
- ✅ Pagination uses `total_pages` (snake_case per PaginationMeta type)

### Endpoint Coverage
- ✅ Notification template CRUD (5 endpoints)
- ✅ Template preview with Handlebars (1 endpoint)
- ✅ Notification list with filtering (2 endpoints)
- ✅ Email tracking (2 public webhooks)
- ✅ Push subscription (1 endpoint)
- ✅ Automation rule CRUD + toggle (6 endpoints)
- ✅ Automation logs (1 endpoint)

**Total:** 18 endpoints implemented

## Dependencies Satisfied

**Input Dependencies:**
- Phase 7-01: CloudEvent types for notification lifecycle tracking
- Phase 2: Database schemas (notificationTemplates, notifications, automationRules, automationLogs)
- Phase 3: RBAC patterns (createRouteHandler, PERMISSIONS, findCompanyId)
- Phase 5: Existing API route patterns (bookings/route.ts reference)

**Output Provided:**
- Notification template management API for Phase 4 frontend
- Notification history API for analytics dashboard
- Automation rule management API for workflow UI
- Email tracking foundation for analytics (open/click rates)
- Push subscription registration for Phase 7-03 web push delivery

## Files Created (12)

| File | Lines | Purpose |
|------|-------|---------|
| apps/web/app/api/v1/notification-templates/route.ts | 136 | List and create notification templates |
| apps/web/app/api/v1/notification-templates/[id]/route.ts | 159 | Get, update, delete templates by numeric ID |
| apps/web/app/api/v1/notification-templates/[id]/preview/route.ts | 97 | Render template with Handlebars for preview |
| apps/web/app/api/v1/notifications/route.ts | 80 | List notifications with filtering |
| apps/web/app/api/v1/notifications/[id]/route.ts | 66 | Get single notification with template info |
| apps/web/app/api/v1/webhooks/email-tracking/open/route.ts | 58 | Tracking pixel endpoint (public) |
| apps/web/app/api/v1/webhooks/email-tracking/click/route.ts | 50 | Click tracking with redirect (public) |
| apps/web/app/api/v1/webhooks/push/register/route.ts | 75 | Push subscription registration |
| apps/web/app/api/v1/automation/rules/route.ts | 111 | List and create automation rules |
| apps/web/app/api/v1/automation/rules/[id]/route.ts | 136 | Get, update, delete rules by UUID |
| apps/web/app/api/v1/automation/rules/[id]/toggle/route.ts | 72 | Toggle rule active status |
| apps/web/app/api/v1/automation/logs/route.ts | 102 | List automation execution logs with join |

## Files Modified (2)

| File | Changes | Reason |
|------|---------|--------|
| apps/web/package.json | Added handlebars ^4.7.8 | Required for template preview rendering |
| packages/database/src/schema/auth.ts | Added users.metadata JSONB field | Storage for push subscriptions (Rule 2 deviation) |

## Key Technical Decisions

1. **ID Routing Strategy** - Notification templates use numeric IDs per database design. Automation rules use UUIDs to follow API convention of never exposing SERIAL IDs.

2. **Public Webhooks** - Email tracking endpoints are public (no auth) since they're embedded in emails. Validation prevents open redirect vulnerabilities.

3. **Template Preview** - Handlebars rendering happens directly in API route (lightweight). No need for full worker service for synchronous preview operation.

4. **Push Subscription Storage** - Stored in users.metadata JSONB field. Flexible for future extension without schema migrations.

5. **Automation Logs Join** - INNER JOIN with automation_rules serves dual purpose: enriches data with rule name AND enforces tenant isolation (only rules from user's company).

6. **Toggle Endpoint** - Dedicated toggle endpoint provides better UX than full PUT. Single-click enable/disable from UI without fetching full rule object.

7. **First Open/Click Only** - Tracking endpoints only update on first event (WHERE opened_at IS NULL). Prevents re-opening same email from skewing analytics.

## Self-Check: PASSED ✅

**Files Created:**
- ✅ FOUND: apps/web/app/api/v1/notification-templates/route.ts
- ✅ FOUND: apps/web/app/api/v1/notification-templates/[id]/route.ts
- ✅ FOUND: apps/web/app/api/v1/notification-templates/[id]/preview/route.ts
- ✅ FOUND: apps/web/app/api/v1/notifications/route.ts
- ✅ FOUND: apps/web/app/api/v1/notifications/[id]/route.ts
- ✅ FOUND: apps/web/app/api/v1/webhooks/email-tracking/open/route.ts
- ✅ FOUND: apps/web/app/api/v1/webhooks/email-tracking/click/route.ts
- ✅ FOUND: apps/web/app/api/v1/webhooks/push/register/route.ts
- ✅ FOUND: apps/web/app/api/v1/automation/rules/route.ts
- ✅ FOUND: apps/web/app/api/v1/automation/rules/[id]/route.ts
- ✅ FOUND: apps/web/app/api/v1/automation/rules/[id]/toggle/route.ts
- ✅ FOUND: apps/web/app/api/v1/automation/logs/route.ts

**Commits:**
- ✅ FOUND: cd791f4 (Task 1: Notification templates and tracking)
- ✅ FOUND: 056c623 (Task 2: Automation rules and logs)

**Type Checks:**
- ✅ PASSED: No errors in new routes

**Functionality:**
- ✅ Template CRUD with unique constraint handling
- ✅ Template preview with Handlebars rendering
- ✅ Notification list with multi-field filtering
- ✅ Email tracking with first-event-only updates
- ✅ Push subscription storage in metadata
- ✅ Automation rule CRUD with UUID routing
- ✅ Toggle endpoint for quick enable/disable
- ✅ Logs with rule name via INNER JOIN

## Next Steps

Phase 7 Plan 05 (Notification Delivery) can now proceed:
- Template rendering infrastructure ready (Handlebars installed)
- Notification table ready for queueing
- Automation rules ready for trigger matching
- Email tracking endpoints ready for pixel/link injection
- Push subscriptions ready for web push delivery

Frontend can begin implementing:
- Template management UI (CRUD + preview)
- Notification history dashboard (with tracking stats)
- Automation rule builder (trigger-action configuration)
- Rule toggle switches (quick enable/disable)

---

**Plan Duration:** 680 seconds (11 minutes 20 seconds)
**Completed:** 2026-02-11
**Commits:** cd791f4, 056c623

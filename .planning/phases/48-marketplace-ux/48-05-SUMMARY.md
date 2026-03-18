---
phase: 48-marketplace-ux
plan: 05
subsystem: webhooks
tags: [webhooks, security, encryption, api, settings, booking-events]
dependency_graph:
  requires: [46-security-hardening]
  provides: [UX-05, webhook-delivery-engine, webhook-settings-ui]
  affects: [booking-routes, settings-navigation]
tech_stack:
  added: []
  patterns:
    - AES-256-GCM encrypted HMAC secret storage (reusing Phase 46 encryption module)
    - Fire-and-forget webhook delivery with retry scheduling via DB records + cron
    - SSRF protection at creation time (reusing Phase 46 ssrf.ts)
    - Stripe-like expandable delivery log UI
key_files:
  created:
    - packages/database/src/schema/webhook-config.ts
    - packages/database/src/sql/webhook-config-tables.sql
    - packages/database/src/sql/apply-webhook-tables.ts
    - packages/database/src/sql/grant-webhook-tables.ts
    - apps/web/app/api/v1/webhook-endpoints/route.ts
    - apps/web/app/api/v1/webhook-endpoints/[id]/route.ts
    - apps/web/app/api/v1/webhook-endpoints/[id]/test/route.ts
    - apps/web/app/api/v1/webhook-endpoints/deliveries/route.ts
    - apps/web/app/api/v1/webhook-endpoints/retry/route.ts
    - apps/web/lib/webhooks/trigger.ts
    - apps/web/hooks/use-webhooks-config-query.ts
    - apps/web/app/[locale]/(dashboard)/settings/webhooks/page.tsx
  modified:
    - packages/database/src/schema/index.ts
    - apps/web/lib/navigation.ts
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/app/api/v1/bookings/[id]/confirm/route.ts
    - apps/web/app/api/v1/bookings/[id]/cancel/route.ts
    - apps/web/app/api/v1/bookings/[id]/complete/route.ts
    - apps/web/app/api/v1/bookings/[id]/no-show/route.ts
    - apps/web/app/api/v1/public/company/[slug]/bookings/route.ts
decisions:
  - "webhook tables applied via raw SQL (postgres superuser) because schedulebox user lacks CREATE privilege — consistent with Phase 47 pattern"
  - "Retry scheduling via DB records not RabbitMQ: two pending delivery records inserted at failure time (attempt=2 +60s, attempt=3 +300s); cron processes them"
  - "Exponential backoff: 1min, 5min (trigger.ts), 30min (retry.ts for attempt 3 re-failed)"
  - "SSRF validation reuses existing ssrf.ts (Phase 46) — validateWebhookUrl throws on private IPs"
  - "Secret revealed once in creation response; stored as AES-256-GCM ciphertext; decrypted per-delivery in trigger.ts"
  - "Delivery log payload truncated to 500 chars in list view; full payload in expandable row (frontend handles)"
metrics:
  duration: "18 minutes"
  completed_date: "2026-03-18"
  tasks: 3
  files_created: 13
  files_modified: 9
---

# Phase 48 Plan 05: Webhooks Management System Summary

**One-liner:** Full webhook management system with AES-256-GCM secret storage, HMAC-signed delivery, exponential backoff retries via DB scheduling + cron, and Stripe-like settings UI wired into booking lifecycle events.

## What Was Built

### Task 1: DB Schema, API Routes, Delivery Engine, Retry Cron (commit: 2f24ad8)

**DB Schema** (`packages/database/src/schema/webhook-config.ts`):
- `webhook_endpoints`: company_id FK, encrypted_secret (AES-256-GCM), events text[], is_active
- `webhook_deliveries`: endpoint_id FK cascade, payload jsonb, status, scheduled_at (for retry), attempt, max_attempts
- Applied via direct SQL (postgres superuser, then GRANT to schedulebox user)

**API Routes** (`/api/v1/webhook-endpoints/`):
- `GET /webhook-endpoints` — list for company, returns uuid as id, never exposes encrypted secret
- `POST /webhook-endpoints` — SSRF-validated URL, 5-endpoint limit, generate+encrypt HMAC secret, return plaintext once
- `DELETE /webhook-endpoints/:id` — verified ownership, cascade deletes deliveries, 204 No Content
- `POST /webhook-endpoints/:id/test` — decrypt secret, compute HMAC-SHA256, send real HTTP POST, record delivery
- `GET /webhook-endpoints/deliveries` — paginated delivery log with optional endpoint_id filter
- `GET /webhook-endpoints/retry` — cron endpoint (Bearer CRON_SECRET auth), processes pending retries (attempt > 1, scheduled_at <= now), batch 50

**Trigger Utility** (`apps/web/lib/webhooks/trigger.ts`):
- `triggerWebhooks(companyId, eventType, payload)` — fire-and-forget
- Queries active endpoints where events array contains eventType (using PostgreSQL `@>` operator)
- Per-delivery: decrypt secret, compute HMAC, send HTTP POST, record result
- On failure: insert 2 retry records (attempt=2 +60s, attempt=3 +300s)

### Task 2: Settings UI and Navigation (commit: e9278f8)

**TanStack Query Hooks** (`apps/web/hooks/use-webhooks-config-query.ts`):
- `useWebhookEndpoints()`, `useCreateWebhookEndpoint()`, `useDeleteWebhookEndpoint()`
- `useTestWebhookEndpoint()`, `useWebhookDeliveries(page, endpointId?)`

**Settings Page** (`apps/web/app/[locale]/(dashboard)/settings/webhooks/page.tsx`):
- Header with Add Endpoint button (disabled at 5 endpoints, tooltip shown)
- Create dialog: URL input + event checkboxes with select all/deselect all
- One-time secret reveal dialog: monospace code block, copy button, dismiss
- Endpoint cards: URL, event badges, active badge, test button (inline result), delete with confirmation
- Delivery log: expandable table rows (click to expand JSON payload + response), endpoint filter dropdown, pagination
- Glass card styling, all text translated (en + cs)

**Navigation**: Webhooks link added to sidebar (Globe icon, owner role, `settings/webhooks` path)

### Task 3: Booking Route Integration (commit: 319b340)

`triggerWebhooks` wired (fire-and-forget, `void`) into:
- `POST /api/v1/public/company/[slug]/bookings` → `booking.created`
- `POST /api/v1/bookings/:id/confirm` → `booking.confirmed`
- `POST /api/v1/bookings/:id/cancel` → `booking.cancelled`
- `POST /api/v1/bookings/:id/complete` → `booking.completed`
- `POST /api/v1/bookings/:id/no-show` → `booking.no_show`

Payload for each: `{ booking_id, customer_name, service_name, start_time, status }`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] db:push interactive prompt blocked automated schema push**

- **Found during:** Task 1 DB schema creation
- **Issue:** `drizzle-kit push` prompted interactively about a pre-existing unique constraint on customers table
- **Fix:** Applied webhook tables via raw SQL script using postgres superuser (consistent with Phase 47 pattern), then granted privileges to schedulebox user
- **Files modified:** `packages/database/src/sql/webhook-config-tables.sql`, `apply-webhook-tables.ts`, `grant-webhook-tables.ts`
- **Commit:** 2f24ad8

**2. [Rule 1 - Bug] companies table imported from wrong schema file**

- **Found during:** Task 1 initial db:push attempt
- **Issue:** `companies` table is defined in `./auth` not `./organizations`
- **Fix:** Corrected import in `webhook-config.ts`
- **Commit:** 2f24ad8

**3. [Rule 2 - Missing] Checkbox component not in UI library**

- **Found during:** Task 2 settings page creation
- **Issue:** `@/components/ui/checkbox` does not exist in the project
- **Fix:** Used native `input[type=checkbox]` with Tailwind styling instead
- **Commit:** e9278f8

## Self-Check: PASSED

All key files verified present. All 3 commits verified in git log.

| File | Status |
|------|--------|
| packages/database/src/schema/webhook-config.ts | FOUND |
| apps/web/app/api/v1/webhook-endpoints/route.ts | FOUND |
| apps/web/lib/webhooks/trigger.ts | FOUND |
| apps/web/app/[locale]/(dashboard)/settings/webhooks/page.tsx | FOUND |
| apps/web/hooks/use-webhooks-config-query.ts | FOUND |

| Commit | Status |
|--------|--------|
| 2f24ad8 (DB schema, API routes, delivery engine) | FOUND |
| e9278f8 (Settings UI, hooks, navigation) | FOUND |
| 319b340 (Booking route wiring) | FOUND |

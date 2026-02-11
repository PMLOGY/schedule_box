---
phase: 07-notifications-automation
plan: 02
subsystem: notification-worker
tags: [notifications, bullmq, email, sms, push, handlebars, worker]
dependencies:
  requires:
    - 02-06: notifications table schema
    - 05-02: RabbitMQ event infrastructure
  provides:
    - notification-worker: BullMQ worker service for delivery
    - email-sender: Nodemailer SMTP with pooling
    - sms-sender: Twilio SMS with segment estimation
    - push-sender: Web push with VAPID
    - template-renderer: Handlebars with Czech helpers
    - default-templates: 6 Czech notification templates
  affects:
    - 07-03: Event consumers will enqueue to these BullMQ queues
    - 07-04: Scheduler will reference templates
tech_stack:
  added:
    - bullmq: Job queue for notification delivery
    - nodemailer: SMTP email sending
    - twilio: SMS delivery
    - web-push: Browser push notifications
    - handlebars: Template rendering
  patterns:
    - BullMQ workers with concurrency and rate limiting
    - Graceful degradation when credentials missing
    - Template caching for performance
    - Tracking pixel injection for email open tracking
key_files:
  created:
    - services/notification-worker/package.json
    - services/notification-worker/src/config.ts
    - services/notification-worker/src/queues.ts
    - services/notification-worker/src/index.ts
    - services/notification-worker/src/services/email-sender.ts
    - services/notification-worker/src/services/sms-sender.ts
    - services/notification-worker/src/services/push-sender.ts
    - services/notification-worker/src/services/template-renderer.ts
    - services/notification-worker/src/services/notification-logger.ts
    - services/notification-worker/src/jobs/email-job.ts
    - services/notification-worker/src/jobs/sms-job.ts
    - services/notification-worker/src/jobs/push-job.ts
    - services/notification-worker/src/templates/email/layout.hbs
    - services/notification-worker/src/templates/email/booking-confirmation.hbs
    - services/notification-worker/src/templates/email/booking-reminder.hbs
    - services/notification-worker/src/templates/email/review-request.hbs
    - services/notification-worker/src/templates/sms/booking-confirmation.hbs
    - services/notification-worker/src/templates/sms/booking-reminder.hbs
  modified:
    - pnpm-lock.yaml
decisions:
  - Fire-and-forget job publishing for MVP (reliability in Phase 7 consumer implementation)
  - Graceful degradation when SMTP/Twilio/VAPID not configured (development mode)
  - Template caching via Map for performance optimization
  - Tracking pixel injection before </body> tag for email open tracking
  - SMS segment estimation using GSM-7 (160 chars) vs UCS-2 (70 chars) for Czech
  - BullMQ rate limiting: 100 emails/60s, lower concurrency for SMS (3 vs 5 for email)
  - ESLint disable for control character regex in SMS unicode detection
metrics:
  duration: 340s
  tasks_completed: 2
  commits: 2
  files_created: 18
  completed_at: 2026-02-11T16:44:27Z
---

# Phase 07 Plan 02: Notification Worker Microservice

**Complete BullMQ-based notification delivery engine with email/SMS/push senders, Handlebars templates with Czech locale helpers, and graceful credential handling**

## Tasks Completed

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | Notification worker package scaffold with BullMQ queues and config | 789cc10 | package.json, config.ts, queues.ts, index.ts |
| 2 | Delivery channel senders, template renderer, job handlers, and templates | af9b638 | email-sender.ts, sms-sender.ts, push-sender.ts, template-renderer.ts, notification-logger.ts, 3 job handlers, 6 templates |

## What Was Built

### Core Infrastructure

**Package Setup:**
- ESM-first microservice in `services/notification-worker/`
- Dependencies: bullmq, nodemailer, handlebars, twilio, web-push, drizzle-orm
- BullMQ queues configured: `notification:email`, `notification:sms`, `notification:push`
- Config module with Redis/SMTP/Twilio/VAPID settings from env vars
- Graceful shutdown handler for SIGTERM/SIGINT

**BullMQ Workers:**
- Email worker: concurrency 5, rate limit 100/60s, retry on failure
- SMS worker: concurrency 3 (lower for cost control), retry on failure
- Push worker: concurrency 10 (fast delivery), retry on failure
- All workers log completion/failure events with attempt counts

### Delivery Channels

**Email Sender (`email-sender.ts`):**
- Nodemailer SMTP transport with connection pooling (max 5 connections, 100 messages)
- Tracking pixel injection before `</body>` tag for open tracking
- Graceful degradation: returns mock messageId when SMTP not configured

**SMS Sender (`sms-sender.ts`):**
- Twilio SDK integration for SMS delivery
- Segment estimation: GSM-7 (160 chars) vs UCS-2 (70 chars) for Czech diacritics
- Graceful degradation: returns mock SID when Twilio not configured

**Push Sender (`push-sender.ts`):**
- Web-push with VAPID protocol for browser notifications
- Endpoint-based delivery with p256dh/auth keys
- Graceful degradation: logs warning when VAPID not configured

### Template System

**Template Renderer (`template-renderer.ts`):**
- Handlebars template compilation with caching via Map
- Czech locale helpers registered globally:
  - `formatDate`: cs-CZ date formatting (e.g., "1. ledna 2026")
  - `formatTime`: HH:MM time formatting
  - `formatCurrency`: Czech currency formatting (e.g., "1 500 Kč")
  - `ifEquals`: Conditional block helper for equality checks
- Two rendering modes: inline string or file-based (templates/{channel}/{name}.hbs)

**Default Templates (Czech):**
- Email layout: ScheduleBox branded header (blue #3B82F6), white content area, gray footer
- Booking confirmation email: Service details box, price, cancel link
- Booking reminder email: "Váš termín se blíží", reschedule CTA button
- Review request email: 5-star rating links, feedback encouragement
- Booking confirmation SMS: 70-char optimized with date/time/company
- Booking reminder SMS: "Připomínáme termín: {service} zítra v {time}"

### Database Integration

**Notification Logger (`notification-logger.ts`):**
- `createNotificationRecord`: Inserts pending notification with onConflictDoNothing
- `logNotificationSent`: Updates status to 'sent', stores messageId in metadata
- `logNotificationFailed`: Updates status to 'failed', stores error message
- Uses Drizzle ORM with notifications table from @schedulebox/database

### Job Handlers

**Email Job (`email-job.ts`):**
- Creates notification record if not provided
- Injects tracking pixel with notification ID
- Sends via Nodemailer, updates status
- Re-throws errors for BullMQ retry mechanism

**SMS Job (`sms-job.ts`):**
- Creates notification record if not provided
- Sends via Twilio, logs segment count
- Updates status, re-throws on error

**Push Job (`push-job.ts`):**
- Creates notification record if not provided
- Sends via web-push to subscription endpoint
- Updates status, re-throws on error

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] BullMQ stalledInterval config incompatibility**
- **Found during:** Task 2 type-check
- **Issue:** BullMQ v5 doesn't support `stalledInterval` and `maxStalledCount` in `settings` object (API changed)
- **Fix:** Removed stalled job configuration from all three workers (BullMQ defaults handle this)
- **Files modified:** email-job.ts, sms-job.ts, push-job.ts
- **Commit:** af9b638

**2. [Rule 1 - Bug] Incorrect drizzle-orm import path**
- **Found during:** Task 2 type-check
- **Issue:** Attempted to import drizzle-orm from @schedulebox/database package (not re-exported)
- **Fix:** Added drizzle-orm as direct dependency in package.json, imported from 'drizzle-orm'
- **Files modified:** package.json, notification-logger.ts
- **Commit:** af9b638

**3. [Rule 3 - Blocking] ESLint no-control-regex error**
- **Found during:** Task 2 pre-commit hook
- **Issue:** Regex `/[^\x00-\x7F]/` for unicode detection triggered ESLint control character rule
- **Fix:** Added `eslint-disable-next-line no-control-regex` comment (legitimate use case for SMS encoding detection)
- **Files modified:** sms-sender.ts
- **Commit:** 70edf7d

**4. [Rule 2 - Missing Critical] Handlebars helper type annotation**
- **Found during:** Task 2 type-check
- **Issue:** `this` parameter in `ifEquals` helper had implicit any type
- **Fix:** Added explicit type annotation: `function (this: unknown, ...)`
- **Files modified:** template-renderer.ts
- **Commit:** af9b638

## Verification Results

✅ `pnpm install` succeeded (all dependencies resolved)
✅ `pnpm --filter @schedulebox/notification-worker type-check` passed
✅ All 6 template files exist with valid Handlebars syntax
✅ Worker entrypoint imports all three job handlers
✅ All senders have graceful degradation for missing credentials

## Key Integration Points

**For Plan 07-03 (Event Consumers):**
- Enqueue jobs via: `emailQueue.add('send-email', { companyId, recipient, subject, html, ... })`
- Queue imports: `import { emailQueue, smsQueue, pushQueue } from '@schedulebox/notification-worker/src/queues.js'`
- Job data interfaces exported from job handler files

**For Plan 07-04 (Notification Scheduler):**
- Template rendering: `renderTemplateFile('booking-confirmation', 'email', { customer_name, booking_date, ... })`
- Templates follow Czech locale conventions (date/time/currency formatting)

**Environment Variables Required (Phase 7 Plan 03+):**
```env
# Email (required for production)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
SMTP_FROM=noreply@schedulebox.cz

# SMS (optional, graceful degradation)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_FROM_NUMBER=+420xxxxxxxxx

# Push (optional, graceful degradation)
VAPID_PUBLIC_KEY=xxxx
VAPID_PRIVATE_KEY=xxxx
```

## Self-Check: PASSED

**Files created:**
✅ services/notification-worker/package.json
✅ services/notification-worker/src/config.ts
✅ services/notification-worker/src/queues.ts
✅ services/notification-worker/src/index.ts
✅ services/notification-worker/src/services/email-sender.ts
✅ services/notification-worker/src/services/sms-sender.ts
✅ services/notification-worker/src/services/push-sender.ts
✅ services/notification-worker/src/services/template-renderer.ts
✅ services/notification-worker/src/services/notification-logger.ts
✅ services/notification-worker/src/jobs/email-job.ts
✅ services/notification-worker/src/jobs/sms-job.ts
✅ services/notification-worker/src/jobs/push-job.ts
✅ services/notification-worker/src/templates/email/layout.hbs
✅ services/notification-worker/src/templates/email/booking-confirmation.hbs
✅ services/notification-worker/src/templates/email/booking-reminder.hbs
✅ services/notification-worker/src/templates/email/review-request.hbs
✅ services/notification-worker/src/templates/sms/booking-confirmation.hbs
✅ services/notification-worker/src/templates/sms/booking-reminder.hbs

**Commits exist:**
✅ 789cc10: feat(backend): notification worker package scaffold with BullMQ queues
✅ af9b638: feat(backend): add remaining notification worker components

## Next Steps

**Plan 07-03:** Event consumers and RabbitMQ queue bindings
- Bind to booking.created, booking.cancelled, payment.completed events
- Transform CloudEvents to BullMQ job data
- Enqueue to email/SMS/push queues based on notification preferences

**Plan 07-04:** Notification scheduler and rule engine
- Scheduled notifications (reminders, follow-ups)
- Rule-based delivery (time windows, customer preferences)
- Template management API (CRUD, preview, versioning)

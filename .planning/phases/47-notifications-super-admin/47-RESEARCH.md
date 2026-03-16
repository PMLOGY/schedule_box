# Phase 47: Notifications & Super-Admin - Research

**Researched:** 2026-03-16
**Domain:** Transactional notifications (email/SMS) + Super-admin toolset (impersonation, feature flags, suspend, broadcast, maintenance, metrics, audit)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- SMTP/nodemailer transporter already exists in `lib/email/auth-emails.ts` — reuse same pattern for booking emails
- Twilio SMS integration: reuse existing Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) — install `twilio` SDK
- Impersonation: full-width red banner "Impersonating: [Name] ([email]) — [End Session]" on every page
- Impersonation: "Impersonate" button directly on each user row in admin Users list
- Impersonation: ALL roles (owner, employee, customer), NOT other admins
- Impersonation: 15-min hard timeout, no extension; mandatory audit on start/every action/end; cannot change passwords or billing
- Feature flags: global + per-company scope; both shown in admin UI (global toggle + per-company override list)
- Feature flags: Upstash Redis cached with 60s TTL; new tables: `feature_flags`, `feature_flag_overrides`
- Maintenance: branded glass card page, Redis flag, middleware check; admin bypass mechanism at Claude's discretion
- Broadcast: email FIRST as advance notice, then in-app banner at scheduled time; audience = all companies or specific plan tier
- Broadcast table: `platform_broadcasts` (message, scheduled_at, sent_at, audience, created_by)
- Company suspend: required reason field; suspended companies get 403 on login but CAN access billing pages
- Metrics dashboard: business KPIs (signups, MRR, churn, active companies, bookings this week) + operational health (API error rate, notification delivery rate, SMS delivery rate, failed payments)
- Metrics table: `platform_daily_metrics` (date, metric_name, metric_value)
- Audit log: full JSONB before/after values, IP, request ID; new table `platform_audit_logs`
- Audit UI: searchable, filterable, expandable detail rows
- Notification delivery status visible in owner notification list (sent/failed/pending) — NOTIF-04

### Claude's Discretion

- Email sending approach for bookings: inline in API route vs Vercel Cron — pick simplest reliable approach
- SMS reminder trigger: Vercel Cron vs Upstash QStash — pick based on Vercel constraints
- Email template HTML design (branded HTML with plain text fallback recommended)
- Impersonation end session destination
- Multi-tab impersonation behavior (recommend single-tab via sessionStorage)
- Impersonation token storage (sessionStorage vs cookie)
- Maintenance mode admin bypass mechanism (recommend secret cookie set via admin panel)
- Broadcast scheduling implementation (Vercel Cron vs on-demand check)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTIF-01 | Booking confirmation email sends on booking creation via SMTP | Existing nodemailer transporter in auth-emails.ts; inline trigger in createBooking() after successful insert |
| NOTIF-02 | Booking reminder SMS sends 24h before appointment via Twilio | Twilio SDK needs installing; Vercel Cron at `/api/v1/cron/sms-reminders` queries notifications with scheduledAt within window |
| NOTIF-03 | Booking status change emails (confirmed, cancelled, completed) send correctly | Add email triggers after confirmBooking(), cancelBooking(), completeBooking() in booking-transitions.ts |
| NOTIF-04 | Notification delivery status visible in owner notification list (sent/failed/pending) | notifications table already has status column; existing GET /api/v1/notifications returns it |
| ADMIN-01 | Admin can impersonate any user with mandatory audit trail entry | New impersonation JWT variant + impersonation_sessions table + red banner component |
| ADMIN-02 | Feature flags table + admin UI to toggle features per company | New feature_flags + feature_flag_overrides tables + Redis cache layer + admin UI pages |
| ADMIN-03 | Admin can suspend/unsuspend companies with reason field | Extend companies table with suspended_reason column + suspend check in login route |
| ADMIN-04 | Admin can broadcast messages to all active companies | New platform_broadcasts table + email + in-app banner scheduling |
| ADMIN-05 | Maintenance mode toggle blocks public access with branded status page | Redis flag + middleware check + glass maintenance page + admin bypass cookie |
| ADMIN-06 | Platform daily metrics dashboard (new companies, bookings, revenue, churn) | Extend existing /api/v1/admin/stats + new platform_daily_metrics table + new admin dashboard section |
| ADMIN-07 | Platform audit log of all admin actions with timestamp, actor, and details | New platform_audit_logs table + audit helper + admin UI list page |
</phase_requirements>

---

## Summary

Phase 47 has two domains: (1) wiring transactional notifications that were deferred when RabbitMQ was removed in Phase 45, and (2) completing the super-admin toolset with impersonation, feature flags, maintenance mode, broadcasts, metrics, and an audit log.

The notification domain is well-understood and low-risk. The SMTP nodemailer transporter exists and works. The `notifications` table already tracks lifecycle (pending/sent/delivered/failed). The `notification_templates` table exists with types for `booking_confirmation`, `booking_reminder`, and `booking_cancellation`. The missing piece is: (1) trigger email inline after booking creation/transition events (replacing the old publishEvent no-op pattern), and (2) a Vercel Cron job for SMS reminders 24h before appointments using the Twilio REST API. The Twilio SDK is NOT installed yet — it exists only as env vars in `env.ts`. One `npm install twilio` is needed.

The super-admin domain is more complex but is well-scaffolded. The admin panel exists with Companies, Users, Dashboard pages and a working sidebar. The `createRouteHandler` pattern handles all route boilerplate. The JWT system is extensible. The key architectural decision is impersonation token design: a separate short-lived JWT with `token_type: 'impersonation'` claim stored in a separate HttpOnly cookie, validated against a new `impersonation_sessions` DB table. This prevents leaked tokens from granting persistent access. Feature flags must be enforced server-side from the DB table, with Upstash Redis as a 60s TTL cache. The `companies` table already has `suspendedAt` timestamp — a `suspended_reason` text column and a `status` check in the login route complete ADMIN-03 with minimal schema change.

**Primary recommendation:** Use inline email sending (not cron) for booking notification emails — simpler, no cold-start scheduling edge cases, and email delivery latency of a few hundred ms is acceptable at booking time. Use Vercel Cron for SMS reminders because 24h-before scheduling requires a persistent timer that cannot be inline.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nodemailer | ^7.0.11 | SMTP email sending | Already in package.json; transporter in auth-emails.ts |
| @upstash/redis | installed | Feature flag cache, maintenance flag, impersonation session store | Already used throughout the app |
| drizzle-orm | installed | New table schemas + queries | Project standard ORM |
| jsonwebtoken | installed | Impersonation JWT variant | Already used in jwt.ts |
| zod | installed | Body/query validation | Project standard |
| next-intl | installed | Translation keys for email templates + new admin pages | Project standard |

### New Package Required
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| twilio | ^5.x | Twilio REST API for SMS | TWILIO_* env vars exist; SDK not installed; needed for NOTIF-02 |

**Installation:**
```bash
pnpm --filter @schedulebox/web add twilio
pnpm --filter @schedulebox/web add -D @types/twilio
```

Note: Twilio v5.x is the current major release (2025). The SDK is Node.js-only (not Edge Runtime). All SMS routes must use `export const runtime = 'nodejs'` or run in API routes without Edge annotation.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline email on booking | Vercel Cron | Cron adds scheduling complexity, delay, and cold-start risk; inline is simpler for confirmation/status-change emails which should be immediate |
| Vercel Cron for SMS reminders | Upstash QStash | QStash is event-driven and more precise; but Vercel Cron is simpler to operate and 15-min resolution is sufficient for 24h-before reminder window |
| DB-backed feature flags + Redis | LaunchDarkly/Flagsmith | External service adds cost and vendor dependency; ~10 flags maximum at SMB scale makes DB-backed fully sufficient |
| Separate impersonation JWT cookie | Extend regular JWT payload | Regular JWT is 30-day refresh; impersonation must be 15-min non-renewable, revocable, non-refreshable — separate cookie + `impersonation_sessions` table is the only safe approach |

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
apps/web/
├── app/api/v1/
│   ├── admin/
│   │   ├── impersonate/route.ts          # POST (start), DELETE (end)
│   │   ├── feature-flags/route.ts        # GET, POST
│   │   ├── feature-flags/[id]/route.ts   # PUT, DELETE
│   │   ├── feature-flags/[id]/overrides/route.ts  # GET, POST override per company
│   │   ├── companies/suspend/route.ts    # POST (suspend), POST (unsuspend)
│   │   ├── broadcast/route.ts            # GET, POST
│   │   ├── maintenance/route.ts          # GET, PUT (toggle)
│   │   ├── metrics/route.ts              # GET (daily metrics + operational health)
│   │   └── audit-log/route.ts            # GET (paginated)
│   └── cron/
│       ├── sms-reminders/route.ts        # GET — Vercel Cron (24h before)
│       └── broadcast-dispatch/route.ts   # GET — Vercel Cron (check scheduled_at)
├── app/[locale]/
│   ├── (admin)/admin/
│   │   ├── feature-flags/page.tsx
│   │   ├── broadcast/page.tsx
│   │   ├── maintenance/page.tsx
│   │   ├── metrics/page.tsx
│   │   └── audit-log/page.tsx
│   └── maintenance/page.tsx              # Public maintenance page (glass card)
├── components/
│   ├── admin/
│   │   ├── impersonation-banner.tsx      # Red full-width banner
│   │   ├── feature-flag-table.tsx
│   │   ├── broadcast-form.tsx
│   │   └── audit-log-table.tsx
│   └── shared/
│       └── broadcast-banner.tsx          # Yellow/blue dismissible banner for owners
└── lib/
    ├── email/
    │   └── booking-emails.ts             # Booking confirmation/status email functions
    ├── sms/
    │   └── twilio-client.ts              # Twilio SMS sender
    ├── admin/
    │   ├── audit.ts                      # writeAuditLog() helper
    │   ├── feature-flags.ts              # getFlag(), setFlag(), invalidateCache()
    │   └── impersonation.ts              # generateImpersonationToken(), verifyImpersonation()
    └── middleware/
        └── rbac.ts                       # Extend: add isImpersonating() check

packages/database/src/schema/
└── platform.ts                           # New: feature_flags, feature_flag_overrides,
                                          #      platform_broadcasts, platform_daily_metrics,
                                          #      platform_audit_logs, impersonation_sessions
```

### Pattern 1: Inline Email Trigger on Booking Events

**What:** After `createBooking()` completes successfully, call `sendBookingConfirmationEmail()` as fire-and-forget (non-blocking). Same pattern after `confirmBooking()`, `cancelBooking()`, `completeBooking()`.

**When to use:** All booking status transitions. Email failure must NEVER fail the booking operation itself.

```typescript
// Source: mirrors auth-emails.ts transporter pattern
// In booking-service.ts — after successful insert, before return
sendBookingConfirmationEmail({
  to: customerEmail,
  customerName: customer.name,
  serviceName: service.name,
  startTime: booking.startTime,
  companyName: company.name,
  bookingUuid: booking.uuid,
}).catch((err) => {
  console.error('[BookingEmails] Confirmation email failed:', err);
  // Do NOT re-throw — email failure is non-fatal
});

// Also insert notification record for NOTIF-04 delivery tracking
await db.insert(notifications).values({
  companyId,
  customerId: booking.customerId,
  bookingId: booking.id,
  channel: 'email',
  recipient: customerEmail,
  subject: 'Potvrzení rezervace',
  body: renderedEmailText,
  status: 'pending',
}).then(async ([record]) => {
  // Update to 'sent' after successful sendMail
});
```

**Why inline over cron:** Booking confirmation must reach the customer immediately. Cron adds 0-15 minute delay, a scheduling table, and cold-start risk. All email sending at booking time is < 300ms on SMTP relay and acceptable within Vercel's 30s function limit.

### Pattern 2: Vercel Cron for SMS Reminders

**What:** Cron job at `GET /api/v1/cron/sms-reminders` runs every 15 minutes. Queries `notifications` table for pending SMS reminders with `scheduledAt` in the next 15-minute window. Sends via Twilio, updates `status` to 'sent' or 'failed'.

**When to use:** Only for `booking_reminder` type SMS (NOTIF-02). All other notifications are inline.

```typescript
// vercel.json cron config
{
  "crons": [{
    "path": "/api/v1/cron/sms-reminders",
    "schedule": "*/15 * * * *"
  }]
}
```

**Cron route security:** Validate `Authorization: Bearer ${CRON_SECRET}` header (CRON_SECRET already in env.ts). Vercel sets this header automatically on cron invocations.

**SMS reminder creation:** When a booking is created, also insert a `notifications` row with `channel: 'sms'`, `status: 'pending'`, `scheduledAt: new Date(booking.startTime - 24h)`. The cron picks it up.

```typescript
// lib/sms/twilio-client.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export async function sendSMS(to: string, body: string): Promise<void> {
  await client.messages.create({
    body,
    from: process.env.TWILIO_FROM_NUMBER,
    to,
  });
}
```

### Pattern 3: Impersonation JWT Flow

**What:** Admin starts impersonation → server issues 15-min purpose-specific JWT → stored in separate `imp_token` HttpOnly cookie → every request to impersonated user's routes checks `imp_token` → banner reads from sessionStorage flag set on start → end session clears cookie + sessionStorage + sets `revoked_at` in DB.

**Token structure:**
```typescript
// Impersonation JWT payload (extends JWTPayload)
interface ImpersonationJWTPayload extends JWTPayload {
  token_type: 'impersonation';
  acting_as_user_uuid: string;    // UUID of impersonated user
  acting_as_company_id: number;   // company_id of impersonated user
  admin_uuid: string;             // original admin UUID for audit
  session_id: string;             // FK to impersonation_sessions.id
}
```

**Server-side check on every impersonated request:**
```typescript
// In route-handler or middleware: if imp_token cookie present,
// verify it, check impersonation_sessions.revoked_at IS NULL
// If revoked_at is set → 401, clear cookie
```

**15-min timeout:** JWT `exp` enforces hard cutoff. No refresh token issued for impersonation JWTs. Once expired, session ends automatically.

**Multi-tab safety (Claude's discretion):** Store `imp_token` only in HttpOnly cookie (not sessionStorage). Use sessionStorage for the UI banner flag only. If user opens new tab, cookie exists → banner renders in all tabs. End session from any tab revokes the cookie and sets DB `revoked_at`. This is safer than sessionStorage which would silently allow un-bannered impersonation in other tabs.

### Pattern 4: Feature Flag Server-Side Enforcement

**What:** `getFlag(flagName, companyId?)` checks Upstash Redis first (60s TTL), falls back to DB. Returns boolean. Called in route handlers AFTER auth, BEFORE business logic.

```typescript
// lib/admin/feature-flags.ts
export async function getFlag(
  flagName: string,
  companyId?: number
): Promise<boolean> {
  const cacheKey = companyId
    ? `ff:${flagName}:${companyId}`
    : `ff:${flagName}:global`;

  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached === 'true';

  // DB lookup: check override first, then global
  if (companyId) {
    const [override] = await db
      .select({ enabled: featureFlagOverrides.enabled })
      .from(featureFlagOverrides)
      .innerJoin(featureFlags, eq(featureFlagOverrides.flagId, featureFlags.id))
      .where(
        and(
          eq(featureFlags.name, flagName),
          eq(featureFlagOverrides.companyId, companyId)
        )
      )
      .limit(1);

    if (override !== undefined) {
      await redis.set(cacheKey, String(override.enabled), { ex: 60 });
      return override.enabled;
    }
  }

  const [flag] = await db
    .select({ globalEnabled: featureFlags.globalEnabled })
    .from(featureFlags)
    .where(eq(featureFlags.name, flagName))
    .limit(1);

  const result = flag?.globalEnabled ?? false;
  await redis.set(cacheKey, String(result), { ex: 60 });
  return result;
}

export async function invalidateFlagCache(flagName: string, companyId?: number) {
  if (companyId) await redis.del(`ff:${flagName}:${companyId}`);
  await redis.del(`ff:${flagName}:global`);
}
```

### Pattern 5: Maintenance Mode Middleware Check

**What:** Middleware checks `maintenance:enabled` key in Redis on every non-admin request. Returns 302 to `/maintenance` page. Admin bypass via secret cookie `maintenance_bypass=<ADMIN_BYPASS_SECRET>`.

**Why Redis (not DB):** Instant toggle — no deployment needed. Redis read latency ~1ms on Upstash.

```typescript
// apps/web/middleware.ts — extend existing next-intl middleware
const maintenanceEnabled = await redis.get('maintenance:enabled');
const bypassCookie = req.cookies.get('maintenance_bypass')?.value;
const isBypassed = bypassCookie === process.env.MAINTENANCE_BYPASS_SECRET;

if (maintenanceEnabled === 'true' && !isBypassed && !isAdminPath) {
  return NextResponse.redirect(new URL('/maintenance', req.url));
}
```

**Current middleware.ts is minimal** (only next-intl). The new middleware must:
1. Keep next-intl routing
2. Add maintenance check BEFORE next-intl (return early on maintenance)
3. The matcher must remain the same (exclude /api, /_next, /embed, /monitoring, static files)

### Pattern 6: Company Suspend Check at Login

**What:** In `POST /api/v1/auth/login`, after password verification, check `companies.suspendedAt IS NOT NULL`. If suspended, return `403` with `{ code: 'COMPANY_SUSPENDED', message: 'Account suspended: [reason]' }`.

**Exception:** The billing page path (`/[locale]/billing`) must be reachable even for suspended companies. Implement by checking the route in middleware or having a separate login response flag that the client uses to redirect to billing-only mode.

**Current schema:** `companies.suspendedAt` already exists as a `timestamp` column. Need to add `suspendedReason text` column.

### Anti-Patterns to Avoid

- **Email sending blocking booking response:** Always fire-and-forget `.catch()`. Email failure must NEVER roll back a booking.
- **Feature flags checked client-side only:** Client-side flag checks are bypassed via browser DevTools. Always enforce in route handler before executing logic.
- **Impersonation JWT in localStorage or regular cookie:** Regular cookies are sent on all requests including CSRF-sensitive ones. Use a separate named HttpOnly cookie (`imp_token`) with `path: '/'` and `sameSite: 'strict'`.
- **Impersonation allowing password/billing changes:** In `confirmImpersonation()` or relevant mutation handlers, check for `token_type === 'impersonation'` and throw `ForbiddenError` on password change or billing update routes.
- **Broadcast email without rate limit:** A single admin mistake can send email to 10,000 companies. Add confirmation step (e.g., type the target count or "SEND") before executing broadcast. Rate-limit the broadcast endpoint to 1 call/10min.
- **Audit log with mutable rows:** `platform_audit_logs` must be append-only. No UPDATE or DELETE on audit rows. Enforce at DB level with an RLS policy `USING (false)` for UPDATE/DELETE, or at application level by never exposing a mutation route.
- **Maintenance middleware running on API routes:** Do NOT apply maintenance mode check to `/api/*` — that breaks the admin UI's ability to toggle maintenance off. The existing matcher already excludes `/api`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP email sending | Custom fetch to mail server | nodemailer (already installed) | Handles STARTTLS, auth, connection pooling, error handling |
| SMS sending | Raw Twilio REST HTTP fetch | twilio SDK | Handles auth, retries, error types, message status callbacks |
| JWT signing/verification | Custom crypto | jsonwebtoken (already installed) | Handles algorithm agility, expiry, claims verification |
| Feature flag distributed cache | Manual Redis key-value + custom invalidation | Redis `SET key value EX 60` + `DEL key` pattern | The pattern IS simple — don't over-engineer with a pub/sub invalidation bus; 60s TTL is sufficient |
| Cron authentication | Custom token scheme | CRON_SECRET env var (already in env.ts) + Authorization header check | Vercel sets the header automatically; just validate it |

---

## Common Pitfalls

### Pitfall 1: Email Sending Blocking Booking Response
**What goes wrong:** `await sendBookingConfirmationEmail(...)` throws SMTP error → entire booking creation fails → customer sees 500 error for a completed booking.
**Why it happens:** Email is called synchronously in the happy path.
**How to avoid:** Always wrap email calls in `.catch((err) => console.error(...))` and do not await them in the main response path. Insert the `notifications` row first (DB write), then trigger email fire-and-forget.
**Warning signs:** SMTP_HOST not set in .env causes every booking creation to fail in dev.

### Pitfall 2: Twilio SMS to Invalid Czech Phone Numbers
**What goes wrong:** Czech phone numbers in DB are stored as `+420XXXXXXXXX` or `XXXXXXXXX` (9 digits, no country code). Twilio requires E.164 format (`+420XXXXXXXXX`).
**Why it happens:** Phone numbers entered by users without country code.
**How to avoid:** In `sendSMS()`, normalize phone number to E.164 by prepending `+420` if not starting with `+`. Add validation check before sending.
**Warning signs:** Twilio returns `21211 - Invalid 'To' phone number` error.

### Pitfall 3: Maintenance Mode Blocking Admin API
**What goes wrong:** Admin toggles maintenance on → now their API calls to toggle it off also return 302 → stuck in maintenance mode.
**Why it happens:** Maintenance check applied to all routes including API.
**How to avoid:** The existing middleware matcher already excludes `/api/*`. Verify the maintenance check is in the middleware function body with an early return, not in `config.matcher`.
**Warning signs:** POST `/api/v1/admin/maintenance` returns 302 during maintenance.

### Pitfall 4: Impersonation Session Not Revoked on Expiry
**What goes wrong:** Admin impersonates user, JWT expires, but `impersonation_sessions` row still has `revoked_at: null`. Next time admin checks active sessions, it looks active.
**Why it happens:** JWT expiry and DB revocation are separate mechanisms.
**How to avoid:** On every impersonated request: if JWT is expired → set `revoked_at = now()` in DB before returning 401. Add a cron job or on-demand cleanup to mark expired sessions as revoked.
**Warning signs:** Admin audit log shows open impersonation sessions from days ago.

### Pitfall 5: Feature Flag Cache Stale After Toggle
**What goes wrong:** Admin toggles feature flag ON → Redis cache still has `false` for 60s → feature appears disabled for up to 60 seconds.
**Why it happens:** Redis TTL not invalidated after admin writes.
**How to avoid:** In the feature flag PUT/POST handler, call `invalidateFlagCache(flagName, companyId?)` immediately after DB write. 60s TTL is the maximum stale time for non-manual reads.
**Warning signs:** Feature toggle appears to have no effect for ~1 minute.

### Pitfall 6: Impersonation Token Allows Password Change
**What goes wrong:** Admin impersonating a user changes the user's password → user loses access to their own account.
**Why it happens:** Password change route does not check `token_type`.
**How to avoid:** In `PUT /api/v1/auth/password` and any billing mutation route, check: `if (user.token_type === 'impersonation') throw new ForbiddenError('Cannot perform this action during impersonation')`.
**Warning signs:** No protection on those routes.

### Pitfall 7: Broadcast Email Sent to Suspended Companies
**What goes wrong:** Broadcast sends to ALL companies including suspended ones.
**Why it happens:** Broadcast query does not filter by `isActive` and `suspendedAt`.
**How to avoid:** Broadcast email query: `WHERE companies.is_active = true AND companies.suspended_at IS NULL`. Apply the same filter for in-app banners.

### Pitfall 8: Vercel Cron Not Enabled on Hobby Plan
**What goes wrong:** `vercel.json` crons defined but never execute because Vercel Hobby does not support cron jobs.
**Why it happens:** Vercel Cron requires Pro plan.
**How to avoid:** Verify Vercel plan tier (Pro is already required for `maxDuration: 30`). CRON_SECRET env var already in env.ts. Document as Pro plan dependency.
**Warning signs:** SMS reminders never fire; cron log shows no invocations.

---

## Code Examples

### Booking Confirmation Email Function Signature
```typescript
// Source: mirrors auth-emails.ts pattern
// New file: apps/web/lib/email/booking-emails.ts

interface BookingEmailData {
  to: string;
  customerName: string;
  serviceName: string;
  employeeName: string | null;
  startTime: Date;
  companyName: string;
  companyPhone: string | null;
  bookingUuid: string;
  locale?: 'cs' | 'sk' | 'en';
}

export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<void>
export async function sendBookingStatusChangeEmail(data: BookingEmailData & { newStatus: 'confirmed' | 'cancelled' | 'completed' }): Promise<void>
export async function sendBookingReminderEmail(data: BookingEmailData): Promise<void>
```

### Notification Record + Email Delivery Tracking Pattern
```typescript
// In booking-service.ts createBooking() — after successful booking insert
const [notifRecord] = await db.insert(notifications).values({
  companyId,
  customerId: booking.customerId,
  bookingId: booking.id,
  channel: 'email',
  recipient: customerEmail,
  subject: 'Potvrzení rezervace - ' + serviceName,
  body: plainTextBody,
  status: 'pending',
}).returning();

// Fire-and-forget email + update status
sendBookingConfirmationEmail({ ... })
  .then(async () => {
    await db.update(notifications)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(notifications.id, notifRecord.id));
  })
  .catch(async (err) => {
    console.error('[BookingEmails] Failed:', err);
    await db.update(notifications)
      .set({ status: 'failed', errorMessage: String(err) })
      .where(eq(notifications.id, notifRecord.id));
  });
```

### Impersonation Session DB Schema (Drizzle)
```typescript
// packages/database/src/schema/platform.ts
export const impersonationSessions = pgTable('impersonation_sessions', {
  id: varchar('id', { length: 64 }).primaryKey(), // nanoid(32)
  adminId: integer('admin_id').notNull().references(() => users.id),
  targetUserId: integer('target_user_id').notNull().references(() => users.id),
  targetCompanyId: integer('target_company_id').references(() => companies.id),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // startedAt + 15min
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 45 }),
}, (table) => ({
  adminIdx: index('idx_imp_sessions_admin').on(table.adminId),
  targetIdx: index('idx_imp_sessions_target').on(table.targetUserId),
  activeIdx: index('idx_imp_sessions_active')
    .on(table.revokedAt)
    .where(sql`revoked_at IS NULL`),
}));
```

### Platform Audit Log Schema
```typescript
export const platformAuditLogs = pgTable('platform_audit_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  adminId: integer('admin_id').notNull().references(() => users.id),
  adminUuid: uuid('admin_uuid').notNull(),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  targetEntityType: varchar('target_entity_type', { length: 50 }),
  targetEntityId: varchar('target_entity_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  requestId: varchar('request_id', { length: 64 }),
  beforeValue: jsonb('before_value'),
  afterValue: jsonb('after_value'),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  adminIdx: index('idx_audit_admin').on(table.adminId),
  timestampIdx: index('idx_audit_timestamp').on(table.timestamp),
  actionIdx: index('idx_audit_action').on(table.actionType),
}));
```

### Audit Log Helper
```typescript
// lib/admin/audit.ts
export async function writeAuditLog(entry: {
  req: NextRequest;
  adminUuid: string;
  adminId: number;
  actionType: string;
  targetEntityType?: string;
  targetEntityId?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
}): Promise<void> {
  const ip = entry.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? entry.req.headers.get('x-real-ip')
    ?? 'unknown';
  const requestId = entry.req.headers.get('x-vercel-id') ?? entry.req.headers.get('x-request-id') ?? nanoid(16);

  await db.insert(platformAuditLogs).values({
    adminId: entry.adminId,
    adminUuid: entry.adminUuid,
    actionType: entry.actionType,
    targetEntityType: entry.targetEntityType,
    targetEntityId: entry.targetEntityId,
    ipAddress: ip,
    requestId,
    beforeValue: entry.beforeValue ?? null,
    afterValue: entry.afterValue ?? null,
  });
  // No try/catch — audit log failure should propagate (security requirement)
}
```

### Feature Flags DB Schema
```typescript
export const featureFlags = pgTable('feature_flags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  globalEnabled: boolean('global_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const featureFlagOverrides = pgTable('feature_flag_overrides', {
  id: serial('id').primaryKey(),
  flagId: integer('flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  flagCompanyUnique: unique('ff_override_flag_company_unique').on(table.flagId, table.companyId),
  flagIdx: index('idx_ff_overrides_flag').on(table.flagId),
  companyIdx: index('idx_ff_overrides_company').on(table.companyId),
}));
```

### Maintenance Mode Redis Keys
```typescript
// Redis key conventions for maintenance mode
const MAINTENANCE_KEY = 'maintenance:enabled';   // 'true' | 'false' | null
const MAINTENANCE_MSG_KEY = 'maintenance:message'; // Custom message (optional)

// Toggle on
await redis.set(MAINTENANCE_KEY, 'true');

// Toggle off
await redis.del(MAINTENANCE_KEY);

// Middleware check (inline — not async import)
// NOTE: Upstash HTTP client, ~1ms latency acceptable in middleware
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RabbitMQ notification worker | Inline SMTP + Vercel Cron | Phase 45 (v3.0) | notification-worker deleted; Phase 47 must replace with direct SMTP calls |
| publishEvent() for notifications | No-op publishEvent() | Phase 45 | All booking notification triggers are dead; Phase 47 adds them back inline |
| isActive boolean for companies | isActive + suspendedAt timestamp | Already in schema | ADMIN-03 only needs suspended_reason column; can use existing suspendedAt |

**Deprecated/outdated:**
- `publishEvent(createNotificationSendRequestedEvent(...))` in `notifications/route.ts` line 119: this is a no-op and the notification never sends. Phase 47 must replace this with direct inline sending.
- The `notification-worker` service was deleted in Phase 45 — there is no background processor for the `notifications` table. This is the core gap Phase 47 closes.

---

## Open Questions

1. **Twilio Messaging Service vs From Number**
   - What we know: `TWILIO_FROM_NUMBER` env var exists; Twilio Messaging Service provides better delivery and region routing
   - What's unclear: Whether original v1.1 SMS used a direct number or Messaging Service SID
   - Recommendation: Use direct `from: TWILIO_FROM_NUMBER` for simplicity (matches existing env var). Document how to switch to Messaging Service if needed.

2. **Broadcast in-app banner persistence**
   - What we know: Banner appears at `scheduled_at` time; it's dismissible
   - What's unclear: Where dismissed state is stored (per-user in DB vs localStorage)
   - Recommendation: localStorage per broadcast ID (e.g., `dismissed_broadcast_{id}`). No DB write needed; banner auto-hides after `sent_at + 7 days`.

3. **Operational health metrics (API error rate, notification delivery rate)**
   - What we know: These require aggregating from logs/events not currently captured in DB
   - What's unclear: Whether Sentry (Phase 46) will be available to query
   - Recommendation: For Phase 47, compute notification delivery rate from the `notifications` table (`sent/total` ratio), and API error rate from a simple count of 5xx responses in a new `platform_daily_metrics` row written by a nightly cron. Keep it pragmatic — no external APM needed.

4. **companies.status vs suspendedAt for ADMIN-03**
   - What we know: `companies.suspendedAt` timestamp already exists; `companies.isActive` boolean also exists
   - What's unclear: CONTEXT.md says "add `status` field" but the schema already has `isActive` and `suspendedAt`
   - Recommendation: Do NOT add a new `status` enum column — use existing `suspendedAt IS NOT NULL` as the suspension check and add only `suspended_reason text` column. This avoids a schema migration conflict with `isActive`. Login route checks: if `suspendedAt IS NOT NULL` → return 403 COMPANY_SUSPENDED.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `apps/web/vitest.config.ts` (assumed; existing tests in `lib/security/*.test.ts`) |
| Quick run command | `pnpm --filter @schedulebox/web test --run lib/admin` |
| Full suite command | `pnpm --filter @schedulebox/web test --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIF-01 | Booking confirmation email sends after createBooking | unit | `pnpm test --run lib/email/booking-emails.test` | Wave 0 |
| NOTIF-02 | SMS reminder cron queries pending SMS notifications in window | unit | `pnpm test --run lib/sms/twilio-client.test` | Wave 0 |
| NOTIF-03 | Status-change emails trigger on confirm/cancel/complete | unit | `pnpm test --run lib/email/booking-emails.test` | Wave 0 |
| NOTIF-04 | Notification status updated to sent/failed after delivery | unit | `pnpm test --run lib/email/booking-emails.test` | Wave 0 |
| ADMIN-01 | Impersonation token has 15-min expiry and correct claims | unit | `pnpm test --run lib/admin/impersonation.test` | Wave 0 |
| ADMIN-01 | Impersonation session revoked_at set on end session | unit | `pnpm test --run lib/admin/impersonation.test` | Wave 0 |
| ADMIN-02 | getFlag returns Redis cached value within TTL | unit | `pnpm test --run lib/admin/feature-flags.test` | Wave 0 |
| ADMIN-02 | Cache invalidated after flag toggle | unit | `pnpm test --run lib/admin/feature-flags.test` | Wave 0 |
| ADMIN-03 | Login returns 403 for suspended company | unit | Manual API test (smoke) | manual-only |
| ADMIN-04 | Broadcast skips suspended/inactive companies | unit | `pnpm test --run lib/admin/broadcast.test` | Wave 0 |
| ADMIN-05 | Maintenance middleware redirects non-admin, allows bypass cookie | unit | `pnpm test --run middleware.test` | Wave 0 |
| ADMIN-06 | Metrics endpoint returns correct KPI fields | unit | Manual API test | manual-only |
| ADMIN-07 | writeAuditLog inserts correct fields including IP | unit | `pnpm test --run lib/admin/audit.test` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @schedulebox/web test --run lib/admin lib/email lib/sms`
- **Per wave merge:** `pnpm --filter @schedulebox/web test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/lib/email/booking-emails.test.ts` — covers NOTIF-01, NOTIF-03, NOTIF-04
- [ ] `apps/web/lib/sms/twilio-client.test.ts` — covers NOTIF-02 (mock Twilio client)
- [ ] `apps/web/lib/admin/impersonation.test.ts` — covers ADMIN-01
- [ ] `apps/web/lib/admin/feature-flags.test.ts` — covers ADMIN-02
- [ ] `apps/web/lib/admin/audit.test.ts` — covers ADMIN-07
- [ ] `apps/web/lib/admin/broadcast.test.ts` — covers ADMIN-04 (audience filtering)
- [ ] `apps/web/middleware.test.ts` — covers ADMIN-05 maintenance redirect

---

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/web/lib/email/auth-emails.ts` — confirmed nodemailer 7.x transporter pattern; reuse directly
- Codebase: `apps/web/lib/auth/jwt.ts` — confirmed JWT structure; `JWTPayload` interface is extensible for impersonation variant
- Codebase: `packages/database/src/schema/notifications.ts` — confirmed `notifications` table has `status`, `sentAt`, `errorMessage` columns for NOTIF-04
- Codebase: `packages/database/src/schema/auth.ts` — confirmed `companies.suspendedAt` already exists; only `suspended_reason` column needed
- Codebase: `apps/web/lib/redis/client.ts` — confirmed Upstash client pattern with no-op dev fallback
- Codebase: `apps/web/lib/env.ts` — confirmed `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `CRON_SECRET` env vars already declared
- Codebase: `apps/web/middleware.ts` — confirmed minimal (next-intl only); safe to extend with maintenance check
- Codebase: `apps/web/app/[locale]/(admin)/admin/users/page.tsx` — confirmed Users table structure; "Impersonate" button adds to the existing Actions column
- Project SUMMARY.md — confirmed impersonation JWT design, feature flag Redis cache pattern, maintenance mode Redis flag pattern

### Secondary (MEDIUM confidence)
- Project CONTEXT.md — user decisions verified directly from discuss-phase output
- REQUIREMENTS.md — requirement IDs and descriptions confirmed

### Tertiary (LOW confidence)
- Twilio SDK v5.x API: assumed from npm registry current major version. Verify `client.messages.create()` signature at time of implementation — SDK v5 changed some method names from v4.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json and codebase
- Notification architecture: HIGH — transporter and schema confirmed in code; inline pattern mirrors proven auth-email pattern
- Impersonation design: HIGH — JWT structure confirmed; impersonation_sessions schema follows research SUMMARY.md patterns exactly
- Feature flags: HIGH — Redis client pattern confirmed; DB schema is straightforward
- Maintenance mode: HIGH — Redis client + middleware extension pattern is simple and confirmed
- Twilio integration: MEDIUM — env vars confirmed, SDK not installed, API shape assumed from npm docs

**Research date:** 2026-03-16
**Valid until:** 2026-04-15 (stable stack, no fast-moving dependencies)

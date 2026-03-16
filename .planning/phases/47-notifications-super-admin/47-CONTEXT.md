# Phase 47: Notifications & Super-Admin - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire up transactional email and SMS notifications for booking events (confirmation, reminders, status changes). Build complete super-admin toolset: impersonation, feature flags, company suspend/unsuspend, broadcast messages, maintenance mode, platform daily metrics dashboard, and admin audit log.

</domain>

<decisions>
## Implementation Decisions

### Notification Delivery

- Claude's discretion on email sending approach (inline in API route vs Vercel Cron — pick simplest reliable approach)
- Claude's discretion on SMS reminder trigger (Vercel Cron vs external scheduler — pick based on Vercel constraints)
- Claude's discretion on email template style (branded HTML with plain text fallback recommended)
- SMTP infrastructure already exists in `lib/email/auth-emails.ts` — reuse nodemailer transporter pattern
- Twilio SMS integration exists from v1.1 — reuse existing Twilio Messaging Service

### Admin Impersonation

- Full-width red banner at top of every page during impersonation: "Impersonating: [Name] ([email]) — [End Session]"
- Initiate via "Impersonate" button on each user row in admin Users list
- Admin can impersonate ALL roles (owner, employee, customer) under strict policy:
  - Mandatory audit log entry on impersonation start, every action, and end
  - 15-minute hard timeout — session cannot be extended
  - Cannot change passwords or billing info during impersonation
  - Cannot impersonate other admins
- Claude's discretion on: end session destination, multi-tab behavior (recommend single-tab via sessionStorage for safety)

### Feature Flags

- Global + per-company scope — each flag can be toggled globally or overridden per individual company
- Admin UI shows both global toggle and per-company override list
- Flag state cached in Upstash Redis with 60-second TTL for server-side enforcement
- New DB table: `feature_flags` (name, description, global_enabled, created_at, updated_at)
- New DB table: `feature_flag_overrides` (flag_id, company_id, enabled)

### Maintenance Mode

- Branded glassmorphism maintenance page (ScheduleBox logo, glass card, "We are performing scheduled maintenance" message)
- Claude's discretion on admin bypass mechanism (recommend secret cookie set via admin panel)
- Maintenance flag stored in Upstash Redis for instant toggle (no deployment needed)
- Middleware checks maintenance flag on every request — blocks non-admin access

### Company Suspend/Unsuspend

- Admin can suspend a company with a required reason field
- Suspended companies get 403 on login but CAN still access billing pages (to reactivate/pay)
- Unsuspending restores full access immediately

### Broadcast Messages

- Both in-app banner + email notification
- Email sent FIRST as advance notice (so employees can prepare)
- In-app banner appears at scheduled time — yellow/blue dismissible banner at top of owner dashboard
- Admin creates broadcast with: message text, scheduled time, and audience (all companies or specific plan tier)
- New DB table: `platform_broadcasts` (message, scheduled_at, sent_at, audience, created_by)

### Platform Daily Metrics Dashboard

- Both business KPIs AND operational health:
  - Top row: New signups, MRR, churn rate, active companies, total bookings this week
  - Bottom row: API error rate, notification delivery rate, SMS delivery rate, failed payments
- Existing admin stats endpoint at `/api/v1/admin/stats` — extend with daily metrics
- New DB table: `platform_daily_metrics` (date, metric_name, metric_value)

### Admin Audit Log

- Full detail with before/after values for every change
- Fields: timestamp, admin_id, action_type, target_entity_type, target_entity_id, ip_address, request_id, before_value (JSONB), after_value (JSONB)
- New DB table: `platform_audit_logs`
- Admin UI: searchable, filterable log list with expandable detail rows

### Claude's Discretion

- Exact notification email HTML template design
- Whether to use inline email sending or Vercel Cron for booking notifications
- Whether to use Vercel Cron or Upstash QStash for SMS reminders
- Impersonation token storage (sessionStorage vs cookie)
- End-impersonation redirect destination
- Maintenance mode bypass mechanism
- Broadcast scheduling implementation (Vercel Cron vs on-demand check)

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `lib/email/auth-emails.ts`: Nodemailer SMTP transporter — reuse for booking emails
- `packages/shared/src/types/notification.ts`: Notification types and schemas
- `apps/web/app/api/v1/notifications/route.ts`: Notification CRUD API
- `apps/web/app/api/v1/admin/stats/route.ts`: Admin stats endpoint — extend
- `apps/web/app/api/v1/admin/users/route.ts`: Admin users list — add impersonate button
- `apps/web/components/layout/admin-sidebar.tsx`: Admin navigation — add new pages

### Established Patterns

- Auth middleware: `lib/middleware/rbac.ts` — extend for impersonation context
- JWT token: contains user role, permissions — need impersonation variant
- Glass UI: `variant="glass"` on Card, Dialog — use for maintenance page
- Upstash Redis: `lib/redis/client.ts` — use for feature flag cache and maintenance flag

### Integration Points

- `apps/web/middleware.ts`: Add maintenance mode check
- `apps/web/app/api/v1/auth/login/route.ts`: Add suspend check
- Booking creation routes: Add email trigger after successful insert
- Booking status transition: Add email trigger on confirm/cancel/complete

</code_context>

<specifics>
## Specific Ideas

- Broadcast: email goes out FIRST as advance notice, in-app banner appears at scheduled time
- Impersonation: "Impersonate" button directly on each user row in admin list (not buried in detail page)
- Audit: full forensic detail — before/after JSON values, IP address, request ID
- Suspended companies can still access billing pages (to reactivate)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 47-notifications-super-admin_
_Context gathered: 2026-03-16_

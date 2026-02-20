# Phase 22: Monitoring & Alerts - Research

**Researched:** 2026-02-20
**Domain:** Application monitoring, alerting, Prometheus metrics, CI coverage tracking
**Confidence:** HIGH

## Summary

Phase 22 requires four distinct monitoring capabilities: email delivery monitoring (MON-01), SMS cost alerting (MON-02), payment webhook failure logging with DLQ alerts (MON-03), and CI coverage tracking (MON-04). The good news is that significant monitoring infrastructure already exists in the codebase: prom-client 15.1.3 with a custom registry, business metric counters (bookings, payments, notifications), a `/api/metrics` Prometheus scrape endpoint, BullMQ job workers with `completed`/`failed` events, a DLQ infrastructure in `packages/events/src/consumer.ts`, and a `notifications` DB table with full lifecycle status tracking (pending/sent/delivered/failed/opened/clicked). The existing Grafana dashboards and Prometheus alerting rules in `k8s/monitoring/` target Kubernetes, but the app is deployed on Railway (PaaS), so the monitoring approach must focus on application-level metrics and alerting rather than infrastructure-level K8s alerts.

The core work is: (1) add new prom-client counters/gauges for email bounces, SMS costs, and webhook failures in the shared metrics module, (2) instrument the notification worker's email-job and sms-job handlers to increment those counters on success/failure, (3) add payment webhook failure tracking with DLQ integration, (4) create an internal monitoring API endpoint that queries the notifications table for bounce/failure rates and triggers alerts, and (5) enhance CI coverage reporting. Since Railway does not provide Prometheus/Alertmanager, alerting must be application-level: a scheduled check (cron or BullMQ repeatable job) that queries metrics and sends alert emails/Slack webhooks when thresholds are breached.

**Primary recommendation:** Instrument existing BullMQ workers and webhook handlers with prom-client counters, add a scheduled monitoring check that queries DB notification stats and sends alerts via email/webhook, and enhance the CI pipeline with coverage delta reporting.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| prom-client | ^15.1.3 | Prometheus metrics (Counter, Gauge, Histogram) | Already installed in @schedulebox/shared, custom registry configured |
| BullMQ | ^5.68.0 | Job queue with built-in metrics, repeatable jobs for scheduled checks | Already used for email/SMS/push queues in notification worker |
| nodemailer | ^7.x | Alert email delivery | Already installed in @schedulebox/web for auth emails |
| drizzle-orm | (existing) | Query notifications table for delivery stats | Already the project's ORM |

### Supporting

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| @actions/core | N/A | CI action for coverage annotation | GitHub Actions built-in, no install needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Application-level alerts | Grafana Cloud Free | Would need external service; Railway has no Prometheus scraper |
| BullMQ repeatable jobs for scheduled checks | node-cron | BullMQ already available, repeatable jobs survive restarts better |
| DB-based monitoring queries | Redis-only counters | DB has full notification history; Redis counters lose data on restart |

**Installation:**
No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure

```
packages/shared/src/metrics/
  index.ts              # (EXISTS) Custom registry, HTTP metrics, DB metrics
  business.ts           # (EXISTS) Booking, payment, notification counters
  event-loop.ts         # (EXISTS) Event loop utilization gauge
  email-monitoring.ts   # (NEW) Email delivery counters: sent, failed, bounced
  sms-monitoring.ts     # (NEW) SMS delivery counters and cost gauge
  webhook-monitoring.ts # (NEW) Webhook processing counters: success, failure, DLQ

services/notification-worker/src/
  jobs/email-job.ts     # (MODIFY) Increment email metrics on success/failure
  jobs/sms-job.ts       # (MODIFY) Increment SMS metrics on success/failure
  monitoring/
    monitoring-scheduler.ts  # (NEW) Repeatable BullMQ job for periodic checks
    alert-sender.ts          # (NEW) Send alert emails/webhooks when thresholds breached

apps/web/app/api/v1/
  monitoring/
    email-stats/route.ts     # (NEW) GET endpoint: email delivery stats from DB
    sms-stats/route.ts       # (NEW) GET endpoint: SMS usage and cost stats
    webhook-stats/route.ts   # (NEW) GET endpoint: webhook processing stats
    alerts/route.ts          # (NEW) GET/POST: alert configuration and history

.github/workflows/ci.yml    # (MODIFY) Add coverage summary/delta reporting
```

### Pattern 1: Instrument BullMQ Workers with prom-client Counters

**What:** Add metric increments to existing BullMQ worker event handlers (completed/failed)
**When to use:** Every email/SMS delivery success or failure
**Example:**
```typescript
// In email-job.ts or a wrapper
import { Counter } from 'prom-client';
import { register } from '@schedulebox/shared/metrics';

export const emailDeliveryTotal = new Counter({
  name: 'schedulebox_email_delivery_total',
  help: 'Total email deliveries by status',
  labelNames: ['status'], // 'sent', 'failed', 'bounced'
  registers: [register],
});

// In handleEmailJob success path:
emailDeliveryTotal.inc({ status: 'sent' });
// In handleEmailJob catch path:
emailDeliveryTotal.inc({ status: 'failed' });
```

### Pattern 2: Scheduled Monitoring Check via BullMQ Repeatable Job

**What:** A repeatable BullMQ job that runs every 5-15 minutes, queries notification stats from the database, and triggers alerts when thresholds are breached.
**When to use:** For application-level alerting on Railway (no Prometheus/Alertmanager available)
**Example:**
```typescript
// monitoring-scheduler.ts
import { Queue, Worker } from 'bullmq';

const MONITORING_QUEUE = 'monitoring-checks';

// Create repeatable job
const monitoringQueue = new Queue(MONITORING_QUEUE, { connection: redisConfig });
await monitoringQueue.add('check-delivery-stats', {}, {
  repeat: { every: 5 * 60 * 1000 }, // Every 5 minutes
  jobId: 'delivery-stats-check',
});

// Worker handler
async function handleMonitoringCheck() {
  // Query DB for email failure rate in last hour
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM notifications
    WHERE channel = 'email'
      AND created_at > NOW() - INTERVAL '1 hour'
  `);

  const failureRate = stats.failed / (stats.sent + stats.failed);
  if (failureRate > 0.05) {
    await sendAlertEmail({
      subject: '[ALERT] Email bounce rate above 5%',
      body: `Current rate: ${(failureRate * 100).toFixed(1)}%`,
    });
  }
}
```

### Pattern 3: Payment Webhook Failure Logging to DLQ

**What:** The Comgate webhook handler already returns 500 on processing errors (Comgate retries). The monitoring addition is to count failures via prom-client and periodically check `processed_webhooks` table for stuck/failed entries.
**When to use:** Every webhook processing attempt
**Example:**
```typescript
// In webhooks/comgate/route.ts
import { webhookProcessingTotal } from '@schedulebox/shared/metrics/webhook-monitoring';

// On success path:
webhookProcessingTotal.inc({ gateway: 'comgate', status: 'success' });
// On failure path:
webhookProcessingTotal.inc({ gateway: 'comgate', status: 'failure' });
```

### Pattern 4: CI Coverage Delta Reporting

**What:** After running tests with coverage, generate a summary comment on PRs showing coverage delta
**When to use:** CI pipeline on pull requests
**Example:**
```yaml
# In ci.yml, after test:coverage step
- name: Coverage Summary
  if: github.event_name == 'pull_request'
  uses: davelosert/vitest-coverage-report-action@v2
  with:
    json-summary-path: packages/shared/coverage/coverage-summary.json
```

### Anti-Patterns to Avoid

- **Polling external APIs for delivery status:** Do not poll Brevo/cesky-hosting for bounce data. Instead, track send success/failure at the SMTP call site (nodemailer success = sent, nodemailer error = failed/bounced).
- **Alert fatigue from low thresholds:** Start with conservative thresholds (5% bounce rate, not 1%). Adjust based on production data.
- **Monitoring in the hot path:** Never block email/SMS sending to wait for metric storage. Metric increments are fire-and-forget.
- **Custom Prometheus scraper on Railway:** Railway does not run kube-prometheus-stack. The K8s monitoring configs are for future Kubernetes migration. Do not depend on them for current Railway deployment.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Prometheus metric types | Custom counter/gauge classes | prom-client Counter/Gauge/Histogram | Thread-safe, handles label cardinality, exposition format |
| Scheduled periodic checks | setInterval in process | BullMQ repeatable jobs | Survives worker restarts, deduplicates across replicas, visible in queue UI |
| Email bounce tracking | Custom webhook receiver from SMTP provider | Count nodemailer send failures locally | cesky-hosting.cz SMTP does not provide bounce webhooks; track at send time |
| Coverage enforcement | Custom script parsing coverage output | Vitest v8 coverage thresholds + CI exit code | Already configured in vitest.shared.ts at 80% |

**Key insight:** This phase is primarily about instrumenting existing code paths with counters and adding scheduled checks -- not building new monitoring infrastructure. The notification worker, webhook handlers, and CI pipeline already exist. The task is to add observability hooks.

## Common Pitfalls

### Pitfall 1: prom-client Custom Registry Scope in Worker Process

**What goes wrong:** Metrics defined in `@schedulebox/shared` are only available in the process that imports them. The notification worker is a separate Node.js process from the Next.js app.
**Why it happens:** prom-client registries are per-process. The notification worker runs independently from `apps/web`.
**How to avoid:** Define worker-specific metrics in the notification worker process. The `/api/metrics` endpoint in the web app exposes web metrics only. For worker metrics, either expose a separate metrics endpoint on the worker health server (port 3001) or push to a shared store.
**Warning signs:** Metric values always zero on the `/api/metrics` endpoint for worker-originated events.

### Pitfall 2: Notification Status vs Delivery Status Confusion

**What goes wrong:** The `notifications` table tracks notification lifecycle (pending -> sent -> opened), but "sent" means "SMTP accepted the message", not "delivered to inbox". Bounces happen AFTER the SMTP 250 OK response.
**Why it happens:** SMTP is fire-and-forget. The SMTP server may return success but the email bounces later.
**How to avoid:** Track two separate metrics: (1) SMTP send success/failure (immediate, at sendEmail call site), (2) bounce rate via the `status='failed'` count in notifications table over time. For MVP, SMTP-level failures (connection refused, auth error, recipient rejected) are the primary signal.
**Warning signs:** Bounce rate metric always shows 0% because you're only counting SMTP connection failures, not delivery failures.

### Pitfall 3: SMS Cost Calculation Without Twilio Billing API

**What goes wrong:** Trying to get real-time SMS costs from Twilio's billing API adds complexity and latency.
**Why it happens:** Twilio pricing is per-segment, varies by destination, and billing data is delayed.
**How to avoid:** Estimate SMS costs locally: count segments sent (already have `estimateSMSSegments()` in sms-sender.ts), multiply by approximate CZK-per-segment rate stored in config. Alert when estimated monthly cost approaches threshold.
**Warning signs:** Alert triggers are days late because you're polling Twilio billing API which has 24-48h delay.

### Pitfall 4: Coverage Delta on Merge Commits

**What goes wrong:** Coverage delta reporting shows wrong numbers on merge commits because the base comparison is incorrect.
**Why it happens:** GitHub Actions `pull_request` event has different SHA semantics than `push`.
**How to avoid:** Use `github.event.pull_request.base.sha` for base coverage comparison. Use a dedicated coverage action that handles this correctly.
**Warning signs:** Coverage delta shows massive drops/gains on PRs that only change a few lines.

### Pitfall 5: Alert Email Fails Because SMTP Is Down

**What goes wrong:** The monitoring system tries to send an alert email about email delivery failures, but the alert itself fails because SMTP is down.
**Why it happens:** Using the same SMTP transport for alerts as for business emails.
**How to avoid:** Have a fallback alert channel. Primary: email via SMTP. Fallback: Slack webhook (HTTP POST, no SMTP dependency). Log alerts to DB regardless of delivery success.
**Warning signs:** No alerts received during an actual SMTP outage.

## Code Examples

Verified patterns from the existing codebase:

### Adding a New Counter to the Shared Metrics Module

```typescript
// packages/shared/src/metrics/email-monitoring.ts
// Pattern: follows exact same style as business.ts

import { Counter, Gauge } from 'prom-client';
import { register } from './index';

export const emailDeliveryTotal = new Counter({
  name: 'schedulebox_email_delivery_total',
  help: 'Total email delivery attempts by status',
  labelNames: ['status'], // 'sent', 'failed'
  registers: [register],
});

export const emailBounceRate = new Gauge({
  name: 'schedulebox_email_bounce_rate',
  help: 'Current email bounce rate (0-1) over last hour',
  registers: [register],
});
```

### Instrumenting Existing Email Worker

```typescript
// Modification to services/notification-worker/src/jobs/email-job.ts
// Add counter increments to existing try/catch

// After successful sendEmail():
emailDeliveryTotal.inc({ status: 'sent' });

// In catch block:
emailDeliveryTotal.inc({ status: 'failed' });
```

### SMS Cost Tracking

```typescript
// packages/shared/src/metrics/sms-monitoring.ts

import { Counter, Gauge } from 'prom-client';
import { register } from './index';

export const smsDeliveryTotal = new Counter({
  name: 'schedulebox_sms_delivery_total',
  help: 'Total SMS delivery attempts by status',
  labelNames: ['status'], // 'sent', 'failed'
  registers: [register],
});

export const smsSegmentsTotal = new Counter({
  name: 'schedulebox_sms_segments_total',
  help: 'Total SMS segments sent (for cost estimation)',
  registers: [register],
});

export const smsEstimatedMonthlyCost = new Gauge({
  name: 'schedulebox_sms_estimated_monthly_cost_czk',
  help: 'Estimated monthly SMS cost in CZK',
  registers: [register],
});
```

### Querying Notification Stats from Database

```typescript
// SQL pattern for monitoring endpoint
import { sql } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';

async function getEmailDeliveryStats(windowMinutes: number = 60) {
  const [stats] = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) as delivered,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) as total
    FROM notifications
    WHERE channel = 'email'
      AND created_at > NOW() - INTERVAL '${sql.raw(String(windowMinutes))} minutes'
  `);
  return stats;
}
```

### Payment Webhook Failure Detection

```typescript
// Query processed_webhooks for stuck/failed entries
async function getWebhookFailureStats() {
  const [stats] = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'processing' AND processed_at < NOW() - INTERVAL '5 minutes') as stuck
    FROM processed_webhooks
    WHERE processed_at > NOW() - INTERVAL '1 hour'
  `);
  return stats;
}
```

### CI Coverage Summary

```yaml
# Addition to .github/workflows/ci.yml test job
- name: Generate coverage summary
  if: always()
  run: |
    echo "## Test Coverage Summary" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    # Parse coverage from each package
    for pkg in packages/shared packages/events apps/web; do
      if [ -f "$pkg/coverage/coverage-summary.json" ]; then
        name=$(basename $pkg)
        lines=$(jq '.total.lines.pct' "$pkg/coverage/coverage-summary.json")
        echo "- **$name**: ${lines}% lines" >> $GITHUB_STEP_SUMMARY
      fi
    done
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| K8s Prometheus/Alertmanager stack | Application-level monitoring on PaaS (Railway) | Deployment moved to Railway | Cannot rely on K8s monitoring configs; must use app-level checks |
| External bounce webhook from SMTP provider | Track SMTP send success/failure locally | cesky-hosting.cz has no bounce webhooks | Simpler but less granular; catches SMTP errors, not post-delivery bounces |
| Manual coverage checking | Vitest v8 thresholds enforced in CI at 80% | Phase 16 | Build fails automatically; MON-04 partially done |

**Deprecated/outdated:**

- K8s monitoring configs (`k8s/monitoring/`): Written for future Kubernetes migration. Currently on Railway. Do not depend on these for Phase 22.
- The `notificationsTotalCounter` in `business.ts`: Defined but never incremented anywhere in the codebase. Phase 22 should wire this up.

## Open Questions

1. **Slack webhook for alerts**
   - What we know: The K8s alertmanager config references a Slack webhook URL (placeholder). The project uses Slack for team communication.
   - What's unclear: Whether a real Slack webhook URL is available or should be set up.
   - Recommendation: Implement alerts via email first (SMTP already working). Add Slack webhook as optional secondary channel via `SLACK_WEBHOOK_URL` env var. This provides redundancy (email alerts even if Slack is down, Slack alerts even if SMTP is down).

2. **SMS cost per segment for Czech numbers**
   - What we know: Twilio pricing for Czech numbers varies. `estimateSMSSegments()` already exists.
   - What's unclear: The exact per-segment price for Czech mobile numbers on the project's Twilio plan.
   - Recommendation: Use a configurable `SMS_COST_PER_SEGMENT_CZK` env var with a default of ~1.50 CZK (approximate Twilio CZ rate). Allow easy adjustment without code changes.

3. **Railway observability dashboard access**
   - What we know: Railway Pro plan includes monitoring with configurable alerts (CPU, RAM, response time).
   - What's unclear: Whether the project has Railway Pro plan and what native monitors are already configured.
   - Recommendation: Application-level monitoring (this phase) is complementary to Railway platform monitoring. Implement both.

4. **Worker metrics exposure**
   - What we know: The notification worker has a health server on port 3001 with `/health` and `/ready`. The web app has `/api/metrics` for Prometheus exposition.
   - What's unclear: Whether anyone scrapes `/api/metrics` on Railway, or if metrics are purely for future K8s deployment.
   - Recommendation: Add a `/metrics` endpoint to the worker health server for completeness. Even without a Prometheus scraper, the endpoint is useful for manual debugging (`curl localhost:3001/metrics`). The DB-based monitoring checks are the primary alerting mechanism on Railway.

## Sources

### Primary (HIGH confidence)

- Codebase analysis: `packages/shared/src/metrics/` (prom-client 15.1.3, custom registry, existing counters)
- Codebase analysis: `services/notification-worker/src/jobs/email-job.ts` and `sms-job.ts` (BullMQ workers, existing completed/failed events)
- Codebase analysis: `packages/events/src/consumer.ts` (DLQ infrastructure with `schedulebox.events.dlx` exchange)
- Codebase analysis: `packages/database/src/schema/notifications.ts` (status: pending/sent/delivered/failed/opened/clicked)
- Codebase analysis: `packages/database/src/schema/webhooks.ts` (processed_webhooks with status: processing/completed/failed)
- Codebase analysis: `apps/web/app/api/v1/webhooks/comgate/route.ts` (webhook handler with idempotency)
- Codebase analysis: `.github/workflows/ci.yml` (existing test/coverage/build pipeline)

### Secondary (MEDIUM confidence)

- [Railway Monitoring Docs](https://docs.railway.com/guides/monitoring) - Railway Pro monitoring features
- [BullMQ Metrics Docs](https://docs.bullmq.io/guide/metrics) - Built-in metrics per worker
- [BullMQ Events Docs](https://docs.bullmq.io/guide/events) - Worker completed/failed events
- [prom-client GitHub](https://github.com/siimon/prom-client) - Node.js Prometheus client API

### Tertiary (LOW confidence)

- SMS per-segment pricing for Czech numbers (needs verification with actual Twilio account)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already installed and in use; no new dependencies needed
- Architecture: HIGH - Patterns follow existing codebase conventions (prom-client custom registry, BullMQ workers, Drizzle ORM queries)
- Pitfalls: HIGH - Based on direct codebase analysis of current implementation gaps (worker process isolation, SMTP bounce limitations, K8s vs Railway mismatch)
- CI coverage: HIGH - Pipeline already exists, enhancement is straightforward

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- stable stack, no fast-moving dependencies)

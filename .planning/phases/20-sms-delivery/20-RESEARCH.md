# Phase 20: SMS Delivery - Research

**Researched:** 2026-02-20
**Domain:** Twilio SMS delivery, Czech phone number handling, AI-gated cost optimization
**Confidence:** HIGH

## Summary

Phase 20 builds on a mature foundation: the notification worker already has a complete SMS pipeline (BullMQ queue, sms-job.ts, sms-sender.ts, Twilio SDK v5.12.1, Handlebars templates). The existing code handles Twilio client creation, SMS segment estimation, mock mode for development, and delivery tracking via the notifications table. The reminder scheduler already enqueues SMS jobs alongside email jobs. What is missing is: (1) production Twilio credentials and a Czech phone number, (2) correct UCS-2 segment estimation for multipart messages with Czech diacritics, (3) AI no-show score gating to optimize costs, and (4) cost monitoring via Twilio Usage Triggers API.

The key technical risks are: Czech diacritics force UCS-2 encoding (70 chars/segment vs 160 for GSM-7), and multipart UCS-2 messages use 67 chars/segment due to User Data Headers. The existing `estimateSMSSegments` function uses 70 chars for all UCS-2 messages, which is only correct for single-segment messages -- multipart messages need 67 chars/segment. This must be fixed. Additionally, Twilio requires Sender ID registration for Czech T-Mobile and O2 networks (3-week provisioning time), or messages will have their sender rewritten to a random short code. A Czech mobile number ($12/month) with alphanumeric sender ID registration ($30/month) is recommended.

**Primary recommendation:** Fix the UCS-2 segment calculation, add AI score gating to the reminder scheduler, wire Twilio Usage Triggers for cost alerts, and configure production credentials as env vars in Helm/Railway -- all code paths already exist and need targeted modifications, not new architecture.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| twilio | 5.12.1 | SMS delivery via Twilio REST API | Already installed, TypeScript-native, no v4->v5 breaking changes |
| bullmq | ^5.29.5 | Job queue for SMS delivery | Already wired: `notification-sms` queue with 3 concurrency |
| handlebars | ^4.7.8 | SMS template rendering | Already wired: `renderTemplateFile('booking-reminder', 'sms', data)` |
| drizzle-orm | ^0.36.4 | Notification logging to DB | Already wired: `createNotificationRecord`, `logNotificationSent` |

### Supporting

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| @schedulebox/events | workspace | CloudEvents for booking.reminder routing | Already wired in booking-consumer.ts |
| @schedulebox/database | workspace | notifications + notification_templates schemas | Already wired in notification-logger.ts |
| opossum | (via apps/web) | Circuit breaker for AI no-show prediction | Already in apps/web/lib/ai/circuit-breaker.ts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Twilio | MessageBird/Vonage | Twilio already installed and coded; switching gains nothing |
| BullMQ for SMS queue | Direct Twilio send | Loses retry, rate limiting, and observability |
| Twilio Usage Triggers | Custom DB-based tracking | Twilio handles it natively with webhook callbacks |

**Installation:**
```bash
# No new packages needed -- twilio@5.12.1 already in services/notification-worker/package.json
```

## Architecture Patterns

### Existing Notification Worker Structure (already built)

```
services/notification-worker/src/
  config.ts                    # Twilio env vars (accountSid, authToken, fromNumber)
  queues.ts                    # BullMQ queues: notification-email, notification-sms, notification-push
  index.ts                     # Starts workers, RabbitMQ consumers, schedulers
  consumers/
    booking-consumer.ts        # booking.created -> enqueue confirm SMS (if phone + template)
    notification-send-consumer.ts  # Manual notification.send_requested -> enqueue SMS
  schedulers/
    reminder-scheduler.ts      # 15-min scan: upcoming bookings -> enqueue reminder SMS
  jobs/
    sms-job.ts                 # BullMQ worker: dequeue SMS job -> sendSMS() -> log
  services/
    sms-sender.ts              # Twilio client.messages.create() wrapper
    notification-logger.ts     # DB: create record, mark sent/failed
    template-renderer.ts       # Handlebars with Czech locale helpers
  templates/sms/
    booking-confirmation.hbs   # "Rezervace potvrzena: {{service_name}}, ..."
    booking-reminder.hbs       # "Pripominame termin: {{service_name}} zitra v ..."
```

### Pattern 1: AI-Gated SMS (New -- Core of Phase 20)

**What:** Before enqueuing an SMS reminder, query the AI no-show prediction and only send SMS if `no_show_probability > 0.7`.
**When to use:** In `reminder-scheduler.ts` when processing the 24h and 2h reminder windows.
**How it works:**
1. Reminder scanner finds upcoming booking
2. Call `predictNoShow({ booking_id })` (circuit breaker wrapped)
3. If `no_show_probability > 0.7` AND `fallback !== true` -> enqueue SMS
4. If fallback is true (AI unavailable) -> skip SMS (conservative; email still sends)
5. Log the decision in notification metadata for auditability

```typescript
// Pattern: AI-gated SMS in reminder-scheduler.ts
import { predictNoShow } from '../../apps/web/lib/ai/client.js';

// In scanWindow(), after email is enqueued:
if (booking.customerPhone) {
  const prediction = await predictNoShow({ booking_id: booking.id });

  // Only send SMS for high-risk bookings (cost optimization)
  if (prediction.no_show_probability > 0.7 && !prediction.fallback) {
    await smsQueue.add('send-sms', {
      companyId: booking.companyId,
      recipient: booking.customerPhone,
      body: smsBody,
      customerId: booking.customerId,
      bookingId: booking.id,
    }, { jobId: smsJobId });
  }
}
```

**CRITICAL NOTE:** The AI client (`apps/web/lib/ai/client.ts`) currently lives in the Next.js app, not in the notification worker. The prediction call needs to be either:
- (a) Extracted to a shared package, or
- (b) Called via HTTP from the notification worker to the AI service directly, or
- (c) Duplicated as a lightweight HTTP call in the notification worker.

Option (b) is recommended: make a direct HTTP call to `AI_SERVICE_URL/api/v1/predictions/no-show` from the notification worker, with a simple timeout/fallback (no circuit breaker needed for low-frequency reminder scans).

### Pattern 2: Twilio Usage Triggers for Cost Monitoring

**What:** Use Twilio's built-in Usage Triggers API to alert when SMS spending approaches a threshold.
**When to use:** Setup once during Twilio configuration (API call to create trigger).
**Example:**

```typescript
// One-time setup: create usage trigger for SMS cost monitoring
const client = twilio(accountSid, authToken);

await client.usage.triggers.create({
  friendlyName: 'ScheduleBox SMS Monthly Budget Alert',
  usageCategory: 'sms',
  triggerBy: 'price',
  triggerValue: '50',          // Alert at $50 USD monthly SMS spend
  recurring: 'monthly',
  callbackUrl: 'https://app.schedulebox.cz/api/v1/webhooks/twilio-usage',
  callbackMethod: 'POST',
});
```

### Pattern 3: UCS-2 Segment Estimation (Fix Existing Bug)

**What:** Fix the existing `estimateSMSSegments` function to use 67 chars for multipart UCS-2 messages.
**Why:** Current code uses 70 chars universally, but multipart UCS-2 segments hold only 67 chars due to User Data Header overhead.

```typescript
// Fixed segment estimation
export function estimateSMSSegments(body: string): number {
  const hasUnicode = /[^\x00-\x7F]/.test(body);

  if (hasUnicode) {
    // UCS-2: 70 chars single, 67 chars per segment if multipart
    return body.length <= 70 ? 1 : Math.ceil(body.length / 67);
  } else {
    // GSM-7: 160 chars single, 153 chars per segment if multipart
    return body.length <= 160 ? 1 : Math.ceil(body.length / 153);
  }
}
```

### Anti-Patterns to Avoid

- **Sending SMS for every reminder:** At $0.0666/message, 100 reminders/day = $200/month. Use AI gating.
- **Ignoring fallback flag:** When AI service is down, the fallback returns `no_show_probability: 0.15`. If you gate only on score (not checking `fallback: true`), you will correctly not send SMS -- but you should explicitly check `fallback` to distinguish "AI says low risk" from "AI is down".
- **Hardcoding Twilio credentials:** Use env vars (already done in config.ts).
- **Czech text without UCS-2 awareness:** Template content like "Pripominame termin" avoids diacritics, but custom templates from the `notification_templates` table may contain full Czech diacritics like "Pripominkame termín" -- always estimate segments with UCS-2 logic.
- **Sending SMS to landlines:** Twilio returns error 21614 for Czech landlines. Validate phone format before enqueuing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| SMS delivery | HTTP calls to carrier API | `twilio` SDK `client.messages.create()` | Handles auth, retries, encoding, error codes |
| SMS cost tracking | Custom DB counters per message | Twilio Usage Triggers API + Usage Records API | Real-time carrier-side tracking, webhook alerts |
| SMS segment counting | Custom character counting | Fix existing `estimateSMSSegments` + Twilio handles actual segmentation | Twilio auto-segments; our estimate is for cost prediction only |
| Czech phone validation | Regex for +420 | E.164 format validation: `/^\+420[0-9]{9}$/` | Czech mobile numbers are always +420 followed by 9 digits |
| Character encoding | Manual UCS-2/GSM-7 encoding | Twilio auto-detects and encodes | Twilio automatically uses UCS-2 when diacritics are present |

**Key insight:** Twilio handles the hard parts (encoding, segmentation, delivery, carrier routing). Our job is to (a) decide WHEN to send, (b) decide WHAT to send, and (c) monitor HOW MUCH we spend.

## Common Pitfalls

### Pitfall 1: Czech Sender ID Registration Required

**What goes wrong:** SMS to T-Mobile CZ and O2 CZ customers shows random short code as sender instead of your number/brand name.
**Why it happens:** Since July 2025, T-Mobile and O2 in Czech Republic require registered Sender IDs. Unregistered alphanumeric IDs are rewritten.
**How to avoid:** Register alphanumeric Sender ID "ScheduleBox" via Twilio Console ($30/month) or use a purchased Czech mobile number (+420, $12/month). Registration takes ~3 weeks.
**Warning signs:** Customer complaints about "unknown sender" or messages not arriving on T-Mobile/O2.

### Pitfall 2: UCS-2 Doubles Your Cost

**What goes wrong:** A 100-character Czech message with diacritics costs 2 segments ($0.1332) instead of expected 1 segment ($0.0666).
**Why it happens:** Any non-GSM-7 character (like Czech characters with háčky/čárky: á, č, ď, é, ě, í, ň, ó, ř, š, ť, ú, ů, ý, ž) forces the entire message to UCS-2 encoding. UCS-2 limit is 70 chars (single) or 67 chars (multipart).
**How to avoid:** Keep SMS templates SHORT (under 70 characters for Czech text). The existing templates are good examples: "Pripominame termin: {{service_name}} zitra v {{formatTime booking_time}}. {{company_name}}" -- note this avoids diacritics! But custom templates from DB may not. Monitor segment counts.
**Warning signs:** `estimateSMSSegments` returning > 1 for what seems like a short message.

### Pitfall 3: AI Fallback Sends Unwanted SMS

**What goes wrong:** When AI service is down, fallback returns `no_show_probability: 0.15` with `fallback: true`. If code only checks `> 0.7`, it correctly skips SMS. But if someone changes the threshold logic without understanding fallback, they might send SMS to everyone.
**Why it happens:** The fallback is designed to be conservative (low probability) to avoid false positives. But the `fallback: true` flag is the real signal.
**How to avoid:** Always check BOTH `no_show_probability > 0.7` AND `fallback !== true`. Log the decision.
**Warning signs:** Sudden spike in SMS volume when AI service has an outage.

### Pitfall 4: SMS Template Contains Diacritics in Default Templates

**What goes wrong:** The existing `booking-reminder.hbs` says "Pripominame termin" (without diacritics), but the correct Czech is "Připomínáme termín" (with diacritics). If someone "fixes" the template, it triggers UCS-2.
**Why it happens:** Original developer deliberately avoided diacritics to keep GSM-7 encoding.
**How to avoid:** Document this deliberate choice. If diacritics are needed, keep total message under 70 chars. Consider two template variants.
**Warning signs:** Template changes that add Czech diacritics without checking segment impact.

### Pitfall 5: Reminder Scheduler Sends SMS Without No-Show Check

**What goes wrong:** Current `reminder-scheduler.ts` (lines 233-271) enqueues SMS for ALL bookings with a phone number, without any AI score gating.
**Why it happens:** The scheduler was built before the cost optimization requirement.
**How to avoid:** Add the AI prediction check before the SMS enqueue block in `scanWindow()`.
**Warning signs:** SMS costs scaling linearly with booking volume instead of being ~30% (only high-risk).

## Code Examples

Verified patterns from the existing codebase and official Twilio docs:

### Existing SMS Send (already works)

```typescript
// Source: services/notification-worker/src/services/sms-sender.ts (lines 49-77)
export async function sendSMS(options: { to: string; body: string }): Promise<string> {
  const client = getTwilioClient();

  if (!client || !config.twilio.fromNumber) {
    const mockSid = `SM${Date.now()}mock`;
    console.warn('[SMS Sender] Twilio not configured, using mock SID:', mockSid);
    return mockSid;
  }

  const message = await client.messages.create({
    from: config.twilio.fromNumber,
    to: options.to,
    body: options.body,
  });

  return message.sid;
}
```

### AI No-Show Prediction Call (from notification worker)

```typescript
// New: Direct HTTP call to AI service from notification worker
// (avoids importing apps/web code into services/notification-worker)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface NoShowResult {
  no_show_probability: number;
  risk_level: string;
  fallback: boolean;
}

async function getNoShowPrediction(bookingId: number): Promise<NoShowResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/predictions/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`AI service: ${response.status}`);
    return await response.json() as NoShowResult;
  } catch {
    // Fallback: conservative (no SMS sent)
    return { no_show_probability: 0.15, risk_level: 'low', fallback: true };
  }
}
```

### Twilio Usage Trigger Setup

```typescript
// Source: Twilio Usage Triggers API docs
// https://www.twilio.com/docs/usage/api/usage-trigger
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

// Create monthly SMS cost alert
const trigger = await client.usage.triggers.create({
  friendlyName: 'ScheduleBox SMS Monthly Budget',
  usageCategory: 'sms',
  triggerBy: 'price',
  triggerValue: '50',  // $50 USD threshold
  recurring: 'monthly',
  callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/webhooks/twilio-usage`,
  callbackMethod: 'POST',
});
console.log('Usage trigger created:', trigger.sid);
```

### Czech Phone Number Validation

```typescript
// E.164 format for Czech mobile numbers
const CZECH_MOBILE_REGEX = /^\+420[67][0-9]{8}$/;

function isValidCzechMobile(phone: string): boolean {
  return CZECH_MOBILE_REGEX.test(phone);
}

// Czech mobile prefixes: +420 6xx xxx xxx or +420 7xx xxx xxx
// Landline prefixes: +420 2xx (Prague), +420 3xx-5xx (regional)
// Twilio returns 21614 for landline SMS attempts
```

### Webhook for Usage Trigger Callback

```typescript
// API route: apps/web/app/api/v1/webhooks/twilio-usage/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const data = await req.formData();

  const currentValue = data.get('CurrentValue');
  const triggerValue = data.get('TriggerValue');
  const usageCategory = data.get('UsageCategory');

  console.warn(
    `[Twilio Usage Alert] ${usageCategory} spend reached $${currentValue} ` +
    `(threshold: $${triggerValue})`
  );

  // TODO: Send alert to admin (Slack webhook, email, etc.)
  // For now, log it -- Phase 22 (Monitoring) will add proper alerting

  return NextResponse.json({ received: true });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| Twilio SDK v4 | Twilio SDK v5 (auto-generated via OpenAPI) | 2024 | No breaking changes; already on v5.12.1 |
| No sender registration CZ | Mandatory Sender ID for T-Mobile/O2 CZ | July 2025 | Must register or messages get rewritten |
| Send SMS to all reminders | AI-gated SMS (no-show score > 0.7) | This phase | ~70% cost reduction |

**Deprecated/outdated:**

- Twilio SDK v4 import style `const twilio = require('twilio')` still works in v5, but ESM `import twilio from 'twilio'` (already used in sms-sender.ts) is the modern approach.
- The existing default SMS templates deliberately omit Czech diacritics for GSM-7 encoding efficiency. This is intentional, not a bug.

## Czech Republic SMS Specifics

### Pricing

| Item | Cost |
| --- | --- |
| Outbound SMS per segment | $0.0666 USD |
| Czech mobile number (monthly) | $12.00 USD |
| Alphanumeric Sender ID registration (monthly) | $30.00 USD |
| Failed message processing fee | $0.001 USD |

### Character Encoding Impact on Cost

| Template Type | Encoding | Chars/Segment | Example | Segments | Cost |
| --- | --- | --- | --- | --- | --- |
| No diacritics (current) | GSM-7 | 160 (153 multipart) | "Pripominame termin: Strih damsky zitra v 14:00. Salon Krasa" | 1 | $0.0666 |
| With diacritics | UCS-2 | 70 (67 multipart) | "Připomínáme termín: Střih dámský zítra v 14:00. Salón Krása" | 1 | $0.0666 |
| Long with diacritics | UCS-2 | 67 per part | 80-char Czech message | 2 | $0.1332 |

### Sender ID Options

| Option | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| Czech mobile number (+420) | Two-way SMS, no registration needed for number | $12/month, shows phone number not brand | Good for transactional |
| Alphanumeric "ScheduleBox" | Shows brand name, professional | $30/month, one-way only, 3-week setup, required registration for T-Mobile/O2 | Best for brand recognition |
| Both (mobile + alphanumeric) | Full flexibility | $42/month combined | Overkill for MVP |

**Recommendation:** Start with Czech mobile number ($12/month). Add alphanumeric sender ID later if branding is a priority. The mobile number is simpler to set up (no 3-week registration wait).

## Open Questions

1. **Twilio account status**
   - What we know: STATE.md says "No external service accounts yet (Twilio)"
   - What's unclear: Is there a Twilio account created? Trial or paid?
   - Recommendation: Plan should include a human checkpoint for Twilio account setup, phone number purchase, and credential configuration. This cannot be automated.

2. **AI service availability in notification worker**
   - What we know: AI client lives in `apps/web/lib/ai/client.ts` (not accessible from notification worker). AI service URL is `http://localhost:8000` in dev.
   - What's unclear: Can the notification worker reach the AI service in production (network/DNS)?
   - Recommendation: Add `AI_SERVICE_URL` to notification worker config.ts and make a direct HTTP call (no circuit breaker needed for 15-min scanner interval).

3. **Cost threshold value**
   - What we know: SMS-04 requires "alert at cost threshold" but no specific dollar amount defined
   - What's unclear: What is the acceptable monthly SMS budget?
   - Recommendation: Default to $50/month as initial trigger, make it configurable via env var `SMS_BUDGET_ALERT_THRESHOLD`. This covers ~750 messages/month.

4. **SMS opt-out / STOP handling**
   - What we know: Czech SMS guidelines recommend STOP/HELP keyword support
   - What's unclear: Whether Twilio handles this automatically for Czech numbers
   - Recommendation: Twilio handles STOP/HELP automatically for purchased numbers. No custom code needed. Document this in deployment runbook.

## Sources

### Primary (HIGH confidence)

- Existing codebase: `services/notification-worker/src/` -- full SMS pipeline reviewed
- Twilio SDK v5.12.1 installed in `services/notification-worker/package.json`
- Twilio UPGRADE.md -- confirmed no breaking changes v4->v5
- Twilio Usage Triggers API docs: https://www.twilio.com/docs/usage/api/usage-trigger
- Twilio UCS-2 encoding docs: https://www.twilio.com/docs/glossary/what-is-ucs-2-character-encoding
- Twilio SMS character limits: https://www.twilio.com/docs/glossary/what-sms-character-limit

### Secondary (MEDIUM confidence)

- Twilio Czech Republic SMS Guidelines: https://www.twilio.com/en-us/guidelines/cz/sms
  - Verified: Sender ID registration required for T-Mobile/O2 since July 2025
- Twilio Czech Republic Regulatory: https://www.twilio.com/en-us/guidelines/cz/regulatory
  - Verified: Mobile number requires business registration + representative ID
- Twilio SMS Pricing CZ: https://www.twilio.com/en-us/sms/pricing/cz
  - Verified: $0.0666/message, $12/month Czech mobile, alphanumeric available

### Tertiary (LOW confidence)

- Exact 3-week Sender ID registration timeline -- from Twilio guidelines page, may vary
- Czech landline error code 21614 -- from Twilio docs, not tested with Czech numbers specifically

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- existing code reviewed, Twilio SDK verified, no new dependencies needed
- Architecture: HIGH -- notification worker architecture is well-understood, modifications are targeted
- Pitfalls: HIGH -- UCS-2 encoding, Czech sender registration, and AI gating are well-documented
- Cost monitoring: MEDIUM -- Twilio Usage Triggers API documented but webhook payload format not fully verified

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- Twilio SDK and pricing are stable)

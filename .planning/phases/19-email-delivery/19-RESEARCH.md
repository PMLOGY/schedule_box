# Phase 19: Email Delivery - Research

**Researched:** 2026-02-20
**Domain:** Transactional email delivery — Brevo SMTP, DNS authentication (SPF/DKIM/DMARC), nodemailer, Czech provider deliverability
**Confidence:** HIGH (core stack verified against official docs; DNS specifics verified across multiple sources)

---

## Summary

Phase 19 is primarily a **configuration and wiring phase**, not a build phase. The notification worker is 95% complete with Handlebars email templates, BullMQ job queuing, SMTP transport via nodemailer 7, reminder scheduling (24h/2h), and booking event consumers all implemented. What is missing is: (1) Brevo production credentials wired into the deployment, (2) DNS records (DKIM via Brevo dashboard, DMARC TXT) added to the sender domain, and (3) three specific email sends that currently log to console in development — password reset, email verification on registration, and booking cancellation fallback.

The largest risk is DNS propagation time (24–48h for DKIM/DMARC) and Czech provider deliverability for Seznam.cz, which explicitly rejects email without working DKIM. The Helm chart already has SMTP env var placeholders but they hardcode empty strings — the fix is to route them to Kubernetes secrets via `secretKeyRef`. The `.env.example` currently documents SendGrid credentials; this must be updated to Brevo.

**Primary recommendation:** Configure Brevo SMTP credentials (host: `smtp-relay.brevo.com`, port: `587`) via Kubernetes secrets, add DKIM (generated from Brevo dashboard) and DMARC DNS records to the sender domain, implement email sending for the three missing auth flows, then verify end-to-end with mail-tester.com and real Czech provider inboxes.

---

## Existing Codebase Inventory

This section is critical — it prevents re-building what already exists.

### Already Built (Do Not Re-Implement)

| Component | Location | Status |
|-----------|----------|--------|
| Email sender service (nodemailer, connection pool) | `services/notification-worker/src/services/email-sender.ts` | Complete |
| Template renderer (Handlebars + Czech locale helpers) | `services/notification-worker/src/services/template-renderer.ts` | Complete |
| Email job worker (BullMQ, 5 concurrent, 100/min rate limit) | `services/notification-worker/src/jobs/email-job.ts` | Complete |
| Booking confirmation email (RabbitMQ consumer) | `services/notification-worker/src/consumers/booking-consumer.ts` | Complete |
| Booking reminder scheduler (24h + 2h, 15-min scan) | `services/notification-worker/src/schedulers/reminder-scheduler.ts` | Complete |
| Tracking pixel injection | `services/notification-worker/src/services/email-sender.ts` | Complete |
| Notification logger (DB records for sent/failed) | `services/notification-worker/src/services/notification-logger.ts` | Complete |
| Email templates (confirmation, reminder, review request) | `services/notification-worker/src/templates/email/` | Complete |
| Layout template (responsive HTML, unsubscribe link) | `services/notification-worker/src/templates/email/layout.hbs` | Complete |
| Docker Compose SMTP env vars | `docker/docker-compose.yml` lines 137-141 | Complete |
| Helm worker deployment SMTP placeholders | `helm/schedulebox/templates/worker-deployment.yaml` lines 61-68 | Present but broken (empty strings) |
| Password reset token flow (Redis storage, validation, consumption) | `apps/web/app/api/v1/auth/forgot-password/route.ts` + `reset-password/route.ts` | Token logic complete; **email send is TODO** |
| Email verification token consumption | `apps/web/app/api/v1/auth/verify-email/route.ts` | Consumption complete; **token generation + email send on register is TODO** |

### What Is Missing (The Actual Work)

| Gap | File(s) | What to Add |
|-----|---------|-------------|
| Password reset email send | `apps/web/app/api/v1/auth/forgot-password/route.ts` line 51 | Call email API or enqueue RabbitMQ event |
| Email verification token generation + email send on register | `apps/web/app/api/v1/auth/register/route.ts` | Generate nanoid token, store in Redis as `email_verify:{hash}`, send email |
| Booking cancellation email template | `services/notification-worker/src/templates/email/` | Create `booking-cancellation.hbs` (currently inline HTML fallback in `booking-consumer.ts` line 355) |
| Company name fetching in templates | `booking-consumer.ts` line 77, `reminder-scheduler.ts` line 179 | Replace hardcoded `'ScheduleBox'` with DB lookup on `companies.name` |
| Brevo credentials in Helm secrets | `helm/schedulebox/templates/secrets.yaml` + `worker-deployment.yaml` | Add `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` to `secrets.yaml`; use `secretKeyRef` in `worker-deployment.yaml` |
| `.env.example` SMTP docs update | `.env.example` lines 71-76 | Replace SendGrid example with Brevo settings |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nodemailer | ^7.0.11 (already installed) | SMTP transport, connection pooling | Industry standard for Node.js email; v7.0.0 released May 2025 (breaking change: SES SDK only, irrelevant here) |
| handlebars | ^4.7.8 (already installed) | Email template rendering with helpers | Already in use; Czech locale formatters implemented |
| bullmq | ^5.29.5 (already installed) | Email job queuing, retry, rate limiting | Already in use; email worker already configured |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | (already in web app) | Generate password reset and email verification tokens | Token generation in auth routes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Brevo SMTP relay | Resend, Mailgun, SendGrid | Brevo chosen: best free tier (300/day), lowest entry cost for CZ/SK SMB market |
| Nodemailer direct | Brevo API (REST) | SMTP relay is transport-agnostic; switching providers requires only env var change, not code changes |
| Handlebars file templates | React Email / MJML | Handlebars already built and working; MJML would require rewrite; not worth it for this phase |

**No new npm packages required.** All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure (Existing — Reference Only)

```
services/notification-worker/src/
├── config.ts                           # SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
├── jobs/email-job.ts                   # BullMQ worker (5 concurrent, 100/min)
├── services/
│   ├── email-sender.ts                 # nodemailer createTransport, sendMail, tracking pixel
│   └── template-renderer.ts           # Handlebars compile + cache
├── templates/email/
│   ├── layout.hbs                      # HTML wrapper (responsive, unsubscribe link)
│   ├── booking-confirmation.hbs        # Czech booking confirmation
│   ├── booking-reminder.hbs            # Czech 24h/2h reminder
│   ├── review-request.hbs             # Post-service review
│   └── booking-cancellation.hbs        # [MISSING - must create]
└── consumers/booking-consumer.ts       # RabbitMQ → BullMQ bridge

apps/web/app/api/v1/auth/
├── forgot-password/route.ts            # Generates token; [MISSING: email send]
├── reset-password/route.ts             # Validates token; complete
├── register/route.ts                   # [MISSING: verification token + email send]
└── verify-email/route.ts               # Validates token; complete
```

### Pattern 1: Auth Email via Direct nodemailer Call (Recommended for Auth Routes)

**What:** Auth routes in `apps/web` call nodemailer directly (not via RabbitMQ) for password reset and email verification. These are synchronous security flows where the user waits for the response; speed matters.

**When to use:** Password reset and email verification sends. These happen in the Next.js API layer, not the notification worker.

**Example:**
```typescript
// apps/web/lib/email/auth-emails.ts
// Source: nodemailer official docs (nodemailer.com/smtp)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,        // smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,                       // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,       // Brevo login email
    pass: process.env.SMTP_PASS,       // Brevo SMTP key
  },
});

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@schedulebox.cz',
    to,
    subject: 'Obnovení hesla - ScheduleBox',
    html: `<p>Pro obnovení hesla klikněte <a href="${resetUrl}">zde</a>. Odkaz vyprší za 1 hodinu.</p>`,
  });
}

export async function sendEmailVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@schedulebox.cz',
    to,
    subject: 'Ověření e-mailu - ScheduleBox',
    html: `<p>Pro ověření e-mailu klikněte <a href="${verifyUrl}">zde</a>. Odkaz vyprší za 24 hodin.</p>`,
  });
}
```

**Alternative:** Publish a `notification.send_requested` RabbitMQ event. This is more decoupled but adds latency; for auth emails the synchronous approach is acceptable and simpler.

### Pattern 2: Brevo SMTP Credentials Configuration

**What:** Brevo uses `smtp-relay.brevo.com:587` with STARTTLS. Authentication uses the Brevo account login email as `user` and a generated **SMTP key** (not API key) as `pass`.

**Brevo SMTP settings (verified via official Brevo developer docs):**
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-account-email@example.com
SMTP_PASS=<smtp-key-generated-in-brevo-dashboard>
SMTP_FROM=noreply@schedulebox.cz
```

**Note:** Port `587` uses STARTTLS (secure:false in nodemailer). Port `465` uses implicit TLS (secure:true). Port `2525` is also available as fallback. Use `587` as the standard.

### Pattern 3: Kubernetes Secret for SMTP Credentials

**What:** The Helm `worker-deployment.yaml` currently hardcodes empty strings for SMTP vars. These must reference the K8s secret via `secretKeyRef`.

**Current (broken):**
```yaml
- name: SMTP_HOST
  value: ""
- name: SMTP_PASS
  value: ""
```

**Fix — add to `helm/schedulebox/templates/secrets.yaml`:**
```yaml
stringData:
  # ... existing secrets ...
  SMTP_HOST: {{ .Values.secrets.smtpHost | quote }}
  SMTP_USER: {{ .Values.secrets.smtpUser | quote }}
  SMTP_PASS: {{ .Values.secrets.smtpPass | quote }}
  SMTP_FROM: {{ .Values.secrets.smtpFrom | default "noreply@schedulebox.cz" | quote }}
```

**Fix — update `worker-deployment.yaml` to use secretRef (already has `secretRef` for the full secret):**
The deployment already uses `secretRef` (`envFrom: - secretRef: name: ...`). Once SMTP secrets are added to the K8s secret, they will be injected automatically. Remove the hardcoded empty-string env overrides.

### Pattern 4: Email Verification on Registration

**What:** On user registration, generate a verification token, store it in Redis, and send the verification email. This is currently missing — register creates the user but never sets the `email_verify:{hash}` key in Redis.

**Token generation pattern (matches existing forgot-password pattern):**
```typescript
// apps/web/app/api/v1/auth/register/route.ts
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

// After user creation:
const verifyToken = nanoid(64);
const tokenHash = createHash('sha256').update(verifyToken).digest('hex');
// 24-hour TTL (86400 seconds)
await redis.setex(`email_verify:${tokenHash}`, 86400, user.id.toString());
// Send email (non-blocking - don't fail registration if email fails)
sendEmailVerificationEmail(input.email, verifyToken).catch((err) =>
  console.error('[Register] Failed to send verification email:', err)
);
```

### Anti-Patterns to Avoid

- **Blocking registration on email send failure:** Email is best-effort; user account creation must succeed even if SMTP is temporarily unavailable. Use fire-and-forget for verification emails.
- **Using Brevo API key as SMTP password:** Brevo requires a dedicated SMTP key generated separately from API keys. Using the API key will cause authentication failure.
- **Adding `include:spf.sendinblue.com` or `include:spf.brevo.com` to SPF records:** Brevo does NOT require SPF authorization for the sender domain on shared IPs. Their envelope sender is Brevo's own domain. Adding this SPF record causes authentication failure (verified via multiple sources).
- **Hardcoding company name as 'ScheduleBox' in templates:** Two TODOs exist in booking-consumer.ts and reminder-scheduler.ts. These must be fixed to fetch the actual company name from the database.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP connection management | Custom TCP pool | nodemailer `pool: true, maxConnections: 5` (already configured) | Handles STARTTLS negotiation, keep-alive, SMTP greeting |
| Template compilation cache | Custom Map-based cache | nodemailer/Handlebars compile cache (already in template-renderer.ts) | Already implemented |
| Email retry logic | Custom retry loop | BullMQ `attempts: 3, backoff: exponential` (already configured) | BullMQ handles exponential backoff, dead letter queues |
| Rate limiting | Custom queue throttle | BullMQ `limiter: { max: 100, duration: 60000 }` (already configured) | Already enforces 100 emails/min |
| DNS record verification | curl/dig scripts | MXToolbox.com + Brevo dashboard "Verify" button | MXToolbox checks SPF, DKIM, DMARC, blacklists in one click |
| Spam score testing | Manual inbox checks | mail-tester.com (sends to a unique address, shows spam score 0-10) | Tests content scoring, authentication, blacklists automatically |

**Key insight:** The email delivery infrastructure is already built. This phase's work is configuration, wiring, and filling three missing email sends — not rebuilding the stack.

---

## DNS Authentication Setup

This is the highest-risk area because mistakes require 24-48h propagation to correct.

### Required DNS Records

**1. DKIM (mandatory — without this, Seznam.cz marks email as spam)**

DKIM records are account-specific and generated inside the Brevo dashboard:
- Navigate: **Brevo dashboard → Senders, Domains, and Dedicated IPs → Domains → Add domain → schedulebox.cz**
- Brevo generates two CNAME records (automatic method) or one TXT record (manual method)
- CNAME method uses 2048-bit keys (preferred); TXT method uses 1024-bit keys
- Copy the record name and value from the Brevo interface — they are unique per account

**Example format (values will differ per account):**
```
Type: CNAME
Name: brevo-code._domainkey.schedulebox.cz
Value: <brevo-generated-cname-value>.dkim.brevo.com
```

**2. DMARC (recommended — required for Gmail bulk sender compliance 2025)**

```
Type: TXT
Name: _dmarc.schedulebox.cz
Value: v=DMARC1; p=none; rua=mailto:dmarc@schedulebox.cz; ruf=mailto:dmarc@schedulebox.cz; fo=1
```

Start with `p=none` (monitoring only). After 2 weeks of clean data, advance to `p=quarantine`, then `p=reject`.

**3. SPF (NOT required for Brevo on shared IPs)**

Do NOT add `include:spf.brevo.com` or `include:spf.sendinblue.com`. Brevo's envelope sender uses their own domain; the SPF check passes on their IP, not yours. Adding the include causes authentication failure.

If you already have an SPF record for another purpose (e.g., Google Workspace), do not modify it for Brevo.

### DNS Propagation Timeline

| Action | Propagation Time |
|--------|-----------------|
| Add DKIM CNAME records | 15 min – 48h (typically <2h for major DNS providers) |
| Add DMARC TXT record | 15 min – 48h |
| Verify in Brevo dashboard | Immediate after DNS propagates |

### Verification Checklist

1. MXToolbox DKIM check: `https://mxtoolbox.com/dkim.aspx` → enter selector and domain
2. MXToolbox DMARC check: `https://mxtoolbox.com/dmarc.aspx`
3. Brevo dashboard "Authenticate this email domain" button → shows green checkmarks
4. mail-tester.com → send test email → score should be 9+/10
5. Send real email to Gmail → inspect headers for `DKIM=pass` and `DMARC=pass`
6. Send real email to seznam.cz address → verify inbox (not spam)

---

## Common Pitfalls

### Pitfall 1: Using Brevo API Key as SMTP Password

**What goes wrong:** SMTP authentication fails with 535 authentication error.
**Why it happens:** Brevo has separate API keys (for REST API) and SMTP keys (for SMTP relay). They are generated in different places in the dashboard.
**How to avoid:** In Brevo dashboard, go to **SMTP & API → SMTP → Generate a new SMTP key**. Use the SMTP key as `SMTP_PASS`. The `SMTP_USER` is your Brevo account login email.
**Warning signs:** `Error: Invalid login: 535 5.7.8 Error: authentication failed` in notification worker logs.

### Pitfall 2: Missing Email Verification Token Generation on Register

**What goes wrong:** `/api/v1/auth/verify-email` always returns "Invalid or expired verification token" because the token was never stored in Redis during registration.
**Why it happens:** `register/route.ts` creates the user but never calls `redis.setex('email_verify:...')`. The verify-email route expects this key to exist.
**How to avoid:** Add token generation + Redis storage in the register route immediately after user creation. Use `nanoid(64)` + SHA-256 hash (same pattern as forgot-password).
**Warning signs:** User registers, clicks verification link, always gets error regardless of timing.

### Pitfall 3: Helm SMTP Secrets Not Injected into Worker

**What goes wrong:** Notification worker logs "SMTP not configured, using mock message ID" in production.
**Why it happens:** `worker-deployment.yaml` has hardcoded empty-string env vars for SMTP that override the `secretRef`. In Kubernetes, explicit `env` entries take precedence over `envFrom` for the same key.
**How to avoid:** Remove the hardcoded `- name: SMTP_HOST value: ""` blocks. Add SMTP secrets to `secrets.yaml`. The `secretRef` block already covers the full secret.
**Warning signs:** Production logs show `mock-XXXXX@schedulebox.cz` as messageId.

### Pitfall 4: DNs Propagation Causing Delayed DKIM Failure

**What goes wrong:** Emails work immediately after DKIM setup (because the old DNS cache is still valid) but then fail after 24h when cache expires.
**Why it happens:** Some DNS resolvers cache the absence of a record (NXDOMAIN), then start failing once the TTL expires and they discover the correct record.
**How to avoid:** Set DNS TTL to 300 seconds (5 min) before making changes to allow rapid re-propagation. After verification, increase TTL.
**Warning signs:** Emails go to spam 24-48h after initial successful delivery.

### Pitfall 5: Sending from noreply@ to Seznam.cz

**What goes wrong:** Seznam.cz increases spam score for emails sent from `noreply@` addresses.
**Why it happens:** Seznam.cz's postmaster guidelines explicitly flag no-reply senders as a spam indicator. Source: verified via emaillabs.io/suped.com.
**How to avoid:** Use `info@schedulebox.cz` or `rezervace@schedulebox.cz` as the SMTP_FROM. If using noreply, set `Reply-To` header to a real address.
**Warning signs:** Gmail delivers fine but seznam.cz consistently routes to spam.

### Pitfall 6: Hardcoded Company Name in Templates

**What goes wrong:** All booking confirmation and reminder emails display "ScheduleBox" as the company name instead of the actual tenant's company name.
**Why it happens:** Two TODOs in `booking-consumer.ts` (line 77) and `reminder-scheduler.ts` (line 179) note "TODO: fetch from company settings."
**How to avoid:** In both files, fetch `companies.name` from the database using the `companyId` from the event. This is a single DB query, already joining other tables in the same function.
**Warning signs:** Customer receives email from "Tým ScheduleBox" instead of "Tým Kosmetický Salon Eva."

---

## Code Examples

### Verify Nodemailer Transporter Connection

```typescript
// Source: nodemailer.com/smtp (verified)
// Use this to test SMTP credentials before deployment
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,  // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Returns true if connection succeeds, throws if not
await transporter.verify();
console.log('SMTP connection verified');
```

### Forgot Password Route (Completed Version)

```typescript
// apps/web/app/api/v1/auth/forgot-password/route.ts (additions)
// Source: existing codebase pattern + nodemailer docs
import { sendPasswordResetEmail } from '@/lib/email/auth-emails';

// Inside the if (user) block, replace the TODO comment:
try {
  await sendPasswordResetEmail(input.email, resetToken);
} catch (err) {
  // Log but don't expose email failure to the user
  console.error('[Forgot Password] Email send failed:', err);
}
```

### Email Verification on Registration (New Code)

```typescript
// apps/web/app/api/v1/auth/register/route.ts (additions after user creation)
// Source: existing forgot-password pattern
import { sendEmailVerificationEmail } from '@/lib/email/auth-emails';

// After result = await db.transaction(...)
const verifyToken = nanoid(64);
const verifyHash = createHash('sha256').update(verifyToken).digest('hex');
await redis.setex(`email_verify:${verifyHash}`, 86400, result.user.id.toString()); // 24h TTL

// Fire-and-forget — registration succeeds even if email fails
sendEmailVerificationEmail(result.user.email, verifyToken).catch((err) =>
  console.error('[Register] Failed to send verification email:', err)
);
```

### Company Name DB Lookup Fix

```typescript
// In booking-consumer.ts and reminder-scheduler.ts
// Source: existing DB pattern in the same file
import { companies } from '@schedulebox/database';
import { eq } from 'drizzle-orm';

const [company] = await db
  .select({ name: companies.name })
  .from(companies)
  .where(eq(companies.id, companyId))
  .limit(1);

const companyName = company?.name || 'ScheduleBox';
```

### Booking Cancellation Template (New File)

```handlebars
{{! services/notification-worker/src/templates/email/booking-cancellation.hbs }}
<h2>Rezervace zrušena</h2>

<p>Dobrý den {{customer_name}},</p>

<p>Vaše rezervace byla zrušena.</p>

<div class="details-box">
  <p><strong>Služba:</strong> {{service_name}}</p>
  <p><strong>Datum:</strong> {{formatDate booking_date}}</p>
  {{#if reason}}
  <p><strong>Důvod:</strong> {{reason}}</p>
  {{/if}}
</div>

<p>Chcete-li si sjednat nový termín, navštivte naše stránky.</p>

<p>S pozdravem,<br>
Tým {{company_name}}</p>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| SPF alone for email authentication | SPF + DKIM + DMARC required | Gmail: Feb 2024; Microsoft: May 2025 | Must have DKIM to reach Gmail/Outlook inbox |
| SendGrid (documented in .env.example) | Brevo SMTP relay | Phase 19 decision | Change SMTP_HOST from `smtp.sendgrid.net` to `smtp-relay.brevo.com`, SMTP_USER from `apikey` to Brevo login email |
| Nodemailer 6.x | Nodemailer 7.0.x | May 2025 | Breaking: SES SDK removed (irrelevant for SMTP relay use); already on v7 |
| p=none DMARC forever | p=none → p=quarantine → p=reject progression | Industry best practice 2024+ | Start monitoring, advance after clean data |

**Deprecated/outdated:**

- `include:spf.sendinblue.com` in SPF records: Brevo no longer recommends this for shared IP senders; causes authentication failure.
- SendGrid credentials in `.env.example`: Must be replaced with Brevo credentials.

---

## Open Questions

1. **Does `schedulebox.cz` domain already have DNS management set up?**
   - What we know: The domain is referenced throughout config; DNS must be accessible to add DKIM/DMARC records.
   - What's unclear: Which DNS provider manages `schedulebox.cz` (Cloudflare, Route53, Wedos, etc.) and whether the team has access.
   - Recommendation: Confirm DNS access before beginning this phase. If using Cloudflare, Brevo can add records automatically via OAuth.

2. **Should auth emails (password reset, verification) use the notification worker or direct nodemailer in the web app?**
   - What we know: Notification worker handles booking-related emails via RabbitMQ. Auth emails are security-critical and synchronous.
   - What's unclear: Whether the team prefers architectural consistency (everything through the worker) or simplicity for auth (direct call).
   - Recommendation: Use direct nodemailer call in the web app for auth emails. Rationale: simpler, no RabbitMQ dependency for user-facing auth flows, already the implied pattern from the `TODO: Send email via notification service` comment that calls it a "service" not an "event."

3. **Is 300 emails/day Brevo free tier sufficient for launch?**
   - What we know: Brevo free tier = 300 emails/day (shared across campaigns and transactional). Confirmed for 2026.
   - What's unclear: Launch traffic volume. For a new SMB SaaS, 300/day may be sufficient initially (10-15 bookings/day × 2 emails each = 20-30 emails/day).
   - Recommendation: Start on free tier, monitor usage in Brevo dashboard, upgrade to Starter plan (€19/month for 20k emails) when approaching the limit.

4. **Unsubscribe link in transactional emails**
   - What we know: The email layout template (`layout.hbs`) includes `<a href="{{unsubscribe_url}}">Odhlásit se z odběru</a>` but `unsubscribe_url` is never populated in the template data calls.
   - What's unclear: Whether transactional emails require an unsubscribe link (legally in CZ, yes for marketing; transactional emails are exempt but Liste include it anyway).
   - Recommendation: Populate `unsubscribe_url` with a valid endpoint or remove the placeholder. Do not leave it as a broken link.

---

## Sources

### Primary (HIGH confidence)

- Brevo Developer Docs — `smtp-relay.brevo.com:587`, SMTP key vs API key distinction, DKIM/DMARC setup via dashboard — https://developers.brevo.com/docs/node-smtp-relay-example
- Nodemailer Official Docs — pool:true, maxConnections, secure:false for STARTTLS on port 587, verify() method — https://nodemailer.com/smtp
- Nodemailer Pooled SMTP — https://nodemailer.com/smtp/pooled
- Existing codebase (direct inspection) — all "already built" findings, all TODOs, all gaps

### Secondary (MEDIUM confidence)

- suped.com on Seznam.cz requirements — SPF+DKIM mandatory, no-reply sender penalized, fbl.seznam.cz feedback loop — https://www.suped.com/knowledge/email-deliverability/troubleshooting/how-to-resolve-spam-filtering-issues-with-seznamcz
- emaillabs.io on Czech provider rules — dedicated DKIM required for seznam.cz — https://emaillabs.io/en/sending-to-czech-republic-rules-introduced-by-seznam-cz/
- autospf.com on Brevo SPF — SPF include NOT required/not recommended for Brevo shared IP — https://autospf.com/blog/configuring-spf-dkim-and-dmarc-for-brevo/
- dmarcdkim.com — DMARC TXT record format, p=none starting policy — https://dmarcdkim.com/setup/brevo-dmarc-dkim-spf-domain-authentication
- powerdmarc.com — Gmail enforcement Nov 2025 for DMARC non-compliance — https://powerdmarc.com/gmail-enforcement-email-rejection/
- Brevo free plan 300 emails/day confirmed — https://moosend.com/blog/brevo-pricing/

### Tertiary (LOW confidence)

- MXToolbox email deliverability checklist (verification tool, not setup guide) — https://mxtoolbox.com/dmarc/email-delivery/email-delivery-checklist

---

## Metadata

**Confidence breakdown:**

- Existing codebase inventory: HIGH — directly inspected source files
- Standard stack (nodemailer, Handlebars, BullMQ): HIGH — verified in package.json and source
- Brevo SMTP credentials format: HIGH — verified via official Brevo developer docs
- SPF "not required" finding: MEDIUM — verified across 3 sources (autospf.com, dmarcdkim.com, Brevo help FAQ); critical to get right
- DKIM record generation: MEDIUM — process verified, exact record values are account-specific (generated in Brevo UI)
- DMARC TXT record format: MEDIUM — standard RFC format, verified across multiple sources
- Seznam.cz DKIM requirement: MEDIUM — verified via emaillabs.io and suped.com; could not verify directly with seznam.cz postmaster docs
- Brevo 300 email/day free limit: MEDIUM — confirmed by multiple review sites for 2026

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days — Brevo pricing/limits are stable; DNS standards are stable)

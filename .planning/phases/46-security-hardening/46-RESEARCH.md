# Phase 46: Security Hardening - Research

**Researched:** 2026-03-16
**Domain:** Security — PII encryption, XSS sanitization, HIBP breach check, CSRF, SSRF, Sentry, GDPR cookie policy
**Confidence:** HIGH (codebase is fully read; all external APIs verified against official docs)

---

## Summary

Phase 46 adds seven independent security layers to the existing Next.js 14 App Router + Drizzle + Neon + Upstash codebase. None of the seven requirements depend on each other — they can be planned as parallel tasks in the same wave with no sequencing constraint between them, though the database migration (SEC-03) requires a maintenance window and must be treated with the most caution.

The project already has a composable `createRouteHandler` factory used by every protected route. CSRF (SEC-06) is best implemented as a new middleware step added to that factory. XSS sanitization (SEC-02) requires exactly one new package — `isomorphic-dompurify` — because DOMPurify does not work server-side without a DOM polyfill. Every other requirement is implementable with zero new npm packages (Node.js `crypto`, native `fetch`, Sentry's own wizard-generated files, static page scaffolding).

The highest-risk work is SEC-03 (PII encryption). The customers table has `email varchar(255)` and `phone varchar(50)` as plaintext. Encrypting them requires an expand-contract migration: add ciphertext columns, back-fill in 500-row batches, atomically swap references, drop old columns. The HMAC lookup index replaces the current `ilike` email/phone search used in `GET /api/v1/customers`.

**Primary recommendation:** Plan six independent tasks (one per SEC-01 through SEC-07, combining SEC-06/SEC-07 as lightweight tasks). Run SEC-03 migration separately with a documented rollback SQL file prepared before execution.

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                    | Research Support                                                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Sentry error tracking integrated with Next.js App Router (@sentry/nextjs)                     | Sentry provides `withSentryConfig` wrapper + `instrumentation.ts` pattern; `tunnelRoute: "/monitoring"` bypasses CZ/SK ad-blockers            |
| SEC-02 | DOMPurify sanitizes all user-generated content (reviews, messages, notes)                      | `isomorphic-dompurify` wraps DOMPurify for server + client; affected fields: `reviews.comment`, `reviews.reply`, `notification_templates.body_template`, `companies.description` |
| SEC-03 | PII fields (email, phone) encrypted with AES-256-GCM at rest via expand-contract migration    | Node.js `crypto` module provides `createCipheriv`/`createDecipheriv`; HMAC-SHA256 deterministic index enables search without plaintext         |
| SEC-04 | HIBP API checks passwords on registration and password change                                  | HIBP Pwned Passwords v3 k-anonymity API is free, no key required; SHA-1 first-5-chars prefix query; integration points: register + change-password routes |
| SEC-05 | SSRF protection — URL whitelist + private IP blocking on webhook URLs                          | Automation rules `actionConfig.url` + future webhook settings; pure Node.js `URL` + regex pattern; RFC 1918 + link-local ranges to block      |
| SEC-06 | CSRF token middleware for state-changing POST/PUT/DELETE requests                              | JWT-based `Authorization` header is already CSRF-safe for API routes using Bearer tokens; incoming webhook routes must be explicitly excluded   |
| SEC-07 | Cookie Policy page accessible from footer on all public pages                                  | `/[locale]/cookie-policy` page follows same pattern as existing `/terms` and `/privacy` pages; MarketingFooter needs one new Link              |

</phase_requirements>

---

## Standard Stack

### Core

| Library              | Version       | Purpose                              | Why Standard                                                              |
| -------------------- | ------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `@sentry/nextjs`     | latest (^9)   | Error tracking + performance         | Official Sentry SDK for Next.js; native App Router + instrumentation.ts   |
| `isomorphic-dompurify` | latest (^2) | XSS sanitization on server + client | DOMPurify requires DOM — this package provides jsdom shim for Node.js     |
| Node.js `crypto`     | built-in      | AES-256-GCM + HMAC                   | Zero npm install; `createCipheriv`/`createDecipheriv`/`createHmac` stable |
| Native `fetch`       | built-in      | HIBP API call                        | Node.js 18+ includes global fetch; no axios/node-fetch needed             |

### Supporting

| Library       | Version  | Purpose                        | When to Use                                     |
| ------------- | -------- | ------------------------------ | ----------------------------------------------- |
| `next-intl`   | existing | i18n for cookie policy page    | Already installed; translate CS/EN cookie text  |
| `zod`         | existing | Validate webhook URL input     | Already installed; add `.url()` + IP refine     |

### Alternatives Considered

| Instead of               | Could Use              | Tradeoff                                                            |
| ------------------------ | ---------------------- | ------------------------------------------------------------------- |
| `isomorphic-dompurify`   | `sanitize-html`        | sanitize-html is heavier; DOMPurify is the OWASP-recommended choice |
| `isomorphic-dompurify`   | Manual regex stripping | Never — regex-based HTML sanitization is trivially bypassable       |
| Node.js `crypto` AES-GCM | `libsodium`            | libsodium is excellent but is a new npm dep; Node crypto is sufficient |
| Custom CSRF token        | `@edge-csrf/nextjs`    | Unnecessary — Bearer token in Authorization header is already CSRF-safe for this API-only architecture |

**Installation (one new package only):**

```bash
pnpm --filter @schedulebox/web add isomorphic-dompurify @sentry/nextjs
pnpm --filter @schedulebox/web add -D @types/dompurify
```

---

## Architecture Patterns

### Recommended Project Structure for Phase 46

```
apps/web/
├── instrumentation.ts              # EXTEND: add Sentry server/edge init
├── instrumentation-client.ts       # NEW: Sentry client init
├── sentry.server.config.ts         # NEW: server DSN + tunnelRoute
├── sentry.edge.config.ts           # NEW: edge DSN
├── next.config.mjs                 # EXTEND: wrap withSentryConfig
├── lib/
│   ├── security/
│   │   ├── encryption.ts           # NEW: AES-256-GCM + HMAC helpers
│   │   ├── sanitize.ts             # NEW: DOMPurify wrapper (server+client)
│   │   └── ssrf.ts                 # NEW: private IP validator
│   ├── auth/
│   │   └── hibp.ts                 # NEW: k-anonymity password breach check
│   └── middleware/
│       └── route-handler.ts        # EXTEND: CSRF check step (minor, see note)
├── app/
│   └── [locale]/
│       └── (marketing)/
│           └── cookie-policy/
│               └── page.tsx        # NEW: static cookie policy page
└── messages/
    ├── cs.json                     # EXTEND: add landing.cookiePolicy keys
    └── en.json                     # EXTEND: same
packages/database/src/
├── schema/customers.ts             # EXTEND: add emailCiphertext, phoneCiphertext, emailHmac columns
└── migrations/
    └── XXXX_pii_encryption.sql     # NEW: expand-contract DDL migration
```

### Pattern 1: AES-256-GCM Encryption with HMAC Search Index

**What:** Encrypt PII at write time, store IV + auth-tag + ciphertext together. Compute HMAC(key2, plaintext) as a separate deterministic column for exact-match search.

**When to use:** All writes to `customers.email` and `customers.phone`.

**Key derivation:** Two separate 32-byte keys from `ENCRYPTION_KEY` env var (master secret):
- `encKey` = `createHash('sha256').update(masterKey + ':enc').digest()`
- `hmacKey` = `createHash('sha256').update(masterKey + ':hmac').digest()`

**Example:**

```typescript
// Source: Node.js crypto docs (https://nodejs.org/api/crypto.html)
import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;    // 96-bit IV — recommended for GCM
const TAG_BYTES = 16;   // 128-bit auth tag

function deriveKeys(masterKey: string) {
  const encKey  = createHash('sha256').update(masterKey + ':enc').digest();
  const hmacKey = createHash('sha256').update(masterKey + ':hmac').digest();
  return { encKey, hmacKey };
}

export function encrypt(plaintext: string, masterKey: string): string {
  const { encKey } = deriveKeys(masterKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, encKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as: base64(iv:tag:ciphertext) — all three parts needed for decrypt
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decrypt(stored: string, masterKey: string): string {
  const { encKey } = deriveKeys(masterKey);
  const buf = Buffer.from(stored, 'base64');
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, encKey, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

export function hmacIndex(plaintext: string, masterKey: string): string {
  const { hmacKey } = deriveKeys(masterKey);
  return createHmac('sha256', hmacKey).update(plaintext.toLowerCase()).digest('hex');
}
```

**Drizzle schema additions to `customers` table:**

```typescript
emailCiphertext: text('email_ciphertext'),
phoneCiphertext: text('phone_ciphertext'),
emailHmac: varchar('email_hmac', { length: 64 }),  // hex SHA-256 = 64 chars
```

Add index on `emailHmac`:

```typescript
emailHmacIdx: index('idx_customers_email_hmac').on(table.emailHmac),
```

### Pattern 2: Expand-Contract PII Migration

**What:** Two-step migration to add ciphertext columns, back-fill, then cut over — preserves zero downtime.

**Migration SQL:**

```sql
-- Step 1: Add new columns (non-null after backfill)
ALTER TABLE customers
  ADD COLUMN email_ciphertext TEXT,
  ADD COLUMN phone_ciphertext TEXT,
  ADD COLUMN email_hmac VARCHAR(64);

CREATE INDEX CONCURRENTLY idx_customers_email_hmac ON customers(email_hmac);
```

**Back-fill script** (TypeScript, run as one-off via `pnpm tsx`):

```typescript
// Process in 500-row batches to avoid Neon timeout
const BATCH = 500;
let offset = 0;
while (true) {
  const rows = await db.select({ id, email, phone }).from(customers)
    .where(isNull(customers.emailCiphertext))
    .limit(BATCH).offset(offset);
  if (!rows.length) break;
  for (const row of rows) {
    await db.update(customers).set({
      emailCiphertext: row.email ? encrypt(row.email, MASTER_KEY) : null,
      phoneCiphertext: row.phone ? encrypt(row.phone, MASTER_KEY) : null,
      emailHmac:       row.email ? hmacIndex(row.email, MASTER_KEY) : null,
    }).where(eq(customers.id, row.id));
  }
  offset += BATCH;
}
```

**Cutover:** Once back-fill is verified, rename columns or swap application logic to use ciphertext columns for writes, HMAC for search.

**Rollback SQL (prepare before running migration):**

```sql
ALTER TABLE customers
  DROP COLUMN IF EXISTS email_ciphertext,
  DROP COLUMN IF EXISTS phone_ciphertext,
  DROP COLUMN IF EXISTS email_hmac;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_email_hmac;
```

### Pattern 3: HIBP k-Anonymity Check

**What:** SHA-1 hash password, send first 5 chars to HIBP, check if full hash suffix appears in response. No API key required.

**When to use:** In `POST /api/v1/auth/register` before inserting user, and `POST /api/v1/auth/change-password` before calling `updatePassword`.

```typescript
// Source: HIBP API docs (https://haveibeenpwned.com/API/v3#PwnedPasswords)
import { createHash } from 'crypto';

export async function isPasswordBreached(password: string): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
    // next: { revalidate: 0 } — always fresh, never cache breach data
    cache: 'no-store',
  });

  if (!res.ok) {
    // HIBP unavailable — fail open (do not block registration)
    console.warn('[HIBP] API unavailable, skipping breach check');
    return false;
  }

  const text = await res.text();
  return text.split('\n').some((line) => {
    const [hashSuffix, count] = line.trim().split(':');
    return hashSuffix === suffix && parseInt(count, 10) > 0;
  });
}
```

**Fail-open policy:** If HIBP is unreachable (timeout, 5xx), log a warning and allow the password — do not block legitimate registrations over network failures.

### Pattern 4: SSRF Private IP Validation

**What:** Reject webhook URLs pointing to RFC 1918, loopback, link-local, or other non-routable ranges.

**When to use:** In `automationRules` creation/update where `actionType = 'webhook'` and `actionConfig.url` is set. Also applies to any future webhook settings UI.

```typescript
// Source: RFC 1918 + RFC 3927 + RFC 4193 (no library needed)
const PRIVATE_RANGES = [
  /^127\./,                        // loopback
  /^10\./,                         // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./,   // RFC 1918
  /^192\.168\./,                   // RFC 1918
  /^169\.254\./,                   // link-local (APIPA)
  /^::1$/,                         // IPv6 loopback
  /^fc00:/i,                       // IPv6 unique local
  /^fd[0-9a-f]{2}:/i,              // IPv6 unique local
  /^fe80:/i,                       // IPv6 link-local
  /^0\./,                          // reserved
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // CGNAT RFC 6598
];

export function isPrivateIP(urlString: string): boolean {
  try {
    const { hostname } = new URL(urlString);
    return PRIVATE_RANGES.some((re) => re.test(hostname));
  } catch {
    return true; // Invalid URL — treat as unsafe
  }
}

export function validateWebhookUrl(url: string): void {
  if (isPrivateIP(url)) {
    throw new ValidationError(
      'Webhook URL must be a public internet address. Private and link-local IP addresses are not allowed.'
    );
  }
}
```

**Zod integration:**

```typescript
const webhookUrlSchema = z.string().url()
  .refine((url) => !isPrivateIP(url), {
    message: 'Webhook URL must not point to a private IP address',
  });
```

### Pattern 5: DOMPurify Sanitization Wrapper

**What:** Sanitize HTML strings before storing user-generated content. Strip all tags except a safe allow-list.

**Fields to sanitize:**
- `reviews.comment` — customer review text
- `reviews.reply` — owner reply to review
- `notification_templates.body_template` — owner-authored template body
- `companies.description` — company profile description (in `auth` schema)

```typescript
// lib/security/sanitize.ts
// Source: isomorphic-dompurify docs (https://github.com/kkomelin/isomorphic-dompurify)
import DOMPurify from 'isomorphic-dompurify';

// Default: strip ALL tags (plain text only) — use for review comments, notes
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Rich: allow basic formatting — use for notification templates, descriptions
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
```

### Pattern 6: Sentry Integration (SEC-01)

**What:** Add `@sentry/nextjs` with tunnel route `/monitoring` to prevent CZ/SK ad-blockers from dropping events.

**Files to create:**

`instrumentation-client.ts` (root of `apps/web`):
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // Phase 49 will raise this with OTel
  tunnel: '/monitoring',
});
```

`sentry.server.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  tunnel: '/monitoring',
  integrations: [Sentry.prismaIntegration ? undefined : undefined].filter(Boolean),
});
```

`sentry.edge.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

**Extend `instrumentation.ts`:**
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
```

**Extend `next.config.mjs`:**
```javascript
import { withSentryConfig } from '@sentry/nextjs';
// ... existing config ...
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
});
```

**Middleware exclusion** (add `monitoring` to existing middleware.ts matcher):
```typescript
export const config = {
  matcher: ['/((?!api|_next|embed|monitoring|.*\\..*).*)'],
};
```

### Pattern 7: CSRF Consideration for This API Architecture

**Key finding (HIGH confidence):** This application uses `Authorization: Bearer <JWT>` headers for ALL authenticated API calls. Bearer tokens sent via custom `Authorization` headers are inherently CSRF-safe because cross-origin form submissions and `<img>` tag requests cannot set custom headers. The OWASP CSRF Prevention Cheat Sheet classifies "custom request headers" as a primary defense.

**Conclusion:** The existing `createRouteHandler` with JWT auth already provides CSRF protection for authenticated routes. There is NO need to add a separate CSRF token layer for the existing routes.

**What SEC-06 actually requires:**
- Confirm the existing Authorization header pattern covers all state-changing routes — it does.
- Verify incoming webhook routes (`/api/v1/webhooks/comgate`, `/api/v1/webhooks/email-tracking/*`, `/api/v1/webhooks/push/*`, `/api/v1/webhooks/twilio-usage`) do NOT use Bearer auth (they should not — they receive external callbacks) — explicitly document their exclusion.
- Write a short `lib/security/csrf-audit.ts` or inline comments documenting why each webhook is excluded.

**If the team wants belt-and-suspenders CSRF tokens for unauthenticated form endpoints** (e.g., public booking form, public review submission), use a stateless HMAC token approach:

```typescript
// CSRF token = HMAC(sessionId + timestamp, CSRF_SECRET) — stored in HTTP-only cookie
// Validated by checking header X-CSRF-Token matches recomputed HMAC
```

This can be added to the Next.js middleware for `/(embed|[company_slug])` public routes only.

### Pattern 8: Cookie Policy Page (SEC-07)

**What:** A new static page following the exact same structure as existing `/terms` and `/privacy` pages.

**Location:** `apps/web/app/[locale]/(marketing)/cookie-policy/page.tsx`

**Required changes:**
1. Create `page.tsx` (mirrors `terms/page.tsx` structure with `generateStaticParams`)
2. Add translations to `cs.json`, `en.json`, `sk.json` under `landing.cookiePolicy`
3. Add `cookiePolicyLink` key to `landing.footer` in all three locale files
4. Add `<Link href="/cookie-policy">` to `MarketingFooter` in the Legal section

---

## Don't Hand-Roll

| Problem                           | Don't Build                               | Use Instead                                      | Why                                                             |
| --------------------------------- | ----------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| HTML sanitization                 | Regex-based tag stripping                 | `isomorphic-dompurify`                           | Regex bypasses via encoding, nested tags, mutation XSS vectors  |
| AES key management                | Hard-coded keys in source                 | `ENCRYPTION_KEY` env var + key derivation        | Rotation, secret management, no code-level secrets              |
| HIBP response parsing             | Full hash database download               | k-anonymity API (free, no key needed)            | Database is 40GB+, API is fast and anonymous                    |
| CSRF for API-only routes          | Cookie-based CSRF tokens                  | Existing Bearer JWT header (already CSRF-safe)   | Custom header cannot be sent cross-origin without CORS preflight |
| Private IP detection              | Reverse DNS lookups                       | Regex against parsed hostname                    | DNS rebinding attack bypasses DNS-based checks                   |

**Key insight:** For AES-256-GCM, the IV must NEVER be reused with the same key. Using `randomBytes(12)` per encryption call (stored alongside ciphertext) is the correct pattern. Never use a static/counter IV.

---

## Common Pitfalls

### Pitfall 1: IV Reuse in AES-GCM

**What goes wrong:** Using a static or counter-based IV causes GCM to lose all confidentiality — an attacker can recover the XOR keystream and decrypt other messages.
**Why it happens:** Developers mistake AES-CBC patterns (where IV is separate) for AES-GCM.
**How to avoid:** Always `randomBytes(12)` for the IV. Prepend IV to the stored ciphertext.
**Warning signs:** IV is a constant in code, or is stored separately from ciphertext.

### Pitfall 2: Auth Tag Not Stored

**What goes wrong:** Without the GCM auth tag, you cannot detect ciphertext tampering.
**Why it happens:** Forgetting that GCM provides authenticated encryption — `cipher.getAuthTag()` must be called AFTER `cipher.final()`.
**How to avoid:** Store layout is `[12 bytes IV][16 bytes tag][N bytes ciphertext]` concatenated as base64.
**Warning signs:** `decipher.setAuthTag()` call is absent.

### Pitfall 3: Search Breaks After PII Encryption

**What goes wrong:** The existing `ilike(customers.email, '%search%')` query returns zero results after encryption because the column now contains ciphertext.
**Why it happens:** Substring search cannot work on encrypted data.
**How to avoid:** Replace email/phone search with exact-match on the HMAC index column. Normalize input (`.toLowerCase().trim()`) before computing HMAC for comparison.
**Warning signs:** Search returns 0 results; `ilike` calls against `email`/`phone` columns remain after migration.

### Pitfall 4: HIBP Fail-Open vs Fail-Closed

**What goes wrong:** Treating a network error from HIBP as a breach blocks all registrations when HIBP is unavailable.
**Why it happens:** Reversing the error handling logic.
**How to avoid:** Catch fetch errors and return `false` (not breached). Log a warning but do not throw.
**Warning signs:** HIBP error causes HTTP 500 on register endpoint.

### Pitfall 5: DOMPurify Undefined on Server

**What goes wrong:** Importing plain `dompurify` in a server component throws "window is not defined."
**Why it happens:** DOMPurify requires a browser DOM environment.
**How to avoid:** Use `isomorphic-dompurify` which ships jsdom as a server-side DOM shim.
**Warning signs:** Build errors referencing `window` in server-only paths.

### Pitfall 6: Sentry tunnelRoute Blocked by Middleware

**What goes wrong:** The `/monitoring` tunnel route gets caught by `next-intl` middleware and returns 404 or a redirect.
**Why it happens:** The existing `middleware.ts` matcher does not exclude `/monitoring`.
**How to avoid:** Add `monitoring` to the middleware matcher exclusion list.
**Warning signs:** Sentry events are dropped; Sentry dashboard shows no events.

### Pitfall 7: Encryption Key Rotation

**What goes wrong:** No plan for rotating the `ENCRYPTION_KEY` means a leaked key permanently exposes all PII.
**Why it happens:** Encryption is treated as a one-time setup.
**How to avoid:** Document a key rotation procedure (re-encrypt all rows with new key in batches). Not required in Phase 46 itself, but note the process in a comment near the encryption module.
**Warning signs:** Single static `ENCRYPTION_KEY` with no rotation path documented.

### Pitfall 8: Back-fill Migration Timeout on Neon

**What goes wrong:** Running `UPDATE customers SET ...` on all rows in a single statement times out on Neon's serverless connection with a 30-second limit.
**Why it happens:** Neon HTTP transport has shorter timeouts than persistent connections.
**How to avoid:** Back-fill in 500-row batches using `LIMIT/OFFSET` in a TypeScript script, not a raw SQL UPDATE.
**Warning signs:** Migration script crashes at the SQL layer with a timeout error.

---

## Code Examples

### HIBP Integration Points

Register route (`/api/v1/auth/register/route.ts`) — add after schema validation, before `hashPassword`:

```typescript
// After validateBody, before hashPassword:
const breached = await isPasswordBreached(input.password);
if (breached) {
  throw new ValidationError(
    'This password has appeared in known data breaches. Please choose a different password.'
  );
}
```

Change-password route (`/api/v1/auth/change-password/route.ts`) — add after password history check:

```typescript
// After checkPasswordHistory, before updatePassword:
const breached = await isPasswordBreached(body.new_password);
if (breached) {
  throw new ValidationError(
    'This password has appeared in known data breaches. Please choose a different password.'
  );
}
```

### Customer Search After Encryption

Replace existing `ilike` email/phone search in `GET /api/v1/customers`:

```typescript
// Before: ilike(customers.email, `%${search}%`)
// After (exact email match via HMAC):
if (search && search.includes('@')) {
  const hmac = hmacIndex(search.trim().toLowerCase(), MASTER_KEY);
  conditions.push(eq(customers.emailHmac, hmac));
} else if (search) {
  // Name search still uses ilike (not encrypted)
  conditions.push(ilike(customers.name, `%${search}%`));
}
```

---

## State of the Art

| Old Approach                    | Current Approach                              | When Changed | Impact                                          |
| ------------------------------- | --------------------------------------------- | ------------ | ----------------------------------------------- |
| Plaintext PII in DB columns     | AES-256-GCM ciphertext + HMAC index           | Phase 46     | GDPR compliance for data at rest                |
| DOMPurify browser-only          | `isomorphic-dompurify` for server+client      | ~2023        | SSR sanitization without custom jsdom setup     |
| Sentry `_next/sentry-tunnel`    | `tunnelRoute: "/monitoring"` config option    | Sentry v8+   | One config line instead of custom route handler |
| Manual CSRF tokens in Next.js   | Bearer JWT header (CSRF-safe by spec)         | OWASP 2019   | No token needed when using custom auth headers  |

**Deprecated/outdated:**

- `next-csrf` npm package: Designed for Pages Router; does not work cleanly with App Router.
- DOMPurify direct import in server components: Always use `isomorphic-dompurify`.

---

## Open Questions

1. **DNS Rebinding for SSRF (SEC-05)**
   - What we know: Regex on the URL hostname string blocks static private IPs.
   - What's unclear: DNS rebinding can map a public hostname to a private IP after the regex check. True prevention requires resolving the DNS at request time (not registration time).
   - Recommendation: For Phase 46, validate at registration/creation time (the roadmap requirement is "registering a webhook URL pointing to private IPs is rejected"). Document the DNS rebinding limitation as a Phase 49/50 hardening note. Full DNS resolution validation is a separate concern.

2. **Encryption Key Rotation Procedure**
   - What we know: Phase 46 sets up the encryption with a single `ENCRYPTION_KEY`.
   - What's unclear: No documented re-encryption migration procedure exists yet.
   - Recommendation: Add a `// TODO: key rotation` comment in `encryption.ts` pointing to a future runbook. Out of scope for Phase 46.

3. **Existing `users.email` field**
   - What we know: `users` table has plaintext `email` used for login lookups. SEC-03 specifically targets `customers` table email/phone.
   - What's unclear: Does the GDPR scope require encrypting `users.email` too?
   - Recommendation: The requirements explicitly say "customer email and phone" — `users.email` is out of scope for Phase 46. It is used as a login identifier and would require fundamentally different handling (a separate phase). Keep it plaintext for now.

---

## Validation Architecture

### Test Framework

| Property           | Value                       |
| ------------------ | --------------------------- |
| Framework          | Vitest (existing)           |
| Config file        | `vitest.config.ts` (root)   |
| Quick run command  | `pnpm vitest run`           |
| Full suite command | `pnpm test:coverage`        |

### Phase Requirements → Test Map

| Req ID | Behavior                                           | Test Type | Automated Command                                      | File Exists? |
| ------ | -------------------------------------------------- | --------- | ------------------------------------------------------ | ------------ |
| SEC-01 | Sentry init loads without throwing                 | smoke     | Verify Sentry DSN env var present + build succeeds     | Manual only  |
| SEC-02 | `sanitizeText('<script>alert(1)</script>')` = `''` | unit      | `pnpm vitest run lib/security/sanitize.test.ts`        | ❌ Wave 0   |
| SEC-02 | `sanitizeRichText` allows `<b>` blocks             | unit      | `pnpm vitest run lib/security/sanitize.test.ts`        | ❌ Wave 0   |
| SEC-03 | `encrypt(decrypt(x)) === x` round-trip             | unit      | `pnpm vitest run lib/security/encryption.test.ts`      | ❌ Wave 0   |
| SEC-03 | `hmacIndex(x) === hmacIndex(x)` deterministic      | unit      | `pnpm vitest run lib/security/encryption.test.ts`      | ❌ Wave 0   |
| SEC-04 | `isPasswordBreached` returns true for "password"   | unit+mock | `pnpm vitest run lib/auth/hibp.test.ts`                | ❌ Wave 0   |
| SEC-04 | `isPasswordBreached` returns false on HIBP 5xx     | unit+mock | `pnpm vitest run lib/auth/hibp.test.ts`                | ❌ Wave 0   |
| SEC-05 | `isPrivateIP('http://10.0.0.1')` = true            | unit      | `pnpm vitest run lib/security/ssrf.test.ts`            | ❌ Wave 0   |
| SEC-05 | `isPrivateIP('https://api.example.com')` = false   | unit      | `pnpm vitest run lib/security/ssrf.test.ts`            | ❌ Wave 0   |
| SEC-06 | Webhook routes lack Authorization header check     | audit     | Manual code review                                     | N/A          |
| SEC-07 | `/cs/cookie-policy` page renders without error     | smoke     | `pnpm vitest run` (Next.js build check)                | Manual only  |

### Sampling Rate

- **Per task commit:** `pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/web/lib/security/encryption.test.ts` — covers SEC-03 round-trip + determinism
- [ ] `apps/web/lib/security/sanitize.test.ts` — covers SEC-02 XSS stripping
- [ ] `apps/web/lib/auth/hibp.test.ts` — covers SEC-04 breach detection + fail-open
- [ ] `apps/web/lib/security/ssrf.test.ts` — covers SEC-05 private IP blocking

---

## Sources

### Primary (HIGH confidence)

- Node.js crypto docs — `createCipheriv`, `createDecipheriv`, `createHmac`, `randomBytes` API
  https://nodejs.org/api/crypto.html
- HIBP Pwned Passwords API v3 — k-anonymity range endpoint, response format, padding header
  https://haveibeenpwned.com/API/v3#PwnedPasswords
- Sentry Next.js Manual Setup — `instrumentation.ts`, `withSentryConfig`, `tunnelRoute`
  https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- isomorphic-dompurify — server-side DOMPurify with jsdom shim
  https://github.com/kkomelin/isomorphic-dompurify
- OWASP CSRF Prevention Cheat Sheet — "Custom Request Headers" as a primary defense
  https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

### Secondary (MEDIUM confidence)

- Sentry Next.js App Router integration discussion — `onRequestError` hook pattern
  https://github.com/getsentry/sentry-javascript/discussions/13442
- Medium: DOMPurify in Next.js — isomorphic-dompurify as the standard solution
  https://github.com/vercel/next.js/issues/46893

### Tertiary (LOW confidence)

- Various blog posts on CSRF in Next.js App Router — consistent with OWASP finding that Bearer header is sufficient for API-only architectures

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified against official docs and existing package.json
- Architecture (PII encryption): HIGH — Node.js crypto API is stable and well-documented
- Architecture (HIBP): HIGH — API docs verified, response format confirmed
- Architecture (Sentry): HIGH — official manual setup docs fetched and verified
- CSRF assessment: HIGH — OWASP primary defense classification verified; Bearer header is CSRF-safe
- Architecture (cookie policy page): HIGH — existing privacy/terms pages provide exact pattern
- Pitfalls: HIGH — derived from direct codebase reading (specific file paths, actual column names)

**Research date:** 2026-03-16
**Valid until:** 2026-09-16 (all referenced APIs are stable; Sentry SDK changes quickly — re-verify `withSentryConfig` options if >6 months pass)

# Phase 49: Observability & Verticals - Research

**Researched:** 2026-03-18
**Domain:** OpenTelemetry / Vercel Observability + Industry Vertical Data Model
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Extra vertical-specific fields added to Step 3 (customer info) of the booking wizard — below standard fields
- Fields only appear when company's industry_type matches (medical_clinic → birth_number + insurance_provider, auto_service → license_plate + vin)
- Field required/optional is configurable per field by the owner in company settings — stored in industry_config JSONB
- Labels come from a separate industry config file (industry-labels.ts), NOT the i18n translation files
- Core entity labels override: Customer, Booking, Service — medical: Pacient/Termín/Vyšetření, automotive: Vozidlo/Zakázka/Servis
- Labels apply to BOTH public booking page AND owner dashboard
- Fallback: industries without overrides use generic defaults (Zákazník, Rezervace, Služba)
- Labels apply to email notifications (when Phase 47 active)
- Industry type changeable in company settings (not locked)
- Replace existing OTLP gRPC tracer with @vercel/otel for production
- Keep existing tracer code for local dev reference, but production uses @vercel/otel
- 10% trace sampling rate (matches existing Sentry config)
- Keep Winston logger, adapt output format to include: level, message, route, duration_ms, request_id
- Custom spans on critical paths: booking CRUD, payment processing, auth flows (~5-8 key routes)
- Request ID middleware: generate UUID per request, attach to X-Request-Id header, inject into all log entries
- AI config stored in existing industry_config JSONB: `{ ai: { upselling_enabled: boolean, capacity_mode: string } }`
- Scope: upselling toggle + capacity mode only (medical: upselling off, fitness: group class capacity)
- Auto-set defaults based on industry_type during onboarding, owner can override in settings
- Settings > AI / Automation page: simple toggles

### Claude's Discretion

- Data model choice: generic booking_metadata JSONB vs separate typed columns (JSONB recommended)
- Booking detail presentation of vertical fields (inline vs expandable)
- Exact set of UI labels to override per industry beyond core 3
- @vercel/otel integration details and instrumentation.ts changes
- Custom span placement and granularity
- Winston format adapter implementation

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                              | Research Support                                                                        |
| ------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| OBS-01 | OpenTelemetry instrumentation on API routes with @vercel/otel + 10% sampling | registerOTel in instrumentation.ts; @vercel/otel handles OTEL_TRACES_SAMPLER env var |
| OBS-02 | Structured JSON logging compatible with Vercel log drain                 | Winston JSON format already outputs JSON; add route, duration_ms, request_id fields     |
| VERT-01 | Medical vertical — booking_metadata JSONB supports birth_number, insurance fields | Add jsonb column to bookings; Zod schema per industry_type on write              |
| VERT-02 | Automotive vertical — booking_metadata JSONB supports SPZ/VIN fields     | Same booking_metadata JSONB column, different Zod schema branch                        |
| VERT-03 | Per-industry UI labels dynamically rendered from industry config          | industry-labels.ts static map; useIndustryLabels hook reads company.industry_type      |
| VERT-04 | Per-industry AI config (disable upselling for medical, adjust capacity for fitness) | industry_config JSONB on companies already exists; add AI sub-key           |

</phase_requirements>

---

## Summary

Phase 49 has two distinct technical tracks that share zero runtime coupling but are delivered together. The observability track replaces the existing OTLP gRPC tracer (`packages/shared/src/telemetry/tracer.ts`) with `@vercel/otel`, which works natively with the Vercel observability dashboard and requires only an `instrumentation.ts` change plus a Winston format adapter. The verticals track adds a `booking_metadata` JSONB column to the bookings table, a conditional field injection in Step 3 of the booking wizard, a static industry-labels config file, and a simple AI toggle in company settings.

The codebase is already well-positioned for both tracks. The `companies` table already has `industryType` (varchar) and `industryConfig` (jsonb) columns. The Winston logger already outputs JSON with trace correlation — it only needs `route`, `duration_ms`, and `request_id` fields added. The `instrumentation.ts` already registers Sentry; `registerOTel` needs to be called alongside it. The booking schema needs one migration (add `booking_metadata jsonb`), and the public booking API and Step 3 component need conditional field injection.

**Primary recommendation:** Build the two tracks as independent waves. Wave 1: observability (instrumentation.ts + Winston adapter + request ID middleware). Wave 2: vertical fields (DB migration + Step 3 fields + industry-labels.ts + BookingDetailPanel + AI settings page).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| ------- | ------- | ------- | ------------ |
| @vercel/otel | latest (pnpm add) | OpenTelemetry registration for Vercel | Zero-config Vercel integration, Edge-compatible, replaces NodeSDK/gRPC |
| @opentelemetry/api | ^1.9.0 (already in shared) | Custom spans via trace.getTracer() | Already installed, used by existing logger |
| winston | ^3.19.0 (already in shared) | Structured JSON logging | Already installed and configured |

### Supporting

| Library | Version | Purpose | When to Use |
| ------- | ------- | ------- | ----------- |
| @opentelemetry/sdk-logs | peer of @vercel/otel | Log signal support | Required by @vercel/otel peer deps |
| @opentelemetry/api-logs | peer of @vercel/otel | Log API | Required by @vercel/otel peer deps |
| @opentelemetry/instrumentation | peer of @vercel/otel | Auto-instrumentation base | Required by @vercel/otel peer deps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| ---------- | --------- | -------- |
| @vercel/otel | Manual NodeSDK (already in shared) | NodeSDK is not Edge-compatible; @vercel/otel is simpler and Vercel-native |
| JSONB booking_metadata | Typed columns per vertical | JSONB avoids per-vertical migrations; schema enforced via Zod at API layer |
| Static industry-labels.ts | next-intl messages files | i18n files are per-locale translations; label overrides are per-industry business logic — separate concerns |

**Installation:**
```bash
pnpm --filter @schedulebox/web add @vercel/otel @opentelemetry/sdk-logs @opentelemetry/api-logs @opentelemetry/instrumentation
```

Note: `@opentelemetry/api` is already in `packages/shared` — available transitively. The four new packages install only in `apps/web`.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase:

```
apps/web/
├── instrumentation.ts                    # Extend: add registerOTel call
├── lib/
│   ├── logger/
│   │   └── route-logger.ts              # NEW: Winston format adapter for Vercel drain
│   ├── middleware/
│   │   └── request-id.ts               # NEW: UUID generation, X-Request-Id header
│   └── industry/
│       ├── industry-labels.ts           # NEW: per-industry label overrides
│       ├── industry-fields.ts           # NEW: per-industry vertical field configs
│       └── industry-ai-defaults.ts     # NEW: per-industry AI config defaults
├── hooks/
│   └── use-industry-labels.ts          # NEW: hook returning label map from company context
├── components/
│   └── booking/
│       ├── Step3CustomerInfo.tsx        # EXTEND: inject vertical fields below standard fields
│       └── BookingDetailPanel.tsx       # EXTEND: show booking_metadata vertical fields
└── app/
    ├── api/v1/
    │   ├── public/company/[slug]/bookings/route.ts  # EXTEND: accept + store booking_metadata
    │   ├── bookings/route.ts                         # EXTEND: accept + store booking_metadata
    │   └── settings/
    │       ├── company/route.ts                      # EXTEND: accept industry_type + industry_config updates
    │       └── ai/route.ts                          # NEW: GET/PUT industry AI config
    └── [locale]/(dashboard)/settings/
        └── ai/page.tsx                              # NEW: AI settings page (simple toggles)

packages/database/src/schema/
└── bookings.ts                          # EXTEND: add booking_metadata jsonb column
```

### Pattern 1: @vercel/otel Registration alongside Sentry

**What:** `registerOTel` must be called inside the `register()` function in `instrumentation.ts`, before or after Sentry init. Both coexist. `@vercel/otel` handles Edge runtime via HTTP exporter automatically.

**When to use:** Always — this is the Vercel-native OTEL setup pattern.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/open-telemetry
import { registerOTel } from '@vercel/otel';
import { captureRequestError } from '@sentry/nextjs';

export async function register() {
  // @vercel/otel: works on both nodejs and edge runtimes
  registerOTel({ serviceName: 'schedulebox' });

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = captureRequestError;
```

**Sampling:** `@vercel/otel` respects the `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG` environment variables. Set `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1` in Vercel env vars to achieve 10%.

### Pattern 2: Custom Spans via @opentelemetry/api

**What:** Use `trace.getTracer()` + `startActiveSpan()` to wrap critical service calls. The OTEL API is already installed in `packages/shared` and the existing logger already calls it for trace context extraction.

**When to use:** On critical paths — booking create, payment process, auth flows.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/open-telemetry
import { trace } from '@opentelemetry/api';

export async function createBookingWithTrace(data: BookingInput) {
  return await trace
    .getTracer('schedulebox')
    .startActiveSpan('booking.create', async (span) => {
      try {
        span.setAttributes({
          'booking.company_id': data.companyId,
          'booking.service_id': data.serviceId,
        });
        const result = await createBooking(data);
        span.setAttributes({ 'booking.id': result.id });
        return result;
      } catch (err) {
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    });
}
```

### Pattern 3: Request ID Middleware

**What:** Generate a UUID per request in Next.js middleware, attach to `X-Request-Id` response header, and make the ID accessible to the logger via request context.

**When to use:** Applied globally in `middleware.ts` before maintenance check.

**Example:**
```typescript
// apps/web/middleware.ts — add at top of middleware function
const requestId = crypto.randomUUID();
const response = NextResponse.next();
response.headers.set('X-Request-Id', requestId);
// Pass via request header for downstream API routes to read
const requestWithId = new Request(req, {
  headers: { ...Object.fromEntries(req.headers), 'x-request-id': requestId },
});
```

Note: Next.js middleware cannot mutate the incoming `req` object; the pattern used in Phase 47 (reading request headers in route handlers) is the right approach. API route handlers read `req.headers.get('x-request-id')` and pass it to log calls.

### Pattern 4: Winston Route Logger Adapter

**What:** Add a `logRoute` helper that always includes `route`, `duration_ms`, and `request_id` fields — the fields required by Vercel log drain consumers.

**When to use:** At the start/end of each API route handler execution.

**Example:**
```typescript
// apps/web/lib/logger/route-logger.ts
import { logInfo, logError } from '@schedulebox/shared';

export function logRouteComplete(params: {
  route: string;
  method: string;
  status: number;
  duration_ms: number;
  request_id: string;
  error?: Error;
}) {
  const { error, ...fields } = params;
  if (error) {
    logError('route_error', { ...fields, error_message: error.message });
  } else {
    logInfo('route_complete', fields);
  }
}
```

### Pattern 5: booking_metadata JSONB with Per-Industry Zod Validation

**What:** A single nullable JSONB column on `bookings` stores all vertical-specific data. The API layer applies a Zod discriminated union based on the company's `industry_type` to validate fields before write.

**When to use:** On booking create (public + owner APIs).

**Example:**
```typescript
// Zod schema for booking_metadata
const medicalMetadataSchema = z.object({
  industry_type: z.literal('medical_clinic'),
  birth_number: z.string().max(20).optional(),
  insurance_provider: z.string().max(100).optional(),
});

const autoMetadataSchema = z.object({
  industry_type: z.literal('auto_service'),
  license_plate: z.string().max(20).optional(),
  vin: z.string().max(17).optional(),
});

const bookingMetadataSchema = z.discriminatedUnion('industry_type', [
  medicalMetadataSchema,
  autoMetadataSchema,
]).nullable().optional();
```

### Pattern 6: Industry Labels Static Map

**What:** A static TypeScript map from `industry_type` to label overrides. No runtime fetch — imported directly by components. The `useIndustryLabels` hook reads `company.industry_type` from the existing `useCompany` context hook.

**When to use:** Everywhere a generic "Customer", "Booking", or "Service" label would appear.

**Example:**
```typescript
// apps/web/lib/industry/industry-labels.ts

export interface IndustryLabels {
  customer: string;        // Zákazník / Pacient / Vozidlo
  booking: string;         // Rezervace / Termín / Zakázka
  service: string;         // Služba / Vyšetření / Servis
  newBooking: string;      // Nová rezervace / Nový termín / Nová zakázka
  customerSearch: string;  // Hledat zákazníka / Hledat pacienta / ...
}

const DEFAULT_LABELS: IndustryLabels = {
  customer: 'Zákazník',
  booking: 'Rezervace',
  service: 'Služba',
  newBooking: 'Nová rezervace',
  customerSearch: 'Hledat zákazníka',
};

const INDUSTRY_LABEL_MAP: Record<string, Partial<IndustryLabels>> = {
  medical_clinic: {
    customer: 'Pacient',
    booking: 'Termín',
    service: 'Vyšetření',
    newBooking: 'Nový termín',
    customerSearch: 'Hledat pacienta',
  },
  auto_service: {
    customer: 'Vozidlo',
    booking: 'Zakázka',
    service: 'Servis',
    newBooking: 'Nová zakázka',
    customerSearch: 'Hledat vozidlo',
  },
};

export function getIndustryLabels(industryType: string): IndustryLabels {
  return { ...DEFAULT_LABELS, ...(INDUSTRY_LABEL_MAP[industryType] ?? {}) };
}
```

### Pattern 7: Industry AI Config Defaults

**What:** Per-industry defaults for `industry_config.ai` sub-key, auto-applied during onboarding when `industry_type` is selected. Owner can override in Settings > AI page.

**Example:**
```typescript
// apps/web/lib/industry/industry-ai-defaults.ts
interface IndustryAiConfig {
  upselling_enabled: boolean;
  capacity_mode: 'individual' | 'group' | 'standard';
}

const INDUSTRY_AI_DEFAULTS: Record<string, IndustryAiConfig> = {
  medical_clinic: { upselling_enabled: false, capacity_mode: 'individual' },
  fitness_gym:    { upselling_enabled: true,  capacity_mode: 'group' },
  yoga_pilates:   { upselling_enabled: true,  capacity_mode: 'group' },
  // all others default:
};

const DEFAULT_AI_CONFIG: IndustryAiConfig = {
  upselling_enabled: true,
  capacity_mode: 'standard',
};

export function getIndustryAiDefaults(industryType: string): IndustryAiConfig {
  return INDUSTRY_AI_DEFAULTS[industryType] ?? DEFAULT_AI_CONFIG;
}
```

### Anti-Patterns to Avoid

- **Calling `initTracer()` from `packages/shared/src/telemetry/tracer.ts` in instrumentation.ts:** The NodeSDK gRPC tracer conflicts with `@vercel/otel`. Keep `tracer.ts` in place for local/reference use but do NOT import it from `instrumentation.ts`.
- **Sampling via code, not env vars:** Do not implement sampler logic in TypeScript. Use `OTEL_TRACES_SAMPLER_ARG=0.1` in Vercel env. Code-based sampling makes sampling rate not configurable per environment.
- **Adding booking_metadata validation in the Drizzle schema check constraint:** JSONB validation in Postgres check constraints is complex and not idiomatic with Drizzle ORM. Validate at the API Zod layer, store raw JSON.
- **Putting industry labels in `messages/cs.json`:** Labels are industry business logic, not locale strings. They are constant per industry across all locales (Czech-primary app). Mixing them with i18n strings would require duplicating them per locale and prevents clean programmatic access.
- **Running heavy OTel SDK in Edge middleware:** @vercel/otel is Edge-compatible; the old NodeSDK/gRPC is not. Never import `tracer.ts` from middleware.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| ------- | ----------- | ----------- | --- |
| OTEL registration | Manual NodeSDK gRPC setup | @vercel/otel registerOTel | Edge-compatible, zero-config Vercel dashboard integration |
| Sampling logic | TypeScript sampler class | OTEL_TRACES_SAMPLER env var | Env-var approach is the standard; configurable per deployment without code changes |
| Request ID generation | Custom ID library | `crypto.randomUUID()` | Already used in Phase 47 (crypto.randomUUID().slice(0,16) in writeAuditLog); Node built-in, no import needed |
| Log format | Custom JSON serializer | Winston JSON format (already configured) | Already outputs valid JSON; only extend defaultMeta |

**Key insight:** Vercel's observability dashboard consumes standard OTEL spans — no proprietary SDK needed. The existing Sentry 10% `tracesSampleRate` aligns with the 10% OTEL sampling requirement, creating a consistent observability posture across both systems.

---

## Common Pitfalls

### Pitfall 1: `registerOTel` Must Be Called Unconditionally (No `NEXT_RUNTIME` Guard)

**What goes wrong:** Wrapping `registerOTel` in `if (process.env.NEXT_RUNTIME === 'nodejs')` disables OTEL on Edge routes entirely.
**Why it happens:** Developers copy the Sentry runtime guard pattern, not realizing @vercel/otel handles both runtimes internally.
**How to avoid:** Call `registerOTel({ serviceName: 'schedulebox' })` at the top of `register()` with no runtime guard. Let @vercel/otel select the right exporter internally.
**Warning signs:** No traces appear for middleware or Edge API routes in Vercel dashboard.

### Pitfall 2: NodeSDK and @vercel/otel Both Active Simultaneously

**What goes wrong:** If the existing `initTracer()` from `packages/shared` is imported anywhere in the Next.js build (even transitively), two OTEL SDKs compete and produce duplicate/corrupted spans.
**Why it happens:** `packages/shared/src/index.ts` may re-export `initTracer`. If any `apps/web` file imports from `@schedulebox/shared` root and `initTracer` is in the barrel export, it initializes on import.
**How to avoid:** Verify that `initTracer` is NOT called anywhere in `apps/web`. It is safe for `packages/shared` to export it (for non-Vercel services), but `apps/web` must not call it.
**Warning signs:** Spans have doubled attributes, or Vercel dashboard shows 20% of requests sampled instead of 10%.

### Pitfall 3: booking_metadata Column Missing on Existing DB

**What goes wrong:** Attempting to write `booking_metadata` before the DB migration runs causes a column-not-found error at runtime.
**Why it happens:** Drizzle schema changes require explicit migration. The `drizzle-kit push` or raw SQL must run before deployment.
**How to avoid:** Apply migration via raw SQL (consistent with Phase 47/48 pattern where schedulebox user lacks CREATE privilege). Migration: `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_metadata jsonb DEFAULT NULL;`
**Warning signs:** POST /api/v1/public/company/[slug]/bookings returns 500 on vertical bookings.

### Pitfall 4: industry_config AI Sub-Key Not Initialized for Existing Companies

**What goes wrong:** Existing companies that existed before Phase 49 have `industry_config = {}` (no `ai` sub-key). The AI settings page crashes reading `company.industry_config.ai.upselling_enabled`.
**Why it happens:** Industry_config was previously used for other vertical config but not pre-populated with AI defaults.
**How to avoid:** The AI settings API GET endpoint must merge `industry_config.ai` with `getIndustryAiDefaults(industry_type)`, never assuming the key exists. Use `const aiConfig = { ...getIndustryAiDefaults(company.industryType), ...(company.industryConfig?.ai ?? {}) }`.
**Warning signs:** Settings > AI page throws TypeError reading undefined property.

### Pitfall 5: Winston Logger Not Compatible with Vercel Serverless Log Collection

**What goes wrong:** Winston `File` transport or multi-line log output breaks Vercel's per-line log collection.
**Why it happens:** Vercel collects logs line-by-line from stdout/stderr. Multi-line or non-JSON output cannot be parsed by log drains.
**How to avoid:** The existing logger already uses `Console` transport + `winston.format.json()` — this is correct. Only add fields to `defaultMeta` or pass them in log calls. Never add `File` transports.
**Warning signs:** Log drain parser errors, malformed JSON in Vercel log view.

### Pitfall 6: Duplicate i18n vs industry-labels Confusion

**What goes wrong:** Developers put industry labels in both `messages/cs.json` AND `industry-labels.ts`, causing drift where UI shows wrong label.
**Why it happens:** The booking form Step 3 uses `useTranslations` — easy to accidentally add industry-specific strings there.
**How to avoid:** `industry-labels.ts` is the single source of truth for industry labels. Do NOT add industry-specific keys to translation files. The `useIndustryLabels` hook takes precedence over translation for entity names.
**Warning signs:** Medical user sees "Customer" label in one place and "Pacient" in another.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### instrumentation.ts with @vercel/otel + Sentry Coexistence

```typescript
// Source: https://nextjs.org/docs/app/guides/open-telemetry
import { registerOTel } from '@vercel/otel';
import { captureRequestError } from '@sentry/nextjs';

export async function register() {
  // No runtime guard — @vercel/otel handles both nodejs and edge
  registerOTel({ serviceName: 'schedulebox' });

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = captureRequestError;
```

### Custom Span for Booking Create

```typescript
// Source: https://nextjs.org/docs/app/guides/open-telemetry (adapted)
import { trace } from '@opentelemetry/api';

export async function createBookingSpanned(data: BookingInput) {
  return trace
    .getTracer('schedulebox')
    .startActiveSpan('schedulebox.booking.create', async (span) => {
      try {
        span.setAttributes({
          'booking.company_id': String(data.companyId),
          'booking.service_id': String(data.serviceId),
        });
        const result = await createBooking(data);
        span.setAttribute('booking.id', String(result.id));
        return result;
      } catch (err) {
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    });
}
```

### Request ID Header in Middleware

```typescript
// apps/web/middleware.ts — added before intlMiddleware call
// Generate request ID for log correlation
const requestId = crypto.randomUUID();

// Let intl middleware run, then attach request ID to response
const intlResponse = intlMiddleware(req);
if (intlResponse) {
  intlResponse.headers.set('X-Request-Id', requestId);
  // Forward to downstream via request header for API routes
  intlResponse.headers.set('x-request-id', requestId);
  return intlResponse;
}
```

### Winston Route Log with Required Vercel Fields

```typescript
// The Winston logger already outputs JSON. Add fields at call site:
import { logInfo } from '@schedulebox/shared';

// Inside an API route handler, after execution:
logInfo('api_request', {
  level: 'info',                        // already set by winston level
  route: '/api/v1/bookings',            // ADD THIS
  duration_ms: Date.now() - startTime,  // ADD THIS
  request_id: req.headers.get('x-request-id') ?? 'unknown', // ADD THIS
  method: req.method,
  status: 201,
});
```

### DB Migration for booking_metadata

```sql
-- Apply via raw SQL (postgres superuser, consistent with Phase 47/48 pattern)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_metadata jsonb DEFAULT NULL;
```

Drizzle schema addition:
```typescript
// packages/database/src/schema/bookings.ts
import { jsonb } from 'drizzle-orm/pg-core';

// In bookings table definition, after internalNotes:
bookingMetadata: jsonb('booking_metadata'),
```

### Conditional Vertical Fields in Step3CustomerInfo

```typescript
// apps/web/components/booking/Step3CustomerInfo.tsx
// Company context provides industry_type
import { useCompany } from '@/hooks/use-company';
import { VERTICAL_FIELDS } from '@/lib/industry/industry-fields';

const { company } = useCompany();
const verticalFields = VERTICAL_FIELDS[company?.industry_type ?? ''] ?? [];

// After standard fields in form render:
{verticalFields.map((field) => (
  <FormField
    key={field.key}
    name={`metadata.${field.key}`}
    render={({ field: formField }) => (
      <FormItem>
        <FormLabel>{field.label}</FormLabel>
        <FormControl>
          <Input {...formField} placeholder={field.placeholder} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
))}
```

### Industry Fields Config

```typescript
// apps/web/lib/industry/industry-fields.ts
export interface VerticalField {
  key: string;
  label: string;         // Czech label
  placeholder: string;
  required: boolean;     // default — owner can override via industry_config
  maxLength: number;
}

export const VERTICAL_FIELDS: Record<string, VerticalField[]> = {
  medical_clinic: [
    { key: 'birth_number', label: 'Rodné číslo', placeholder: 'NNNNNN/NNNN', required: false, maxLength: 20 },
    { key: 'insurance_provider', label: 'Pojišťovna', placeholder: 'VZP, ČPZP, OZP...', required: false, maxLength: 100 },
  ],
  auto_service: [
    { key: 'license_plate', label: 'SPZ', placeholder: '1A2 3456', required: false, maxLength: 20 },
    { key: 'vin', label: 'VIN', placeholder: 'Identifikační číslo vozidla (17 znaků)', required: false, maxLength: 17 },
  ],
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| ------------ | ---------------- | ------------ | ------- |
| OTLP gRPC NodeSDK (tracer.ts) | @vercel/otel registerOTel | 2024 (Vercel introduced @vercel/otel) | Edge-compatible, dashboard-native, zero config |
| Manual span export to Jaeger | Vercel observability dashboard | 2024 | No separate collector needed on Vercel |
| NodeSDK not Edge-compatible | @vercel/otel HTTP exporter for Edge | @vercel/otel design | Edge API routes now produce traces |

**Deprecated/outdated:**

- OTLP gRPC endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT` pointing to localhost:4317): Not applicable on Vercel serverless. @vercel/otel uses Vercel's built-in collector.
- `SEMRESATTRS_SERVICE_NAME` (from `@opentelemetry/semantic-conventions`): The old `SEMRESATTRS_` prefix is deprecated in favor of `ATTR_SERVICE_NAME` in v1.26+. Existing code in `tracer.ts` uses the deprecated form — not a concern since we replace that file for production.

---

## Open Questions

1. **Does @vercel/otel support `OTEL_TRACES_SAMPLER_ARG` for 10% sampling in Vercel env vars?**
   - What we know: The @vercel/otel package says it supports standard OTEL env vars per documentation
   - What's unclear: Whether Vercel's internal OTEL pipeline respects head-based sampling at the SDK layer or overrides it at the collector
   - Recommendation: Set `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1` in Vercel project env vars; verify in dashboard that ~10% of traces appear. If not supported, add a `TraceIdRatioBasedSampler` in registerOTel options.

2. **Does `useCompany` hook expose `industry_type` currently?**
   - What we know: `companies` table has `industryType` column; GET /api/v1/settings/company returns `industry_type`
   - What's unclear: Whether the `useCompany` hook in the frontend already fetches and exposes `industry_type`
   - Recommendation: Check `apps/web/hooks/use-auth.ts` (which was modified per git status) or the company context; if not exposed, add `industry_type` to the company settings query response.

3. **Birth number (rodné číslo) — GDPR/PII sensitivity**
   - What we know: Birth numbers are sensitive PII under Czech law (zákon č. 133/2000 Sb.)
   - What's unclear: Whether `booking_metadata` JSONB should also be AES-256-GCM encrypted (like email/phone from Phase 46)
   - Recommendation: For v3.0 scope, store unencrypted (booking_metadata is only accessible to company owners via authenticated API — same level as existing notes field). Flag for v3.1 PII expansion.

---

## Validation Architecture

### Test Framework

| Property | Value |
| -------- | ----- |
| Framework | Vitest (configured in apps/web/package.json as `vitest run`) |
| Config file | vitest.config.ts (exists in apps/web) |
| Quick run command | `pnpm --filter @schedulebox/web test -- --reporter=verbose` |
| Full suite command | `pnpm --filter @schedulebox/web test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
| ------ | --------- | --------- | ----------------- | ------------ |
| OBS-01 | registerOTel called in instrumentation.ts | smoke | manual — no runtime OTEL validator in test env | N/A |
| OBS-01 | Custom span attributes set on booking.create | unit | `pnpm test -- --reporter=verbose industry-labels` | ❌ Wave 0 |
| OBS-02 | Log output includes route, duration_ms, request_id | unit | `pnpm test -- route-logger` | ❌ Wave 0 |
| VERT-01 | booking_metadata stored correctly for medical | unit | `pnpm test -- booking-metadata` | ❌ Wave 0 |
| VERT-02 | booking_metadata stored correctly for automotive | unit | (same test file, different case) | ❌ Wave 0 |
| VERT-03 | getIndustryLabels returns medical labels | unit | `pnpm test -- industry-labels` | ❌ Wave 0 |
| VERT-04 | getIndustryAiDefaults disables upselling for medical | unit | `pnpm test -- industry-ai-defaults` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @schedulebox/web test -- --reporter=verbose`
- **Per wave merge:** `pnpm --filter @schedulebox/web test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/web/lib/logger/__tests__/route-logger.test.ts` — covers OBS-02 (route, duration_ms, request_id fields present in log output)
- [ ] `apps/web/lib/industry/__tests__/industry-labels.test.ts` — covers VERT-03 (medical/auto/default label sets)
- [ ] `apps/web/lib/industry/__tests__/industry-ai-defaults.test.ts` — covers VERT-04 (upselling_enabled=false for medical, group for fitness)
- [ ] `apps/web/lib/industry/__tests__/booking-metadata.test.ts` — covers VERT-01/VERT-02 (Zod schema validates medical/auto fields, rejects unknown fields)

---

## Sources

### Primary (HIGH confidence)

- Next.js official docs — https://nextjs.org/docs/app/guides/open-telemetry — @vercel/otel API, register() pattern, custom spans, default span types
- Existing codebase: `apps/web/instrumentation.ts`, `packages/shared/src/telemetry/tracer.ts`, `packages/shared/src/logger/index.ts`, `packages/database/src/schema/bookings.ts`, `packages/database/src/schema/auth.ts`

### Secondary (MEDIUM confidence)

- https://vercel.com/docs/tracing/instrumentation — Vercel-specific OTEL configuration options
- https://vercel.com/docs/drains/reference/logs — Vercel log drain expected JSON structure (fields: level, message, timestamp, projectId, deploymentId)
- https://oneuptime.com/blog/post/2026-02-06-opentelemetry-nextjs-vercel-otel/view — Practical @vercel/otel setup guide (Feb 2026)

### Tertiary (LOW confidence)

- OTEL_TRACES_SAMPLER_ARG behavior in @vercel/otel — assumed based on standard OTEL spec compliance; needs runtime verification

---

## Metadata

**Confidence breakdown:**

- Standard stack (observability): HIGH — official Next.js docs + existing codebase confirmed
- Standard stack (verticals): HIGH — existing companies table JSONB column confirmed, pattern consistent with Phase 46/47/48
- Architecture: HIGH — confirmed against actual codebase file structure
- Pitfalls: MEDIUM-HIGH — based on known Vercel/OTEL gotchas and project history
- Sampling behavior: LOW — assumed OTEL spec compliance, verify after deploy

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable APIs — @vercel/otel and Next.js OTEL support are stable)

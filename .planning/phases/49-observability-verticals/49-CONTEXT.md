# Phase 49: Observability & Verticals - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

OpenTelemetry tracing on Vercel with @vercel/otel (10% sampling), structured JSON logging compatible with Vercel log drain, and industry verticals: medical (birth_number, insurance_provider) and automotive (license_plate/SPZ, VIN) with per-industry booking fields, UI label overrides, and AI configuration.

</domain>

<decisions>
## Implementation Decisions

### Vertical Field Capture UX

- Extra vertical-specific fields added to Step 3 (customer info) of the booking wizard — below standard fields
- Fields only appear when company's industry_type matches (medical_clinic → birth_number + insurance_provider, auto_service → license_plate + vin)
- Field required/optional is configurable per field by the owner in company settings — stored in industry_config JSONB
- Data model: Claude's discretion (generic booking_metadata JSONB with Zod validation per industry_type recommended vs separate typed columns)
- Booking detail view: Claude's discretion on how vertical fields are presented (inline vs expandable section)

### Per-Industry UI Labels

- Labels come from a separate industry config file (industry-labels.ts), NOT the i18n translation files
- Core entity labels override: Customer, Booking, Service — and Claude decides which additional labels make sense
- Medical: Pacient/Termín/Vyšetření. Automotive: Vozidlo/Zakázka/Servis. Claude decides exact label set.
- Labels apply to BOTH public booking page AND owner dashboard — consistent experience
- Fallback: industries without overrides (beauty_salon, photography, etc.) use generic defaults (Zákazník, Rezervace, Služba)
- Labels also apply to email notifications (when Phase 47 is active) — "Potvrzení termínu" instead of "Potvrzení rezervace" for medical
- Industry type changeable in company settings (not locked after onboarding)

### Observability

- Replace existing OTLP gRPC tracer with @vercel/otel — native Vercel observability dashboard integration
- Keep existing tracer code for local dev reference, but production uses @vercel/otel
- 10% trace sampling rate (matches existing Sentry config)
- Keep Winston logger, adapt output format to include required Vercel log drain fields: level, message, route, duration_ms, request_id
- Custom spans on critical paths: booking CRUD, payment processing, auth flows (~5-8 key routes)
- Request ID middleware: generate UUID per request, attach to X-Request-Id header, inject into all log entries for correlation

### Per-Industry AI Config

- Stored in existing industry_config JSONB column on companies table: `{ ai: { upselling_enabled: boolean, capacity_mode: string } }`
- Scope: upselling toggle + capacity mode only (medical: upselling off, fitness: group class capacity)
- Auto-set defaults based on industry_type during onboarding, owner can override in settings
- Settings > AI / Automation page: simple toggles showing current industry defaults with override capability
- Other industries: default behavior (upselling on, standard capacity)

### Claude's Discretion

- Data model choice: generic booking_metadata JSONB vs separate typed columns (JSONB recommended)
- Booking detail presentation of vertical fields (inline vs expandable)
- Exact set of UI labels to override per industry beyond core 3
- @vercel/otel integration details and instrumentation.ts changes
- Custom span placement and granularity
- Winston format adapter implementation

</decisions>

<specifics>
## Specific Ideas

- Industry labels should feel natural in Czech — "Pacient" for medical, "Vozidlo" for automotive
- Labels must be consistent everywhere: booking form, dashboard, detail panels, and emails
- Request ID in X-Request-Id header — essential for customer support correlating user reports with logs
- AI settings page should be simple toggles, not a complex configuration panel

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `packages/shared/src/telemetry/tracer.ts`: OTLP gRPC tracer — replace with @vercel/otel for production
- `packages/shared/src/logger/index.ts`: Winston JSON logger with OTEL trace correlation — adapt format
- `apps/web/instrumentation.ts`: Sentry entry point — extend with @vercel/otel registration
- `apps/web/sentry.server.config.ts` + `sentry.edge.config.ts`: Sentry configs (10% sample rate)
- `apps/web/lib/onboarding/industry-templates.ts`: 8 Czech industry templates with service/pricing — extend with vertical field configs
- `apps/web/components/onboarding/industry-template-picker.tsx`: Industry selection UI — reuse pattern
- `packages/database/src/schema/auth.ts`: companies table with `industry_type` (varchar) + `industry_config` (jsonb) — use for vertical config
- `packages/database/src/schema/bookings.ts`: bookings table — add booking_metadata JSONB column
- `apps/web/components/booking/BookingDetailPanel.tsx`: Sheet-based detail — add vertical fields display
- `apps/web/components/booking/Step3CustomerInfo.tsx`: Booking wizard step 3 — add vertical fields
- `packages/database/src/schema/ai.ts`: ai_predictions + ai_model_metrics tables — reference for AI config
- `apps/web/components/booking/UpsellingSuggestions.tsx`: Upselling component — add industry_config check
- `apps/web/app/api/v1/ai/optimization/upselling/route.ts`: Upselling API — add industry gate

### Established Patterns

- TanStack Query: useQuery/useMutation with invalidation — use for settings pages
- Glass UI: variant="glass" on Card, Dialog — use for settings sections
- Zod validation: all API inputs validated — add booking_metadata schemas per industry
- Company context: useCompany hook provides current company data including industry_type
- Settings pages: existing sub-page pattern under /(dashboard)/settings/

### Integration Points

- `apps/web/middleware.ts`: Add request_id generation
- `apps/web/app/api/v1/bookings/route.ts`: Add booking_metadata to create/update
- `apps/web/components/booking/Step3CustomerInfo.tsx`: Inject vertical fields conditionally
- Industry templates: extend with default industry_config AI settings
- Onboarding flow: auto-populate industry_config when industry_type selected
- Company settings: add industry type change + AI settings page

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 49-observability-verticals_
_Context gathered: 2026-03-18_

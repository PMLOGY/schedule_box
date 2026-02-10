# Architecture

**Analysis Date:** 2026-02-10

## Pattern Overview

**Overall:** Event-Driven Microservices with Shared Kernel

**Key Characteristics:**
- 19 autonomous microservices communicating via RabbitMQ domain events (choreography SAGA pattern)
- Monorepo structure (pnpm workspaces) with shared kernel packages (`@schedulebox/database`, `@schedulebox/shared`, `@schedulebox/events`, `@schedulebox/ui`)
- Tenant isolation via Row Level Security (RLS) with `company_id` on every data-bearing table
- API gateway layer (Kong/Traefik) fronting Next.js API routes and standalone microservices
- Synchronous boundaries (REST/gRPC) for direct dependencies; asynchronous via CloudEvents for eventual consistency

## Layers

**Client Layer:**
- Purpose: User-facing interfaces
- Location: `apps/web/`, embedded widgets, React Native mobile
- Contains: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui components, Zustand global state, TanStack Query server state
- Depends on: API Gateway at `/api/v1/`
- Used by: End users, administrators, customers

**Edge Layer:**
- Purpose: DDoS protection, global distribution, load balancing
- Location: Cloudflare CDN (configured at infrastructure level)
- Contains: Cloudflare DDoS protection, static asset caching, GEOIP routing
- Depends on: Nothing (sits in front of entire stack)
- Used by: All client applications

**API Gateway Layer:**
- Purpose: Single entry point, authentication, rate limiting, routing
- Location: Kong or Traefik (containerized)
- Contains: Request validation, JWT auth enforcement, rate limiting per company_id, request logging, API version routing
- Depends on: Auth Service for token validation
- Used by: All client requests

**Service Layer (19 Microservices):**
- Purpose: Business logic encapsulation by bounded context
- Location: `apps/web/app/api/` (Next.js routes) + `services/` directory (standalone)
- Contains: Service-specific controllers, handlers, event publishers
- Depends on: Shared packages, PostgreSQL, Redis, RabbitMQ, external APIs
- Used by: API Gateway (synchronous), other services (asynchronous via events)

**Data Layer:**
- Purpose: Persistent state and caching
- Location: PostgreSQL 16 (SQL), Redis 7 (cache/sessions), Cloudflare R2 (files)
- Contains: Normalized relational schema (47 tables), RLS policies per company_id, indexes for query optimization
- Depends on: Nothing
- Used by: All microservices

**Message Layer:**
- Purpose: Event distribution and service coupling reduction
- Location: RabbitMQ 3.13 (Docker container)
- Contains: `schedulebox.events` topic exchange, routing keys by `{service}.{entity}.{action}`, Dead Letter Queue for failed messages
- Depends on: Nothing
- Used by: All services producing/consuming domain events

**External Services Layer:**
- Purpose: Third-party integrations
- Location: Comgate API, QRcomat, Zoom/Meet/Teams, OpenAI, SMTP/SMS providers, Apple/Google Wallet
- Contains: Payment gateways, video conferencing, AI inference, notification delivery, wallet integration
- Depends on: Nothing (external)
- Used by: Payment Service, Video Service, AI Service, Notification Service, Loyalty Service

## Data Flow

**Booking Creation Flow:**

1. Client submits booking request to `POST /api/v1/bookings`
2. API Gateway validates JWT, routes to Booking Service
3. Booking Service validates via Zod schema (availability, customer, service, employee, resources)
4. Booking Service performs `SELECT FOR UPDATE` on availability_slots to prevent race conditions
5. Booking Service inserts booking record with `status='pending'`
6. Booking Service publishes `booking.booking.created` event to RabbitMQ
7. Event is immediately returned to client with `payment_url` (if payment required)
8. Asynchronously, consumers act:
   - Notification Service: queue confirmation email template
   - AI Service: queue no-show prediction
   - Analytics Service: track event
   - Automation Service: check triggered rules

**Payment → Confirmation Flow:**

1. Customer completes payment on Comgate/QRcomat
2. Payment gateway POSTs webhook to `POST /api/v1/webhooks/payments/{gateway}`
3. Payment Service validates webhook signature
4. Payment Service updates `payments.status = 'completed'`
5. Payment Service publishes `payment.payment.completed` event
6. Consumers subscribe (via routing key `payment.payment.completed`):
   - Booking Service: `UPDATE bookings SET status='confirmed'`, publishes `booking.booking.confirmed`
   - Loyalty Service: awards points
   - Analytics Service: tracks conversion
   - Invoice Service: generates invoice
7. Notification Service consumes `booking.booking.confirmed`, sends email

**State Management:**

- **Transactional state:** PostgreSQL (bookings, customers, payments, audit_logs)
- **Session/cache state:** Redis (JWT blacklist, availability cache, rate limit counters)
- **Eventual consistency:** RabbitMQ events (up to 3 retries with exponential backoff before DLQ)
- **Temporary files:** Cloudflare R2 (invoices, documents, white-label app builds)

## Key Abstractions

**Company (Tenant):**
- Purpose: Multi-tenant isolation boundary
- Examples: `apps/web/app/api/auth/register`, `packages/database/src/schema/auth.ts` (companies table)
- Pattern: Every query filtered by `WHERE company_id = $1`; RLS enforces at database level; JWT includes `company_id` claim

**Booking (Core Entity):**
- Purpose: Represents a single customer appointment
- Examples: `apps/web/app/api/bookings/[id]`, `packages/database/src/schema/bookings.ts`
- Pattern: Immutable creation; status state machine (pending → confirmed → completed/cancelled/no_show); availability checked via SELECT FOR UPDATE

**Service (Offering):**
- Purpose: Business offering (haircut, massage, consultation, etc.)
- Examples: `apps/web/app/api/services/[id]`, `packages/database/src/schema/services.ts`
- Pattern: Has duration_minutes, price (static or dynamic), capacity, required resources, employee assignments; supports online (video) or in-person

**Availability Slot:**
- Purpose: Specific time window available for booking
- Examples: `packages/database/src/schema/bookings.ts` (availability_slots table)
- Pattern: Generated on-the-fly or cached; respects employee working_hours + overrides; reserved pessimistically via SELECT FOR UPDATE

**Domain Event (CloudEvents):**
- Purpose: Immutable fact about a change in the system
- Examples: `packages/events/src/events/booking.ts`, `packages/events/src/events/payment.ts`
- Pattern: Follows CloudEvents spec 1.0; contains `type` (routing key), `source` (service origin), `data` (payload), `time` (ISO 8601 timestamp); published to RabbitMQ topic exchange

**Automation Rule:**
- Purpose: IF trigger THEN action pattern for no-code workflows
- Examples: `apps/web/app/api/automation/rules`, `packages/database/src/schema/automation.ts`
- Pattern: Trigger on domain events; actions include email, SMS, loyalty points, webhook calls; stored as JSON DSL

**AI Prediction:**
- Purpose: ML model inference cached in database
- Examples: `services/ai-service/`, `packages/database/src/schema/ai.ts` (ai_predictions table)
- Pattern: Predictions stored with `model_version`, `confidence`, `computed_at`; updated asynchronously; fallback to rule-based if unavailable

## Entry Points

**Web Application:**
- Location: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- Triggers: Browser navigation to https://schedulebox.cz
- Responsibilities: Auth context setup, route protection, global error boundaries, Zustand store initialization

**API Gateway:**
- Location: Kong/Traefik config (Docker Compose)
- Triggers: Any HTTP request to `/api/v1/`
- Responsibilities: JWT validation, rate limiting (100 req/min per company_id), request logging, routing to Next.js/standalone services

**Booking API Route:**
- Location: `apps/web/app/api/v1/bookings/route.ts`
- Triggers: `POST /api/v1/bookings`, `GET /api/v1/bookings`, `GET /api/v1/bookings/[id]`
- Responsibilities: Request validation (Zod), authorization check (RLS + RBAC), availability query, double-booking prevention, event publishing

**RabbitMQ Consumer (Notification Service):**
- Location: `services/notification-service/src/consumers/`
- Triggers: RabbitMQ message on routing key `booking.*`, `payment.*`, `review.*`
- Responsibilities: Template rendering, rate limiting, channel selection (email/SMS/push), delivery via SMTP/SMS provider, retry logic

**Webhook Receiver (Payment Service):**
- Location: `apps/web/app/api/v1/webhooks/payments/[gateway]/route.ts`
- Triggers: HTTP POST from Comgate/QRcomat with webhook signature
- Responsibilities: Signature verification, idempotency check, payment record update, event publishing

**Scheduled Job (AI Service):**
- Location: `services/ai-service/src/jobs/` (runs via Kubernetes CronJob)
- Triggers: Daily at 02:00 UTC for model retraining, hourly for predictions
- Responsibilities: Data collection, model training/inference, result storage in PostgreSQL

## Error Handling

**Strategy:** Graceful degradation with standardized error format

**Patterns:**

- **Validation Error** (400): Zod schema failure → `{ error: 'validation_failed', code: 'VALIDATION_ERROR', message: 'Booking duration exceeds max_capacity', details: { duration_minutes: ['Must be between 15 and 480'] } }`

- **Authorization Error** (403): User lacks permission or company_id mismatch → `{ error: 'forbidden', code: 'FORBIDDEN', message: 'You lack permission: bookings.update' }`

- **Not Found** (404): Entity doesn't exist or wrong company → `{ error: 'not_found', code: 'NOT_FOUND', message: 'Booking not found' }`

- **Conflict** (409): Double-booking detected → `{ error: 'conflict', code: 'DOUBLE_BOOKING', message: 'Slot not available (SELECT FOR UPDATE failed)' }`

- **Rate Limit** (429): Exceeded quota → `{ error: 'too_many_requests', code: 'RATE_LIMIT', message: 'Rate limit: 100 requests/minute' }`

- **External Service Failure** (503): Comgate down, OpenAI timeout, etc. → Fallback to cached data or queued for retry; return `{ error: 'service_unavailable', code: 'EXTERNAL_SERVICE_ERROR', message: 'Payment gateway temporary unavailable, retry in 1 minute' }`

- **Database Constraint Violation** (409): UNIQUE constraint on `(company_id, email)` → `{ error: 'conflict', code: 'UNIQUE_CONSTRAINT', message: 'Email already in use' }`

- **Event Publishing Failure** (500): RabbitMQ unavailable → Stored as pending in database, retried by scheduled job; user sees booking as confirmed but notification delayed

## Cross-Cutting Concerns

**Logging:**
- Framework: `console.log` (structured JSON logged to stdout, collected by Docker/Kubernetes)
- Pattern: Use `structuredLog()` utility in `packages/shared/src/utils/logging.ts` → `{ level: 'info', service: 'booking-service', action: 'booking.created', booking_id: 'uuid', company_id: 1, duration_ms: 234 }`
- Sensitive data: Never log passwords, tokens, PII; hash customer emails in logs

**Validation:**
- Framework: Zod schemas in `packages/shared/src/schemas/`
- Pattern: Every API input validated before database operation; schemas reused client-side for optimistic updates
- Examples: `loginSchema` (email + password), `bookingCreateSchema` (customer_id, service_id, start_time, etc.)

**Authentication:**
- Method: JWT (RS256) issued by Auth Service
- Pattern: Access token (15 min), Refresh token (7 days, stored in refresh_tokens table); JWT includes claims: `sub` (user_id), `company_id`, `role`, `email`
- Enforcement: API Gateway validates all requests; backend re-validates in critical operations

**Row Level Security (RLS):**
- Framework: PostgreSQL native
- Pattern: Every table (except global lookups like `roles`, `permissions`) has `company_id` column; RLS policy `USING (company_id = current_setting('app.company_id'))` applied to all SELECT/UPDATE/DELETE operations
- Implementation: Before query, set `SET app.company_id TO {company_id}`; database enforces isolation

**Tenant Isolation:**
- Pattern: Enforced at 3 levels: (1) JWT includes company_id, (2) RLS at DB, (3) explicit `company_id` check in each service handler
- Never filter by: user_id alone (could see other company's users); always: `WHERE company_id = $1 AND user_id = $2`

**Audit Logging:**
- Table: `audit_logs` in `packages/database/src/schema/analytics.ts`
- Pattern: Trigger on every INSERT/UPDATE/DELETE of sensitive tables (bookings, payments, customers); record `action`, `old_values`, `new_values`, `changed_by` (user_id), `company_id`, `timestamp`
- Use case: GDPR data subject access requests, compliance, forensics

---

*Architecture analysis: 2026-02-10*

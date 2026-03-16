# Requirements: ScheduleBox v3.0

**Defined:** 2026-03-16
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

## v3.0 Requirements

Requirements for production launch with 100% documentation coverage. Each maps to roadmap phases.
Source: GAP Analysis (32 gaps) + Employee Review Feedback (5 items).

### Infrastructure

- [ ] **INFRA-01**: publishEvent becomes safe no-op — app boots without RabbitMQ
- [ ] **INFRA-02**: PostgreSQL migrated to Neon serverless (pooled + direct URLs)
- [ ] **INFRA-03**: Redis migrated to Upstash (HTTP transport, drop-in for get/set/incr/expire)
- [ ] **INFRA-04**: App deployed to Vercel with production env vars and DNS
- [ ] **INFRA-05**: Next.js patched to >=14.2.25 (CVE-2025-29927 middleware bypass fix)

### Security

- [ ] **SEC-01**: Sentry error tracking integrated with Next.js App Router (@sentry/nextjs)
- [ ] **SEC-02**: DOMPurify sanitizes all user-generated content (reviews, messages, notes)
- [ ] **SEC-03**: PII fields (email, phone) encrypted with AES-256-GCM at rest via expand-contract migration
- [ ] **SEC-04**: HIBP API checks passwords on registration and password change
- [ ] **SEC-05**: SSRF protection — URL whitelist + private IP blocking on webhook URLs
- [ ] **SEC-06**: CSRF token middleware for state-changing POST/PUT/DELETE requests
- [ ] **SEC-07**: Cookie Policy page accessible from footer on all public pages

### Super-Admin

- [ ] **ADMIN-01**: Admin can impersonate any user with mandatory audit trail entry
- [ ] **ADMIN-02**: Feature flags table + admin UI to toggle features per company
- [ ] **ADMIN-03**: Admin can suspend/unsuspend companies with reason field
- [ ] **ADMIN-04**: Admin can broadcast messages to all active companies
- [ ] **ADMIN-05**: Maintenance mode toggle blocks public access with branded status page
- [ ] **ADMIN-06**: Platform daily metrics dashboard (new companies, bookings, revenue, churn)
- [ ] **ADMIN-07**: Platform audit log of all admin actions with timestamp, actor, and details

### Notifications

- [ ] **NOTIF-01**: Booking confirmation email sends on booking creation via SMTP
- [ ] **NOTIF-02**: Booking reminder SMS sends 24h before appointment via Twilio
- [ ] **NOTIF-03**: Booking status change emails (confirmed, cancelled, completed) send correctly
- [ ] **NOTIF-04**: Notification delivery status visible in owner notification list (sent/failed/pending)

### Marketplace

- [ ] **MKT-01**: Public marketplace page at /marketplace with full-text search across firms
- [ ] **MKT-02**: Filter by category, subcategory, city, and geolocation radius
- [ ] **MKT-03**: Firm detail page with description, photos, reviews, services list, and map
- [ ] **MKT-04**: Direct booking from marketplace firm profile (links to existing booking wizard)
- [ ] **MKT-05**: Premium listing placement for AI-Powered tier companies (featured flag)
- [ ] **MKT-06**: Sort by average rating, distance, and featured status

### UX Improvements

- [ ] **UX-01**: Booking detail opens in modal/drawer instead of full page navigation
- [ ] **UX-02**: Booking status changes (confirm/cancel/complete/no-show) via modal actions
- [ ] **UX-03**: Real-time dashboard updates via 30s TanStack Query polling (refetchInterval)
- [ ] **UX-04**: Video meetings management UI page for owners
- [ ] **UX-05**: Webhooks settings UI page for owners to manage API webhooks

### Bug Fixes

- [ ] **FIX-01**: AI-Powered plan shows unlimited bookings capacity (not 0)

### Observability

- [ ] **OBS-01**: OpenTelemetry instrumentation on API routes with @vercel/otel + 10% sampling
- [ ] **OBS-02**: Structured JSON logging compatible with Vercel log drain

### Testing

- [ ] **TEST-01**: Vitest unit test coverage reaches 80% on critical business logic paths
- [ ] **TEST-02**: Playwright E2E tests for booking flow, payments, auth, and admin
- [ ] **TEST-03**: Testcontainers integration tests for DB operations (CI-only)
- [ ] **TEST-04**: Storybook for core UI components (Button, Card, Dialog, Badge, DataTable)

### Industry Verticals

- [ ] **VERT-01**: Medical vertical — booking_metadata JSONB supports birth_number, insurance fields
- [ ] **VERT-02**: Automotive vertical — booking_metadata JSONB supports SPZ/VIN fields
- [ ] **VERT-03**: Per-industry UI labels dynamically rendered from industry config
- [ ] **VERT-04**: Per-industry AI config (disable upselling for medical, adjust capacity for fitness)

### Infrastructure Hardening

- [ ] **HARD-01**: DB partitioning for bookings table by month (raw SQL migration)
- [ ] **HARD-02**: DB partitioning for notifications and audit_logs tables

## Future Requirements (v3.1+)

### Mobile
- **MOB-01**: White-label React Native mobile app for companies
- **MOB-02**: App Store / Play Store CI/CD pipeline

### Enterprise Security
- **ESEC-01**: HashiCorp Vault for centralized secrets management
- **ESEC-02**: ClamAV file scanning for uploaded content
- **ESEC-03**: Pact contract tests between services

### Architecture
- **ARCH-01**: Microservices decomposition (if scale requires)
- **ARCH-02**: API Gateway (Kong/Traefik) for service routing
- **ARCH-03**: S3/R2 file storage for avatars and photos

## Out of Scope

| Feature | Reason |
|---------|--------|
| React Native mobile app | 200+ hours, separate milestone, web-first approach works |
| HashiCorp Vault | .env is sufficient for Vercel deployment model |
| Blue/Green deployment | Vercel handles this natively via preview deployments |
| Pact contract tests | TypeScript schema validation sufficient at monolith scale |
| Microservices migration | Monolith is correct architecture for <500 companies |
| ClamAV file scanning | No file upload feature is active |
| S3/R2 file storage | No file upload feature needs object storage yet |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 45 | Pending |
| INFRA-02 | Phase 45 | Pending |
| INFRA-03 | Phase 45 | Pending |
| INFRA-04 | Phase 45 | Pending |
| INFRA-05 | Phase 45 | Pending |
| FIX-01 | Phase 45 | Pending |
| SEC-01 | Phase 46 | Pending |
| SEC-02 | Phase 46 | Pending |
| SEC-03 | Phase 46 | Pending |
| SEC-04 | Phase 46 | Pending |
| SEC-05 | Phase 46 | Pending |
| SEC-06 | Phase 46 | Pending |
| SEC-07 | Phase 46 | Pending |
| NOTIF-01 | Phase 47 | Pending |
| NOTIF-02 | Phase 47 | Pending |
| NOTIF-03 | Phase 47 | Pending |
| NOTIF-04 | Phase 47 | Pending |
| ADMIN-01 | Phase 47 | Pending |
| ADMIN-02 | Phase 47 | Pending |
| ADMIN-03 | Phase 47 | Pending |
| ADMIN-04 | Phase 47 | Pending |
| ADMIN-05 | Phase 47 | Pending |
| ADMIN-06 | Phase 47 | Pending |
| ADMIN-07 | Phase 47 | Pending |
| MKT-01 | Phase 48 | Pending |
| MKT-02 | Phase 48 | Pending |
| MKT-03 | Phase 48 | Pending |
| MKT-04 | Phase 48 | Pending |
| MKT-05 | Phase 48 | Pending |
| MKT-06 | Phase 48 | Pending |
| UX-01 | Phase 48 | Pending |
| UX-02 | Phase 48 | Pending |
| UX-03 | Phase 48 | Pending |
| UX-04 | Phase 48 | Pending |
| UX-05 | Phase 48 | Pending |
| OBS-01 | Phase 49 | Pending |
| OBS-02 | Phase 49 | Pending |
| VERT-01 | Phase 49 | Pending |
| VERT-02 | Phase 49 | Pending |
| VERT-03 | Phase 49 | Pending |
| VERT-04 | Phase 49 | Pending |
| TEST-01 | Phase 50 | Pending |
| TEST-02 | Phase 50 | Pending |
| TEST-03 | Phase 50 | Pending |
| TEST-04 | Phase 50 | Pending |
| HARD-01 | Phase 50 | Pending |
| HARD-02 | Phase 50 | Pending |

**Coverage:**

- v3.0 requirements: 47 total
- Mapped to phases: 47 (100%)
- Unmapped: 0

---

_Requirements defined: 2026-03-16_
_Last updated: 2026-03-16 after roadmap creation — traceability complete_

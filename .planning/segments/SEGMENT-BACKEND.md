# SEGMENT: BACKEND

**Terminal Role:** API routes, business logic, authentication, microservices, event publishing
**Documentation Reference:** Parts II, IV, VI, VII, VIII of `schedulebox_complete_documentation.md`

---

## Your Scope

You are responsible for:
1. **Next.js 14 API routes** for all 99 endpoints
2. **Authentication & authorization** (JWT, MFA, OAuth2, RBAC)
3. **Business logic** for all 19 services
4. **RabbitMQ event publishing & consumption**
5. **SAGA workflows** (booking→payment→notification)
6. **External API integrations** (Comgate, QRcomat, Zoom, OpenAI)
7. **Resilience patterns** (circuit breaker, retry, fallback)
8. **WebSocket server** (Socket.io)
9. **Shared packages** (`@schedulebox/shared`, `@schedulebox/events`)

You are NOT responsible for: Database schema design (use what DATABASE segment provides), UI components, Docker/K8s setup.

---

## Package & Directory Structure

### Main App (Next.js API Routes)
```
apps/web/
├── src/
│   └── app/
│       └── api/
│           └── v1/
│               ├── auth/
│               │   ├── register/route.ts
│               │   ├── login/route.ts
│               │   ├── logout/route.ts
│               │   ├── refresh/route.ts
│               │   ├── verify-email/route.ts
│               │   ├── forgot-password/route.ts
│               │   ├── reset-password/route.ts
│               │   ├── mfa/
│               │   │   ├── setup/route.ts
│               │   │   └── verify/route.ts
│               │   ├── oauth/
│               │   │   └── [provider]/route.ts
│               │   └── me/route.ts
│               ├── bookings/
│               │   ├── route.ts              # GET (list), POST (create)
│               │   ├── [id]/
│               │   │   ├── route.ts          # GET, PUT, DELETE
│               │   │   ├── confirm/route.ts  # POST
│               │   │   ├── cancel/route.ts   # POST
│               │   │   ├── complete/route.ts # POST
│               │   │   └── no-show/route.ts  # POST
│               │   └── upcoming/route.ts     # GET
│               ├── availability/route.ts     # GET ?service_id&date_from&date_to
│               ├── customers/
│               │   ├── route.ts              # GET, POST
│               │   ├── [id]/
│               │   │   ├── route.ts          # GET, PUT, DELETE
│               │   │   └── bookings/route.ts # GET
│               │   ├── import/route.ts       # POST (CSV)
│               │   └── export/route.ts       # GET (CSV)
│               ├── services/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               ├── service-categories/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               ├── employees/
│               │   ├── route.ts
│               │   ├── [id]/
│               │   │   ├── route.ts
│               │   │   └── working-hours/route.ts
│               ├── resources/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               ├── resource-types/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               ├── payments/
│               │   ├── route.ts
│               │   ├── [id]/
│               │   │   ├── route.ts
│               │   │   └── refund/route.ts
│               │   ├── comgate/
│               │   │   ├── create/route.ts
│               │   │   └── webhook/route.ts
│               │   └── qrcomat/
│               │       ├── generate/route.ts
│               │       └── webhook/route.ts
│               ├── invoices/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               ├── coupons/
│               │   ├── route.ts
│               │   ├── [id]/route.ts
│               │   └── validate/route.ts
│               ├── gift-cards/
│               │   ├── route.ts
│               │   ├── [id]/route.ts
│               │   └── redeem/route.ts
│               ├── loyalty/
│               │   ├── programs/
│               │   ├── cards/
│               │   ├── rewards/
│               │   └── transactions/
│               ├── notifications/
│               │   ├── route.ts
│               │   └── templates/
│               ├── reviews/
│               │   ├── route.ts
│               │   └── [id]/
│               │       ├── route.ts
│               │       └── reply/route.ts
│               ├── ai/
│               │   ├── no-show/route.ts
│               │   ├── clv/route.ts
│               │   ├── upselling/route.ts
│               │   ├── pricing/route.ts
│               │   ├── health-score/route.ts
│               │   └── voice-booking/route.ts
│               ├── marketplace/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               ├── video/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               ├── automation/
│               │   ├── rules/
│               │   └── logs/
│               ├── analytics/
│               │   ├── dashboard/route.ts
│               │   ├── revenue/route.ts
│               │   ├── bookings/route.ts
│               │   └── export/route.ts
│               ├── settings/
│               │   ├── company/route.ts
│               │   ├── working-hours/route.ts
│               │   ├── api-keys/
│               │   └── webhooks/
│               └── widget/
│                   └── config/[slug]/route.ts
```

### Shared Package
```
packages/shared/
├── src/
│   ├── types/           # TypeScript interfaces (see DEPENDENCIES.md)
│   ├── schemas/         # Zod validation schemas
│   ├── utils/           # Shared utilities
│   │   ├── errors.ts    # AppError class, error codes
│   │   ├── pagination.ts # Pagination helpers
│   │   └── date.ts      # Date/timezone helpers
│   └── index.ts
```

### Events Package
```
packages/events/
├── src/
│   ├── publisher.ts     # RabbitMQ publisher
│   ├── consumer.ts      # RabbitMQ consumer
│   ├── types.ts         # CloudEvents types
│   ├── events/          # Event definitions per service
│   └── index.ts
```

### Backend Lib (service layer)
```
apps/web/src/lib/
├── auth/
│   ├── jwt.ts           # JWT sign/verify
│   ├── middleware.ts     # Auth middleware (withAuth, withRole)
│   ├── rbac.ts          # Permission checking
│   └── oauth/           # OAuth2 providers
├── services/            # Business logic layer
│   ├── booking.service.ts
│   ├── customer.service.ts
│   ├── payment.service.ts
│   ├── availability.service.ts
│   ├── notification.service.ts
│   ├── loyalty.service.ts
│   └── ...
├── integrations/        # External API clients
│   ├── comgate.ts
│   ├── qrcomat.ts
│   ├── zoom.ts
│   ├── google-meet.ts
│   ├── ms-teams.ts
│   └── openai.ts
├── resilience/          # Resilience patterns
│   ├── circuit-breaker.ts
│   ├── retry.ts
│   └── fallback.ts
├── websocket/           # Socket.io server
│   └── server.ts
└── middleware/          # Shared API middleware
    ├── validation.ts    # Zod validation middleware
    ├── rls.ts           # Set company_id for RLS
    ├── rate-limit.ts    # Rate limiting
    └── error-handler.ts # Global error handler
```

---

## 19 Services — Endpoint Summary

| # | Service | Endpoints | Priority |
|---|---|---|---|
| 1 | Auth | 13 (register, login, logout, refresh, verify-email, forgot-password, reset-password, mfa/setup, mfa/verify, oauth, me, change-password, profile) | P0 |
| 2 | Booking | 10 (CRUD, confirm, cancel, complete, no-show, upcoming, availability) | P0 |
| 3 | Customer | 7 (CRUD, bookings, import, export) | P0 |
| 4 | Service | 5 (CRUD + categories CRUD) | P0 |
| 5 | Employee | 5 (CRUD + working-hours) | P0 |
| 6 | Resource | 5 (CRUD + resource-types CRUD) | P1 |
| 7 | Payment | 8 (CRUD, refund, comgate/create, comgate/webhook, qrcomat/generate, qrcomat/webhook) | P0 |
| 8 | Coupon | 4 (CRUD, validate) | P1 |
| 9 | Gift Card | 4 (CRUD, redeem) | P1 |
| 10 | Loyalty | 8 (programs, cards, rewards, transactions CRUD) | P1 |
| 11 | Notification | 4 (CRUD, templates CRUD) | P1 |
| 12 | Review | 4 (CRUD, reply) | P2 |
| 13 | AI | 6 (no-show, clv, upselling, pricing, health-score, voice-booking) | P2 |
| 14 | Marketplace | 3 (CRUD) | P2 |
| 15 | Video | 3 (CRUD) | P2 |
| 16 | App | 3 (CRUD) | P3 |
| 17 | Automation | 4 (rules CRUD, logs) | P2 |
| 18 | Analytics | 5 (dashboard, revenue, bookings, export, audit) | P2 |
| 19 | Settings | 6 (company, working-hours, api-keys, webhooks, widget/config) | P1 |

---

## Domain Events (RabbitMQ)

### Events Published
```
booking.booking.created     → Notification, AI, Analytics, Automation
booking.booking.confirmed   → Notification, Analytics, Video
booking.booking.cancelled   → Notification, Payment, Loyalty, Analytics, Video
booking.booking.completed   → Notification, Loyalty, AI, Analytics, Automation
booking.booking.no_show     → Notification, AI, Analytics, Automation
payment.payment.initiated   → Analytics
payment.payment.completed   → Booking, Notification, Loyalty, Invoice, Analytics
payment.payment.failed      → Booking, Notification, Analytics
payment.payment.refunded    → Booking, Notification, Loyalty, Analytics
customer.customer.created   → Notification, Loyalty, Analytics, Automation
customer.customer.updated   → Analytics
customer.customer.deleted   → Loyalty, Analytics, GDPR
review.review.created       → Notification, Marketplace, Analytics, Automation
automation.rule.triggered   → Notification, Loyalty, AI
notification.notification.sent    → Analytics
notification.notification.opened  → AI, Analytics
notification.notification.clicked → AI, Analytics
```

---

## RBAC — Role Permissions

| Permission | Owner | Admin | Employee | Customer |
|---|---|---|---|---|
| bookings.create | Yes | Yes | Yes | Own only |
| bookings.read | All | All | Assigned | Own only |
| bookings.update | Yes | Yes | Assigned | No |
| bookings.delete | Yes | Yes | No | No |
| customers.* | Yes | Yes | Read only | No |
| services.* | Yes | Yes | Read only | Read only |
| employees.manage | Yes | Yes | No | No |
| payments.read | Yes | Yes | No | Own only |
| payments.refund | Yes | Yes | No | No |
| settings.manage | Yes | Yes | No | No |
| ai.use | Yes | Yes | No | No |
| loyalty.manage | Yes | Yes | No | No |

---

## SAGA Patterns

### Booking + Payment SAGA
```
1. POST /bookings → status=pending, emit booking.booking.created
2. POST /payments/comgate/create → redirect to Comgate
3. Comgate webhook → payment.payment.completed
4. Consumer: Booking Service listens → status=confirmed, emit booking.booking.confirmed
5. Consumer: Notification → send confirmation email (retry on failure, no rollback)
6. Consumer: Loyalty → add points (retry on failure, no rollback)

COMPENSATION:
- If payment fails → booking.status=cancelled, emit booking.booking.cancelled
- If booking expires (30 min) → auto-cancel, refund if partial payment
```

---

## Phase-by-Phase Tasks

### Phase 1: Setup
- [ ] Initialize `apps/web` (Next.js 14)
- [ ] Initialize `packages/shared` (types, schemas, utils)
- [ ] Initialize `packages/events` (RabbitMQ helpers)
- [ ] Set up error handling utilities
- [ ] Set up Zod validation middleware

### Phase 3: Auth & Core (P0)
- [ ] JWT authentication (sign, verify, refresh)
- [ ] Auth middleware (`withAuth`, `withRole`, `withPermission`)
- [ ] RLS middleware (set `app.current_company_id`)
- [ ] Register, Login, Logout endpoints
- [ ] Email verification, Password reset
- [ ] MFA setup & verification
- [ ] OAuth2 (Google, Facebook, Apple)
- [ ] Customer CRUD
- [ ] Service & Category CRUD
- [ ] Employee CRUD + Working Hours
- [ ] Resource CRUD

### Phase 5: Booking MVP (P0)
- [ ] Availability engine (slot calculation, overlap detection)
- [ ] Booking CRUD with double-booking prevention
- [ ] Booking status transitions (confirm, cancel, complete, no-show)
- [ ] RabbitMQ event publishing
- [ ] WebSocket notifications (booking:created, booking:updated)

### Phase 6: Payments (P0)
- [ ] Comgate API integration (create payment, handle webhook)
- [ ] QRcomat integration (generate QR, handle webhook)
- [ ] Payment SAGA (booking ↔ payment flow)
- [ ] Invoice generation
- [ ] Webhook signature verification

### Phase 7: Notifications (P1)
- [ ] Notification service (email via SMTP, SMS via Twilio)
- [ ] Template engine (Handlebars)
- [ ] RabbitMQ event consumers
- [ ] Automation engine (rule evaluation, action execution)

### Phase 8: CRM & Marketing (P1)
- [ ] Coupon CRUD & validation
- [ ] Gift card CRUD & redemption
- [ ] Customer import/export (CSV)
- [ ] Customer tagging

### Phase 9: Loyalty (P1)
- [ ] Loyalty program CRUD
- [ ] Points earning on booking completion
- [ ] Points redemption
- [ ] Tier system

### Phase 10-11: AI (P2)
- [ ] Circuit breaker for AI service
- [ ] Fallback values when AI unavailable
- [ ] No-show prediction endpoint
- [ ] CLV prediction endpoint
- [ ] Upselling recommendations
- [ ] Dynamic pricing

### Phase 12: Advanced (P2-P3)
- [ ] Review system
- [ ] Marketplace listing
- [ ] Widget config API
- [ ] Video meeting integration
- [ ] Analytics dashboard data

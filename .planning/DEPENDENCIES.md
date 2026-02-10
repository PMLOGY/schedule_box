# ScheduleBox — Cross-Segment Dependencies & Contracts

This document defines the **interfaces between segments** so each terminal can work independently while staying compatible.

---

## 1. Database ↔ Backend Contract

### Drizzle Schema Location
```
packages/database/src/schema/
├── auth.ts          # companies, users, roles, permissions, refresh_tokens, api_keys
├── customers.ts     # customers, tags, customer_tags
├── services.ts      # services, service_categories, service_resources
├── employees.ts     # employees, employee_services, working_hours, working_hours_overrides
├── resources.ts     # resources, resource_types
├── bookings.ts      # bookings, booking_resources, availability_slots
├── payments.ts      # payments, invoices
├── coupons.ts       # coupons, coupon_usage
├── gift-cards.ts    # gift_cards, gift_card_transactions
├── loyalty.ts       # loyalty_programs, loyalty_tiers, loyalty_cards, loyalty_transactions, rewards
├── notifications.ts # notifications, notification_templates
├── reviews.ts       # reviews
├── ai.ts            # ai_predictions, ai_model_metrics
├── marketplace.ts   # marketplace_listings
├── video.ts         # video_meetings
├── apps.ts          # whitelabel_apps
├── automation.ts    # automation_rules, automation_logs
├── analytics.ts     # analytics_events, audit_logs, competitor_data
└── index.ts         # Re-exports all schemas
```

### Naming Conventions
- Table names: snake_case, plural (`bookings`, `loyalty_cards`)
- Column names: snake_case (`company_id`, `created_at`)
- Drizzle schema exports: camelCase (`bookingsTable`, `loyaltyCardsTable`)
- Relation exports: camelCase (`bookingsRelations`)

### Every Table MUST Have
```typescript
{
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  companyId: integer('company_id').notNull().references(() => companiesTable.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}
```
Exception: `companies` table itself doesn't have `companyId`. Lookup tables (`roles`, `permissions`) don't have `companyId`.

---

## 2. Backend ↔ Frontend Contract

### API Response Format
```typescript
// Success (single item)
{ data: T }

// Success (list)
{ data: T[], meta: { total: number, page: number, limit: number, totalPages: number } }

// Error
{ error: string, code: string, message: string, details?: Record<string, string[]> }
```

### API Base URL
- Development: `http://localhost:3000/api/v1`
- All endpoints prefixed with `/api/v1/`

### Authentication Header
```
Authorization: Bearer <jwt_access_token>
```

### Shared Types Location
```
packages/shared/src/types/
├── auth.ts          # User, Company, LoginRequest, RegisterRequest, etc.
├── booking.ts       # Booking, BookingCreate, BookingUpdate, AvailabilitySlot, etc.
├── customer.ts      # Customer, CustomerCreate, CustomerFilters, etc.
├── service.ts       # Service, ServiceCategory, etc.
├── employee.ts      # Employee, WorkingHours, etc.
├── payment.ts       # Payment, Invoice, ComgatePayment, etc.
├── common.ts        # PaginatedResponse, ApiError, SortDirection, etc.
└── index.ts
```

### Shared Zod Schemas Location
```
packages/shared/src/schemas/
├── auth.ts          # registerSchema, loginSchema, etc.
├── booking.ts       # bookingCreateSchema, etc.
├── customer.ts      # customerCreateSchema, etc.
└── index.ts
```

---

## 3. Backend ↔ Events Contract

### Event Bus Location
```
packages/events/src/
├── types.ts         # Event type definitions (CloudEvents format)
├── publisher.ts     # RabbitMQ publisher utility
├── consumer.ts      # RabbitMQ consumer utility
├── events/
│   ├── booking.ts   # booking.booking.created, .confirmed, .cancelled, .completed, .no_show
│   ├── payment.ts   # payment.payment.initiated, .completed, .failed, .refunded
│   ├── customer.ts  # customer.customer.created, .updated, .deleted
│   ├── review.ts    # review.review.created
│   ├── automation.ts # automation.rule.triggered
│   └── notification.ts # notification.notification.sent, .opened, .clicked
└── index.ts
```

### Event Format (CloudEvents)
```typescript
interface DomainEvent<T> {
  specversion: '1.0';
  id: string;           // UUID v4
  source: string;       // 'schedulebox/{service-name}'
  type: string;         // '{service}.{entity}.{action}'
  time: string;         // ISO 8601
  datacontenttype: 'application/json';
  data: T;
}
```

### Exchange & Routing
- Exchange: `schedulebox.events` (topic)
- Routing key: `{service}.{entity}.{action}`
- DLQ Exchange: `schedulebox.dlq`
- Retry: 3 attempts with exponential backoff, then DLQ

---

## 4. Frontend ↔ DevOps Contract

### Build & Serve
- Dev: `pnpm dev` → localhost:3000
- Build: `pnpm build` → `.next/` output
- Test: `pnpm test` (unit), `pnpm test:e2e` (Playwright)

### Environment Variables (Frontend-relevant)
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_WIDGET_URL=http://localhost:3001
NEXT_PUBLIC_SENTRY_DSN=...
```

---

## 5. Execution Order & Dependencies

### Phase 1 (Parallel — All Segments)
```
DATABASE: Init Drizzle, create schemas     ─┐
BACKEND:  Init Next.js, shared packages     ├── Can work in parallel
FRONTEND: Init Next.js app, design system   │   (no dependencies yet)
DEVOPS:   Docker Compose, CI/CD skeleton   ─┘
```

### Phase 2 (Sequential Dependencies)
```
DATABASE creates schemas → BACKEND imports schemas for API routes
BACKEND defines API types → FRONTEND imports types for API calls
DEVOPS provides Docker env → ALL segments use for local development
```

### Sync Points (Segments Must Coordinate)
1. **After DATABASE Phase 2:** Backend can start implementing services
2. **After BACKEND Phase 3 (Auth):** Frontend can implement auth pages
3. **After BACKEND Phase 5 (Booking API):** Frontend can implement booking flow
4. **After all Phase 1:** DevOps integrates everything in Docker Compose

---

## 6. Package Manager & Monorepo

### Package Manager: pnpm
### Workspace Structure
```json
// pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

### Shared Package Imports
```typescript
// From any app/service:
import { bookingsTable } from '@schedulebox/database';
import { BookingCreate, ApiError } from '@schedulebox/shared';
import { publishEvent } from '@schedulebox/events';
import { Button, Input } from '@schedulebox/ui';
```

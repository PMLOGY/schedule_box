# Codebase Structure

**Analysis Date:** 2026-02-10

## Directory Layout

```
schedulebox/
├── apps/
│   └── web/                              # Next.js 14 (App Router) frontend + API routes
│       ├── app/
│       │   ├── (auth)/                   # Auth pages: login, register, password reset
│       │   ├── (dashboard)/              # Protected routes: bookings, customers, services, etc.
│       │   ├── api/v1/                   # RESTful API routes (Next.js route handlers)
│       │   │   ├── auth/
│       │   │   ├── bookings/
│       │   │   ├── customers/
│       │   │   ├── services/
│       │   │   ├── employees/
│       │   │   ├── resources/
│       │   │   ├── payments/
│       │   │   ├── coupons/
│       │   │   ├── gift-cards/
│       │   │   ├── loyalty/
│       │   │   ├── notifications/
│       │   │   ├── reviews/
│       │   │   ├── ai/
│       │   │   ├── marketplace/
│       │   │   ├── video/
│       │   │   ├── automation/
│       │   │   ├── analytics/
│       │   │   ├── webhooks/             # Payment gateway webhooks (Comgate, QRcomat)
│       │   │   └── settings/
│       │   ├── public/                   # Public pages: home, marketplace, pricing
│       │   ├── layout.tsx                # Root layout with providers
│       │   └── globals.css
│       ├── components/
│       │   ├── auth/                     # LoginForm, RegisterForm, etc.
│       │   ├── booking/                  # BookingCalendar, BookingList, etc.
│       │   ├── customer/                 # CustomerForm, CustomerTable, etc.
│       │   ├── common/                   # Navbar, Footer, Sidebar, ErrorBoundary
│       │   └── ui/                       # Re-exports from @schedulebox/ui
│       ├── lib/
│       │   ├── api.ts                    # Fetch wrapper with auth + error handling
│       │   ├── auth.ts                   # JWT parsing, token management
│       │   └── utils.ts                  # Date formatting, string utils
│       ├── hooks/
│       │   ├── useAuth.ts                # Auth context hook
│       │   ├── useBookings.ts            # Zustand + React Query hook
│       │   └── useCompany.ts             # Current tenant context
│       ├── store/
│       │   └── index.ts                  # Zustand global state (auth, ui, filters)
│       ├── next.config.js
│       ├── tsconfig.json
│       └── tailwind.config.ts
│
├── packages/
│   ├── database/                         # Drizzle ORM schemas + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── auth.ts               # companies, users, roles, permissions, api_keys
│   │   │   │   ├── customers.ts          # customers, tags, customer_tags
│   │   │   │   ├── services.ts           # services, service_categories, service_resources
│   │   │   │   ├── employees.ts          # employees, employee_services, working_hours
│   │   │   │   ├── resources.ts          # resources, resource_types
│   │   │   │   ├── bookings.ts           # bookings, booking_resources, availability_slots
│   │   │   │   ├── payments.ts           # payments, invoices
│   │   │   │   ├── coupons.ts            # coupons, coupon_usage
│   │   │   │   ├── gift-cards.ts         # gift_cards, gift_card_transactions
│   │   │   │   ├── loyalty.ts            # loyalty_programs, loyalty_cards, loyalty_transactions, rewards
│   │   │   │   ├── notifications.ts      # notifications, notification_templates
│   │   │   │   ├── reviews.ts            # reviews
│   │   │   │   ├── ai.ts                 # ai_predictions, ai_model_metrics
│   │   │   │   ├── marketplace.ts        # marketplace_listings
│   │   │   │   ├── video.ts              # video_meetings
│   │   │   │   ├── apps.ts               # whitelabel_apps
│   │   │   │   ├── automation.ts         # automation_rules, automation_logs
│   │   │   │   ├── analytics.ts          # analytics_events, audit_logs, competitor_data
│   │   │   │   └── index.ts              # Re-exports all schemas
│   │   │   ├── drizzle.config.ts         # Drizzle config (database URL, migrations dir)
│   │   │   └── db.ts                     # PostgreSQL client instance
│   │   ├── drizzle/                      # SQL migration files (auto-generated + manual)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/                           # Shared types, utilities, Zod schemas
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── auth.ts               # User, Company, JWT payload, OAuth provider
│   │   │   │   ├── booking.ts            # Booking, BookingCreate, AvailabilitySlot, AvailabilityRequest
│   │   │   │   ├── customer.ts           # Customer, CustomerCreate, CustomerFilters
│   │   │   │   ├── service.ts            # Service, ServiceCategory, ServiceCreate
│   │   │   │   ├── employee.ts           # Employee, WorkingHours, EmployeeCreate
│   │   │   │   ├── payment.ts            # Payment, Invoice, ComgateWebhook, QRcomatWebhook
│   │   │   │   ├── common.ts             # PaginatedResponse, ApiError, SortDirection, FilterOperator
│   │   │   │   └── index.ts
│   │   │   ├── schemas/
│   │   │   │   ├── auth.ts               # registerSchema, loginSchema, refreshTokenSchema
│   │   │   │   ├── booking.ts            # bookingCreateSchema, bookingUpdateSchema, availabilityRequestSchema
│   │   │   │   ├── customer.ts           # customerCreateSchema, customerUpdateSchema
│   │   │   │   ├── payment.ts            # comgateWebhookSchema, qrcomatWebhookSchema
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── logging.ts            # structuredLog() function
│   │   │   │   ├── errors.ts             # createApiError() function
│   │   │   │   ├── date.ts               # formatDate(), isoToDate(), etc.
│   │   │   │   ├── validation.ts         # Zod utilities
│   │   │   │   └── crypto.ts             # hashPassword(), verifyPassword(), generateToken()
│   │   │   ├── constants/
│   │   │   │   ├── errors.ts             # Error codes and messages
│   │   │   │   ├── roles.ts              # ROLES enum, PERMISSIONS map
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── events/                           # RabbitMQ event definitions & helpers
│   │   ├── src/
│   │   │   ├── types.ts                  # DomainEvent<T>, CloudEvents interface
│   │   │   ├── publisher.ts              # publishEvent() utility (RabbitMQ producer)
│   │   │   ├── consumer.ts               # createConsumer() utility (RabbitMQ consumer setup)
│   │   │   ├── events/
│   │   │   │   ├── booking.ts            # BookingCreated, BookingConfirmed, BookingCancelled, etc.
│   │   │   │   ├── payment.ts            # PaymentInitiated, PaymentCompleted, PaymentFailed, etc.
│   │   │   │   ├── customer.ts           # CustomerCreated, CustomerUpdated, CustomerDeleted
│   │   │   │   ├── review.ts             # ReviewCreated
│   │   │   │   ├── automation.ts         # AutomationRuleTriggered
│   │   │   │   ├── notification.ts       # NotificationSent, NotificationOpened, NotificationClicked
│   │   │   │   └── index.ts              # Re-exports
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                               # Shared UI components (shadcn/ui based)
│       ├── src/
│       │   ├── components/
│       │   │   ├── button.tsx            # Button component
│       │   │   ├── input.tsx             # Input component
│       │   │   ├── dialog.tsx            # Dialog/Modal component
│       │   │   ├── table.tsx             # Table component
│       │   │   ├── form.tsx              # Form wrapper
│       │   │   ├── select.tsx            # Select component
│       │   │   ├── calendar.tsx          # Calendar/DatePicker
│       │   │   ├── card.tsx              # Card component
│       │   │   ├── alert.tsx             # Alert/Toast
│       │   │   └── index.ts              # Re-exports
│       │   ├── hooks/
│       │   │   ├── useToast.ts           # Toast notification hook
│       │   │   └── index.ts
│       │   ├── styles/
│       │   │   └── globals.css           # Tailwind CSS setup
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── services/                             # Standalone microservices (Node.js)
│   ├── notification-service/            # Email, SMS, push notifications
│   │   ├── src/
│   │   │   ├── consumers/
│   │   │   │   ├── booking.consumer.ts   # Listens to booking.* events
│   │   │   │   ├── payment.consumer.ts   # Listens to payment.* events
│   │   │   │   ├── review.consumer.ts    # Listens to review.created events
│   │   │   │   └── index.ts
│   │   │   ├── handlers/
│   │   │   │   ├── email.handler.ts      # SMTP integration
│   │   │   │   ├── sms.handler.ts        # SMS provider integration
│   │   │   │   └── push.handler.ts       # Push notification logic
│   │   │   ├── templates/
│   │   │   │   ├── booking-confirmation.hbs
│   │   │   │   ├── payment-receipt.hbs
│   │   │   │   └── reminder.hbs
│   │   │   ├── queue.ts                  # RabbitMQ setup
│   │   │   ├── server.ts                 # Express server (health checks)
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ai-service/                       # ML predictions (Python)
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── no_show_predictor.py
│   │   │   │   ├── clv_predictor.py
│   │   │   │   ├── upsell_recommender.py
│   │   │   │   ├── pricing_optimizer.py
│   │   │   │   ├── capacity_optimizer.py
│   │   │   │   ├── health_score.py
│   │   │   │   └── reminder_timing.py
│   │   │   ├── jobs/
│   │   │   │   ├── train.job.py           # Model retraining (daily)
│   │   │   │   ├── predict.job.py         # Batch predictions (hourly)
│   │   │   │   └── competitor_intel.job.py # Competitor scraping
│   │   │   ├── api/
│   │   │   │   └── predictions.api.py     # REST endpoint for inference
│   │   │   ├── data/
│   │   │   │   ├── pipeline.py            # PostgreSQL → numpy
│   │   │   │   └── utils.py
│   │   │   ├── requirements.txt
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── kubernetes/
│   │       ├── deployment.yaml            # Kubernetes Deployment
│   │       └── cronjob.yaml               # CronJob for training/inference
│   │
│   └── [future-services]/                # Template for additional microservices
│
├── docker/                               # Docker configuration files
│   ├── docker-compose.yml                # Local development stack (PostgreSQL, Redis, RabbitMQ, all services)
│   ├── docker-compose.prod.yml           # Production-like setup
│   ├── Dockerfile.web                    # Frontend/API multi-stage build
│   ├── Dockerfile.notification           # Notification service
│   ├── Dockerfile.ai                     # AI service
│   ├── nginx.conf                        # NGINX config for API gateway
│   ├── postgres.init.sql                 # PostgreSQL initialization (RLS policies)
│   └── rabbitmq.init.sh                  # RabbitMQ initialization (exchanges, queues)
│
├── k8s/                                  # Kubernetes manifests
│   ├── namespace.yaml
│   ├── secrets.yaml                      # ConfigMaps and Secrets (excluded from git)
│   ├── postgres/
│   │   ├── statefulset.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── redis/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── rabbitmq/
│   │   ├── statefulset.yaml
│   │   └── service.yaml
│   ├── web/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   └── hpa.yaml                      # Horizontal Pod Autoscaler
│   ├── notification-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── ai-service/
│   │   ├── deployment.yaml
│   │   └── cronjob.yaml
│   ├── monitoring/
│   │   ├── prometheus.yaml
│   │   ├── grafana.yaml
│   │   └── loki.yaml
│   └── kustomization.yaml
│
├── .github/
│   └── workflows/
│       ├── test.yml                      # Run tests on PR
│       ├── build.yml                     # Build Docker images
│       ├── deploy-staging.yml            # Deploy to staging on merge to staging branch
│       └── deploy-prod.yml               # Deploy to production on tag
│
├── .planning/                            # GSD planning documentation
│   ├── PROJECT.md                        # Project context and goals
│   ├── STATE.md                          # Current phase and status
│   ├── ROADMAP.md                        # Feature roadmap and milestones
│   ├── REQUIREMENTS.md                   # Functional requirements
│   ├── DEPENDENCIES.md                   # Cross-segment contracts
│   ├── codebase/                         # Codebase analysis documents
│   │   └── ARCHITECTURE.md               # This document
│   ├── segments/                         # Segment-specific instructions
│   │   ├── SEGMENT-DATABASE.md
│   │   ├── SEGMENT-BACKEND.md
│   │   ├── SEGMENT-FRONTEND.md
│   │   └── SEGMENT-DEVOPS.md
│   └── phases/                           # Phase execution plans
│       └── [phase-specific]/
│
├── pnpm-workspace.yaml                   # pnpm monorepo config
├── package.json                          # Root workspace package
├── tsconfig.json                         # Root TypeScript config
├── .gitignore
├── .env.example                          # Example environment variables (secrets excluded)
├── CLAUDE.md                             # Project instructions (this repo)
├── schedulebox_complete_documentation.md # Single source of truth (9,785 lines, Czech)
└── README.md                             # Quick start guide
```

## Directory Purposes

**apps/web:**
- Purpose: Monolithic Next.js 14 application serving both frontend UI and backend API routes
- Contains: React components, page routes, API routes, Zustand store, React Query hooks, Tailwind styling
- Key files: `apps/web/app/layout.tsx` (root), `apps/web/app/api/v1/` (all API routes)
- API routes use Node.js runtime: `apps/web/app/api/v1/bookings/route.ts` implements `GET`, `POST`, etc.

**packages/database:**
- Purpose: Drizzle ORM schema definitions and migrations
- Contains: TypeScript schema files (one per domain), relation definitions, migration SQL files
- Key files: `packages/database/src/schema/index.ts` (exports all tables), `packages/database/drizzle/` (migration history)
- Imported by: All services as `import { bookingsTable } from '@schedulebox/database'`

**packages/shared:**
- Purpose: Type definitions and Zod validation schemas shared across services
- Contains: TypeScript interfaces, Zod schemas, utility functions, constants
- Key files: `packages/shared/src/types/booking.ts`, `packages/shared/src/schemas/booking.ts`
- Imported by: Frontend (for type-safe API calls), Backend (for request validation), Services (for event payloads)

**packages/events:**
- Purpose: Event definitions and RabbitMQ utilities
- Contains: TypeScript event type definitions, publisher/consumer helpers, routing logic
- Key files: `packages/events/src/events/` (event type definitions), `packages/events/src/publisher.ts` (publish utility)
- Used by: Any service that needs to publish/consume domain events

**packages/ui:**
- Purpose: Reusable UI component library (shadcn/ui wrappers)
- Contains: Pre-styled React components, hooks for UI state (toast, dialog)
- Key files: `packages/ui/src/components/` (individual component files)
- Imported by: `apps/web/components/` via `import { Button } from '@schedulebox/ui'`

**services/notification-service:**
- Purpose: Standalone microservice for sending notifications
- Contains: RabbitMQ consumers (listening to events), notification handlers (SMTP, SMS), email templates
- Key files: `services/notification-service/src/consumers/` (event listeners)
- Deployment: Docker container, can be scaled independently

**services/ai-service:**
- Purpose: Standalone Python microservice for ML predictions
- Contains: Scikit-learn/XGBoost models, data pipeline, scheduled jobs, REST API endpoint
- Key files: `services/ai-service/src/models/` (model files), `services/ai-service/src/jobs/` (training/inference jobs)
- Deployment: Docker container (Python 3.12), Kubernetes CronJob for scheduled execution

**docker/:**
- Purpose: Docker and containerization configuration
- Contains: Docker Compose files, multi-stage Dockerfiles, NGINX config, initialization scripts
- Key files: `docker/docker-compose.yml` (local dev), `docker/Dockerfile.web` (build frontend + API)

**k8s/:**
- Purpose: Kubernetes manifests for production deployment
- Contains: Deployments, Services, StatefulSets, ConfigMaps, Secrets, Ingress, monitoring, autoscaling
- Key files: `k8s/web/deployment.yaml` (main app), `k8s/postgres/statefulset.yaml` (database)

**.github/workflows/:**
- Purpose: CI/CD pipeline definitions
- Contains: GitHub Actions workflows for testing, building, and deploying
- Key files: `test.yml` (runs on PR), `deploy-staging.yml` (deploys on merge), `deploy-prod.yml` (deploys on tag)

**.planning/:**
- Purpose: GSD project management and segment-specific instructions
- Contains: Project context, dependency contracts, phase plans, segment guides
- Key files: `DEPENDENCIES.md` (cross-segment contracts), `segments/SEGMENT-*.md` (segment instructions)

## Key File Locations

**Entry Points:**

- `apps/web/app/layout.tsx` - Root React layout, auth provider setup, Zustand initialization
- `apps/web/app/page.tsx` - Public home page
- `apps/web/app/(dashboard)/layout.tsx` - Protected dashboard layout with sidebar
- `apps/web/app/api/v1/route.ts` - Optional API root documentation
- `services/notification-service/src/index.ts` - Notification service entry point

**Configuration:**

- `apps/web/next.config.js` - Next.js build config (API routes, redirects, rewrites)
- `apps/web/tsconfig.json` - Frontend TypeScript config
- `packages/database/drizzle.config.ts` - Drizzle database config (PostgreSQL URL)
- `docker/docker-compose.yml` - Local development environment
- `.env.example` - Template for required environment variables

**Core Logic:**

- `apps/web/app/api/v1/bookings/route.ts` - Booking CRUD operations + availability logic
- `apps/web/app/api/v1/auth/register/route.ts` - User registration with email verification
- `apps/web/app/api/v1/auth/login/route.ts` - JWT token generation
- `apps/web/app/api/v1/webhooks/payments/[gateway]/route.ts` - Webhook handlers for payment gateways
- `services/notification-service/src/consumers/booking.consumer.ts` - RabbitMQ listener for booking events
- `services/ai-service/src/jobs/predict.job.py` - Batch prediction job for no-show, CLV, etc.

**Testing:**

- `apps/web/__tests__/` - Unit tests for components, hooks, utilities
- `apps/web/e2e/` - Playwright E2E tests
- `services/notification-service/__tests__/` - Service unit tests
- `services/ai-service/tests/` - Python pytest tests

**Styling & Design:**

- `packages/ui/src/styles/globals.css` - Tailwind CSS configuration and globals
- `apps/web/app/globals.css` - Application-specific Tailwind overrides
- `apps/web/tailwind.config.ts` - Tailwind theme customization

**State Management:**

- `apps/web/store/index.ts` - Zustand global state (auth, ui, filters)
- `apps/web/hooks/useAuth.ts` - Custom hook for auth context
- `apps/web/hooks/useBookings.ts` - Custom hook combining Zustand + React Query for bookings

## Naming Conventions

**Files:**

- Routes: `route.ts` (Next.js app directory convention)
- Components: `ComponentName.tsx` (PascalCase)
- Utilities: `utilityName.ts` (camelCase)
- Hooks: `useHookName.ts` (camelCase with `use` prefix)
- Tests: `ComponentName.test.tsx` or `ComponentName.spec.tsx` (co-located with source)
- Database schemas: `entityName.ts` (camelCase, singular or plural matching table names)

**Directories:**

- Components: `components/feature/` (grouped by feature, not type)
- Routes: `app/(group)/page.tsx` (route groups in parentheses, e.g. `(auth)`, `(dashboard)`)
- Database schemas: `packages/database/src/schema/` (one file per domain)
- Tests: `__tests__/` at root of each package/app
- Utilities: `lib/` or `utils/`
- Standalone services: `services/{service-name}/` (kebab-case)

**TypeScript/JavaScript:**

- Types/interfaces: `PascalCase` (e.g., `User`, `Booking`, `ApiResponse`)
- Functions: `camelCase` (e.g., `getUserById`, `createBooking`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_BOOKING_DURATION`, `API_BASE_URL`)
- Variables: `camelCase` (e.g., `companyId`, `isLoading`)
- Enums: `PascalCase` for enum names, `PascalCase` for members (e.g., `BookingStatus.PENDING`)

**Database:**

- Tables: `snake_case`, plural (e.g., `bookings`, `loyalty_cards`)
- Columns: `snake_case` (e.g., `company_id`, `created_at`)
- Drizzle schema exports: `camelCase` + `Table` suffix (e.g., `bookingsTable`, `loyaltyCardsTable`)
- Relations: `camelCase` + `Relations` suffix (e.g., `bookingsRelations`)

**API/Routes:**

- Endpoints: `kebab-case` path segments (e.g., `/api/v1/gift-cards/{id}`)
- Query parameters: `camelCase` (e.g., `?companyId=1&page=2`)
- Request body properties: `camelCase`
- Response wrapper: `{ data: T }` or `{ data: T[], meta: { total, page, limit } }`

## Where to Add New Code

**New Feature (e.g., new payment method):**

1. **Database:** Add table to `packages/database/src/schema/payments.ts` (or create new file if separate domain)
2. **Shared Types:** Add TypeScript types to `packages/shared/src/types/payment.ts`
3. **Shared Schemas:** Add Zod schema to `packages/shared/src/schemas/payment.ts`
4. **API Route:** Create `apps/web/app/api/v1/payments/[method]/route.ts`
5. **Components:** Create form/display in `apps/web/components/payment/`
6. **Events:** If service communication needed, add event type to `packages/events/src/events/payment.ts`
7. **Consumer:** If external service involved, create consumer in `services/notification-service/src/consumers/` or new service

**New Component/Module (e.g., calendar picker):**

1. Reusable UI component → `packages/ui/src/components/calendar.tsx`
2. Feature-specific wrapper → `apps/web/components/booking/BookingCalendar.tsx`
3. Hook for state → `apps/web/hooks/useCalendarState.ts`
4. Export from index → `packages/ui/src/components/index.ts`

**Utilities/Helpers:**

- Frontend utilities: `apps/web/lib/` (e.g., `apps/web/lib/dateUtils.ts`)
- Shared across packages: `packages/shared/src/utils/` (e.g., `packages/shared/src/utils/logging.ts`)
- Schema validation: `packages/shared/src/schemas/` (export from `schemas/index.ts`)

**New Microservice:**

1. Create directory: `services/my-service/`
2. Copy structure from `services/notification-service/` or `services/ai-service/`
3. Define event consumers in `src/consumers/`
4. Add Docker config: `services/my-service/Dockerfile`
5. Add Kubernetes manifests: `k8s/my-service/` (deployment, service, hpa)
6. Add CI/CD: `.github/workflows/deploy-my-service.yml`
7. Update `docker-compose.yml` with service definition
8. Update `packages/events/src/events/` if new event types

## Special Directories

**docker/:**
- Purpose: Containerization and local development
- Generated: No (manually maintained)
- Committed: Yes
- Content: Dockerfiles, Docker Compose, initialization scripts

**k8s/:**
- Purpose: Production Kubernetes deployment
- Generated: No (manually maintained, some values templated with Kustomize)
- Committed: Yes
- Content: Deployment manifests, service configs, autoscaling, monitoring

**.planning/:**
- Purpose: Project planning and segment instructions
- Generated: Partially (phase execution plans auto-generated, but segment docs manually written)
- Committed: Yes
- Content: Project context, roadmap, dependency contracts, phase instructions

**apps/web/.next/:**
- Purpose: Next.js build output
- Generated: Yes (by `pnpm build`)
- Committed: No
- Content: Compiled JavaScript, static assets, server functions

**node_modules/, dist/, build/:**
- Purpose: Package dependencies and build artifacts
- Generated: Yes (by package managers)
- Committed: No
- Content: Third-party packages, compiled output

---

*Structure analysis: 2026-02-10*

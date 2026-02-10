# Technology Stack

**Analysis Date:** 2026-02-10

## Languages

**Primary:**
- TypeScript - Latest - Frontend (Next.js), backend (API routes, microservices), shared packages
- JavaScript - Latest - Configuration files, build scripts, package.json

**Secondary:**
- Python 3.12 - AI/ML services for predictive models (scikit-learn, XGBoost)
- SQL - PostgreSQL schema, migrations, RLS policies

## Runtime

**Environment:**
- Node.js 20 LTS - Backend runtime for Next.js API routes and microservices

**Package Manager:**
- pnpm - Monorepo workspace management
- Lockfile: `pnpm-lock.yaml` (to be created in Phase 1)

## Frameworks

**Core:**
- Next.js 14 (App Router) - Frontend + API routes, SSR, static generation
  - Location: `apps/web/`
  - Handles both frontend UI and API route endpoints (`/api/v1/*`)

**State Management:**
- Zustand - Global client state (UI state, user preferences)
- React Query / TanStack Query - Server state, API caching, synchronization
  - Package: `@tanstack/react-query`

**UI & Styling:**
- Tailwind CSS - Utility-first CSS framework
- shadcn/ui - Headless component library on top of Tailwind
  - Location: `packages/ui/` - Shared component exports

**Database:**
- Drizzle ORM - Type-safe SQL query builder and migrations
  - Location: `packages/database/`
  - Supports PostgreSQL 16
  - Migrations in `packages/database/src/migrations/`

**Testing:**
- Vitest - Unit and integration tests (faster than Jest)
- Playwright - E2E testing
- Config: `vitest.config.ts` (root level)

**Build/Dev:**
- esbuild - Fast bundler for services
- tsx - TypeScript execution for scripts
- Turbo - Monorepo task orchestration (optional but recommended)

## Key Dependencies

**Critical:**
- `next`: 14.x - Web framework
- `react`: 18.x - UI library
- `typescript`: 5.x - Type safety
- `zod`: Latest - Runtime schema validation (every API input)
  - Location: `packages/shared/src/schemas/`
  - Used for: request validation, API contracts
- `drizzle-orm`: Latest - Database ORM
- `pg`: Latest - PostgreSQL client
- `jsonwebtoken` (or similar) - JWT token generation/verification
- `bcryptjs` - Password hashing

**Infrastructure:**
- `amqplib` - RabbitMQ client for event publishing/consuming
- `redis` - Redis client for caching (ioredis recommended)
- `axios` - HTTP client for calling external APIs (Comgate, QRcomat, Zoom, OpenAI)
- `dotenv` - Environment variable loading
- `pino` or `winston` - Structured logging
- `@sentry/node` - Error tracking and monitoring

**AI/ML:**
- `scikit-learn` (Python) - Machine learning library
- `xgboost` (Python) - Gradient boosting for predictions
- `openai` (Python/Node.js SDK) - LLM inference via OpenAI API

**Integrations:**
- Payment: Comgate API client (custom or HTTP-based)
- Payment: QRcomat API client (custom or HTTP-based)
- Video: Zoom SDK or simple HTTP calls
- Video: Google Meet, MS Teams API clients
- Notifications: SMTP (nodemailer or similar), SMS provider SDK

## Configuration

**Environment:**
- `.env.local` - Development secrets (not committed)
- `.env.example` - Template for required variables (committed)
- Environment variable loading: `process.env` (Node.js) + `NEXT_PUBLIC_*` prefix for browser-accessible vars
- Key configs required:
  - Database: `DATABASE_URL` (PostgreSQL connection string)
  - Redis: `REDIS_URL`
  - RabbitMQ: `RABBITMQ_URL`
  - Auth: `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - Payments: `COMGATE_API_KEY`, `COMGATE_MERCHANT_ID`, `QRCOMAT_API_KEY`
  - AI: `OPENAI_API_KEY`
  - Video: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, etc.
  - Notifications: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMS_API_KEY`
  - Monitoring: `SENTRY_DSN`
  - Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_WIDGET_URL`

**Build:**
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration (root and per-package)
- `.eslintrc.json` - ESLint configuration for code quality
- `.prettierrc` - Prettier code formatting
- `pnpm-workspace.yaml` - Monorepo workspace definition

## Platform Requirements

**Development:**
- Node.js 20 LTS
- pnpm 8+
- Docker and Docker Compose (for local PostgreSQL, Redis, RabbitMQ)
- PostgreSQL client tools (psql) for migrations
- Python 3.12 (for running AI services locally, optional)

**Production:**
- Deployment target: Kubernetes (K3s for staging, EKS/GKE for production)
- Container registry: Docker/OCI compatible (GitHub Container Registry or similar)
- PostgreSQL 16 managed database
- Redis 7 managed cache
- RabbitMQ 3.13 message broker
- Cloudflare R2 or S3-compatible object storage for files
- Load balancer with SSL/TLS termination

## Monorepo Structure

**Package Manager:** pnpm with workspaces

**Workspace Definition:** `pnpm-workspace.yaml`
```
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

**Shared Package Imports:**
```typescript
// From any app/service, use path aliases:
import { bookingsTable, companiesTable } from '@schedulebox/database';
import { BookingCreate, ApiError, User } from '@schedulebox/shared';
import { publishEvent, DomainEvent } from '@schedulebox/events';
import { Button, Input, Modal } from '@schedulebox/ui';
```

**Package Locations:**
- `packages/database/` - Drizzle ORM schemas, migrations, types
- `packages/shared/` - Shared types, Zod schemas, utility functions
- `packages/events/` - RabbitMQ event definitions, CloudEvents format, publisher/consumer helpers
- `packages/ui/` - shadcn/ui component re-exports
- `apps/web/` - Next.js 14 frontend + API routes
- `services/` - Standalone microservices (AI, notifications, etc.)

## Database Configuration

**Primary:** PostgreSQL 16
- Connection: `DATABASE_URL=postgresql://user:password@host:5432/schedulebox`
- SSL: Required in production
- Connection pooling: PgBouncer recommended (configured in Kubernetes)
- Timezone: Europe/Prague (enforced via TIMESTAMPTZ in all tables)

**Caching:** Redis 7
- Connection: `REDIS_URL=redis://host:6379`
- Used for: JWT token blacklist, session data, real-time features
- Data retention: Transient (no persistence required for v1)

**Message Queue:** RabbitMQ 3.13
- Connection: `RABBITMQ_URL=amqp://user:password@host:5672`
- Exchange: `schedulebox.events` (topic)
- DLQ Exchange: `schedulebox.dlq` (for failed messages)
- Retry policy: 3 attempts with exponential backoff before DLQ

## External Service Integrations

**Payment Processing:**
- Comgate (online/card payments)
  - API endpoint: https://http-api.comgate.cz/
  - Authentication: merchant ID + API key
  - Webhook for payment confirmations

- QRcomat (on-site QR code payments)
  - API for QR code generation
  - Authentication: API key
  - Fallback when online payment unavailable

**Video Conferencing:**
- Zoom SDK
- Google Meet API
- Microsoft Teams API
- Used for: Online service bookings (consultations, remote sessions)

**AI/ML Services:**
- OpenAI API (GPT-4 for follow-up generation, Whisper for STT)
- Local models via Python microservice (scikit-learn, XGBoost for predictions)

**Notifications:**
- SMTP for email (configured via env vars)
- SMS provider API (Twilio, Messagebird, or equivalent)
- Push notification service (Firebase Cloud Messaging or equivalent)

**Monitoring & Observability:**
- Sentry for error tracking
- Prometheus for metrics collection
- Grafana for dashboards and alerting
- Loki for log aggregation
- OpenTelemetry (optional) for distributed tracing

**Storage:**
- Cloudflare R2 or S3-compatible object storage for files, invoices, documents

---

*Stack analysis: 2026-02-10*

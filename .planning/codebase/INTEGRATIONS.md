# External Integrations

**Analysis Date:** 2026-02-10

## APIs & External Services

**Payment Processing:**
- Comgate - Online payment gateway (card payments via Comgate hosted page)
  - SDK/Client: HTTP API, no official SDK (use `axios`)
  - Auth: `COMGATE_MERCHANT_ID` and `COMGATE_API_KEY` environment variables
  - Endpoints: Payment creation, payment status checks
  - Webhook: Incoming payment status updates
  - Service location: `services/payment-service/` (or API routes in `apps/web/api/v1/payments/`)
  - Timeout: 15s, with fallback to pending state
  - Error handling: Circuit breaker pattern required

- QRcomat - On-site QR code payment generation
  - SDK/Client: HTTP API
  - Auth: `QRCOMAT_API_KEY` environment variable
  - Endpoints: QR code generation for in-person payments
  - Service location: `services/payment-service/` (or API routes in `apps/web/api/v1/payments/`)
  - Timeout: 10s
  - Error handling: Fallback to cash payment option

**Video Conferencing:**
- Zoom - Video meeting integration for online services
  - SDK/Client: Zoom SDK or REST API via `axios`
  - Auth: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` environment variables
  - Endpoints: Meeting creation, deletion, join URL generation
  - Service location: `services/video-service/` (or API routes in `apps/web/api/v1/video/`)
  - Used for: Online consultations, remote appointments
  - Timeout: 15s

- Google Meet - Alternative video conferencing
  - SDK/Client: Google Calendar API (meetings are created as calendar events)
  - Auth: OAuth 2.0 via Google Cloud credentials
  - Endpoints: Event creation with Meet link generation
  - Service location: `services/video-service/`
  - Used for: Alternative to Zoom for businesses with Google Workspace

- Microsoft Teams - Alternative video conferencing
  - SDK/Client: Microsoft Graph API via `axios`
  - Auth: OAuth 2.0 via Azure AD
  - Endpoints: Meeting creation, join link generation
  - Service location: `services/video-service/`
  - Used for: Alternative for businesses using Microsoft 365

**AI & LLM:**
- OpenAI API - GPT-4 for follow-up emails, Whisper for voice-to-text
  - SDK/Client: `openai` npm package or HTTP API via `axios`
  - Auth: `OPENAI_API_KEY` environment variable
  - Endpoints: Chat completions, speech-to-text
  - Service location: `services/ai-service/` (Python microservice recommended for ML)
  - Timeout: 30s
  - Error handling: Fallback to default templates when unavailable
  - Used for:
    - AI Follow-up Generator (personalized re-engagement emails)
    - Voice booking via phone (Whisper STT + NLU)
    - Customer insights generation

**Analytics & Monitoring:**
- Sentry - Error tracking and performance monitoring
  - SDK/Client: `@sentry/node` (backend), `@sentry/nextjs` (frontend)
  - Auth: `SENTRY_DSN` environment variable
  - Endpoints: Automatic error reporting to Sentry
  - Service location: Integration across all services
  - Used for: Capturing runtime errors, exceptions, performance metrics

## Data Storage

**Databases:**
- PostgreSQL 16 (Primary)
  - Connection: `DATABASE_URL` environment variable
  - Connection string format: `postgresql://user:password@host:5432/schedulebox`
  - Client: `pg` npm package (via Drizzle ORM)
  - SSL: Required in production
  - Timezone: Europe/Prague (all timestamps TIMESTAMPTZ)
  - Tables: 47 total (companies, users, bookings, customers, services, employees, resources, payments, notifications, reviews, loyalty, AI predictions, marketplace, video_meetings, etc.)
  - Location: `packages/database/src/schema/`

- Redis 7 (Caching & Sessions)
  - Connection: `REDIS_URL` environment variable
  - Connection string format: `redis://:password@host:6379`
  - Client: `ioredis` npm package (recommended)
  - Used for:
    - JWT token blacklist/refresh token storage
    - Session management
    - Real-time features (WebSocket support)
    - Rate limiting counters
    - Transient cache (not persistent)

**File Storage:**
- Cloudflare R2 (S3-compatible object storage)
  - Auth: `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME` environment variables
  - Client: `@aws-sdk/client-s3` or similar S3-compatible client
  - Used for:
    - Invoice PDF files
    - Company logos and images
    - Customer documents
    - White-label app assets
  - Fallback: Local filesystem in development

**Caching:**
- Redis 7 (as above)
- HTTP caching headers in Next.js responses for static content

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (no third-party OAuth provider required for core platform)
  - Implementation: JWT access tokens + refresh tokens
  - Access token lifetime: 15 minutes
  - Refresh token lifetime: 7 days (with rotation)
  - Secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET` environment variables
  - Storage (backend): Refresh tokens stored in PostgreSQL `refresh_tokens` table
  - Storage (frontend): Access token in memory, refresh token in secure HTTP-only cookie
  - Location: API routes in `apps/web/api/v1/auth/`

**OAuth2 Integrations (User Login):**
- Google OAuth 2.0
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` environment variables
  - Scope: Basic profile (email, name)
  - Used for: Social login (optional, users can also register with email/password)
  - Endpoint: `POST /api/v1/auth/google`

- Facebook OAuth 2.0
  - Auth: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` environment variables
  - Scope: email, public_profile
  - Used for: Social login
  - Endpoint: `POST /api/v1/auth/facebook`

- Apple OAuth 2.0
  - Auth: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` environment variables
  - Scope: email, name
  - Used for: Social login (primarily mobile)
  - Endpoint: `POST /api/v1/auth/apple`

**MFA (Multi-Factor Authentication):**
- TOTP (Time-based One-Time Password)
  - Library: `speakeasy` or `otplib` npm package
  - Backup codes: Generated and stored encrypted in database
  - Used for: Account security, recommended for owners
  - Endpoint: `POST /api/v1/auth/totp/setup`, `POST /api/v1/auth/totp/verify`

**API Keys:**
- Custom API key management for external integrations
  - Storage: `api_keys` table in PostgreSQL
  - Format: Hashed keys (not stored in plaintext)
  - Scopes: Permissions per key (read bookings, write bookings, etc.)
  - Endpoint: `GET/POST /api/v1/settings/api-keys`

## Notifications

**Email:**
- SMTP Server (configurable)
  - Auth: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` environment variables
  - Library: `nodemailer` npm package
  - Templates: Stored in `notification_templates` table (Handlebars format)
  - Service location: `services/notification-service/` (or background job in API)
  - Timeout: 10s
  - Error handling: Queue to RabbitMQ for retry on failure
  - Used for:
    - Registration confirmation emails
    - Booking confirmation/reminder emails
    - Payment receipts
    - Review requests
    - Marketing newsletters

**SMS:**
- SMS Provider (configurable, e.g., Twilio, Messagebird, etc.)
  - Auth: `SMS_PROVIDER_API_KEY`, `SMS_PROVIDER_ID` environment variables
  - Library: Provider-specific SDK or HTTP API via `axios`
  - Templates: Stored in `notification_templates` table
  - Service location: `services/notification-service/`
  - Timeout: 5s
  - Error handling: Queue for retry
  - Used for:
    - Booking reminders
    - Payment status updates
    - Verification codes

**Push Notifications:**
- Firebase Cloud Messaging or similar
  - Auth: Firebase project credentials (JSON file, environment variable)
  - Library: `firebase-admin` npm package
  - Service location: `services/notification-service/`
  - Used for: Mobile app notifications (when white-label app is available)

**In-App Notifications:**
- WebSocket real-time delivery
  - Used for: Instant alerts, status updates
  - Library: Socket.io or simple WebSocket
  - Endpoint: `ws://api/v1/notifications/real-time`

## Webhooks & Callbacks

**Incoming Webhooks (Third-party → ScheduleBox):**

- **Comgate Payment Webhook**
  - Endpoint: `POST /api/v1/webhooks/comgate/payment`
  - Signature verification: Required (HMAC-SHA256 or similar)
  - Payload: Payment status (completed, failed, refunded)
  - Processing: Update payment record, publish `payment.completed` event to RabbitMQ
  - Idempotency: Tracked via webhook ID in database

- **QRcomat Payment Webhook** (if applicable)
  - Endpoint: `POST /api/v1/webhooks/qrcomat/payment`
  - Signature verification: Required
  - Payload: QR code payment status
  - Processing: Similar to Comgate

- **Video Service Webhooks** (Zoom, etc.)
  - Endpoint: `POST /api/v1/webhooks/zoom/meeting`
  - Payload: Meeting status (started, ended), participant events
  - Processing: Update meeting record if needed

- **Email Delivery Webhooks** (SMTP provider)
  - Endpoint: `POST /api/v1/webhooks/email/status`
  - Payload: Delivery status (delivered, bounced, opened, clicked)
  - Processing: Update notification record with delivery status

**Outgoing Webhooks (ScheduleBox → Third-party):**
- Custom webhook support for customers (future feature)
  - Triggered by domain events: `booking.completed`, `payment.completed`, `customer.created`, etc.
  - Payload format: CloudEvents standard
  - Retry policy: 3 attempts with exponential backoff
  - Endpoint configuration: `POST /api/v1/settings/webhooks` (admin only)

## Environment Configuration

**Required Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/schedulebox

# Cache
REDIS_URL=redis://:password@host:6379

# Message Queue
RABBITMQ_URL=amqp://user:password@host:5672

# Authentication
JWT_SECRET=<random-secret-key-min-32-chars>
JWT_REFRESH_SECRET=<random-secret-key-min-32-chars>

# Payment: Comgate
COMGATE_MERCHANT_ID=<merchant-id>
COMGATE_API_KEY=<api-key>

# Payment: QRcomat
QRCOMAT_API_KEY=<api-key>

# Video: Zoom
ZOOM_CLIENT_ID=<client-id>
ZOOM_CLIENT_SECRET=<client-secret>

# Video: Google Meet (OAuth2)
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>

# Video: Microsoft Teams
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_TENANT_ID=<tenant-id>

# AI: OpenAI
OPENAI_API_KEY=<api-key>

# Notifications: Email
SMTP_HOST=<host>
SMTP_PORT=<port>
SMTP_USER=<username>
SMTP_PASS=<password>
SMTP_FROM=noreply@schedulebox.cz

# Notifications: SMS
SMS_PROVIDER_API_KEY=<api-key>
SMS_PROVIDER_ID=<provider-id>

# Monitoring: Sentry
SENTRY_DSN=<dsn-url>

# Storage: Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY_ID=<key-id>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<secret>
CLOUDFLARE_R2_BUCKET_NAME=schedulebox
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# OAuth2: Google, Facebook, Apple
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
FACEBOOK_APP_ID=<app-id>
FACEBOOK_APP_SECRET=<app-secret>
APPLE_CLIENT_ID=<client-id>
APPLE_TEAM_ID=<team-id>
APPLE_KEY_ID=<key-id>
APPLE_PRIVATE_KEY=<private-key>

# Frontend URLs (NEXT_PUBLIC_* are exposed to browser)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_WIDGET_URL=http://localhost:3001
NEXT_PUBLIC_SENTRY_DSN=<dsn-for-frontend>

# Node.js Environment
NODE_ENV=development|staging|production
```

**Secrets Location:**
- Development: `.env.local` file (Git-ignored, never committed)
- CI/CD: GitHub Secrets (accessed via `${{ secrets.SECRET_NAME }}`)
- Production: Kubernetes Secrets or managed secret service (AWS Secrets Manager, etc.)
- Template: `.env.example` (committed, shows structure without secrets)

## Deployment & Infrastructure

**Hosting Platform:**
- Kubernetes (K3s for staging, EKS/GKE for production)
- Container images: Docker-based, built via GitHub Actions CI

**CI/CD Integrations:**
- GitHub Actions workflows (`.github/workflows/`)
  - Lint and format checks (ESLint, Prettier)
  - Unit tests (Vitest)
  - Build Docker image
  - E2E tests (Playwright) on staging
  - Deployment to Kubernetes

**Infrastructure as Code:**
- Terraform for infrastructure provisioning
  - PostgreSQL database
  - Redis cluster
  - RabbitMQ cluster
  - Kubernetes cluster configuration
  - Load balancer
  - DNS records

**Observability Stack:**
- Prometheus - Metrics collection and storage
  - Scrape interval: 15s
  - Metrics endpoint: `/metrics` on each service

- Grafana - Dashboard and alerting
  - Data source: Prometheus
  - Alert rules for critical thresholds (CPU >80%, disk full, etc.)

- Loki - Log aggregation
  - Log shipper: Promtail
  - Query language: LogQL

- Sentry - Error tracking
  - Project: One per environment (dev, staging, prod)
  - Alert rules for spike detection

---

*Integration audit: 2026-02-10*

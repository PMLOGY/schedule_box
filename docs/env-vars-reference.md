# Environment Variables Reference — ScheduleBox

This document provides a comprehensive reference for all environment variables used across ScheduleBox services. All variables are documented with their purpose, default values, and security notes.

**Security Note:** Never commit secrets to git. Use Kubernetes secrets, environment files (`.env.production`), or secret management tools (HashiCorp Vault, AWS Secrets Manager).

---

## Web Application (`apps/web`)

Main Next.js application serving frontend UI and API routes.

| Variable | Required | Default | Description | Example | Security |
|----------|----------|---------|-------------|---------|----------|
| `NODE_ENV` | Yes | `development` | Node.js environment mode | `production`, `staging`, `development` | Public |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (includes host, port, database, user, password) | `postgresql://user:pass@postgres:5432/schedulebox` | **Secret** — Never log or expose |
| `REDIS_URL` | Yes | - | Redis connection string | `redis://:password@redis:6379` | **Secret** |
| `RABBITMQ_URL` | Yes | - | RabbitMQ AMQP connection string | `amqp://user:pass@rabbitmq:5672` | **Secret** |
| `JWT_SECRET` | Yes | - | Secret key for signing access tokens (minimum 32 characters) | `your-super-secret-jwt-key-min-32-chars` | **Secret** — Rotate every 90 days |
| `JWT_REFRESH_SECRET` | Yes | - | Secret key for signing refresh tokens (must differ from JWT_SECRET) | `your-refresh-token-secret-key-min-32-chars` | **Secret** — Rotate every 90 days |
| `APP_VERSION` | No | `1.0.0` | Application version string for health endpoint and telemetry | `1.2.3`, `v2.0.0` | Public |
| `LOG_LEVEL` | No | `info` | Logging verbosity level | `debug`, `info`, `warn`, `error` | Public |
| `AI_SERVICE_URL` | No | `http://localhost:8000` | Internal URL for AI microservice (within Kubernetes cluster) | `http://ai-service:8000`, `http://schedulebox-ai:8000` | Public (internal network) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | `http://localhost:4317` | OpenTelemetry collector endpoint for traces and metrics | `http://jaeger-collector:4317` | Public (internal network) |
| `SENTRY_DSN` | No | - | Sentry error tracking DSN (Data Source Name) | `https://abc123@o123456.ingest.sentry.io/7890123` | **Secret** — Public DSN is safe to expose client-side |
| `NEXT_TELEMETRY_DISABLED` | No | `0` | Disable Next.js anonymous telemetry (set to `1` in production) | `1` | Public |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public-facing application URL (used for email links, OAuth redirects) | `https://app.schedulebox.cz` | Public |

---

## AI Service (`services/ai`)

Python FastAPI microservice for machine learning predictions, voice booking, and AI optimization.

| Variable | Required | Default | Description | Example | Security |
|----------|----------|---------|-------------|---------|----------|
| `ENVIRONMENT` | No | `development` | Environment mode for AI service | `production`, `staging`, `development` | Public |
| `AI_SERVICE_PORT` | No | `8000` | Port the AI service listens on | `8000` | Public |
| `REDIS_URL` | Yes | - | Redis connection string for feature store caching | `redis://:password@redis:6379` | **Secret** |
| `SCHEDULEBOX_API_URL` | No | `http://localhost:3000` | URL to ScheduleBox main application API (for fetching booking data) | `http://app:3000`, `http://schedulebox-web:3000` | Public (internal network) |
| `MODEL_DIR` | No | `/app/models` | Directory path where trained ML models are stored | `/app/models`, `/var/models` | Public |
| `OPENAI_API_KEY` | No | - | OpenAI API key for GPT-4 and Whisper (voice booking, follow-up emails) | `sk-proj-abc123...` | **Secret** — Never log |
| `OPENAI_MODEL` | No | `gpt-4-turbo` | OpenAI model for voice booking NLU (intent extraction) | `gpt-4-turbo`, `gpt-4o` | Public |
| `OPENAI_FOLLOWUP_MODEL` | No | `gpt-4o-mini` | OpenAI model for follow-up email generation (cheaper model) | `gpt-4o-mini`, `gpt-3.5-turbo` | Public |
| `GOOGLE_PLACES_API_KEY` | No | - | Google Places API key for competitor intelligence (review scraping) | `AIzaSyAbc123...` | **Secret** |
| `MAX_AUDIO_SIZE_MB` | No | `10` | Maximum audio file size for voice booking (in megabytes) | `10`, `25` | Public |
| `MAX_FOLLOWUP_PER_DAY` | No | `50` | Rate limit for follow-up email generation per company per day | `50`, `100` | Public |
| `MAX_COMPETITORS_PER_COMPANY` | No | `5` | Maximum number of competitors a company can monitor | `5`, `10` | Public |
| `LOG_LEVEL` | No | `info` | Logging verbosity level | `debug`, `info`, `warn`, `error` | Public |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS allowed origins | `http://localhost:3000,http://app:3000` | Public |

---

## Notification Worker (`services/notification-worker`)

Node.js worker service consuming RabbitMQ events and sending email/SMS/push notifications via BullMQ queues.

| Variable | Required | Default | Description | Example | Security |
|----------|----------|---------|-------------|---------|----------|
| `NODE_ENV` | Yes | `development` | Node.js environment mode | `production`, `staging`, `development` | Public |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (for notification templates, tracking) | `postgresql://user:pass@postgres:5432/schedulebox` | **Secret** |
| `REDIS_URL` | Yes | - | Redis connection string (BullMQ job queue storage) | `redis://:password@redis:6379` | **Secret** |
| `RABBITMQ_URL` | Yes | - | RabbitMQ AMQP connection string (event consumption) | `amqp://user:pass@rabbitmq:5672` | **Secret** |
| `SMTP_HOST` | No | `localhost` | SMTP server hostname for email sending | `smtp.gmail.com`, `smtp.sendgrid.net` | Public |
| `SMTP_PORT` | No | `587` | SMTP server port (587 for TLS, 465 for SSL, 25 for unencrypted) | `587`, `465` | Public |
| `SMTP_USER` | No | - | SMTP authentication username | `noreply@schedulebox.cz` | **Secret** |
| `SMTP_PASS` | No | - | SMTP authentication password or API key | `your-smtp-password` | **Secret** |
| `SMTP_FROM` | No | `noreply@schedulebox.cz` | Default "From" email address for outgoing emails | `noreply@schedulebox.cz` | Public |
| `TWILIO_ACCOUNT_SID` | No | - | Twilio Account SID for SMS sending | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | **Secret** |
| `TWILIO_AUTH_TOKEN` | No | - | Twilio Auth Token for API authentication | `your-twilio-auth-token` | **Secret** |
| `TWILIO_FROM_NUMBER` | No | - | Twilio phone number for outgoing SMS (E.164 format) | `+420123456789` | Public |
| `VAPID_PUBLIC_KEY` | No | - | VAPID public key for web push notifications (base64 encoded) | `BGhK...` | Public |
| `VAPID_PRIVATE_KEY` | No | - | VAPID private key for web push notifications (base64 encoded) | `AbC1...` | **Secret** |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Public-facing application URL (used for notification links) | `https://app.schedulebox.cz` | Public |

**Note:** Worker gracefully degrades when credentials are not configured (logs warnings but does not crash). Useful for development environments without full SMTP/Twilio setup.

---

## Payment Integration (Comgate Gateway)

Environment variables for Czech payment gateway integration (used in `apps/web` API routes).

| Variable | Required | Default | Description | Example | Security |
|----------|----------|---------|-------------|---------|----------|
| `COMGATE_MERCHANT_ID` | Yes | - | Comgate merchant identifier | `123456` | Public |
| `COMGATE_API_KEY` | Yes | - | Comgate API secret key for payment authentication | `your-comgate-api-key` | **Secret** |
| `COMGATE_TEST_MODE` | No | `true` | Enable Comgate test mode (sandbox environment) | `true`, `false` | Public |
| `COMPANY_DEFAULT_IBAN` | No | - | Default IBAN for QR payment generation (when company IBAN not set) | `CZ6508000000192000145399` | Public |

---

## External Integrations (OAuth2, Video Meetings)

| Variable | Required | Default | Description | Example | Security |
|----------|----------|---------|-------------|---------|----------|
| `ZOOM_CLIENT_ID` | No | - | Zoom OAuth2 client ID for video meeting creation | `ABCDefgh1234567890` | Public |
| `ZOOM_CLIENT_SECRET` | No | - | Zoom OAuth2 client secret | `your-zoom-client-secret` | **Secret** |
| `GOOGLE_MEET_CLIENT_ID` | No | - | Google Meet OAuth2 client ID | `123456789012-abc123.apps.googleusercontent.com` | Public |
| `GOOGLE_MEET_CLIENT_SECRET` | No | - | Google Meet OAuth2 client secret | `your-google-meet-secret` | **Secret** |
| `MICROSOFT_TEAMS_CLIENT_ID` | No | - | Microsoft Teams OAuth2 client ID | `abc12345-6789-0123-4567-890abcdef123` | Public |
| `MICROSOFT_TEAMS_CLIENT_SECRET` | No | - | Microsoft Teams OAuth2 client secret | `your-teams-secret` | **Secret** |

**Note:** Video meeting credentials are optional. Features gracefully degrade when not configured (manual meeting links can still be added).

---

## Kubernetes/Docker Specific

Environment variables used only in containerized deployments.

| Variable | Required | Default | Description | Example | Security |
|----------|----------|---------|-------------|---------|----------|
| `SERVICE_NAME` | No | `schedulebox` | Service name for OpenTelemetry service identification | `schedulebox-web`, `schedulebox-ai` | Public |
| `POD_NAME` | No | - | Kubernetes pod name (auto-injected by downward API) | `schedulebox-web-abc123-xyz` | Public (set by K8s) |
| `POD_NAMESPACE` | No | - | Kubernetes namespace (auto-injected by downward API) | `schedulebox-production` | Public (set by K8s) |
| `CHOKIDAR_USEPOLLING` | No | `false` | Enable file polling in Docker for hot reload (development only) | `true` | Public |
| `WATCHPACK_POLLING` | No | `false` | Enable webpack polling in Docker (development only) | `true` | Public |

---

## GitHub Actions Secrets (CI/CD)

Secrets configured in GitHub repository settings for CI/CD workflows (not environment variables in runtime).

| Secret Name | Description | Used In Workflow |
|-------------|-------------|------------------|
| `GHCR_TOKEN` | GitHub Personal Access Token for pushing Docker images to `ghcr.io` | `.github/workflows/ci.yml`, `.github/workflows/deploy-production.yml` |
| `KUBE_CONFIG_STAGING` | Base64-encoded kubeconfig file for staging cluster access | `.github/workflows/deploy-staging.yml` |
| `KUBE_CONFIG_PRODUCTION` | Base64-encoded kubeconfig file for production cluster access | `.github/workflows/deploy-production.yml` |
| `SENTRY_AUTH_TOKEN` | Sentry authentication token for release tracking and source map upload | `.github/workflows/deploy-production.yml` |
| `DOCKER_BUILDKIT` | Enable Docker BuildKit for faster builds (set to `1`) | `.github/workflows/ci.yml` |

**How to generate `KUBE_CONFIG_*`:**
```bash
cat ~/.kube/config | base64 -w 0  # Linux/macOS
# Or on Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content ~/.kube/config -Raw)))
```

---

## Development Environment (`.env.local`)

Example `.env.local` file for local development (not committed to git):

```bash
# Database
DATABASE_URL=postgresql://schedulebox:schedulebox@localhost:5432/schedulebox

# Cache & Message Queue
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Authentication
JWT_SECRET=local-dev-jwt-secret-min-32-characters-long
JWT_REFRESH_SECRET=local-dev-refresh-secret-min-32-characters-long

# AI Service
AI_SERVICE_URL=http://localhost:8000
OPENAI_API_KEY=sk-proj-your-openai-key-here
GOOGLE_PLACES_API_KEY=AIzaSyYour-google-places-key-here

# Notifications (optional for dev)
SMTP_HOST=localhost
SMTP_PORT=1025  # MailHog SMTP server for local testing
SMTP_FROM=dev@schedulebox.local
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Payments (test mode)
COMGATE_MERCHANT_ID=test-merchant
COMGATE_API_KEY=test-api-key
COMGATE_TEST_MODE=true

# Public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Development
NODE_ENV=development
LOG_LEVEL=debug
NEXT_TELEMETRY_DISABLED=1
```

---

## Production Environment (`.env.production`)

Example `.env.production` file (store securely, never commit):

```bash
# Environment
NODE_ENV=production

# Database (use managed PostgreSQL with SSL)
DATABASE_URL=postgresql://prod_user:strong_password@postgres.example.com:5432/schedulebox?sslmode=require

# Cache & Queue (use managed Redis/RabbitMQ)
REDIS_URL=redis://:strong_redis_password@redis.example.com:6379
RABBITMQ_URL=amqp://prod_user:strong_password@rabbitmq.example.com:5672

# Authentication (rotate secrets every 90 days)
JWT_SECRET=production-jwt-secret-use-strong-random-64-char-string
JWT_REFRESH_SECRET=production-refresh-secret-different-from-jwt-secret

# AI Service
AI_SERVICE_URL=http://schedulebox-ai:8000
OPENAI_API_KEY=sk-proj-production-openai-key
OPENAI_MODEL=gpt-4-turbo
OPENAI_FOLLOWUP_MODEL=gpt-4o-mini
GOOGLE_PLACES_API_KEY=AIzaSyProduction-google-places-key

# Notifications
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.production-sendgrid-api-key
SMTP_FROM=noreply@schedulebox.cz
TWILIO_ACCOUNT_SID=ACprod-twilio-account-sid
TWILIO_AUTH_TOKEN=prod-twilio-auth-token
TWILIO_FROM_NUMBER=+420123456789
VAPID_PUBLIC_KEY=BGprod-vapid-public-key-base64
VAPID_PRIVATE_KEY=prod-vapid-private-key-base64

# Payments (production mode)
COMGATE_MERCHANT_ID=123456
COMGATE_API_KEY=production-comgate-api-key
COMGATE_TEST_MODE=false

# Video Meetings (optional)
ZOOM_CLIENT_ID=prod-zoom-client-id
ZOOM_CLIENT_SECRET=prod-zoom-client-secret
GOOGLE_MEET_CLIENT_ID=prod-google-meet-client-id
GOOGLE_MEET_CLIENT_SECRET=prod-google-meet-client-secret

# Observability
SENTRY_DSN=https://prod-key@o123456.ingest.sentry.io/7890123
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-collector:4317

# Public
NEXT_PUBLIC_APP_URL=https://app.schedulebox.cz
APP_VERSION=1.0.0
LOG_LEVEL=info
NEXT_TELEMETRY_DISABLED=1
```

---

## Environment Variable Validation

ScheduleBox validates required environment variables on startup to prevent runtime errors.

**Validation logic** (example from `apps/web/lib/env.ts`):

```typescript
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'RABBITMQ_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

**On validation failure:** Application exits with error code 1 and descriptive error message.

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for development (gitignored)
   - Use Kubernetes secrets or secret management tools for production

2. **Rotate secrets regularly**
   - JWT secrets: Every 90 days
   - Database passwords: Every 180 days
   - API keys: When compromised or annually

3. **Use strong random secrets**
   - Minimum 32 characters for JWT secrets
   - Use `openssl rand -base64 48` or similar to generate

4. **Restrict secret access**
   - Use Kubernetes RBAC to limit which pods can access secrets
   - Use separate secrets for staging and production

5. **Monitor secret usage**
   - Enable audit logs for secret access in Kubernetes
   - Alert on unauthorized secret reads

6. **Encrypt secrets at rest**
   - Enable Kubernetes secret encryption at rest
   - Use cloud provider KMS (AWS KMS, Google Cloud KMS)

---

## Environment Variable Loading Order

ScheduleBox loads environment variables in this priority order (highest to lowest):

1. **System environment variables** (set via `export VAR=value` or Kubernetes secret)
2. **`.env.production`** (if `NODE_ENV=production`)
3. **`.env.staging`** (if `NODE_ENV=staging`)
4. **`.env.local`** (if `NODE_ENV=development`)
5. **`.env`** (base defaults, committed to git)

**Example:** If `DATABASE_URL` is set in both system environment and `.env.local`, the system environment value is used.

---

## Troubleshooting

### Missing Environment Variable Error

**Error:** `Missing required environment variable: DATABASE_URL`

**Solution:** Set the variable in `.env.local` (development) or Kubernetes secret (production).

### Invalid Connection String

**Error:** `Connection refused to postgres:5432`

**Solution:** Verify `DATABASE_URL` format is correct:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### SMTP Authentication Failed

**Error:** `Invalid login: 535 Authentication failed`

**Solution:**
- Verify `SMTP_USER` and `SMTP_PASS` are correct
- Check if SMTP server requires TLS (use port 587, not 25)
- Test credentials manually: `telnet smtp.example.com 587`

### OpenAI API Rate Limit

**Error:** `Rate limit exceeded for gpt-4-turbo`

**Solution:**
- Check OpenAI usage dashboard for rate limits
- Consider using `gpt-4o-mini` (cheaper, higher rate limit)
- Implement exponential backoff retry logic

---

**Document Version:** 1.0
**Last Updated:** 2026-02-12
**Owner:** DevOps Team

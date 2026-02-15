# ScheduleBox Dev Quickstart

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- Docker Desktop (for PostgreSQL, Redis, RabbitMQ)

## 1. Start Infrastructure

```bash
# Start PostgreSQL 16, Redis 7, RabbitMQ 3.13
pnpm docker:up

# Verify services are running
docker compose -f docker/docker-compose.yml ps
```

**Service ports:**
| Service | Port | UI |
|---------|------|-----|
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| RabbitMQ | 5672 | http://localhost:15672 (guest/guest) |

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Setup Database

```bash
# Run migrations, apply RLS/functions, seed dev data
pnpm --filter @schedulebox/database db:setup

# Optional: seed 5 months of historical data (for analytics/charts)
pnpm --filter @schedulebox/database db:seed:historical
```

## 4. Start the App

```bash
# Start Next.js dev server
pnpm dev
# App available at http://localhost:3000
```

## 5. Login Credentials

All dev passwords are: `password123`

| Account         | Email                  | Role  | Company      |
| --------------- | ---------------------- | ----- | ------------ |
| **Super Admin** | admin@schedulebox.cz   | admin | All          |
| **Owner 1**     | lukas.fiala@centrum.cz | owner | Salon Krasa  |
| **Owner 2**     | martin.novak@seznam.cz | owner | U Brouska    |
| **Owner 3**     | eva.svobodova@email.cz | owner | FitZone      |
| **Test User**   | test@example.com       | owner | Test company |

Employee and customer accounts are auto-generated per company (same password).

## 6. Environment Variables

Two env files exist:

- `.env` (root) — infra config (DB, Redis, RabbitMQ, JWT secrets)
- `apps/web/.env.local` — same values, loaded by Next.js

Key connection strings (dev defaults):

```
DATABASE_URL=postgresql://schedulebox:schedulebox@localhost:5432/schedulebox
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
JWT_ACCESS_SECRET=dev-access-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
```

## 7. Useful Commands

```bash
# Development
pnpm dev                     # Start Next.js dev server
pnpm lint                    # ESLint check
pnpm lint:fix                # ESLint auto-fix
pnpm type-check              # TypeScript check (all packages)
pnpm format                  # Prettier format all files

# Database
pnpm --filter @schedulebox/database db:generate   # Generate migration from schema changes
pnpm --filter @schedulebox/database db:migrate    # Run pending migrations
pnpm --filter @schedulebox/database db:seed       # Re-seed development data
pnpm --filter @schedulebox/database db:studio     # Open Drizzle Studio (visual DB editor)

# Docker
pnpm docker:up               # Start infra services
pnpm docker:down             # Stop infra services
pnpm docker:logs             # Tail service logs

# Build
pnpm build                   # Production build
```

## 8. Project Structure (Key Paths)

```
apps/web/                     # Next.js app (pages + API routes)
  app/[locale]/(auth)/        #   Auth pages (login, register, etc.)
  app/[locale]/(dashboard)/   #   Protected dashboard pages
  app/api/v1/                 #   121 REST API endpoints
  components/                 #   66 React components
  hooks/                      #   14 custom hooks
  stores/                     #   5 Zustand stores
  lib/                        #   41 utility modules
  validations/                #   9 Zod schema files
  messages/                   #   i18n (cs.json, sk.json, en.json)

packages/database/            # Drizzle ORM (47 tables, RLS, seeds)
packages/shared/              # Types, Zod schemas, errors, utils
packages/events/              # RabbitMQ CloudEvents (20+ event types)
packages/ui/                  # Placeholder (components in apps/web)

services/notification-worker/ # Email/SMS/push + reminders + automation
services/ai/                  # Not yet implemented

docker/                       # Docker Compose (local dev stack)
helm/                         # Helm chart (K8s deployment)
k8s/                          # K8s stateful + monitoring configs
```

## 9. Locales

The app supports 3 languages: Czech (default), Slovak, English.

- Czech: `http://localhost:3000/cs/...` (or just `/`)
- Slovak: `http://localhost:3000/sk/...`
- English: `http://localhost:3000/en/...`

## 10. What's Not Working Yet

- **AI Service** (`services/ai/`) — not implemented; API routes return fallback data
- **Push Notifications** — subscription storage is TODO
- **UI Package** (`packages/ui/`) — placeholder only; components live directly in `apps/web/components/ui/`
- **Video Providers** — interface defined but not wired to API

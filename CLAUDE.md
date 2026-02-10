# ScheduleBox — Project Instructions

## Overview

ScheduleBox is an AI-powered reservation & scheduling SaaS platform for the Czech/Slovak SMB market.

- **Documentation:** `schedulebox_complete_documentation.md` is the SINGLE SOURCE OF TRUTH
- **Language:** Czech documentation, English code (variables, comments, commit messages)
- **Version:** 13.0 FINAL

## Tech Stack

| Layer    | Technology                                                   |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| State    | Zustand (global), React Query/TanStack Query (server)        |
| Backend  | Node.js 20 LTS, Next.js API Routes + microservices           |
| ORM      | Drizzle ORM                                                  |
| Database | PostgreSQL 16, Redis 7                                       |
| Queue    | RabbitMQ 3.13                                                |
| Storage  | Cloudflare R2 (S3-compatible)                                |
| AI/ML    | Python 3.12, scikit-learn, XGBoost, OpenAI API               |
| DevOps   | Docker, Kubernetes, GitHub Actions, Terraform                |

## Project Structure (Target)

```
schedulebox/
├── apps/
│   └── web/                    # Next.js 14 frontend + API routes
├── packages/
│   ├── database/               # Drizzle ORM schemas, migrations
│   ├── shared/                 # Shared types, utils, Zod schemas
│   ├── events/                 # RabbitMQ event definitions & helpers
│   └── ui/                     # Shared UI components (shadcn/ui based)
├── services/                   # Standalone microservices (AI, notifications, etc.)
├── docker/                     # Docker configs
├── k8s/                        # Kubernetes manifests
├── .github/workflows/          # CI/CD pipelines
├── .planning/                  # GSD planning docs & segment instructions
└── schedulebox_complete_documentation.md
```

## Multi-Agent Development

This project is developed using **4 parallel agent segments**:

1. **DATABASE** — Schema, migrations, RLS, seeds (`SEGMENT-DATABASE.md`)
2. **BACKEND** — API routes, services, events, auth (`SEGMENT-BACKEND.md`)
3. **FRONTEND** — UI components, pages, state management (`SEGMENT-FRONTEND.md`)
4. **DEVOPS** — Docker, CI/CD, testing, monitoring (`SEGMENT-DEVOPS.md`)

See `.planning/segments/` for detailed instructions per segment.
See `.planning/DEPENDENCIES.md` for cross-segment contracts and interfaces.

## Conventions

- **IDs:** Use UUID for public-facing, SERIAL for internal DB
- **Timestamps:** TIMESTAMPTZ everywhere (timezone: Europe/Prague)
- **Tenant isolation:** Every table has `company_id`, enforced via RLS
- **Error format:** `{ error: string, code: string, message: string, details?: any }`
- **API prefix:** All endpoints under `/api/v1/`
- **Commit style:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branch naming:** `segment/database/feature-name`, `segment/backend/feature-name`, etc.

## GSD Framework

This project uses the GSD (Get Shit Done) workflow framework.

- Planning state lives in `.planning/` (PROJECT.md, STATE.md, ROADMAP.md)
- Use `/gsd:*` commands for structured workflow
- Each segment can independently use GSD phases within its scope

## Critical Rules

1. **Documentation is the single source of truth** — always consult `schedulebox_complete_documentation.md`
2. **Never expose SERIAL IDs** — use UUIDs in API responses
3. **Always enforce RLS** — every query must be scoped to `company_id`
4. **Validate with Zod** — every API input goes through Zod schema validation
5. **Event-driven** — services communicate via RabbitMQ domain events, not direct REST calls
6. **Double-booking prevention** — use `SELECT FOR UPDATE` + UNIQUE constraint on availability

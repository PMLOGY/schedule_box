# ScheduleBox — Project Context

## What
ScheduleBox is an all-in-one AI-powered business platform for service-based businesses (salons, fitness, medical, auto service, etc.). It combines booking, payments, CRM, loyalty, automation, and 7 AI models into one platform.

## Why
Czech/Slovak SMB market lacks an integrated, AI-powered booking solution. Competitors (Reservio, Bookio, SuperSaaS) cover basics but miss AI optimization, integrated payments, and loyalty programs.

## For Whom
- **Primary:** SMB owners (1-50 employees) in CZ/SK
- **Secondary:** Expansion to PL, DE

## Business Model
Freemium with 4 tiers:
| Tier | Price | Key Features |
|---|---|---|
| Free | 0 Kc | 50 bookings/month |
| Essential | 490 Kc/mo | Comgate payments, basic booking |
| Growth | 1,490 Kc/mo | Multi-resource, automation, loyalty |
| AI-Powered | 2,990 Kc/mo | All AI, API access, white-label |

## Architecture
- **19 microservices** communicating via RabbitMQ events
- **47 database tables** with Row Level Security
- **99 API endpoints** (130+ operations)
- **32+ frontend components**
- **7 AI/ML models**

## Current Status
- Documentation: 100% complete (v13.0 FINAL)
- Implementation: 0% — starting from scratch
- Development approach: 4 parallel agent segments

## Key Decisions
1. Next.js 14 monorepo with standalone microservices for AI/notifications
2. Drizzle ORM (not Prisma) — better SQL control, migration flexibility
3. RabbitMQ (not Kafka) — simpler for our scale, sufficient throughput
4. Cloudflare R2 (not AWS S3) — cost-effective, S3-compatible
5. PostgreSQL full-text search (not Elasticsearch) — simpler, sufficient for v1
6. Choreography SAGA pattern (not orchestration) — event-driven, decoupled

## Team
- Multi-agent development with Claude Code
- 4 parallel segments: Database, Backend, Frontend, DevOps

# SEGMENT: DEVOPS & TESTING

**Terminal Role:** Docker, CI/CD, testing framework, monitoring, security, deployment
**Documentation Reference:** Parts IX, X of `schedulebox_complete_documentation.md`

---

## Your Scope

You are responsible for:
1. **Docker Compose** (development environment)
2. **Dockerfile** (production multi-stage build)
3. **CI/CD pipeline** (GitHub Actions)
4. **Testing framework** setup (Jest/Vitest, Playwright, k6, Pact)
5. **Kubernetes manifests** (staging & production)
6. **Monitoring stack** (Prometheus, Grafana, Sentry)
7. **Security scanning** (Trivy, OWASP ZAP, npm audit)
8. **Infrastructure as Code** (Terraform)
9. **Environment management** (env vars, secrets)
10. **Pre-commit hooks** (lint, type-check)

You are NOT responsible for: Writing business logic, UI components, database schema design.

---

## Directory Structure

```
schedulebox/
├── docker/
│   ├── Dockerfile                  # Multi-stage production build
│   ├── Dockerfile.dev              # Development with hot reload
│   └── nginx/
│       └── nginx.conf              # Reverse proxy config
├── docker-compose.yml              # Development environment
├── docker-compose.test.yml         # Testing environment
├── k8s/
│   ├── base/                       # Kustomize base
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml            # Template (values from Vault)
│   ├── overlays/
│   │   ├── staging/
│   │   │   └── kustomization.yaml
│   │   └── production/
│   │       └── kustomization.yaml
│   └── monitoring/
│       ├── prometheus/
│       │   ├── prometheus.yaml
│       │   └── rules/
│       ├── grafana/
│       │   ├── dashboards/
│       │   └── datasources/
│       └── loki/
│           └── loki.yaml
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── database/
│       ├── cache/
│       ├── queue/
│       └── kubernetes/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, type-check, unit tests
│       ├── integration.yml         # Integration tests with services
│       ├── e2e.yml                 # Playwright E2E tests
│       ├── security.yml            # Security scanning
│       ├── deploy-staging.yml      # Deploy to staging
│       └── deploy-production.yml   # Deploy to production
├── tests/
│   ├── unit/                       # Unit tests (co-located or centralized)
│   ├── integration/                # Integration tests
│   │   ├── api/                    # API endpoint tests
│   │   │   ├── auth.test.ts
│   │   │   ├── bookings.test.ts
│   │   │   ├── customers.test.ts
│   │   │   └── payments.test.ts
│   │   └── events/                 # RabbitMQ event tests
│   ├── e2e/                        # Playwright E2E tests
│   │   ├── booking-flow.spec.ts
│   │   ├── payment-flow.spec.ts
│   │   ├── auth-flow.spec.ts
│   │   └── customer-management.spec.ts
│   ├── load/                       # k6 load tests
│   │   ├── booking-api.js
│   │   └── availability-api.js
│   ├── security/                   # Security test configs
│   │   └── zap-config.yaml
│   └── contracts/                  # Pact contract tests
│       └── booking-api.pact.ts
├── scripts/
│   ├── setup.sh                    # First-time setup
│   ├── seed.sh                     # Database seeding
│   ├── migrate.sh                  # Run migrations
│   └── health-check.sh             # Service health verification
├── .husky/                         # Git hooks
│   ├── pre-commit
│   └── commit-msg
├── .env.example                    # Environment variable template
├── .env.test                       # Test environment
└── turbo.json / pnpm-workspace.yaml
```

---

## Docker Compose (Development)

### Services
| Service | Image | Ports | Purpose |
|---|---|---|---|
| app | Built from Dockerfile.dev | 3000 | Next.js app (hot reload) |
| postgres | postgres:16-alpine | 5432 | Primary database |
| redis | redis:7-alpine | 6379 | Cache & sessions |
| rabbitmq | rabbitmq:3.13-management-alpine | 5672, 15672 | Event bus (mgmt UI at 15672) |
| mailhog | mailhog/mailhog | 1025, 8025 | Email testing (UI at 8025) |

### Volumes
- `postgres_data` — persist database between restarts
- `.:/app` — hot reload mount (dev only)
- `/app/node_modules` — prevent overwrite

### Health Checks
- PostgreSQL: `pg_isready -U schedulebox`
- Redis: `redis-cli ping`
- RabbitMQ: `rabbitmq-diagnostics check_running`

---

## CI/CD Pipeline (GitHub Actions)

### Workflow: ci.yml (every push & PR)
```
1. Lint (ESLint)
2. Type Check (tsc --noEmit)
3. Unit Tests (Vitest, ≥80% coverage)
4. Upload coverage to Codecov
```

### Workflow: integration.yml (every push to main/develop)
```
Services: PostgreSQL 16, Redis 7, RabbitMQ 3.13
1. npm ci
2. Run migrations (npm run db:migrate)
3. Run integration tests (npm run test:integration)
4. Run contract tests (npm run test:contracts)
```

### Workflow: e2e.yml (on staging deploy)
```
1. Start app against staging
2. Run Playwright tests (20 critical scenarios)
3. Upload test artifacts (screenshots, videos)
```

### Workflow: security.yml (weekly + on PR)
```
1. npm audit --audit-level=high
2. Trivy image scan (CRITICAL, HIGH)
3. OWASP ZAP baseline scan (staging URL)
4. License compliance check
```

### Workflow: deploy-staging.yml (on push to main)
```
1. Build Docker image
2. Push to GHCR
3. Trivy scan
4. kubectl set image (staging namespace)
5. Run smoke tests
```

### Workflow: deploy-production.yml (manual trigger after staging verified)
```
1. Blue/Green: deploy to green
2. Smoke tests on green
3. Switch traffic blue→green
4. Monitor for 5 minutes
5. Rollback: switch back to blue if errors
```

---

## Testing Strategy

### Test Types & Tools
| Type | Tool | Target | Trigger |
|---|---|---|---|
| Unit | Vitest | ≥80% coverage | Every push |
| Integration | Vitest + Testcontainers | Key API flows | Every push (main/develop) |
| E2E | Playwright | 20 critical scenarios | Staging deploy |
| Load | k6 | Performance benchmarks | Manual pre-release |
| Security | OWASP ZAP + Trivy | Vulnerabilities | Weekly + PR |
| Contract | Pact | API contracts | Every push |

### 20 Critical E2E Scenarios
1. User registration → email verification → first login
2. Onboarding wizard (company setup, services, employees)
3. Create booking (happy path — full 4-step flow)
4. Double-booking prevention (concurrent requests)
5. Cancel booking
6. Complete booking + mark no-show
7. Comgate payment (mock gateway)
8. QRcomat payment (mock gateway)
9. Customer CRUD (create, edit, delete)
10. Service CRUD
11. Employee CRUD + working hours
12. Coupon creation + validation on booking
13. Gift card purchase + redemption
14. Loyalty points earning + redemption
15. Review submission + owner reply
16. Notification delivery (mock email)
17. Automation rule trigger
18. Multi-tenant isolation (firm A can't see firm B data)
19. RBAC (employee can't access owner endpoints)
20. Password reset flow

### Unit Test Patterns
```typescript
// API route tests — mock database, test validation, auth, business logic
// Service layer tests — mock DB queries, test pure business logic
// Component tests — React Testing Library, test rendering & interactions
```

---

## Monitoring & Observability Stack

### Metrics (Prometheus)
- **Application:** Request latency, error rate, active connections
- **Business:** Bookings/min, payment success rate, AI prediction fallback rate
- **Infrastructure:** CPU, memory, disk, pod restarts

### Dashboards (Grafana)
1. **Overview** — Request rate, error rate, latency P50/P95/P99
2. **Business** — Bookings, payments, active users
3. **Infrastructure** — K8s pods, PostgreSQL, Redis, RabbitMQ
4. **AI** — Prediction latency, fallback rate, model accuracy

### Logging (Loki)
- JSON structured logs
- Fields: timestamp, level, service, traceId, companyId, userId, message
- Retention: 30 days

### Tracing (OpenTelemetry + Jaeger)
- Trace across services via correlation ID
- Sampling: 10% in production, 100% in staging

### Error Tracking (Sentry)
- Source maps uploaded on deploy
- Alert on new errors, error spike
- Performance monitoring (transactions)

---

## Environment Variables

### Template (.env.example)
```
# Database
DATABASE_URL=postgresql://schedulebox:schedulebox@localhost:5432/schedulebox
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379/0

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT
JWT_SECRET=dev-secret-change-in-production-256-bit
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=30d

# App
APP_URL=http://localhost:3000
API_URL=http://localhost:3000/api/v1
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# External APIs (leave empty for dev, use mocks)
COMGATE_MERCHANT_ID=
COMGATE_SECRET=
QRCOMAT_API_KEY=
OPENAI_API_KEY=
SMTP_HOST=localhost
SMTP_PORT=1025
```

---

## Phase-by-Phase Tasks

### Phase 1: Setup (Priority — unblocks all segments)
- [ ] Create `docker-compose.yml` with all 5 services
- [ ] Create `Dockerfile.dev` for hot reload
- [ ] Create `Dockerfile` for production (multi-stage)
- [ ] Create `.env.example` and `.env.test`
- [ ] Initialize pnpm workspace (`pnpm-workspace.yaml`)
- [ ] Set up Turborepo or pnpm scripts for monorepo
- [ ] Configure ESLint + Prettier
- [ ] Set up Husky pre-commit hooks (lint + type-check)
- [ ] Create `scripts/setup.sh` for first-time setup
- [ ] Verify: `docker compose up` → all services healthy

### Phase 2: CI/CD Skeleton
- [ ] Create `.github/workflows/ci.yml` (lint + type-check + unit tests)
- [ ] Create `.github/workflows/integration.yml` skeleton
- [ ] Configure Vitest for unit testing
- [ ] Configure Vitest for integration testing (with Testcontainers)
- [ ] Set up Playwright for E2E testing
- [ ] Create test helper utilities (factories, fixtures, mocks)

### Phase 5: Booking Tests
- [ ] Integration tests for booking API
- [ ] Integration tests for availability engine
- [ ] E2E test: booking flow (TC-01)
- [ ] E2E test: double-booking prevention (TC-02)

### Phase 6: Payment Tests
- [ ] Mock Comgate API for testing
- [ ] Integration tests for payment flow
- [ ] E2E test: Comgate payment (TC-03, TC-04)
- [ ] E2E test: AI fallback (TC-05)

### Phase 13: Polish
- [ ] Load testing scripts (k6)
- [ ] Security scanning pipeline
- [ ] Performance benchmarks & optimization

### Phase 15: Launch
- [ ] Kubernetes manifests (base + staging + production overlays)
- [ ] Terraform modules for cloud infrastructure
- [ ] Prometheus + Grafana dashboards
- [ ] Loki logging configuration
- [ ] Sentry integration
- [ ] Deploy staging environment
- [ ] Security audit (OWASP ZAP)
- [ ] Load test results & analysis
- [ ] Production deployment runbook
- [ ] Blue/Green deployment verification

# Architecture Patterns: v1.2 Product Readiness Integration

**Domain:** AI-powered SaaS Booking Platform — v1.2 Feature Integration
**Researched:** 2026-02-21
**Confidence:** HIGH (codebase-verified for integration points; MEDIUM for Railway private networking specifics)

---

## Executive Summary

This document answers the four integration questions for v1.2: Python AI service deployment alongside Next.js on Railway, ML model training data flow from PostgreSQL, landing page architecture, and UI component consolidation.

**Key finding:** The existing codebase is already well-structured for these additions. The Python AI service has a complete FastAPI skeleton with Dockerfile, all endpoint interfaces, circuit breaker in the Next.js client, and training scripts that call `SCHEDULEBOX_API_URL/api/internal/features/training/*` — but the internal feature-extraction API routes do not yet exist in Next.js. The `packages/ui` package is a 0%-implemented placeholder with correct exports structure. The App Router's route-group pattern supports public landing pages without any middleware changes.

---

## Integration Map: v1.2 Components

### What Already Exists (Do Not Rebuild)

| Component | Location | Status |
|-----------|----------|--------|
| FastAPI AI service skeleton | `services/ai/` | Routers, schemas, models, config all written |
| AI Dockerfile (multi-stage) | `services/ai/Dockerfile` | Production-ready |
| AI client in Next.js | `apps/web/lib/ai/client.ts` | All 10 endpoints wired with circuit breaker |
| Circuit breaker (Opossum) | `apps/web/lib/ai/circuit-breaker.ts` | Tuned per endpoint (2s–30s timeouts) |
| Fallback responses | `apps/web/lib/ai/fallback.ts` | All 10 fallback functions written |
| ML training scripts | `services/ai/scripts/train_*.py` | 6 model trainers, call internal API |
| `packages/ui` export skeleton | `packages/ui/src/index.ts` | Placeholder, exports `{}` |
| 21 shadcn/ui primitives | `apps/web/components/ui/` | All working, inline in web app |
| 45 domain components | `apps/web/components/` | booking, analytics, loyalty, etc. |
| Helm chart with AI service | `helm/schedulebox/templates/` | `ai-deployment.yaml`, `ai-service.yaml` |

### What Does Not Yet Exist (Must Build)

| Component | Why Needed | Location |
|-----------|-----------|----------|
| Internal training feature-extraction API routes | Training scripts call `SCHEDULEBOX_API_URL/api/internal/features/training/*` but these routes are missing from Next.js | `apps/web/app/api/internal/features/training/` |
| Railway service configuration | Kubernetes deployment exists but Railway is the actual runtime — `railway.toml` or per-service config not present | `services/ai/` root |
| Landing page routes + layout | `(marketing)` route group does not exist | `apps/web/app/[locale]/(marketing)/` |
| Model artifact build step | `.joblib` model files not committed — Dockerfile copies `./models/` dir but it's empty | CI training job or build script |
| `packages/ui` component implementations | Package is a placeholder; exports nothing | `packages/ui/src/components/` |

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|------------------|
| `apps/web` (Next.js) | Dashboard, auth, public booking widget, API proxy to AI service, landing page | AI service (HTTP private network), PostgreSQL, Redis, RabbitMQ |
| `services/ai` (FastAPI) | ML inference, OpenAI follow-up generation, competitor scraping | Redis (feature cache), `apps/web` internal API (training data pull) |
| `services/notification-worker` | Email/SMS delivery, BullMQ job processing | PostgreSQL, Redis, RabbitMQ, SMTP, Twilio |
| `packages/database` | Drizzle schemas, migrations | Used by `apps/web` only |
| `packages/shared` | Zod schemas, TypeScript types | Used by `apps/web`, test tooling |
| `packages/ui` | Shared shadcn/ui primitives | Used by `apps/web` (once populated) |

---

## Architecture by Feature Area

### 1. Python AI Service on Railway

**Current state:** Kubernetes Helm chart exists (`ai-deployment.yaml`). There is no `railway.toml`. The web app references `AI_SERVICE_URL` env var (default: `http://localhost:8000`). The Helm configmap sets: `AI_SERVICE_URL: "http://schedulebox-ai:8000"`.

**Railway deployment model:**

Railway uses private networking for service-to-service communication. Each service in a project gets a DNS name at `<service-name>.railway.internal`. The AI service should be named `ai` so the web service can reach it at `http://ai.railway.internal:8000`.

```
Railway Project: ScheduleBox
├── web          (Next.js, port 3000)
├── ai           (FastAPI, port 8000)   ← NEW service
├── worker       (notification-worker)
├── postgres     (Railway template)
├── redis        (Railway template)
└── rabbitmq     (Railway template)
```

**Environment variable wiring (Railway):**

| Service | Variable | Value |
|---------|----------|-------|
| `web` | `AI_SERVICE_URL` | `http://ai.railway.internal:8000` |
| `ai` | `REDIS_URL` | Railway reference: `${{Redis.REDIS_URL}}` |
| `ai` | `SCHEDULEBOX_API_URL` | `http://web.railway.internal:3000` |
| `ai` | `AI_SERVICE_API_KEY` | Secret — set as sealed variable |
| `ai` | `OPENAI_API_KEY` | Secret — set as sealed variable |
| `ai` | `MODEL_DIR` | `/app/models` |

**Important constraint:** Railway's private network (new environments, post Oct 16 2025) resolves to both IPv4 and IPv6. The `http://ai.railway.internal:8000` URL uses HTTP (not HTTPS) because traffic is internal. The AI service config already accepts `ALLOWED_ORIGINS` from env — set this to the web service public URL.

**Railway service configuration file:**

Each service requires either a `railway.toml` at the service root or a `railway.json`. For the AI service (Docker-based), Railway auto-detects the Dockerfile if no config file is present. For clarity, a `railway.toml` should be added to `services/ai/`:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "services/ai/Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8000"
healthcheckPath = "/health"
healthcheckTimeout = 30
```

**What changes in Next.js:** Only the `AI_SERVICE_URL` environment variable value changes from the default. The circuit breaker client (`apps/web/lib/ai/client.ts`) needs no code changes — it reads `process.env.AI_SERVICE_URL`.

**Confidence:** HIGH for internal hostname pattern. MEDIUM for `railway.toml` format — verify exact syntax at Railway docs before finalizing.

---

### 2. ML Model Training Pipeline and Data Flow

**Current state:** Training scripts at `services/ai/scripts/train_*.py` each:
1. Call `SCHEDULEBOX_API_URL/api/internal/features/training/{model}` to fetch real data
2. Fall back to synthetic data if the endpoint returns an error or is unreachable
3. Save trained `.joblib` or `.json` files to `MODEL_DIR`

**The gap:** The `api/internal/features/training/*` endpoints do not exist in `apps/web/app/api/`. These need to be created before model training can use real production data.

**Required internal API routes (new in Next.js):**

```
apps/web/app/api/internal/features/training/
├── no-show/route.ts      # Booking + customer features → no-show label
├── clv/route.ts          # Customer booking history aggregates
├── capacity/route.ts     # Hourly booking counts {ds, y} for Prophet
├── pricing/route.ts      # Service bookings with utilization + outcome
├── reminder-timing/route.ts  # Notification delivery with open tracking
└── upselling/route.ts    # Customer-service co-occurrence matrix
```

**Each route pattern:** Queries PostgreSQL via Drizzle, aggregates features, returns JSON array. These are internal routes — they must be protected by `AI_SERVICE_API_KEY` header validation, not the standard JWT auth (the AI service calls them, not browser clients).

**Data flow for a training run:**

```
GitHub Actions (scheduled weekly) or manual trigger
    │
    ▼
Run: python -m scripts.train_no_show
  SCHEDULEBOX_API_URL=http://web.railway.internal:3000
  AI_SERVICE_API_KEY=<secret>
    │
    ▼
GET /api/internal/features/training/no-show
  ← Next.js queries PostgreSQL via Drizzle
  ← Returns [{booking_lead_time_hours, customer_no_show_rate, ..., no_show}]
    │
    ▼
XGBoost trains on data
    │
    ▼
Saves no_show_v1.0.0.joblib to MODEL_DIR
    │
    ▼
AI service loads model on next restart (or: POST /admin/reload-models)
```

**Where trained model files live:** Two options exist:

| Option | Approach | Tradeoff |
|--------|----------|---------|
| **Baked into Docker image (recommended for v1.2)** | Training job runs as CI step, outputs `.joblib` files, new Docker image built with models included | Simple, reproducible, no runtime S3 dependency |
| **Object storage (S3/Cloudflare R2)** | Models uploaded to R2 after training, downloaded by AI service at startup | More complex but enables model hot-swap without redeploy |

For v1.2, bake models into the Docker image. The `services/ai/Dockerfile` already has `COPY ./models ./models` — the CI job runs training scripts before `docker build`, so `.joblib` files are present when the image is built.

**Training CI job pattern:**

```yaml
# .github/workflows/train-models.yml
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly Sunday 2am
  workflow_dispatch:

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r services/ai/requirements.txt
      - name: Train models
        env:
          SCHEDULEBOX_API_URL: ${{ secrets.SCHEDULEBOX_API_URL }}
          AI_SERVICE_API_KEY: ${{ secrets.AI_SERVICE_API_KEY }}
        run: |
          cd services/ai
          python -m scripts.train_no_show
          python -m scripts.train_clv
          python -m scripts.train_capacity
          python -m scripts.train_upselling
          python -m scripts.train_pricing
          python -m scripts.train_reminder_timing
      - name: Build and push Docker image with models
        run: docker build -t ghcr.io/schedulebox/schedulebox-ai:trained-$(date +%Y%m%d) services/ai/
```

**Confidence:** HIGH — training scripts verified against codebase. The `SCHEDULEBOX_API_URL` internal API routes are the only missing piece.

---

### 3. Landing Page Architecture

**Decision: Same Next.js app, new route group.**

**Why not a separate app:**
- Railway charges per service; adding a static landing page as a separate service wastes resources
- The existing `apps/web` serves the embed booking widget (`/embed/[company_slug]`), which is already public with no auth — proving the pattern works
- The App Router's route-group feature (`(marketing)`) is exactly designed for this: different layout with no URL prefix change

**Existing middleware analysis:**

The middleware at `apps/web/middleware.ts` only runs `next-intl` locale detection. It does NOT enforce authentication globally. Auth is enforced by the `AuthGuard` component inside `app/[locale]/(dashboard)/layout.tsx`. Adding a `(marketing)` route group that does NOT use `AuthGuard` is all that is required.

**URL structure (landing page routes):**

```
app/[locale]/
├── (auth)/                  # Existing: login, register
├── (dashboard)/             # Existing: dashboard pages with AuthGuard
├── [company_slug]/          # Existing: public booking widget
└── (marketing)/             # NEW: public landing pages
    ├── layout.tsx            # Marketing layout (navbar + footer, no sidebar, no AuthGuard)
    ├── page.tsx              # / — Home / Hero
    ├── pricing/page.tsx      # /pricing
    ├── features/page.tsx     # /features
    └── contact/page.tsx      # /contact
```

**What the marketing layout does NOT include:**
- No `AuthGuard` — public
- No dashboard sidebar
- No `next-intl` locale detection changes (already handled by middleware)

**What it DOES include:**
- Marketing navbar with CTA (Sign up / Log in)
- Footer with links
- Different metadata (SEO-optimized, Czech content)

**Conflict check:** The App Router requires route groups resolve to unique URLs. Currently `/` redirects to `/cs` (handled by `app/page.tsx`). The marketing home page at `app/[locale]/(marketing)/page.tsx` would resolve to `/cs/` — the same as the current redirect target. This requires adjusting the root redirect: either route `/cs` to the marketing home, or add a route at `app/[locale]/page.tsx` that checks auth status and redirects accordingly.

**Recommended pattern:**

```typescript
// app/[locale]/(marketing)/page.tsx
// No auth check — renders marketing home
export default function MarketingHome() { ... }

// app/page.tsx (existing)
// Redirects / → /cs (unchanged — /cs resolves to (marketing)/page.tsx)
```

This means unauthenticated users landing on `/` see the marketing page. Authenticated users navigating to `/dashboard` see the dashboard. The auth flow is unchanged.

**i18n handling:** All marketing content uses `next-intl` like the rest of the app. Czech-language marketing copy goes in `messages/cs.json` under a `marketing.*` namespace.

**Confidence:** HIGH — verified against existing middleware, route group pattern, and App Router behavior.

---

### 4. UI Component Architecture

**Decision: Leave components in `apps/web/components/ui/` for now. Populate `packages/ui` incrementally.**

**Current state:**
- `packages/ui/src/index.ts` exports `{}` (placeholder)
- `packages/ui/src/components/.gitkeep` — empty
- `apps/web/components/ui/` has 21 shadcn/ui primitives (button, card, dialog, form, input, etc.)
- `apps/web` already has `"@schedulebox/ui": "workspace:*"` in `package.json` dependencies but nothing is imported from it

**Why NOT a big-bang migration to `packages/ui`:**
- All 66 components in `apps/web/components/` import from `@/components/ui/...` (relative paths)
- Moving primitives to `packages/ui` requires updating every import across 45+ domain components
- There is no second consumer of `packages/ui` right now — the benefit of sharing doesn't materialize
- Risk: shadcn/ui components require Tailwind config to be accessible from the consuming package, which requires path aliases and peer deps to be wired correctly

**Recommended approach for v1.2: Additive, not disruptive.**

Build new landing page components directly in `apps/web/components/marketing/`:

```
apps/web/components/
├── marketing/                  # NEW: landing page components
│   ├── hero-section.tsx
│   ├── feature-grid.tsx
│   ├── pricing-cards.tsx
│   ├── testimonials.tsx
│   ├── cta-section.tsx
│   └── marketing-nav.tsx
├── ui/                         # EXISTING: shadcn/ui primitives (stay here)
└── {booking,analytics,...}/    # EXISTING: domain components (stay here)
```

**When to populate `packages/ui`:** Only when a second app (e.g., `apps/admin`) or `services/*` needs the same components. For v1.2, the placeholder stays as-is. The `packages/ui` package.json already has the correct exports structure — no changes needed.

**For UI polish (existing components):**

UI polish on existing dashboard components requires no architectural change. Identify specific components to polish (e.g., `BookingCalendar.tsx`, `dashboard-grid.tsx`) and modify them in place. No migration.

**Confidence:** HIGH — verified against actual package structure and import patterns.

---

## Data Flow: Complete v1.2 Picture

### AI Prediction Flow (Existing + Active)

```
Browser → POST /api/v1/ai/predictions/no-show (Next.js)
    → predictNoShow.fire(body)             [circuit breaker]
    → POST http://ai.railway.internal:8000/api/v1/predictions/no-show
    → FastAPI router → NoShowPredictor.predict()
    → returns {no_show_probability, confidence, risk_level}
    ← success response to browser

If AI service is down:
    → circuit breaker opens after 5 failures
    → fallback: getNoShowFallback() → {probability: 0.15, confidence: 0}
```

### Model Training Flow (New)

```
GitHub Actions (weekly cron) or manual dispatch
    → python -m scripts.train_no_show
    → GET http://web.railway.internal:3000/api/internal/features/training/no-show
    → Next.js queries PostgreSQL:
        SELECT bookings.*, customers.no_show_rate, ...
        FROM bookings JOIN customers ...
        WHERE bookings.status IN ('completed', 'no_show')
    ← Returns [{...features, no_show: 0|1}]
    → XGBoost fits on data → saves no_show_v1.0.0.joblib
    → docker build (includes models/) → push to GHCR → redeploy AI service
```

### Landing Page Flow (New)

```
Browser → GET https://schedulebox.cz/
    → Next.js middleware (next-intl locale detection)
    → redirects to /cs
    → renders app/[locale]/(marketing)/page.tsx
    → NO AuthGuard → public content rendered
    → CTA "Vyzkoušet zdarma" → /cs/register → (auth)/register/page.tsx
```

---

## New vs Modified Components

### New Components

| Component | Location | Notes |
|-----------|----------|-------|
| Internal training API routes (6) | `apps/web/app/api/internal/features/training/` | Protected by API key header |
| Marketing route group | `apps/web/app/[locale]/(marketing)/` | layout.tsx + pages |
| Marketing UI components | `apps/web/components/marketing/` | Hero, features, pricing, CTA |
| Railway AI service config | `services/ai/railway.toml` | Dockerfile path, health check |
| Model training CI workflow | `.github/workflows/train-models.yml` | Scheduled + manual |

### Modified Components

| Component | Location | Change |
|-----------|----------|--------|
| `apps/web/.env.example` | Root | Add `AI_SERVICE_URL=http://ai.railway.internal:8000` |
| `services/ai/.env.example` | AI service root | Add `SCHEDULEBOX_API_URL=http://web.railway.internal:3000` |
| Root `app/page.tsx` or `app/[locale]/page.tsx` | Next.js | Redirect `/cs` → marketing home (currently redirects to login if unauthenticated) |

### Not Changed

| Component | Reason |
|-----------|--------|
| `apps/web/lib/ai/client.ts` | Circuit breaker client reads `AI_SERVICE_URL` — only env var changes |
| `apps/web/lib/ai/circuit-breaker.ts` | No changes needed |
| `services/ai/app/` (all routers, models) | Existing skeleton is complete |
| `packages/ui` | Stays as placeholder |
| `apps/web/components/ui/` | Stays in place |
| `apps/web/middleware.ts` | No changes — public routes work without modification |

---

## Build Order and Dependencies

The following order is forced by code dependencies, not preference:

```
Step 1: Internal training API routes (FIRST — unblocks everything else)
    apps/web/app/api/internal/features/training/*.ts
    Reason: Training scripts can't fetch real data until these exist.
    Duration: ~1 day
    Risk: LOW — standard Drizzle queries behind API key check

Step 2: Railway AI service deployment config
    services/ai/railway.toml + Railway environment variables
    Reason: Circuit breaker already exists; AI service can deploy independently.
    Duration: ~2 hours
    Risk: LOW — Dockerfile already production-ready

Step 3: Model training CI workflow
    .github/workflows/train-models.yml
    Depends on: Step 1 (training API routes), Step 2 (railway.toml)
    Reason: Can now train against real data and deploy updated models.
    Duration: ~1 day (workflow + testing)
    Risk: MEDIUM — Prophet and XGBoost may need dependency pinning for CI

Step 4: Landing page (marketing route group + components)
    apps/web/app/[locale]/(marketing)/ + components/marketing/
    Depends on: Nothing (fully independent)
    Duration: ~3 days (design + content)
    Risk: LOW — route group pattern is well understood

Step 5: UI polish (existing components)
    Modify specific components in apps/web/components/
    Depends on: Nothing (independent)
    Duration: Ongoing
    Risk: LOW — in-place modifications, no migration
```

---

## Railway Deployment Implications

### Existing Infrastructure

The project already has a Kubernetes Helm chart (`helm/schedulebox/`) with the AI service defined. If Railway is the actual hosting environment, the Helm chart may be aspirational / future Kubernetes migration. For Railway:

| Helm Template | Railway Equivalent |
|---------------|-------------------|
| `ai-deployment.yaml` | Railway service "ai" with Docker build |
| `configmap.yaml` — `AI_SERVICE_URL` | Railway env var on "web" service |
| `ai-service.yaml` — port 8000 | Railway service port 8000 |

### Service Naming Matters

The Railway internal DNS is `<service-name>.railway.internal`. The service should be named `ai` in Railway so the web service can use `http://ai.railway.internal:8000`. If named differently (e.g., `ai-service`), the URL changes accordingly.

### Model Size and Build Time

The `services/ai/requirements.txt` includes `prophet==1.1.6` which installs `pystan` and has a long build time (~5 min). Railway caches pip installs between builds. First deploy will be slow; subsequent builds with only model file changes will be fast.

### Memory Requirements

The Helm chart specifies `memory: 512Mi` request, `1Gi` limit. Prophet models use ~100-200MB. XGBoost models are ~10-50MB. This headroom is adequate.

### Cold Start

Railway can suspend idle services. The AI service loads all models on startup (`@app.on_event("startup") → load_models()`). If the service cold-starts under load, the circuit breaker on the Next.js side will catch the startup latency and serve fallbacks until the AI service is healthy. This is by design.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct PostgreSQL Connection from Python AI Service

**What:** Having the AI service connect directly to PostgreSQL for feature extraction.
**Why bad:** The AI service then needs database credentials, the Drizzle schema (Python equivalent), and must implement RLS. This duplicates logic and creates a security surface.
**Instead:** Use the internal HTTP API pattern already designed — Next.js handles DB access, AI service calls Next.js internal endpoints.

### Anti-Pattern 2: Committing `.joblib` Model Files to Git

**What:** Checking in trained model files alongside code.
**Why bad:** Model files are 10-500MB each. Git history becomes bloated and slow. Large binary files in git cause clone and CI performance problems.
**Instead:** Train in CI, include in Docker image. If models need versioning independent of code, use Cloudflare R2 (already in the stack) with a model registry pattern.

### Anti-Pattern 3: Migrating All UI Components to `packages/ui` Before v1.2

**What:** Moving all 21 `apps/web/components/ui/*.tsx` files to `packages/ui` as part of v1.2.
**Why bad:** Requires updating 45+ component imports, wiring Tailwind config through the package, and risks breaking the entire UI with no immediate benefit (still only one consumer).
**Instead:** Add new marketing components to `apps/web/components/marketing/`. Migrate `packages/ui` only when a second consumer exists.

### Anti-Pattern 4: Public AI Training Endpoint

**What:** Making `/api/internal/features/training/*` routes accessible without authentication.
**Why bad:** Exposes customer data (booking history, financial data) publicly.
**Instead:** Require `AI_SERVICE_API_KEY` header on all internal routes. Validate with timing-safe comparison. The pattern already exists in the AI service config (`AI_SERVICE_API_KEY: str = ""`).

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|-------------|-------------|------------|
| AI service inference | 1 replica, 512Mi | 2 replicas + autoscaling | Dedicated inference cluster |
| Model training frequency | Weekly on schedule | Weekly still fine | Near-real-time retraining |
| Feature extraction API | Drizzle query, <1s | Add DB read replica | Read replica + caching |
| Landing page performance | Next.js SSG/ISR adequate | CDN + ISR | Same CDN pattern |
| Redis feature cache | TTL 1h adequate | TTL 30min, larger Redis | Redis cluster |

---

## Sources

- Codebase: `services/ai/` (FastAPI skeleton, Dockerfile, training scripts) — HIGH confidence, direct inspection
- Codebase: `apps/web/lib/ai/` (circuit breaker, client, fallbacks) — HIGH confidence, direct inspection
- Codebase: `apps/web/middleware.ts` (next-intl only, no auth) — HIGH confidence, direct inspection
- Codebase: `apps/web/app/[locale]/(dashboard)/layout.tsx` (AuthGuard location) — HIGH confidence
- Codebase: `apps/web/app/[locale]/(auth)/layout.tsx` (route group pattern) — HIGH confidence
- [Railway Private Networking](https://docs.railway.com/guides/private-networking) — MEDIUM confidence for hostname format `<service>.railway.internal`
- [Railway How Private Networking Works](https://docs.railway.com/networking/private-networking/how-it-works) — IPv4/IPv6 resolution details
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) — HIGH confidence for `(marketing)` pattern
- [Railway FastAPI Deploy Guide](https://docs.railway.com/guides/fastapi) — Dockerfile detection and deployment

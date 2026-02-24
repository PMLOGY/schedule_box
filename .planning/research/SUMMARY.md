# Project Research Summary

**Project:** ScheduleBox v1.2 — Product Readiness
**Domain:** AI-powered Scheduling SaaS — Demo Readiness, ML Service, UI/UX Polish, Landing Page, Onboarding
**Researched:** 2026-02-21
**Confidence:** HIGH

---

## Executive Summary

ScheduleBox v1.1 delivered a fully functional platform — booking engine, payments, CRM, notifications, and monitoring — built on a solid Next.js 14 / Drizzle / PostgreSQL / RabbitMQ monorepo. v1.2 is not about adding new functional capabilities; it is about making the platform **sellable**. The four focus areas are: (1) replacing heuristic AI stubs with real trained ML models in a Python FastAPI microservice, (2) UI/UX polish to match Calendly-level booking experience, (3) a Czech-language landing page to drive organic signups, and (4) an onboarding flow that reduces cold-start churn. The key insight from research is that ScheduleBox's AI features — no-show prediction, CLV scoring, dynamic pricing — are genuinely unique in the Czech/Slovak scheduling market. No competitor (Reservio, Bookio, Calendly) offers ML-based predictions. This is the primary differentiator, but only if the models are actually trained and the predictions are visibly surfaced in the UI.

The recommended approach is incremental and additive. The Python AI microservice skeleton (FastAPI routers, circuit breaker in Next.js, Dockerfile, training scripts) already exists — it needs model training and deployment, not a rewrite. The landing page fits as a new `(marketing)` route group in the existing Next.js app, requiring no new infrastructure. UI polish is done in-place on existing components without migrating to `packages/ui`. The entire v1.2 effort is blocked on one missing piece: the internal feature-extraction API routes (`/api/internal/features/training/*`) that training scripts call but that do not yet exist in Next.js. These must be built first.

The key risks for v1.2 are operational rather than architectural. Model version mismatches between training and serving environments will cause silent prediction failures. Railway container restarts will destroy the pricing optimizer's learned MAB state unless it is persisted to Redis. Deploying a landing page with pre-checked cookie consent or fake testimonials risks Czech GDPR violations and demo failures. UI polish that touches `globals.css` without establishing an embed widget visual regression baseline will break the booking widget on customer sites. These are all preventable with the specific controls documented in PITFALLS.md — none require architectural rework if addressed at the start of each phase.

---

## Key Findings

### Recommended Stack

v1.2 adds three new technology areas to the existing stack (Next.js 14, Drizzle ORM, PostgreSQL, Redis, RabbitMQ, Cloudflare R2). The Python AI microservice uses FastAPI 0.129 with uvicorn 0.34 (without Gunicorn — the `tiangolo/uvicorn-gunicorn-fastapi` image is deprecated as of 2025) running on Python 3.12-slim. ML models use scikit-learn 1.8 + XGBoost 3.2 + pandas 3.0.1 + scipy 1.15, persisted with joblib and cached via the existing Redis 7 instance. The one key architecture decision: the Capacity Optimizer is implemented with `GradientBoostingRegressor` (sklearn) rather than LSTM, achieving 80% of LSTM accuracy at 10% of the complexity and avoiding TensorFlow/PyTorch (+500MB Docker image). LSTM can be swapped in for v1.3 via a `CAPACITY_MODEL_TYPE` env var.

Frontend additions are minimal: Motion 12.34 (formerly Framer Motion, imported from `motion/react`) for scroll animations and page transitions; `tw-animate-css` 1.2 replacing the deprecated `tailwindcss-animate` for shadcn/ui Tailwind v4 compatibility; `react-big-calendar` 1.15 for the upgraded booking calendar view with drag-and-drop rescheduling; and `driver.js` 1.4 for onboarding tours. No new backend libraries are needed in Next.js — the AI service is called via plain `fetch()` with timeout through the existing Opossum circuit breaker.

**Core technologies (new additions only):**

- **FastAPI 0.129 + uvicorn 0.34**: Python AI microservice — async ASGI, auto-OpenAPI, meets <100ms latency target; no Gunicorn wrapper
- **scikit-learn 1.8 + XGBoost 3.2**: ML model training and inference — industry standard, joblib-compatible, sklearn 1.6+ incompatibility fixed in XGBoost 3.2
- **pandas 3.0.1 + numpy 2.4 + scipy 1.15**: Feature engineering, ETL pipeline, and Bayesian optimization support
- **APScheduler 3.11**: Weekly model retraining cron inside FastAPI process — avoids Celery overhead for 6-model service
- **asyncpg 0.30**: Async PostgreSQL driver for nightly ETL feature extraction — 3-5x faster than psycopg2 for I/O-heavy workloads
- **openai 2.21**: Voice booking model via GPT-based NLU — the one model legitimately requiring an external LLM API
- **motion 12.34**: Landing page scroll-reveal and page transitions — MIT, Next.js App Router compatible via `'use client'` wrapper component
- **tw-animate-css 1.2**: Tailwind-native component enter/exit animations — shadcn/ui default replacement for deprecated `tailwindcss-animate`
- **react-big-calendar 1.15 + react-dnd 16**: Google-Calendar-style booking view with drag-and-drop rescheduling — MIT, 3.5x more downloaded than FullCalendar
- **driver.js 1.4**: Zero-dependency onboarding tours — framework-agnostic, lighter than react-joyride which has unresolved bugs since 2020

**Explicitly avoid:** TensorFlow/PyTorch (Docker image size), MLflow (separate server overhead), Celery (APScheduler is sufficient), GSAP (commercial license for SaaS), gunicorn as process manager (deprecated pattern), tailwindcss-animate (deprecated by shadcn/ui), ONNX (no latency problem to solve at ScheduleBox's scale).

### Expected Features

v1.2 transforms the platform from "works" to "sells." Feature research identified a clear P1 (demo-ready launch) set, P2 (post-first-customer validation) set, and explicit deferral criteria.

**Must have for v1.2.0 demo-ready launch (P1):**

- **Trained no-show model** — eliminates `confidence: 0.4, fallback: true` visible in demos; XGBoost classifier on 11 pre-defined feature columns; 500 synthetic samples minimum
- **No-show risk badge on booking list** — makes AI tangible; color-coded: red (>50%), yellow (30-50%), green (<30%)
- **Business setup wizard** — 4 steps, completable in <5 minutes, ends with live booking link and QR code
- **Empty states with action prompts** — every empty table and list needs an action-oriented state; no raw blank screens
- **Landing page hero + pricing (Czech)** — hero with live widget embed, 3-tier pricing (Free / CZK 299 / CZK 699), "Začít zdarma" primary CTA
- **Onboarding checklist** — 5-item dashboard widget tracking setup completion, dismissible when done
- **Mobile booking UX audit** — 44px tap targets, smart time slot grouping (Morning/Afternoon/Evening), progress stepper, skeleton loaders
- **Add-to-calendar (ICS endpoint)** — RFC 5545 format, server-side generation, no external library required

**Should have for v1.2.x (P2 — add after first paying customers give feedback):**

- AI insights panel on dashboard ("Your AI found 3 high-risk bookings today")
- Proactive SMS for high-risk bookings (no-show probability > 0.7)
- Industry template presets (8 verticals: salon, fitness, medical, tutoring, etc.)
- Staff photos and bios in booking widget staff selection step
- ROI calculator on landing page (pure client-side JS)
- First 7-day behavioral email sequence triggered by actual usage gaps
- "First booking" celebration screen with confetti animation

**Defer to v2.0+:**

- Natural language / voice booking (OpenAI NLU integration) — 3+ months to build reliably
- Per-tenant AI models — requires >10K bookings per company; SMBs have 50-500
- Capacity forecast chart — Prophet needs real historical data to be credible, not synthetic
- Video product tour — requires professional recording; defer until copy and UX are finalized
- Competitor comparison page — high content maintenance cost

### Architecture Approach

The existing codebase is already well-structured for v1.2 additions. The Python AI service has a complete FastAPI skeleton, Dockerfile, all endpoint routers, circuit breaker in the Next.js client, and training scripts — but the internal feature-extraction API routes that training scripts call do not yet exist in Next.js. This is the only blocking gap in the entire v1.2 architecture. The landing page fits as a `(marketing)` route group in the existing App Router structure, requiring no middleware changes — authentication is enforced by `AuthGuard` inside the dashboard layout, not globally. UI components stay in `apps/web/components/` — migrating to `packages/ui` is deferred because there is currently only one consumer.

**Major components and their v1.2 responsibilities:**

1. **`apps/web` (Next.js)** — Add `(marketing)` route group, internal training API routes (6 routes, API-key protected), no-show risk badge in booking list, business setup wizard, onboarding checklist, empty states, ICS calendar endpoint, marketing components in `components/marketing/`
2. **`services/ai` (FastAPI)** — Train and load real model files; add `railway.toml` for deployment; wire `AI_SERVICE_URL=http://ai.railway.internal:8000` via Railway private networking; set Railway memory limit to 1.5GB for Prophet
3. **`.github/workflows/train-models.yml`** — New weekly CI job: trains all 6 models against real data fetched via internal API, then builds new Docker image with models baked in (for v1.2 simplicity)
4. **`apps/web/components/marketing/`** — New directory for hero section, feature grid, pricing cards, testimonials, CTA section, marketing nav — all independent of dashboard components
5. **`packages/ui`** — Remains a placeholder; not populated in v1.2; only move components here when a second consumer app exists

### Critical Pitfalls

Research identified 8 critical pitfalls (launch blockers if ignored) and 4 moderate pitfalls (recoverable but costly). The top 5 that must be addressed proactively:

1. **joblib model version mismatch** — Models serialized with scikit-learn X load in a runtime with scikit-learn Y and predict garbage silently. `model_loader.py` reports healthy but all predictions return 0.0. Prevention: train inside Docker (same image as serving); save a `.meta.json` sidecar with library versions; validate versions at startup and raise `RuntimeError` if they mismatch.

2. **Pricing MAB state loss on Railway restart** — The Multi-Armed Bandit pricing optimizer writes state to the in-container filesystem, which Railway destroys on restart. The optimizer silently reverts to random pricing and takes weeks to reconverge. Prevention: persist MAB state to Redis after every update; load from Redis on startup with the baked-in JSON as fallback.

3. **Prophet capacity forecaster OOM on first request** — Prophet's Stan backend does JIT compilation on first inference, spiking memory by 300-500MB for 2-3 seconds. If the AI service runs near Railway's memory limit, this causes an OOM restart loop with the health check never passing. Prevention: run a synthetic warmup prediction during `startup_event()`; set Railway memory limit to 1.5GB.

4. **Landing page Czech GDPR violations kill demo credibility** — Czech Electronic Communications Act (2022) requires strict opt-in consent; pre-checked cookie boxes are explicitly illegal. A Czech SMB owner spotting this during a live demo loses trust immediately and the deal is lost. Prevention: opt-in-only consent or Plausible Analytics (no consent required); Czech-language privacy policy; IČO, DIČ, registered address in footer; real testimonials only — fake social proof in a 10M-person market will be discovered.

5. **UI polish breaks embedded booking widget on customer sites** — Changes to `globals.css` CSS custom properties propagate into the embed widget (`/embed/[company_slug]`) already deployed on customer WordPress and Wix sites. Prevention: establish Playwright visual regression baseline for the embed widget before any `globals.css` changes; scope embed CSS to isolated `--embed-*` custom properties; never reference `var(--primary)` inside embed components.

---

## Implications for Roadmap

Based on combined research, phase ordering is driven by three hard dependencies: (1) internal training API routes must exist before any ML training can use real data; (2) real AI models must be trained before the AI-dependent UI features can show meaningful results; and (3) the landing page live widget embed requires a seeded demo company before it can demonstrate anything. The onboarding flow and booking UX audit are fully independent and can proceed in parallel with AI work, but are sequenced after the landing page so that the booking widget is polished when new sign-ups from the landing page first encounter it.

### Phase 1: AI Service — Training Pipeline and Model Deployment

**Rationale:** The single hardest blocker. The AI service skeleton exists but has zero trained models and zero internal training API routes. Everything AI-visible in the UI (no-show badge, AI insights panel) depends on this phase producing real model files with `confidence > 0.5, fallback: false`. The pricing optimizer's MAB state persistence must be designed here — not retrofitted later when state has already been lost in production.

**Delivers:** 6 internal training API routes in Next.js (`/api/internal/features/training/*`, protected by `AI_SERVICE_API_KEY`); trained no-show predictor (XGBoost, 500 synthetic samples minimum); trained CLV predictor (Random Forest); pricing optimizer Redis state persistence; model versioning `.meta.json` sidecars; model validation at startup (version mismatch raises RuntimeError); weekly model retraining CI workflow (`.github/workflows/train-models.yml`); Railway AI service deployment with `railway.toml`, correct 1.5GB memory limit, and Prophet startup warmup; CPU-bound inference in `ThreadPoolExecutor` (not blocking async event loop).

**Addresses:** Trained no-show model (P1), model versioning in responses (P1)

**Avoids:** joblib version mismatch (Docker-based training + `.meta.json` validation); Pricing MAB state loss (Redis persistence from day 1); Prophet OOM (startup warmup + memory limit); unauthenticated AI endpoints (startup validation: raise if production and `AI_SERVICE_API_KEY` is empty string); single-worker CPU blocking (`run_in_executor(ThreadPoolExecutor(max_workers=4))`)

**Research flag:** Validate R2 model download latency at AI service cold start before deciding between baking models into Docker image vs downloading from R2 at startup. If R2 download exceeds Railway's 30-second health check timeout, baking into Docker image is the only v1.2 option.

### Phase 2: AI-Powered UI Surfaces

**Rationale:** With real models deployed from Phase 1, the no-show risk badge and AI insights panel can show data that is actually meaningful. Building these before models are trained would require permanent mocking that misrepresents the feature. This phase surfaces the v1.2 AI investment where it will be seen in demos.

**Delivers:** No-show risk badge on every booking management list row (color-coded: red/yellow/green); no-show probability on booking detail page (scored asynchronously after booking creation, not blocking the booking flow); AI insights dashboard panel showing daily digest of high-risk bookings; confidence transparency UI (show "AI confidence: 82%" when trained; show "Insufficient data — add more bookings to improve predictions" when confidence < 0.5); onboarding state for new companies ("AI features activate after 10 bookings" with progress indicator).

**Addresses:** No-show risk badge (P1), AI insights panel (P2 groundwork)

**Avoids:** Real-time ML inference on booking creation (adds 200-400ms; score asynchronously via RabbitMQ event instead); showing raw probability scores to non-technical users (display "High risk — consider SMS reminder" not "0.847"); custom AI model per company (global model with customer history features — SMBs have 50-500 bookings, not 10K)

**Research flag:** None — standard React Query + existing API integration. No new patterns required.

### Phase 3: Landing Page and Czech Legal Compliance

**Rationale:** The landing page is architecturally independent (new route group, no backend changes) but is placed third because: (a) the live widget embed in the hero requires a working booking widget, and (b) legal compliance (GDPR cookie consent, Czech legal footer) must be complete before any external demos. Social proof content (real testimonials from beta customers) is a business-side dependency that must be confirmed before the coding phase begins — not as an afterthought.

**Delivers:** `(marketing)` route group (`app/[locale]/(marketing)/`) with marketing layout (no `AuthGuard`, no sidebar); Czech-language hero section with live widget embed and "Začít zdarma" primary CTA; 3-tier pricing page (Free / CZK 299 / CZK 699); feature grid (6 cards); trust badge row (GDPR, Czech hosting, Comgate, bank-level security); real testimonials or an honest "In beta since 2026" counter (never fabricated numbers); footer with IČO, DIČ, registered address; Czech privacy policy (`/cs/privacy`) and terms of service (`/cs/terms`); strict opt-in cookie consent (or Plausible Analytics to avoid consent requirement entirely); Lighthouse performance score >90 (SSR/SSG, `next/image` for hero, no above-the-fold client JS).

**Addresses:** Landing page hero + pricing (P1), Czech-language copy (P1), mobile performance (P1)

**Avoids:** Pre-checked cookie consent boxes (Czech Electronic Communications Act violation, UOOU fine risk); fake testimonials (B2B trust destruction in a 10M-person market); English-only landing page; "Request a demo" as primary CTA (24-48h delay kills SMB self-serve momentum); long testimonial carousel (broken on mobile); Google Analytics without consent management (illegal under Czech law)

**Research flag:** None — route group pattern verified against existing codebase and App Router documentation. Legal content (IČO, privacy policy text) is a business/legal dependency, not a technical research question.

### Phase 4: Booking UX Polish and Calendar Upgrade

**Rationale:** The booking UX audit has no external dependencies. It is placed after the landing page because the landing page drives new inbound traffic that immediately encounters the booking widget — polish should precede that traffic arriving. Critically, the embed widget visual regression baseline must be established as the first action in this phase, before any CSS changes, to prevent breaking the widget on customer sites.

**Delivers:** Playwright visual regression baseline for embed widget (established before any `globals.css` edits); upgraded `react-big-calendar` booking view (day/week/month, CSS variable overrides to match shadcn/ui theme); drag-and-drop rescheduling via react-dnd; smart time slot grouping by Morning/Afternoon/Evening (client-side, no API changes); 44px minimum mobile tap targets on calendar cells; progress stepper showing current step and total ("Step 2 of 4: Choose time"); skeleton loaders on slot fetch (not blank white screens); transparent total display before Comgate payment redirect; add-to-calendar ICS endpoint (`/api/v1/bookings/[id]/calendar.ics`); micro-animations on booking confirmation (Motion 0.3s fade-in + scale on success icon); staff photos and bios in booking widget staff selection step; shadcn/ui `npx shadcn diff` audit before any component changes (document all custom overrides first).

**Uses:** motion 12.34 (booking confirmation animation, `'use client'` wrapper pattern), react-big-calendar 1.15 + react-dnd 16 (calendar upgrade), tw-animate-css 1.2 (component enter/exit animations)

**Addresses:** Mobile booking UX audit (P1), add-to-calendar (P1), instant slot feedback, progress indicator, transparent total, staff photos (P2)

**Avoids:** UI polish breaking embedded widget (visual regression baseline first); shadcn/ui CLI overwriting custom component variants (run `npx shadcn diff` before any `npx shadcn add` on existing components); booking flow changes breaking in-flight customer sessions (old query param aliases required for one full deploy cycle); live chat during booking (requires staffing, most questions answered by better service descriptions)

**Research flag:** None — Motion + Next.js App Router `'use client'` wrapper pattern is verified in STACK.md. react-big-calendar shadcn theming via CSS variable overrides is a medium-complexity but well-documented integration.

### Phase 5: Onboarding and Business Setup Wizard

**Rationale:** The onboarding wizard is fully independent — it calls existing APIs (company creation, service creation, working hours, all built in v1.1). Placed last because the wizard's final step shows the live booking link, and that booking widget should be polished (Phase 4) when owners experience it for the first time. Industry template presets and the 7-day email sequence are included here as P2 scope, triggered by data from first paying customers.

**Delivers:** 4-step business setup wizard (Company details + logo → First service → Working hours → Share booking link); "Your booking link is ready" moment with booking URL and QR code; copy-to-clipboard with browser feedback; 5-item onboarding checklist dashboard widget (dismissible after completion); empty states with action prompts on every previously-blank table and list; demo company data option ("Beauty Studio Praha" with 3 services, 10 past bookings, 5 customers, AI predictions active — clearly labeled "Demo data"); Driver.js-powered contextual tooltips on first visit to each dashboard section (never repeated); industry template presets for 8 verticals with pre-filled Czech service names and CZK pricing; "First booking" celebration screen with confetti animation and social share button; 7-day behavioral email sequence triggered by actual usage gaps (Day 1: booking link live; Day 3: enable SMS reminders if not done; Day 5: add team if still solo; Day 7: AI learning summary).

**Uses:** driver.js 1.4 (tooltip tour via `'use client'` component), existing APIs (company, service, working hours)

**Addresses:** Business setup wizard (P1), empty states (P1), onboarding checklist (P1), industry templates (P2), first booking celebration (P2), 7-day email sequence (P2)

**Avoids:** Mandatory phone verification at signup (7% conversion drop per extra step); product tours longer than 5 steps (users click through without reading); forced service pricing blocking wizard progress ("Free / Price on consultation" is a valid option); Google Calendar OAuth as an early onboarding step (40% drop-off from consent screen — make it optional, promote in step 5+); workflow "improvements" that add steps for rare mistakes rather than removing steps from common paths

**Research flag:** None — all underlying APIs exist; this is UI composition and email sequence work on top of a complete backend.

### Phase Ordering Rationale

- **AI first** because all AI-visible UI features depend on trained models and the internal training API routes. Building the risk badge before models exist produces permanently mocked UI.
- **AI UI surfaces second** because the no-show badge on the booking list is a P1 feature and must be demo-ready before the landing page drives signups.
- **Landing page third** (not first) because the live widget embed in the hero requires a working, non-broken booking widget; and because legal compliance must precede any external demo or public launch.
- **Booking UX before onboarding** because the onboarding wizard's aha moment is when the owner sees and shares their live booking link — that booking widget should be polished before owners encounter it.
- **Onboarding last** because it layers on top of everything else: a polished wizard leading to a polished booking widget backed by a working AI service.
- **Internal training API routes as the absolute first deliverable** within Phase 1 because they unblock all ML training. Without them, training is limited to 500 synthetic samples with no path to real-data improvement.

### Research Flags

Phases needing deeper research validation during planning or implementation:

- **Phase 1 — R2 vs Docker image model storage:** PITFALLS.md recommends R2-based model loading (avoids 10-minute deploys). ARCHITECTURE.md recommends baking into Docker image for v1.2 simplicity. The deciding factor is R2 download latency at cold start vs Railway's health check timeout (30s). Validate this before committing. If R2 download + model loading takes <25s, use R2. Otherwise, bake into Docker image and accept longer deploy times.
- **Phase 1 — Redis MAB TTL and key structure:** Research the right TTL for the pricing optimizer MAB state. 30-day TTL is the current recommendation but needs validation against the actual update frequency and business restart patterns.

Phases with standard, well-documented patterns (skip additional research):

- **Phase 2 — AI UI surfaces:** Standard React Query polling + existing Next.js API integration. No new patterns.
- **Phase 3 — Landing page route group:** `(marketing)` route group architecture verified against existing codebase middleware and App Router conventions. Confidence is HIGH.
- **Phase 4 — Booking UX:** react-big-calendar + Motion + tw-animate-css patterns all have official documentation; Next.js App Router compatibility confirmed in STACK.md.
- **Phase 5 — Onboarding:** All underlying APIs exist in v1.1. Driver.js is framework-agnostic with zero dependencies; no integration research needed.

---

## Confidence Assessment

| Area         | Confidence | Notes |
| ------------ | ---------- | ----- |
| Stack        | HIGH       | Versions verified against PyPI, npm, and official docs as of Feb 2026. scikit-learn 1.8, XGBoost 3.2, pandas 3.0.1, Motion 12.34, driver.js 1.4 all confirmed stable. Key caveat: pandas 3.0 Copy-on-Write default is a breaking change from 2.x — code patterns must be updated (use `.assign()` or explicit `.copy()` before mutation). |
| Features     | MEDIUM-HIGH | AI model training feature importance verified against multiple medical scheduling studies achieving 86%+ accuracy (HIGH). Booking UX patterns (Calendly baseline, 44px tap targets) verified via multiple independent UX studies (MEDIUM). Competitor feature parity (Reservio, Bookio) based on publicly available feature lists and indirect sources (MEDIUM). |
| Architecture | HIGH       | Integration points verified directly against the existing codebase: `services/ai/` skeleton, `apps/web/lib/ai/` circuit breaker, `middleware.ts` (intl only, no global auth), route group pattern in `(auth)/` and `(dashboard)/`. Railway private networking hostname format (`<service>.railway.internal`) is MEDIUM — community-verified but not exhaustively documented by Railway. |
| Pitfalls     | MEDIUM-HIGH | Critical pitfalls backed by official sources: sklearn model persistence docs, Czech Electronic Communications Act (2022 amendment), FastAPI/uvicorn concurrency docs, XGBoost issue tracker. Railway-specific memory and OOM behavior is MEDIUM — based on community help station reports rather than official Railway documentation. |

**Overall confidence: HIGH**

### Gaps to Address

- **R2 vs Docker image model storage tension:** The architecture research and pitfalls research give different recommendations. Resolve empirically: build with Docker image baking first (Phase 1), measure deploy times once the first model exists, migrate to R2 model loading if deploys exceed 5 minutes. Do not pre-optimize.

- **Real training data quality:** Training with 500 synthetic samples is sufficient for demo-readiness (replaces `confidence: 0.4` responses). But actual confidence levels from synthetic data are unknown until the model is trained. If the resulting model still shows `confidence < 0.5`, the synthetic data patterns need improvement before the "AI features" claim holds up in demos. Build the training validation check before declaring Phase 1 complete.

- **Czech legal content is a business dependency:** The development team cannot write the Czech privacy policy, terms of service, or IČO/DIČ footer content. These require input from the business/legal side and must be scheduled before the landing page phase begins. This is a coordination dependency, not a technical one.

- **Real testimonials are a business dependency:** The research is unambiguous that fake testimonials in a 10M-person market are a serious trust and legal risk. The business team must secure at least 3 written beta customer testimonials before the landing page ships. If unavailable, the testimonials section is omitted and replaced with an honest beta counter. Do not code the testimonials section until the content is confirmed real.

- **Railway `railway.toml` syntax:** ARCHITECTURE.md has MEDIUM confidence on the exact toml format. Verify against current Railway documentation before creating the file — Railway docs are actively maintained and the format may have changed.

---

## Sources

### Primary (HIGH confidence)

- FastAPI 0.129.0 release — https://pypi.org/project/fastapi/
- scikit-learn 1.8.0 release notes — https://scikit-learn.org/stable/whats_new.html
- XGBoost 3.2.0 sklearn 1.6+ incompatibility fix — https://github.com/dmlc/xgboost/issues/11093
- NumPy 2.4.2 release — https://numpy.org/news/
- pandas 3.0.1 Copy-on-Write default — https://pandas.pydata.org/docs/whatsnew/v3.0.0.html
- Motion 12.34.2 + Next.js App Router pattern — https://motion.dev/docs/react
- tw-animate-css replacing tailwindcss-animate — https://ui.shadcn.com/docs/tailwind-v4
- driver.js 1.4.0 — https://www.npmjs.com/package/driver.js
- OpenAI Python SDK 2.21.0 — https://pypi.org/project/openai/
- uvicorn without gunicorn (modern pattern) — https://fastapi.tiangolo.com/deployment/docker/
- Railway FastAPI Deployment Guide — https://docs.railway.com/guides/fastapi
- Railway Private Networking — https://docs.railway.com/guides/private-networking
- Next.js Route Groups — https://nextjs.org/docs/app/api-reference/file-conventions/route-groups
- scikit-learn Model Persistence — https://scikit-learn.org/1.5/modules/model_persistence.html
- XGBoost pickle version incompatibility — https://github.com/dmlc/xgboost/issues/6264
- Czech Electronic Communications Act 2022 cookie opt-in requirement — https://secureprivacy.ai/blog/czech-cookie-law
- Czech cookie consent requirements — https://www.cookieyes.com/blog/cookie-consent-czech-republic/
- shadcn/ui Changelog 2025 (toast → sonner, tailwindcss-animate deprecation) — https://ui.shadcn.com/docs/changelog
- Opossum Node.js Circuit Breaker — https://github.com/nodeshift/opossum
- Codebase: `services/ai/` (FastAPI skeleton, Dockerfile, training scripts) — direct inspection
- Codebase: `apps/web/lib/ai/` (circuit breaker, client, fallbacks) — direct inspection
- Codebase: `apps/web/middleware.ts` (intl only, no global auth) — direct inspection

### Secondary (MEDIUM confidence)

- No-show prediction feature importance and accuracy benchmarks — https://pmc.ncbi.nlm.nih.gov/articles/PMC11729783/ (UAE study, 86% accuracy); https://www.nature.com/articles/s41746-022-00594-w (pediatric no-show ML)
- Railway memory OOM community reports — https://help.railway.com/questions/memory-leak-in-fast-api-only-on-railway-f80c567b
- APScheduler for FastAPI background tasks — https://apscheduler.readthedocs.io (community-verified pattern)
- react-big-calendar vs FullCalendar npm trends — https://npmtrends.com/fullcalendar-vs-react-big-calendar
- Booking UX best practices 2025 — https://ralabs.org/blog/booking-ux-best-practices/
- Calendly onboarding checklist analysis — https://useronboarding.academy/user-onboarding-inspirations/calendly
- Czech GDPR requirements — https://www.termsfeed.com/blog/czech-republic-gdpr/
- Competitor analysis: Reservio 2025 highlights — https://www.reservio.com/blog/building-reservio/2025-highlights
- Bookio vs Reservio comparison — https://roi-index.com/blog/porovnanie-rezervacnych-systemov-bookio-a-reservio/
- B2B SaaS landing page conversion rates 2026 — https://firstpagesage.com/seo-blog/b2b-landing-page-conversion-rates/
- SaaS onboarding best practices 2025 — https://productled.com/blog/5-best-practices-for-better-saas-user-onboarding
- ML model versioning best practices — https://lakefs.io/blog/model-versioning/

### Tertiary (LOW confidence — needs validation)

- Prophet Stan backend JIT memory spike magnitude (300-500MB estimate) — community reports, not official Prophet documentation; validate by profiling in Railway staging before production deploy
- Railway `railway.toml` exact syntax for Dockerfile-based services — verify against current Railway documentation before implementing; format has changed in the past

---

_Research completed: 2026-02-21_
_Ready for roadmap: yes_

# Feature Landscape: ScheduleBox v1.2 — Product Readiness

**Domain:** AI-powered Scheduling SaaS — Demo Readiness & Product Polish
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH (AI model training practices HIGH via official docs; UX patterns MEDIUM via multiple web sources; market/competitor analysis MEDIUM via indirect sources)

---

## Context

ScheduleBox v1.1 shipped a working platform (booking, payments, CRM, notifications, monitoring). v1.2 is about making it **sellable**: the sales team needs a product that looks finished and can close SMB owners in a demo.

**What already exists (do not rebuild):**
- Full booking engine: wizard, calendar, availability, double-booking prevention
- Payment processing (Comgate), CRM, loyalty program, automation builder
- 7 AI model endpoints returning heuristic fallbacks (no real ML yet)
- Email/SMS notifications, DKIM/DMARC, monitoring/alerting
- Admin dashboard with analytics, employee/resource/service management
- Public booking widget and marketplace
- i18n (cs/sk/en), WCAG accessibility

**What's missing for "demo-ready":**
1. Real AI models (endpoints exist but return fake confidence=0.4)
2. Polished booking UX (functional but clunky)
3. A landing page that converts SMB owners (none exists)
4. Onboarding flow for new businesses (cold-start is painful)

---

## Category 1: Real AI Models

### Table Stakes (AI Category)

Features that make the AI endpoints credible. With heuristic fallbacks, confidence=0.4 and "fallback: true" in API responses — visible in demos.

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|-----------|-------|
| **Trained no-show predictor** | "AI-powered" is the core value prop; heuristic fallbacks are a liability in demos | HIGH | XGBoost classifier, 11 feature columns already defined. Training script exists (`scripts/train_no_show.py`). Needs real or synthetic training data + model.joblib file loaded at startup. Min ~500 samples for meaningful accuracy. |
| **Trained CLV predictor** | Customer lifetime value underpins loyalty tier assignment and marketing segmentation | HIGH | scikit-learn regression, `scripts/train_clv.py` exists. Pairs with loyalty program already built. |
| **Trained pricing optimizer state** | Thompson Sampling bandit exists but has no learned state — always returns midpoint price | MEDIUM | Not a trained model; needs to persist state (`pricing_optimizer.json`) across restarts and accumulate signal from bookings. Redis-based state accumulation. |
| **Health score calculator** (already works) | Pure RFM heuristic, no ML needed — already returns meaningful results | LOW | Already functional per `model_loader.py`. Just needs UI surface. |
| **Model versioning in responses** | "model_version: heuristic" kills trust in demos | LOW | Replace with "model_version: v1.0.0" when trained model loads. Already in code, just needs model files. |
| **No-show risk on booking list** | Owners need to see which bookings are high-risk today | MEDIUM | Surface no-show probability from AI in booking management UI. Color-coded badge: red (>50%), yellow (30-50%), green (<30%). |

### Differentiators (AI Category)

Features that make ScheduleBox's AI tangible and demonstrable.

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| **AI insights panel on dashboard** | "Your AI found 3 high-risk bookings today" — concrete, actionable, demoes well | MEDIUM | Dashboard widget: daily digest of no-show risks, revenue optimization suggestions from pricing model, capacity alerts. Calls existing `/api/v1/predictions/*` endpoints. |
| **Proactive SMS for high-risk bookings** | AI prediction + automatic action = real value vs manual process | MEDIUM | When no-show probability > 0.7, auto-queue additional SMS reminder 2h before booking. Pairs with notification worker already built. Configurable threshold in settings. |
| **Synthetic training data pipeline** | Ships trained models on day 1 without real customer data | HIGH | Training scripts already generate 500 synthetic samples. Improve synthetic generation to 2000+ samples with realistic Czech/Slovak business patterns (salon, fitness, medical). Run training in CI, commit model files to repo or store in R2. |
| **Confidence indicator transparency** | Show owners "AI confidence: 82%" vs "heuristic fallback" — honest system builds trust | LOW | Already in API responses. Surface in UI. When confidence < 0.5, show "Insufficient data — add more bookings to improve predictions." |
| **Capacity forecast chart** | "Your busiest hour is Tuesday 11am — open more slots" = actionable intelligence | HIGH | Prophet-based forecaster (`models/capacity.py`) exists but returns empty list without trained model. Train with synthetic weekly patterns. Display as heatmap or bar chart in AI dashboard. |

### Anti-Features (AI Category)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| **Real-time ML inference on every booking create** | "AI should score immediately" | Adds 200-400ms latency to booking creation; customer-facing flows must be <100ms | Score asynchronously via RabbitMQ event after booking created; display on booking detail page |
| **Custom AI model per company** | Enterprise differentiation | Each company needs >10K bookings for meaningful per-tenant models; SMBs have 50-500 bookings | Single global model trained on all anonymized data, personalized via customer history features |
| **Natural language booking via chat** | Looks impressive in demos | Requires LLM integration, voice/text parsing, calendar conflict resolution — 3+ months to build reliably | Use existing voice router (already scaffolded) with OpenAI; defer to v2.0 |
| **AI-generated email content** | "Personalized at scale" | Hallucination risk for appointment details (wrong time, wrong service); high trust requirement | Templated emails with AI-suggested subject lines only; existing notification templates are safer |

---

## Category 2: Premium Booking UX

### Table Stakes (UX Category)

Features where Calendly/Reservio set the baseline expectation. SMB owners have tried these tools; ScheduleBox must meet the bar.

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|-----------|-------|
| **Instant slot feedback** | When clicking a date, available times should appear without page reload or >300ms spinner | LOW | Already using React Query — check if slots are being cached or showing loading states. If spinner >300ms, add skeleton loader. |
| **Mobile-first calendar picker** | 40%+ Czech users on iOS (based on regional estimates); tap targets must be ≥44px | MEDIUM | Existing date picker needs audit: cell padding, thumb-friendly spacing, no hover-only states. Test on real iPhone/Android device. |
| **Clear unavailability display** | Booked/blocked slots must look obviously different from available ones — not just grayed | LOW | Color contrast AA compliance + strikethrough or hatching pattern, not just opacity change. |
| **Progress indicator in booking wizard** | Calendly shows "Step 2 of 4" — users need to know how far they are | LOW | Stepper component with step names (Service → Staff → Time → Details → Payment). |
| **Transparent total before payment** | 76.6% of users abandon at unexpected charges; show total (price + any fees) before payment redirect | LOW | Display total in step before Comgate redirect. Already calculated, just needs UI surfacing. |
| **Guest checkout (no account required)** | Requiring account creation before booking kills conversion | LOW | Public booking widget already works without login. Verify no auth wall exists in the widget flow. |
| **Booking confirmation page** | After payment, user needs clear "You're booked!" with all details | LOW | Confirmation page already exists — audit content: service, staff, date/time, location, cancellation policy, add-to-calendar button. |
| **Add to calendar (Google/Apple/Outlook)** | Standard expectation post-booking; every competitor has it | LOW | Generate `.ics` file from booking data. Single API endpoint returning ICS content-type. No external library needed. |
| **Cancellation self-service link** | Businesses get support tickets when customers can't cancel; email must include cancel link | LOW | Cancellation link in confirmation email already exists — verify it works end-to-end and shows proper confirmation screen. |

### Differentiators (UX Category)

Features that make the booking experience feel noticeably better than Reservio/Bookio.

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| **Staff photo + bio on booking widget** | Customers choose their preferred stylist/therapist by face — personal connection drives bookings | MEDIUM | Extend employee entity to include photo URL (R2 upload) and short bio. Display in staff selection step of booking wizard. |
| **Real-time slot count indicator** | "Only 2 slots left today" creates urgency and is factually accurate | LOW | Count available slots in the selected time window; show if <= 3. Prevents overbooking anxiety. |
| **Micro-animations on booking confirmation** | Calendly's checkmark animation makes the booking feel complete and satisfying | LOW | Framer Motion or CSS animation on booking success state. 0.3s fade-in + scale on the success icon. |
| **Smart time slot grouping** | Group available times by "Morning", "Afternoon", "Evening" instead of a raw 30-item scrollable list | LOW | Client-side grouping of time slots by hour ranges. Makes the UX scan-friendly. |
| **Inline service description expand** | Show service details on click/tap without leaving the page — reduce "what does this include?" uncertainty | LOW | Accordion expand on service card. Shows duration, price, what's included, any prep instructions. |
| **Automatic timezone detection** | Czech/Slovak customers booking for international clients — show slots in correct timezone | MEDIUM | Use `Intl.DateTimeFormat().resolvedOptions().timeZone` on client. Store booking in UTC (already), display in detected TZ. |
| **Buffer time visibility for customers** | "Next available after this: 2pm" — shows buffer time is respected, builds trust | LOW | After showing a slot, show when the provider is next free. Already tracked in availability engine. |

### Anti-Features (UX Category)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| **Live chat during booking** | Reduce abandonment via support | Requires staffing or chatbot; most questions answered by service description | Improve service descriptions and inline FAQ; add "Questions? Call us" phone link in widget footer |
| **Waiting list / standby queue** | Fill cancellations automatically | Double-booking risk if slot fills while notifying waitlist; complex race conditions | Simple "notify me if slot opens" email opt-in; staff manually confirm from dashboard |
| **Social login (Google/Facebook) on public widget** | Reduce friction | Requires OAuth in public/untrusted context, GDPR consent complexity for third-party cookies | Email-only confirmation works fine for appointment booking; OAuth for dashboard only |
| **Multi-step upsell flow inside booking** | Revenue maximization | Adds steps and friction to booking completion; Czech/Slovak SMBs have simpler service catalogs | Show "customers also book" suggestions only on confirmation page, after booking is complete |

---

## Category 3: Landing Page

### Table Stakes (Landing Page Category)

Elements that every SaaS landing page must have to not look amateur. SMB owners will judge ScheduleBox's quality by how its own website looks.

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|-----------|-------|
| **Hero section with clear value proposition** | "What does this do for me in 5 seconds?" — SMB owners are busy and skeptical | LOW | Headline formula: "[Outcome] for [Business type] without [Pain]". Example: "Plné rezervace. Žádné telefony. Pro salóny, kliniky a studia." Single primary CTA: "Začít zdarma" (no credit card). |
| **Live/interactive booking widget demo** | Show don't tell; embed the actual ScheduleBox widget with test company data | MEDIUM | Embed public widget (`/[company_slug]`) with a demo company pre-seeded. SMB owner sees the exact customer experience immediately. |
| **Social proof section** | Trust barrier is the #1 conversion killer for new SaaS; 37% average conversion lift from social proof | LOW | 3 testimonials minimum (real or realistic beta user quotes), number of bookings processed (use a realistic growing counter), company logos if any pilot customers exist. |
| **Pricing section** | SMB owners decide on price before anything else; hiding it reduces trust | LOW | 3 tiers: Free (limited bookings), Starter (CZK 299/mo), Pro (CZK 699/mo). "No credit card required" on free tier CTA. Annual discount (2 months free). |
| **Features section** | Explain capabilities concisely; use icons not walls of text | LOW | 6 feature cards with icons: Online Booking, AI No-Show Prevention, Payments, Team Management, Analytics, Notifications. |
| **Mobile performance** | 82.9% of landing page traffic is mobile; 1s load = 3x conversion vs 5s load | MEDIUM | Static/SSR landing page. No client-side JS for above-the-fold content. Optimize images with next/image. Target Lighthouse score >90. |
| **Czech-language copy** | Primary market is Czech/Slovak SMBs; English-only = immediately disqualified | LOW | All landing page copy in Czech. Language toggle for Slovak (sk) variant. URL: schedulebox.cz (not .com). |

### Differentiators (Landing Page Category)

Features that make the landing page stand out and convert better than generic SaaS templates.

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| **Industry-specific hero variants** | "For hair salons" / "For fitness studios" / "For medical clinics" — relevance beats generic | MEDIUM | `/salony`, `/fitness`, `/kliniky` landing page variants with industry-specific screenshots and testimonials. One shared component, different copy/images. |
| **ROI calculator** | "Save 3 hours/week and reduce no-shows by 30%" — concrete number makes value tangible | MEDIUM | Simple inputs: number of bookings/week, average booking value, current no-show rate. Outputs: hours saved, revenue recovered. Pure client-side JS calculation. |
| **"See it in 60 seconds" video** | Interactive demos increase engagement 30-40% longer; video converts skeptical SMB owners | HIGH | Screen recording of: sign up → add service → share booking link → customer books → owner sees booking + AI risk score. Under 90 seconds. No voiceover needed (captions in Czech). |
| **Trust badge row** | GDPR compliant, Czech hosting, bank-level security — addresses local market concerns | LOW | Static badge row below hero: "GDPR compliant", "CZ/SK support", "Comgate payments", "Bank-level security". |
| **Competitor comparison table** | SMB owners google "Reservio alternative" — capture this intent | MEDIUM | Side-by-side vs Reservio and Bookio. Columns: Price, AI features, No-show prediction, Czech support, Free tier. ScheduleBox wins on AI and price. |

### Anti-Features (Landing Page Category)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| **"Request a demo" as primary CTA** | Enterprise SaaS norm | SMBs self-serve; a demo request adds a 24-48h delay and kills momentum | Primary CTA is "Start free" (instant); secondary CTA is "See a 3-min tour" (the video) |
| **Long scrolling testimonial carousel** | More social proof = more trust | Carousel UX is broken on mobile; autoplay distracts attention from CTA | Static 3-card testimonial grid; no carousel |
| **Chat widget on landing page** | Capture leads who have questions | Adds >100KB JS, slows page, bot responses feel impersonal for local market | Prominent WhatsApp/email contact link in nav for Czech/Slovak-style direct communication |
| **Cookie consent banner with full analytics** | GDPR compliance requirement | Full analytics setup (GA4 + Facebook Pixel + Hotjar) can be done later; complexity slows launch | Simple first-party analytics only at launch (Next.js + server-side logging); add third-party analytics post-launch |

---

## Category 4: Onboarding Flow

### Table Stakes (Onboarding Category)

Steps that every scheduling SaaS must guide new businesses through. Without these, cold-start churn is >70% within 48h.

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|-----------|-------|
| **Business setup wizard (4 steps max)** | Calendly's aha moment = first booking link shared; SMB owners need equivalent aha moment | MEDIUM | 4-step wizard: (1) Company details + logo, (2) Add first service (name, duration, price), (3) Set working hours, (4) Share booking link. Completable in <5 minutes. |
| **"Your booking link is ready" moment** | The aha moment for scheduling SaaS is when the owner sees their live booking page | LOW | After wizard step 4, show the actual booking URL (`/[slug]`) and a QR code. "Share this link with your first customer." Clear copy-to-clipboard button. |
| **Onboarding checklist with progress bar** | Checklists increase completion by 21% when first action shows "25% done" | LOW | Persistent sidebar or dashboard widget showing: ✓ Profile complete, ✓ First service added, □ First booking received, □ Payment method set up, □ SMS notifications on. Dismissible after all complete. |
| **Empty states with action prompts** | Empty booking list should guide, not confuse; "No bookings yet — here's how to get your first one" | LOW | Every empty state has: illustration, headline, 1 primary action button, 1 contextual tip. No raw empty tables. |
| **Demo company data option** | "Load sample data" lets owners explore the full dashboard before committing | LOW | One-click seed with realistic Czech business: "Beauty Studio Praha", 3 services, 10 past bookings, 5 customers, AI predictions active. Clearly labeled "Demo data — remove anytime." |

### Differentiators (Onboarding Category)

Features that make new business owners feel immediately successful.

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| **"First booking" celebration screen** | Positive reinforcement when first real booking arrives — memorable moment | LOW | Toast notification + modal: "Vaše první rezervace! [Customer name] si rezervoval [Service] na [Date]." Confetti animation. Share button for social media. |
| **Contextual tooltips on first visit** | Show what each dashboard element does without overwhelming — trigger on first page visit only | LOW | Use a library like Driver.js (5KB) or custom tooltip sequence. Dismiss after first interaction. Never repeat. |
| **Industry template presets** | "I'm a hair salon" → pre-fills services (Střih, Barvení, Melír) with typical Czech prices | MEDIUM | 8 industry templates: salón, fitness, masáže, kosmetika, lékař, zubař, tutoring, fotografie. Each has 3-5 pre-filled services with CZK pricing, typical duration, buffer times. |
| **Booking widget installation guide** | Show owners exactly how to add the booking button to their website/Facebook | LOW | Step-by-step with screenshots for: copy embed code → paste in WordPress/Webflow/Wix. Include Facebook "Book Now" button setup guide. |
| **First 7-day email sequence** | Product-led emails reduce churn; send contextual tips based on what they haven't done yet | MEDIUM | Day 1: "Your booking link is live" + how to share. Day 3: "Enable SMS reminders" if not done. Day 5: "Add your team" if still solo. Day 7: "Your AI is learning — here's what it knows." Triggered by actual usage state. |

### Anti-Features (Onboarding Category)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| **Mandatory phone verification at signup** | Reduce spam/fake accounts | Every extra verification step costs 7% conversion; Czech SMBs are trust-based not anonymous | Email verification only; add phone number collection in payment setup flow where it's expected |
| **Long product tour (>5 steps)** | Teach all features at once | Long tours are ignored; users click through without reading; 2025 standard is contextual triggers | First-visit checklist + contextual tooltips triggered by first visit to each section |
| **Forced service pricing (can't skip)** | Ensure complete profile | Owners who don't know pricing yet abandon; price can be set later | Allow "Free / Price on consultation" as valid option; never block progress for optional fields |
| **"Connect your Google Calendar" as step 1** | Power feature for sync | OAuth consent screen terrifies non-technical SMB owners; 40%+ drop-off | Make calendar sync an optional enhancement, promoted in step 5+; not required for basic function |

---

## Feature Dependencies

```
Real AI Models
  ├─ requires: Training data (synthetic OR real bookings)
  │  └─ requires: `scripts/train_no_show.py` executed, model.joblib stored in MODEL_DIR
  │     └─ requires: MODEL_DIR configured in AI service environment
  │
  ├─ enables: No-show risk badge on booking list
  │  └─ enables: Proactive SMS for high-risk bookings
  │     └─ requires: Notification worker credentials (already in v1.1)
  │
  └─ enables: AI insights panel on dashboard
     └─ requires: Trained no-show model + Trained capacity forecaster

Landing Page
  ├─ requires: Live demo company seeded in production DB
  │  └─ requires: Demo booking widget working at /[demo-slug]
  │
  ├─ requires: Pricing page with real plan limits enforced
  │  └─ requires: Plan limits in DB schema (if not yet implemented)
  │
  └─ enhances: Onboarding flow (landing page drives signups)

Onboarding Wizard
  ├─ requires: Company creation API (already exists)
  ├─ requires: Service creation API (already exists)
  ├─ requires: Working hours API (already exists)
  └─ enables: Industry template presets
     └─ requires: Template seed data per industry

Premium Booking UX
  ├─ requires: Booking widget already functional (exists in v1.1)
  ├─ add-to-calendar requires: ICS generation endpoint (new)
  └─ staff photos requires: R2 file upload already in place (v1.1)
```

### Dependency Notes

- **AI models before AI dashboard widget:** The dashboard widget calls prediction endpoints. If models still return `confidence: 0.4, fallback: true`, the widget shows untrustworthy data. Train models first.
- **Demo company before landing page:** The live widget embed in the landing page hero requires a real seeded demo company in the production database.
- **Onboarding wizard is independent:** Can be built in parallel with AI models and landing page. No external dependencies beyond existing APIs.
- **ICS calendar file does NOT require external service:** Generate from booking data server-side. Simple RFC 5545 format.

---

## MVP Definition

### Launch With (v1.2.0 — Demo-Ready)

These features transform the product from "works" to "sells."

- [x] **Trained no-show model** — eliminates `confidence: 0.4` in demos; 500 synthetic samples minimum; run `train_no_show.py` and commit model file
- [x] **No-show risk badge on booking list** — makes AI tangible and visible; color-coded badge on every booking row
- [x] **Business setup wizard** — 4 steps, <5 minutes, ends with live booking link; required before any other dashboard section
- [x] **Empty states with action prompts** — every empty table/list needs an action-oriented empty state
- [x] **Hero section + pricing page** — Czech-language landing page with live widget embed, 3-tier pricing
- [x] **Onboarding checklist** — 5-item checklist on dashboard, dismissible, tracks completion
- [x] **Mobile booking UX audit** — calendar tap targets, slot grouping, progress stepper, loading states
- [x] **Add-to-calendar button** — ICS file endpoint, add to booking confirmation page and email

### Add After Validation (v1.2.x)

Add when first 10 paying customers give feedback.

- [ ] **Industry template presets** — reduces setup time; trigger: if >30% of new signups don't complete wizard
- [ ] **AI insights dashboard widget** — daily AI digest; trigger: trained models deployed and stable
- [ ] **Proactive SMS for high-risk bookings** — trigger: no-show rate data available from real bookings
- [ ] **ROI calculator on landing page** — trigger: if landing page conversion < 3%
- [ ] **"First booking" celebration screen** — trigger: after 5+ owners confirm they received their first booking
- [ ] **First 7-day email sequence** — trigger: when churn at day 7 exceeds 50%

### Future Consideration (v2.0)

Defer until product-market fit is established.

- [ ] **Natural language / voice booking** — OpenAI integration; defer until base features stable
- [ ] **Per-tenant AI models** — requires >10K bookings per company; defer until top 5 customers hit this threshold
- [ ] **Competitor comparison page** — high content maintenance; defer until market position clearer
- [ ] **Capacity forecast chart** — Prophet model requires more training data than no-show model; defer until real booking data accumulates
- [ ] **Video product tour** — requires professional recording; defer until copy and UX are finalized

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Trained no-show model | HIGH | MEDIUM | P1 |
| Business setup wizard | HIGH | MEDIUM | P1 |
| No-show risk badge | HIGH | LOW | P1 |
| Empty states | HIGH | LOW | P1 |
| Landing page hero + pricing | HIGH | MEDIUM | P1 |
| Mobile booking UX audit | HIGH | LOW | P1 |
| Onboarding checklist | MEDIUM | LOW | P1 |
| Add-to-calendar | MEDIUM | LOW | P1 |
| AI insights dashboard widget | HIGH | MEDIUM | P2 |
| Industry template presets | MEDIUM | MEDIUM | P2 |
| Staff photos in widget | MEDIUM | LOW | P2 |
| Proactive SMS for high-risk | HIGH | LOW | P2 |
| Smart time slot grouping | MEDIUM | LOW | P2 |
| Real-time slot count indicator | LOW | LOW | P2 |
| ROI calculator | MEDIUM | MEDIUM | P2 |
| First 7-day email sequence | HIGH | MEDIUM | P2 |
| Capacity forecast chart | MEDIUM | HIGH | P3 |
| Industry landing page variants | MEDIUM | MEDIUM | P3 |
| Natural language booking | HIGH | HIGH | P3 |
| Per-tenant AI models | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for demo-ready launch (v1.2.0)
- P2: Should have, add after first paying customers (v1.2.x)
- P3: Nice to have, future consideration (v2.0+)

---

## Competitor Feature Analysis

| Feature | Calendly | Reservio | Bookio | ScheduleBox v1.2 Approach |
|---------|----------|----------|--------|--------------------------|
| **AI no-show prediction** | No (smart routing only) | No | No | YES — XGBoost trained model, visible risk badge |
| **Dynamic pricing** | No | No | No | YES — Thompson Sampling bandit (needs state seeding) |
| **Mobile booking UX** | Excellent (Calendly gold standard) | Good | Good | Target: match Calendly — 44px touch targets, slot grouping |
| **Onboarding speed** | Excellent — 3-step wizard, live in 2 min | Good — more steps | Average — complex setup | Target: 4-step wizard, <5 min, industry templates |
| **Czech/Slovak language** | No | YES (Czech company) | YES (Slovak company) | YES — primary market; home advantage |
| **Local payment (Comgate)** | No | Yes (card only) | Yes (card only) | YES — full Comgate: cards, bank transfer, Google Pay, Apple Pay |
| **Free tier** | Yes (basic) | Yes (limited) | Yes (limited) | YES — meaningful free tier to capture trial |
| **Landing page quality** | Excellent | Good | Good | Target: professional Czech-language page with live embed |
| **Embedded widget** | Yes | Yes | Yes | YES — already built, needs UX polish |
| **Add-to-calendar** | YES | YES | YES | Yes — ICS endpoint (needs building) |
| **Staff selection in booking** | YES | YES | YES | YES — exists; add photos for premium feel |

**Key finding:** ScheduleBox's AI features (no-show, dynamic pricing, CLV) are unique in this competitive set. No competitor offers genuine ML-based predictions. This is the primary differentiator — but only if the models are actually trained and results are visibly surfaced in the UI.

---

## AI Model Training Notes

### No-Show Predictor — Training Path

The `scripts/train_no_show.py` script already supports both real-data (API fetch from `/api/internal/features/training/no-show`) and synthetic data (500 samples, `random_state=42`).

**What "real AI" requires for v1.2:**
1. Run `train_no_show.py` with 500 synthetic samples (already works)
2. Store `no_show_predictor.joblib` in `MODEL_DIR` (configured in AI service config)
3. Restart AI service → `model_loader.py` loads it → responses show `confidence: 0.82, fallback: false`

**Key features driving no-show prediction accuracy** (from medical scheduling literature, ~86% accuracy benchmark):
- Lead time (single most influential factor — longer > 60 days = higher no-show)
- Prior no-show history (strongest predictor per patient/customer studies)
- Payment status (paid bookings = lower no-show rate)
- First visit vs returning customer
- Day of week and time of day
- Service duration and price

All 11 of these are already in `FEATURE_COLUMNS`. The model architecture is correct.

### Pricing Optimizer — State Seeding

The Thompson Sampling bandit does not need training — it learns online. But it needs:
1. An initial state JSON file with balanced priors (already supported in `PricingOptimizer.__init__`)
2. A Redis key for persistent state between service restarts
3. A feedback signal when a booking is completed at a given price (API endpoint or RabbitMQ consumer)

Without the feedback loop, the bandit never learns. This is the gap, not the model itself.

### Capacity Forecaster — Minimum Data Requirement

Facebook Prophet requires sufficient historical time-series data. With synthetic data:
- Generate 6 months of synthetic hourly booking counts with realistic Czech business patterns (busy Tuesday-Friday 9am-5pm, slow Monday mornings, weekend variation by business type)
- Train using `scripts/train_capacity.py` (verify this exists — structure follows train_no_show.py pattern)
- Store `capacity_forecaster.joblib` in MODEL_DIR

**Confidence level:** MEDIUM — Prophet's cold-start with synthetic data may produce low-quality forecasts. Better to defer the capacity chart to v1.2.x when real booking data exists, rather than show inaccurate forecasts.

---

## Booking UX Audit Checklist

These specific items need verification (not assumptions) in the existing codebase:

### Public Booking Widget (`/[company_slug]/`)
- [ ] Calendar cell tap targets: minimum 44x44px on mobile
- [ ] Loading states: skeleton loaders, not blank white screen during API calls
- [ ] Error states: clear messages when slots load fails, with retry button
- [ ] Timezone: displayed in customer's local timezone (or company timezone if set)
- [ ] Staff display: photo optional, name mandatory, buffer time respected
- [ ] Progress stepper: shows current step and total steps
- [ ] Pre-payment total display: shows full price before Comgate redirect
- [ ] Confirmation page: all booking details + add-to-calendar + cancellation link

### Dashboard Booking Management
- [ ] No-show risk badge: visible on booking row (after AI model trained)
- [ ] Filters work: by date, status, service, employee
- [ ] Mobile responsive: table scrolls, not cut off
- [ ] Action buttons: confirm, cancel, reschedule — all functional

---

## Sources

### AI/ML — No-Show Prediction
- [PMC: Real-Time Analytics and AI for No-Show Appointments (UAE study, 86% accuracy)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11729783/)
- [Medical Economics: AI predicts no-shows with 90% accuracy (healow model)](https://www.medicaleconomics.com/view/can-ai-predict-no-shows-before-they-happen-this-new-model-says-yes)
- [npj Digital Medicine: Machine learning for pediatric no-show prediction](https://www.nature.com/articles/s41746-022-00594-w)
- [JMIR: Enhancing prediction of missed appointments](https://medinform.jmir.org/2024/1/e48273)
- [AAPC: Can machine learning predict no-shows?](https://www.aapc.com/blog/93112-can-machine-learning-predict-patient-no-shows/)

### Booking UX
- [ralabs.org: Booking UX Best Practices 2025](https://ralabs.org/blog/booking-ux-best-practices/)
- [Medium (Sara Jahanbakhsh): UX Friction in Mobile Booking — Case Study, Jul 2025](https://medium.com/@Sara-Jahanbakhsh/case-study-ux-friction-in-mobile-booking-f30a236fe88f)
- [Eleken: Calendar UI Examples + UX Tips](https://www.eleken.co/blog-posts/calendar-ui-examples)
- [Movers Development: Landing page trust signals that multiply booking rates](https://moversdev.com/landing-page-trust-signals-that-multiply-booking-rates/)
- [Aubergine: Calendly Redesign Case Study](https://www.aubergine.co/insights/ux-re-design-experiments-elevating-calendlys-one-on-one-event-type-feature)

### Landing Page
- [Unbounce: 27 best SaaS landing pages + tips](https://unbounce.com/conversion-rate-optimization/the-state-of-saas-landing-pages/)
- [Magic UI: 7 SaaS Landing Page Best Practices 2025](https://magicui.design/blog/saas-landing-page-best-practices)
- [Heyflow: SaaS landing page best practices](https://heyflow.com/blog/saas-landing-page-best-practices/)
- [Klientboost: 51 High-Converting SaaS Landing Pages 2025](https://www.klientboost.com/landing-pages/saas-landing-page/)

### Onboarding
- [Calendly Onboarding Checklist — UserOnboarding.Academy](https://useronboarding.academy/user-onboarding-inspirations/calendly)
- [ProductLed: SaaS Onboarding Best Practices 2025](https://productled.com/blog/5-best-practices-for-better-saas-user-onboarding)
- [Flowjam: SaaS Onboarding Best Practices 2025 Guide](https://www.flowjam.com/blog/saas-onboarding-best-practices-2025-guide-checklist)
- [Userpilot: Aha Moment Examples for SaaS](https://userpilot.com/blog/aha-moment-examples/)
- [Candu: Best SaaS Onboarding Examples 2025](https://www.candu.ai/blog/best-saas-onboarding-examples-checklist-practices-for-2025)
- [UserGuiding: Onboarding Wizard Examples](https://userguiding.com/blog/what-is-an-onboarding-wizard-with-examples)

### Competitor Analysis
- [Reservio 2025 Highlights](https://www.reservio.com/blog/building-reservio/2025-highlights)
- [GetApp: Reservio 2026](https://www.getapp.com/customer-management-software/a/reservio/)
- [ROI Index: Bookio vs Reservio comparison (Slovak)](https://roi-index.com/blog/porovnanie-rezervacnych-systemov-bookio-a-reservio/)
- [Acuity Scheduling Features](https://acuityscheduling.com/features)
- [Calendly vs Acuity 2026](https://koalendar.com/blog/calendly-vs-acuity)

### Smart Pricing / Capacity
- [Newbook: Dynamic Pricing & AI](https://www.newbook.cloud/price-optimization/)
- [Dialzara: Top 10 AI Tools for No-Show Prediction 2024](https://dialzara.com/blog/top-10-ai-tools-for-no-show-prediction-2024)
- [OnceHub: Better Appointment Scheduling With AI](https://www.oncehub.com/blog/ai-schedule-maker)

---

*Feature research for: ScheduleBox v1.2 — AI Service, UI Polish, Landing Page, Onboarding*
*Researched: 2026-02-21*

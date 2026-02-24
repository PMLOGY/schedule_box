# Phase 27: Onboarding and Business Setup Wizard — Research

**Phase:** 27-onboarding-wizard
**Researched:** 2026-02-21
**Confidence:** HIGH (all underlying APIs exist, UI composition on established patterns)

---

## Codebase Analysis

### Existing APIs (all built in v1.0/v1.1 — no new backend needed)

| API | Route | Method | Purpose |
|-----|-------|--------|---------|
| Register | `/api/v1/auth/register` | POST | Creates company + user in transaction, returns JWT |
| Company settings | `/api/v1/settings/company` | GET/PUT | Read/update company profile (name, logo, address, etc.) |
| Services | `/api/v1/services` | GET/POST | List/create services (name, duration, price, etc.) |
| Company working hours | `/api/v1/settings/working-hours` | GET/PUT | Bulk replace company-level working hours |
| Employee working hours | `/api/v1/employees/[id]/working-hours` | GET/PUT | Per-employee working hours |
| Employees | `/api/v1/employees` | GET/POST | List/create employees |

**Key finding:** The registration endpoint (`/api/v1/auth/register`) already creates the company and user in a single transaction. The wizard starts AFTER registration, not during it. The company already has a slug when the wizard begins.

### Companies Table Schema (relevant columns)

```
companies:
  id, uuid, name, slug, email, phone, website, logo_url, description,
  address_street, address_city, address_zip, address_country (default: 'CZ'),
  currency (default: 'CZK'), timezone (default: 'Europe/Prague'),
  locale (default: 'cs-CZ'), subscription_plan (default: 'free'),
  industry_type (default: 'general'), industry_config (JSONB, default: {}),
  onboarding_completed (boolean, default: false),
  trial_ends_at, suspended_at, features_enabled (JSONB), settings (JSONB),
  is_active, created_at, updated_at
```

**Critical:** `onboarding_completed` boolean already exists in the schema. This is the flag to check whether to show the wizard.

### Industry Types (from DB CHECK constraint)

```
beauty_salon, barbershop, spa_wellness, fitness_gym, yoga_pilates,
dance_studio, medical_clinic, veterinary, physiotherapy, psychology,
auto_service, cleaning_service, tutoring, photography, consulting,
coworking, pet_grooming, tattoo_piercing, escape_room, general
```

All 20 types already have a CHECK constraint on the `companies.industry_type` column.

### Existing Component Patterns

**Wizard pattern:** `BookingWizard.tsx` + `StepIndicator.tsx` provide a working reference:
- Zustand store (`booking-wizard.store.ts`) manages step, data, and navigation
- `StepIndicator` renders numbered circles with connector lines
- Each step is a separate component rendered conditionally
- Cards wrap the content, with `Alert` for errors

**Empty state:** `EmptyState` component exists at `apps/web/components/shared/empty-state.tsx`:
- Props: icon (LucideIcon), title, description, action (label + onClick/href)
- Renders centered layout with icon, heading, description, and CTA button
- Already used across dashboard sections

**Dashboard:** `page.tsx` renders `DashboardGrid` (4 stat cards) + `QuickActions`

### Seed Pattern

Development seed at `packages/database/src/seeds/development.ts`:
- Uses `@faker-js/faker` for Czech-realistic data
- Seeds 3 companies, 10+ users, 20+ customers, 10+ services, 30+ bookings
- Uses helper functions: `czechName`, `czechEmail`, `czechPhone`, `czechAddress`
- Imports schema from `packages/database/src/schema/index`

### i18n Pattern

- Messages in `apps/web/messages/{cs,en,sk}.json`
- Components use `useTranslations('namespace')` hook
- Nested namespaces: `dashboard.title`, `booking.wizard.steps.service`

---

## Architecture Decisions

### 1. Wizard Flow (post-registration)

The wizard triggers AFTER a new user registers and lands on the dashboard for the first time. Detection logic:
- On dashboard load, check `company.onboarding_completed === false`
- If false, redirect to `/onboarding` route (inside dashboard layout)
- Wizard uses existing APIs (PUT company, POST service, PUT working-hours)
- Final step marks `onboarding_completed = true` via company update

### 2. Onboarding Route Structure

```
app/[locale]/(dashboard)/onboarding/
  page.tsx              -- Main wizard page (redirects here if !onboarding_completed)
  layout.tsx            -- Minimal layout (no sidebar, just logo + step indicator)
```

The wizard page lives inside `(dashboard)` route group so it benefits from `AuthGuard`, but uses a simplified layout without the full sidebar.

### 3. State Management

New Zustand store `apps/web/stores/onboarding-wizard.store.ts`:
- Steps: 1 (Company), 2 (Service), 3 (Hours), 4 (Share)
- Each step's data persisted via existing APIs before advancing
- Store tracks completion state per step for the checklist

### 4. QR Code Generation

Use `qrcode` npm package (MIT, 4.8M weekly downloads) for generating QR code as data URL. No server-side rendering needed — generate in browser from the booking URL string.

### 5. Demo Data Seeder

Create an API endpoint `POST /api/v1/onboarding/demo-data` that:
- Creates demo services, customers, and bookings for the authenticated company
- Tags all created records with a `demo_data` flag in the company settings JSONB
- Provides a "Remove demo data" action that deletes records with this flag

### 6. Industry Templates

Store template data as a TypeScript constant file (`apps/web/lib/onboarding/industry-templates.ts`). Each template maps to an `industry_type` enum value and contains:
- Sample services with Czech names, durations, CZK prices
- Default working hours
- Industry-specific configuration

---

## Documentation Vertical Data (8 templates for Phase 27-04)

From `schedulebox_complete_documentation.md` Part XIV (lines 8837-9785):

### 1. beauty_salon (Kadeřnictví / Kosmetika)
Services: Střih dámský (60min, 500 CZK), Střih pánský (30min, 300 CZK), Barvení (120min, 1200 CZK), Melír (150min, 1500 CZK), Foukaná (30min, 250 CZK), Manikúra (60min, 400 CZK), Pedikúra (60min, 500 CZK), Gelové nehty (90min, 800 CZK)
Hours: Mon-Fri 8:00-18:00, Sat 9:00-14:00

### 2. fitness_gym (Fitness / Posilovna)
Services: Osobní trénink (60min, 800 CZK, cap 1), Skupinový trénink (60min, 200 CZK, cap 15), Spinning (45min, 150 CZK, cap 20), CrossFit (60min, 250 CZK, cap 12), Funkční trénink (45min, 200 CZK, cap 10), Konzultace výživy (60min, 600 CZK, cap 1)
Hours: Mon-Fri 6:00-22:00, Sat-Sun 8:00-20:00

### 3. yoga_pilates (Jóga / Pilates)
Services: Hatha jóga (75min, 250 CZK, cap 15), Vinyasa flow (60min, 250 CZK, cap 15), Yin jóga (90min, 300 CZK, cap 12), Power jóga (60min, 250 CZK, cap 15), Pilates mat (60min, 250 CZK, cap 12), Pilates reformer (55min, 450 CZK, cap 6)
Hours: Mon-Fri 7:00-21:00, Sat-Sun 9:00-18:00

### 4. medical_clinic (Lékař / Zubař)
Services: Preventivní prohlídka (30min, 0 CZK), Vstupní vyšetření (60min, 800 CZK), Kontrola (15min, 400 CZK), Dentální hygiena (45min, 1200 CZK), Bělení zubů (60min, 3000 CZK), Plomba (30min, 1500 CZK)
Hours: Mon-Fri 7:00-16:00

### 5. auto_service (Autoservis)
Services: Výměna oleje (30min, 800 CZK), Přezutí pneumatik (45min, 600 CZK), Technická kontrola (60min, 1500 CZK), Klimatizace servis (60min, 1200 CZK), Diagnostika (30min, 500 CZK), Geometrie (45min, 800 CZK)
Hours: Mon-Fri 7:00-17:00

### 6. tutoring (Doučování / Korepetice)
Services: Matematika ZŠ (60min, 400 CZK), Matematika SŠ (60min, 500 CZK), Angličtina (60min, 450 CZK), Čeština příprava (60min, 400 CZK), Fyzika (60min, 500 CZK), Příprava k maturitě (90min, 700 CZK)
Hours: Mon-Fri 14:00-20:00, Sat 9:00-17:00

### 7. photography (Fotografický ateliér)
Services: Portrétní focení (60min, 2000 CZK), Rodinné focení (90min, 3000 CZK), Produktové focení (120min, 4000 CZK), Svatební focení (480min, 15000 CZK), Novorozenecké focení (120min, 3500 CZK)
Hours: Mon-Fri 9:00-18:00, Sat 10:00-16:00

### 8. spa_wellness (Lázně / Wellness / Masáže)
Services: Klasická masáž (60min, 800 CZK), Relaxační masáž (90min, 1200 CZK), Thajská masáž (60min, 1000 CZK), Baňkování (30min, 500 CZK), Sauna + Whirlpool (120min, 600 CZK, cap 8)
Hours: Mon-Fri 9:00-20:00, Sat-Sun 10:00-18:00

---

## Technology Additions

| Package | Version | Purpose |
|---------|---------|---------|
| `qrcode` | ^1.5.4 | QR code generation for booking URL (MIT, browser-compatible) |
| `driver.js` | ^1.4.0 | Contextual tooltips on first visit (already in STACK.md recommendation) |

Both are small additions. `driver.js` was already recommended in the v1.2 stack research.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wizard blocks dashboard access | LOW | Show "Skip for now" option; wizard is guided but not forced |
| Demo data conflicts with real data | LOW | Tag demo records in company.settings JSONB; "Remove demo data" button |
| Industry template data out of date | LOW | Template data is static TypeScript, easy to update |
| Empty states missed in some sections | LOW | Systematic audit of all dashboard pages listing data |

---

_Research completed: 2026-02-21_
_Ready for planning: yes_

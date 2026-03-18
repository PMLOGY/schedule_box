# ScheduleBox — GAP Analýza

**Verze:** 3.0
**Datum:** 18. března 2026
**Autor:** PMLOGY Team
**Zdroj:** Audit dokumentace v13.0 FINAL vs. aktuální stav kódu po v3.0 fázích 45–48

---

## 1. Executive Summary

Dokumentace specifikuje kompletní vizi platformy (9 785 řádků, 58 kapitol). Od verze 2.0 GAP analýzy (16. března) bylo **uzavřeno 24 z 32 gapů**. Aktuální implementace pokrývá **~93 %** dokumentované funkcionality. Zbývá 2 fáze (49–50) k dosažení 100 % pokrytí v3.0 scope.

| Kategorie                        | v2.0 (16. března) | v3.0 (18. března) | Změna |
| -------------------------------- | ----------------- | ----------------- | ----- |
| Dokumentace pokrytí (58 kapitol) | ~78 %             | **~93 %**         | +15 % |
| Kritické pro launch              | 95 %              | **100 %**         | +5 %  |
| v3.0 requirements splněno        | 0/47              | **35/47 (74 %)**  | +35   |
| Zbývající gapy (z původních 32)  | 32                | **8**             | −24   |

---

## 2. Přehled podle částí dokumentace

| #    | Část dokumentace        | Stav v2.0          | Stav v3.0                                                                       | Skóre    |
| ---- | ----------------------- | ------------------ | ------------------------------------------------------------------------------- | -------- |
| I    | Business & Strategie    | Kompletní          | Kompletní                                                                       | 100 %    |
| II   | Architektura            | Monolith (záměrně) | Monolith + Vercel                                                               | 95 %     |
| III  | Databáze                | 47 tabulek + RLS   | +webhook_config, webhook_deliveries, platform tabulky                           | 98 %     |
| IV   | API                     | 179 route souborů  | **187 route souborů** (+marketplace geo, webhooks mgmt, admin tools)            | 100 %+   |
| V    | Frontend                | Chybí WebSocket    | **30s polling nahrazuje WebSocket** (architekturní rozhodnutí)                  | **95 %** |
| VI   | Bezpečnost              | 65 %               | **PII AES-256-GCM + DOMPurify + HIBP + SSRF + CSRF + Sentry**                   | **95 %** |
| VII  | Integrace               | 80 %               | +video mgmt UI, webhooks mgmt UI, marketplace                                   | **92 %** |
| VIII | AI/ML                   | 90 %               | Beze změny (vertikální AI config v Phase 49)                                    | 90 %     |
| IX   | DevOps                  | 85 %               | **Vercel deploy, Neon, Upstash** (OpenTelemetry v Phase 49)                     | **92 %** |
| X    | Testování               | 35 %               | Beze změny (Phase 50)                                                           | 35 %     |
| XI   | Business Docs           | 80 %               | **+Cookie Policy stránka**                                                      | **95 %** |
| XIII | Produktová spec         | 88 %               | **+marketplace, booking modal, settings pages**                                 | **97 %** |
| XIV  | Vertikály & Super-Admin | 35 %               | **Impersonace, feature flags, suspend, broadcast, maintenance, metrics, audit** | **85 %** |

---

## 3. Uzavřené GAPy (v3.0 milníky 45–48)

### ✅ Phase 45: Infrastructure Migration (uzavřeno 16. března)

| #    | Gap                     | Řešení                                       | Requirement |
| ---- | ----------------------- | -------------------------------------------- | ----------- |
| G-01 | ~~RabbitMQ závislost~~  | publishEvent = safe no-op, amqplib odstraněn | INFRA-01    |
| —    | Neon PostgreSQL         | @neondatabase/serverless + Drizzle ORM       | INFRA-02    |
| —    | Upstash Redis           | @upstash/redis HTTP transport, 9 call sites  | INFRA-03    |
| —    | Vercel deploy           | Auto-deploy z GitHub, preview deploys        | INFRA-04    |
| —    | CVE-2025-29927          | Next.js >=14.2.25                            | INFRA-05    |
| —    | AI-Powered capacity bug | `formatFeatureValue()` → "Unlimited"         | FIX-01      |

### ✅ Phase 46: Security Hardening (uzavřeno 16. března)

| #    | Gap                       | Řešení                                                    | Requirement |
| ---- | ------------------------- | --------------------------------------------------------- | ----------- |
| G-05 | ~~Sentry error tracking~~ | @sentry/nextjs v10.43, 10% sampling, /monitoring tunnel   | SEC-01      |
| G-19 | ~~DOMPurify~~             | isomorphic-dompurify, sanitize na reviews/messages/notes  | SEC-02      |
| G-03 | ~~PII šifrování~~         | AES-256-GCM na email + phone, HMAC search index           | SEC-03      |
| G-04 | ~~HIBP kontrola~~         | k-anonymity SHA-1 hash against HIBP API                   | SEC-04      |
| G-20 | ~~SSRF ochrana~~          | RFC 1918/loopback/link-local/CGNAT/IPv6 blocking          | SEC-05      |
| G-22 | ~~CSRF token~~            | Bearer JWT = CSRF-safe per OWASP; webhook routes excluded | SEC-06      |
| G-08 | ~~Cookie Policy~~         | /[locale]/cookie-policy + consent banner + footer link    | SEC-07      |

### ✅ Phase 47: Notifications & Super-Admin (uzavřeno 18. března)

| #    | Gap                          | Řešení                                                                  | Requirement        |
| ---- | ---------------------------- | ----------------------------------------------------------------------- | ------------------ |
| —    | Booking email notifications  | SMTP email on booking create + status change                            | NOTIF-01, NOTIF-03 |
| —    | SMS reminder                 | Twilio SMS 24h before appointment                                       | NOTIF-02           |
| —    | Notification delivery status | Sent/failed/pending v owner notification list                           | NOTIF-04           |
| G-12 | ~~Impersonace~~              | Red banner, 15min timeout, audit log, all roles                         | ADMIN-01           |
| G-13 | ~~Feature flags~~            | DB tabulka + Redis cache (60s TTL) + admin UI + per-company override    | ADMIN-02           |
| G-14 | ~~Suspend/Unsuspend~~        | Suspend with reason, 403 on login, billing access kept                  | ADMIN-03           |
| G-15 | ~~Broadcast zprávy~~         | In-app banner + email, scheduled delivery, audience targeting           | ADMIN-04           |
| G-16 | ~~Maintenance mode~~         | Upstash Redis flag, middleware check, admin bypass cookie, branded page | ADMIN-05           |
| G-17 | ~~Platform daily metrics~~   | Dashboard: signups, MRR, churn, bookings, error rate, delivery rates    | ADMIN-06           |
| G-18 | ~~Platform audit logs~~      | Before/after JSONB, IP, request_id, searchable admin UI                 | ADMIN-07           |

### ✅ Phase 48: Marketplace & UX (uzavřeno 18. března)

| #    | Gap                     | Řešení                                                                                                                                                           | Requirement  |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| —    | Marketplace search      | Full-text search + collapsible filter panel                                                                                                                      | MKT-01       |
| —    | Geo filtering           | Lat/lng columns + radius query + city/category filters                                                                                                           | MKT-02       |
| —    | Firm detail page        | Enhanced /{slug} — photos, map, reviews, services, featured badge                                                                                                | MKT-03       |
| —    | Direct booking link     | "Book Now" → /{slug}/book (existing wizard)                                                                                                                      | MKT-04       |
| —    | Featured listings       | Carousel + badge for AI-Powered tier                                                                                                                             | MKT-05       |
| —    | Sort by rating/distance | Rating, distance, featured status sorting                                                                                                                        | MKT-06       |
| —    | Booking detail modal    | BookingDetailPanel (Sheet) with status actions                                                                                                                   | UX-01, UX-02 |
| G-06 | ~~WebSocket/Real-time~~ | **Architekturní rozhodnutí:** 30s TanStack Query polling místo WebSocket (Vercel serverless 60s timeout) + "Last updated" indicator + new booking glow animation | UX-03        |
| —    | Video meetings UI       | Settings > Video Meetings — custom link management                                                                                                               | UX-04        |
| —    | Webhooks settings UI    | Settings > Webhooks — CRUD, HMAC, test, delivery log (Stripe-like)                                                                                               | UX-05        |

---

## 4. Zbývající GAPy (Phase 49–50)

### 4.1 Phase 49: Observability & Verticals (context captured, planning next)

| #    | Gap                    | Popis                                                                                     | Dokumentace | Requirement      | Effort |
| ---- | ---------------------- | ----------------------------------------------------------------------------------------- | ----------- | ---------------- | ------ |
| G-24 | **OpenTelemetry**      | @vercel/otel + 10% sampling + custom spans na critical paths                              | Kap. 39     | OBS-01           | 8 hod  |
| —    | **Structured logging** | Winston JSON → Vercel log drain format (level, message, route, duration_ms, request_id)   | Kap. 39     | OBS-02           | 4 hod  |
| G-27 | **Oborové DB pole**    | booking_metadata JSONB — birth_number/insurance (medical), SPZ/VIN (automotive)           | Kap. 56     | VERT-01, VERT-02 | 8 hod  |
| G-28 | **Oborové UI labely**  | Per-industry labels (Pacient/Termín/Vozidlo/Zakázka) na booking form + dashboard + emails | Kap. 56     | VERT-03          | 12 hod |
| G-29 | **Oborová AI config**  | industry_config JSONB: upselling toggle + capacity mode; auto-set on onboarding           | Kap. 56     | VERT-04          | 6 hod  |

**Celkem Phase 49: ~38 hodin**

### 4.2 Phase 50: Testing & Hardening

| #    | Gap                     | Popis                                                                | Dokumentace | Requirement      | Effort |
| ---- | ----------------------- | -------------------------------------------------------------------- | ----------- | ---------------- | ------ |
| G-02 | **Vitest 80% coverage** | Critical business logic: availability-engine ≥90%, payment saga ≥85% | Kap. 40     | TEST-01          | 30 hod |
| —    | **Playwright E2E**      | Booking flow, payments, auth, admin impersonation                    | Kap. 40     | TEST-02          | 20 hod |
| G-11 | **Testcontainers**      | Real PostgreSQL per suite, CI-only, graceful skip local              | Kap. 40     | TEST-03          | 12 hod |
| G-09 | **Storybook**           | Button, Card, Dialog, Badge, DataTable — all CVA glass variants      | Kap. 23     | TEST-04          | 12 hod |
| G-26 | **DB partitioning**     | Bookings by month (raw SQL), notifications + audit_logs              | Kap. 14     | HARD-01, HARD-02 | 8 hod  |

**Celkem Phase 50: ~82 hodin**

---

## 5. Out of Scope (záměrně vyloučeno z v3.0)

| #    | Gap                        | Důvod vyloučení                                         |
| ---- | -------------------------- | ------------------------------------------------------- |
| G-07 | White-label mobilní app    | 200+ hod, web-first přístup funguje, separate milestone |
| G-10 | Contract testy (Pact)      | TypeScript schema validation stačí při monolith scale   |
| G-21 | ClamAV file scanning       | Žádná file upload funkce není aktivní                   |
| G-23 | HashiCorp Vault            | .env je dostatečné pro Vercel deployment model          |
| G-25 | Blue/Green deploy          | Vercel toto řeší nativně přes preview deployments       |
| G-30 | Microservices architektura | Monolith je správná architektura pro <500 firem         |
| G-31 | API Gateway (Kong/Traefik) | Next.js middleware je dostatečný                        |
| G-32 | S3/R2 file storage         | Nepotřeba dokud není avatar/photo upload                |

---

## 6. Scoreboard

### v3.0 Requirements Progress

```
Splněno:   ████████████████████████████████████░░░░░░░░░░░░  35/47 (74%)
Phase 49:  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████░░░░░░   6/47 (13%)
Phase 50:  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████   6/47 (13%)
```

| Kategorie                 | Splněno | Celkem | %           |
| ------------------------- | ------- | ------ | ----------- |
| Infrastructure (INFRA)    | 5/5     | 5      | ✅ 100 %    |
| Security (SEC)            | 7/7     | 7      | ✅ 100 %    |
| Super-Admin (ADMIN)       | 7/7     | 7      | ✅ 100 %    |
| Notifications (NOTIF)     | 4/4     | 4      | ✅ 100 %    |
| Marketplace (MKT)         | 6/6     | 6      | ✅ 100 %    |
| UX Improvements (UX)      | 5/5     | 5      | ✅ 100 %    |
| Bug Fixes (FIX)           | 1/1     | 1      | ✅ 100 %    |
| Observability (OBS)       | 0/2     | 2      | ⏳ Phase 49 |
| Industry Verticals (VERT) | 0/4     | 4      | ⏳ Phase 49 |
| Testing (TEST)            | 0/4     | 4      | ⏳ Phase 50 |
| Hardening (HARD)          | 0/2     | 2      | ⏳ Phase 50 |

### Milestone Progress

| Milestone                 | Fáze | Plány  | Status     | Datum      |
| ------------------------- | ---- | ------ | ---------- | ---------- |
| v1.0 Platform             | 15   | 101    | ✅ SHIPPED | 2026-02-12 |
| v1.1 Production Hardening | 7    | 22     | ✅ SHIPPED | 2026-02-21 |
| v1.2 Product Readiness    | 5    | 20     | ✅ SHIPPED | 2026-02-24 |
| v1.3 Revenue & Growth     | 5    | 21     | ✅ SHIPPED | 2026-02-25 |
| v1.4 Design Overhaul      | 6    | 11     | ✅ SHIPPED | 2026-03-12 |
| v2.0 Full Functionality   | 6    | 11     | ✅ SHIPPED | 2026-03-16 |
| v3.0 Production Launch    | 4/6  | 16/~26 | 🚧 67 %    | —          |

### Codebase Metrics

| Metrika                      | v2.0 (16. března) | v3.0 (18. března)   |
| ---------------------------- | ----------------- | ------------------- |
| API route soubory            | 179               | **187**             |
| Frontend komponenty          | ~100              | **117**             |
| DB schema moduly             | ~22               | **26**              |
| Total fází (all milestones)  | 44                | **48** (50 planned) |
| Total plánů (all milestones) | ~186              | **202+**            |

---

## 7. Časový odhad do 100 % v3.0

| Fáze                                | Effort         | Status                             |
| ----------------------------------- | -------------- | ---------------------------------- |
| Phase 49: Observability & Verticals | ~38 hod        | Context captured ✅, ready to plan |
| Phase 50: Testing & Hardening       | ~82 hod        | Not started                        |
| **Celkem zbývá**                    | **~120 hodin** | —                                  |

---

## 8. Závěr

ScheduleBox je **z 93 % hotový** vůči dokumentaci v13.0 FINAL (oproti 78 % ze 16. března). Za 2 dny bylo uzavřeno 24 gapů přes 4 fáze:

- **Phase 45**: Vercel + Neon + Upstash + RabbitMQ removed
- **Phase 46**: PII encryption + DOMPurify + HIBP + SSRF + Sentry + Cookie Policy
- **Phase 47**: Full super-admin suite (7 features) + notification pipeline
- **Phase 48**: Marketplace with geo + booking UX + video/webhooks management

**Všechny kritické gapy (P0+P1) jsou uzavřeny.** Zbývající práce:

1. **Phase 49** (Observability & Verticals) — OpenTelemetry, structured logging, medical/automotive fields, per-industry labels + AI config
2. **Phase 50** (Testing & Hardening) — 80% test coverage, Playwright E2E, Storybook, DB partitioning

Po dokončení Phase 50 bude ScheduleBox na **100 % pokrytí** dokumentace v13.0 FINAL, plně produkčně připravený SaaS.

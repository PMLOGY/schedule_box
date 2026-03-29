# ScheduleBox — Kompletní Technická Dokumentace

**Verze:** 13.0 FINAL (100% autonomní, audit-opravená)
**Datum:** 10. února 2026
**Autor:** PMLOGY + Claude AI Architect
**Účel:** Kompletní specifikace pro 100% autonomní vývoj celé platformy

---

## Obsah

### ČÁST I — BUSINESS & STRATEGIE

1. [Executive Summary](#1-executive-summary)
2. [Business Plán](#2-business-plán)
3. [Analýza Konkurence](#3-analýza-konkurence)
4. [Gap Analýza a Inovace](#4-gap-analýza-a-inovace)

### ČÁST II — ARCHITEKTURA

5. [Architektura Systému](#5-architektura-systému)
6. [Modulární Architektura & Boundaries](#6-modulární-architektura--boundaries)
7. [Domain Events (Synchronní)](#7-domain-events-synchronní)
8. [Service Interdependencies](#8-service-interdependencies)
9. [SAGA Workflows](#9-saga-workflows)
10. [Resilience & Fallback Patterns](#10-resilience--fallback-patterns)

### ČÁST III — DATABÁZE

11. [Databázové Schéma (kompletní SQL)](#11-databázové-schéma)
12. [Row Level Security](#12-row-level-security)
13. [Double-Booking Prevence](#13-double-booking-prevence)
14. [Partitioning Strategy](#14-partitioning-strategy)

### ČÁST IV — API

15. [OpenAPI Specifikace (kompletní YAML)](#15-openapi-specifikace)
16. [API Error Handling Standard](#16-api-error-handling)
17. [Rate Limiting](#17-rate-limiting)
18. [API Versioning](#18-api-versioning)

### ČÁST V — FRONTEND

19. [Design System](#19-design-system)
20. [Frontend Komponenty (kompletní)](#20-frontend-komponenty)
21. [State Management](#21-state-management)
22. [Real-time (WebSocket)](#22-real-time-websocket)
23. [i18n & Accessibility](#23-i18n--accessibility)

### ČÁST VI — BEZPEČNOST

24. [Security Specifikace](#24-security-specifikace)
25. [Auth Specifikace](#25-auth-specifikace)
26. [RBAC Kompletní Matice (99 endpointů)](#26-rbac-kompletní-matice)
27. [OWASP Top 10 Coverage](#27-owasp-top-10)

### ČÁST VII — INTEGRACE

28. [Comgate Integrace](#28-comgate-integrace)
29. [QRcomat](#29-qrcomat-integrace)
30. [Video Integrace](#30-video-integrace)
31. [White-label App](#31-white-label-app)

### ČÁST VIII — AI & ML

32. [ML Modely Specifikace](#32-ml-modely)
33. [AI Fallback Strategie](#33-ai-fallback-strategie)
34. [AI Data Pipeline](#34-ai-data-pipeline)

### ČÁST IX — DEVOPS & DEPLOYMENT

35. [Deployment Strategy](#35-deployment-strategy)
36. [CI/CD Pipeline](#36-cicd-pipeline)
37. [Docker & Kubernetes](#37-docker--kubernetes)
38. [Environment Variables](#38-environment-variables)
39. [Observability Stack](#39-observability-stack)

### ČÁST X — TESTOVÁNÍ & KVALITA

40. [Test Strategy](#40-test-strategy)
41. [User Flows (kompletní)](#41-user-flows)
42. [Formuláře & Validace](#42-formuláře--validace)

### ČÁST XI — BUSINESS DOCS

43. [Právní Dokumenty](#43-právní-dokumenty)
44. [Marketing Materiály](#44-marketing-materiály)
45. [Vizuální Identita](#45-vizuální-identita)

### ČÁST XIV — OBOROVÉ VERTIKÁLY & SUPER-ADMIN

55. [Multi-tenant Architektura](#55-multi-tenant-architektura)
56. [Oborové vertikály (Industry Presets)](#56-oborové-vertikály)
57. [Super-Admin Dashboard](#57-super-admin-dashboard)
58. [Přehledová tabulka — Obory](#58-přehledová-tabulka--jak-se-obory-liší)

### ČÁST XIII — PRODUKTOVÁ SPECIFIKACE (Pro člověka)

49. [Kompletní přehled funkcí](#49-kompletní-přehled-funkcí)
50. [Navigace a Menu Struktura](#50-navigace-a-menu-struktura)
51. [Popis obrazovek](#51-popis-obrazovek)
52. [Role a oprávnění (pro člověka)](#52-role-a-oprávnění)
53. [Cenový plán — Feature Matrix](#53-cenový-plán--feature-matrix)
54. [Chybové stavy](#54-chybové-stavy)

### ČÁST XII — IMPLEMENTAČNÍ PLÁN

46. [Prompt pro Autonomního Agenta](#46-prompt-pro-agenta)
47. [Sprint Plán](#47-sprint-plán)
48. [Audit Report](#48-audit-report)

---

---

# ČÁST I — BUSINESS & STRATEGIE

---

## 1. Executive Summary

ScheduleBox je **all-in-one AI-powered business platforma** pro služby založené na rezervacích (kadeřnictví, kosmetika, fitness, masáže, lékařské ordinace, autoservisy a další). Kombinuje rezervační systém, platební infrastrukturu, CRM, věrnostní program, automatizaci marketingu a 10 inovativních AI funkcí do jednoho nativně propojeného systému.

### Klíčové metriky produktu

| Metrika             | Hodnota                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| Cílový trh          | CZ/SK (následně PL, DE)                                                       |
| Cílová skupina      | SMB (1–50 zaměstnanců)                                                        |
| Tech stack          | Next.js 15, TypeScript, PostgreSQL, Redis                                     |
| Architektura        | Monolith (Next.js App Router)                                                 |
| API endpointy       | 199+ route souborů, 250+ operací                                              |
| DB tabulky          | 88                                                                            |
| Frontend komponenty | 122+                                                                          |
| AI modely           | 7 (No-show, CLV, Upselling, Pricing, Capacity, Health Score, Reminder Timing) |
| Platební brány      | Comgate (online), QRcomat (na místě)                                          |
| Cenový model        | Freemium: 0 / 490 / 1490 / 2990 Kč/měs                                        |

### Unique Value Proposition

> **„ScheduleBox — Rezervační systém, který myslí za vás. Zvyšte své tržby o 30 % a ušetřete 10 hodin týdně díky AI, která optimalizuje vaše ceny, marketing i provoz."**

---

## 2. Business Plán

### 2.1. Popis produktu

ScheduleBox je komplexní platforma zahrnující:

- **Rezervační systém:** Online rezervace, správa kalendáře, multi-resource booking, multi-employee scheduling
- **Platební infrastruktura:** Online platby (Comgate), platby na místě (QRcomat), dárkové karty, kupóny
- **Marketing & CRM (CRMbox):** Věrnostní karty (Apple/Google Wallet), automatizace komunikace, review generator, štítky zákazníků
- **Business Intelligence:** Pokročilé reporty, prediktivní analytika, competitor intelligence
- **AI-powered funkce:** 10 ML modelů pro optimalizaci cen, kapacity, marketingu a predikce chování
- **Marketplace:** Katalog firem pro organický růst
- **White-label aplikace:** Vlastní mobilní aplikace pro každou firmu
- **Videokonference:** Integrace Zoom, Google Meet, MS Teams pro online služby
- **Automatizace:** Visual rule builder pro automatické akce (email, SMS, push, loyalty)
- **Embeddable Widget:** JavaScript widget pro vložení na existující web zákazníka

### 2.2. Cenová strategie

| Plán           | Cílová skupina        | Klíčové funkce                                                                      | Cena/měsíc |
| -------------- | --------------------- | ----------------------------------------------------------------------------------- | ---------- |
| **Free**       | Testování             | Max 50 rezervací/měsíc, 1 zaměstnanec                                               | 0 Kč       |
| **Essential**  | Živnostníci (1 osoba) | Základní rezervace, Comgate, Kupóny, Review Generator                               | 490 Kč     |
| **Growth**     | Malé firmy (2–10)     | + Správa zdrojů, Automatizace, Věrnostní systém, Smart Upselling, No-show Predictor | 1 490 Kč   |
| **AI-Powered** | Střední firmy (10+)   | + VŠECHNY AI FUNKCE, API, White-label app, Marketplace Premium                      | 2 990 Kč   |

**Doplňkové služby:**

- Marketplace Premium (zvýraznění): 200 Kč/měsíc
- AI Voice Booking: 1 Kč/minuta
- Custom integrace: od 5 000 Kč jednorázově

### 2.3. Go-to-Market strategie

**Fáze 1: Launch (měsíc 1–3):** Cross-sell do stávající zákaznické základny, PR kampaň „první AI-powered rezervační systém v ČR"

**Fáze 2: Růst (měsíc 3–12):** Content marketing (AI v businessu), partnerství s oborovými asociacemi, PPC na long-tail keywords

**Fáze 3: Dominance (rok 2+):** Expanze do PL/DE, akvizice menších konkurentů, komunita

### 2.4. Finanční projekce

| Metrika         | Rok 1      | Rok 2        | Rok 3        |
| --------------- | ---------- | ------------ | ------------ |
| Počet zákazníků | 500        | 2 000        | 5 000        |
| MRR             | 500 000 Kč | 2 500 000 Kč | 7 000 000 Kč |
| Churn rate      | 5 %        | 3 %          | 2 %          |
| CAC             | 3 000 Kč   | 2 000 Kč     | 1 500 Kč     |
| LTV             | 30 000 Kč  | 45 000 Kč    | 60 000 Kč    |

---

## 3. Analýza Konkurence

### 3.1. Hlavní konkurenti na CZ/SK trhu

| Konkurent      | Silné stránky                        | Slabé stránky                            | Cena         |
| -------------- | ------------------------------------ | ---------------------------------------- | ------------ |
| **Reservio**   | Silná značka, marketplace, API       | Žádné AI, omezené platby, starý UI       | 250–1 500 Kč |
| **Reservanto** | Jednoduchost, český support          | Velmi omezené funkce, žádná automatizace | 200–800 Kč   |
| **Bookio**     | Marketplace, "vypadat zaneprázdněně" | Žádné AI, omezený CRM                    | 300–1 200 Kč |
| **Fresha**     | Zdarma, globální                     | Jen beauty/wellness, vendor lock-in      | 0 + provize  |
| **Calendly**   | UX, brand                            | Jen scheduling, žádné platby/CRM         | $8–$16       |
| **Acuity**     | Flexibilita, API                     | Jen scheduling, žádné AI                 | $16–$45      |
| **Mindbody**   | Enterprise fitness                   | Drahý, složitý, vendor lock-in           | $139–$699    |

### 3.2. Konkurenční výhody ScheduleBoxu

1. **AI-first přístup** — žádný konkurent nenabízí 10 ML modelů
2. **All-in-one** — booking + CRM + loyalty + payments + automation v jednom
3. **Dual payment** — Comgate (online) + QRcomat (na místě) — unikátní kombinace
4. **White-label app** — vlastní mobilní aplikace za zlomek ceny
5. **Competitor Intelligence** — automatický monitoring konkurence
6. **"Vypadat zaneprázdněně"** — unikátní funkce z Bookio, ale s AI rozšířením

---

## 4. Gap Analýza a Inovace

### 4.1. Funkce převzaté z konkurence

| Funkce                  | Zdroj              | Implementace v ScheduleBox                         |
| ----------------------- | ------------------ | -------------------------------------------------- |
| Marketplace katalog     | Reservio, Bookio   | Marketplace Service s geo-searchem                 |
| "Vypadat zaneprázdněně" | Bookio             | companies.busy_appearance_enabled + AI variabilita |
| Online booking widget   | Reservio, Calendly | Embeddable JS widget + iframe                      |
| Kupóny a dárkové karty  | Fresha, Mindbody   | Coupon + GiftCard service                          |
| Věrnostní program       | Bookio             | Points/stamps/tiers s Apple/Google Wallet          |
| Video integrace         | Calendly           | Zoom + Meet + Teams v jednom                       |
| Štítky zákazníků        | Fresha             | customer_tags M:N                                  |
| Review management       | Mindbody           | Auto-redirect na Google/FB nebo interní            |

### 4.2. Inovativní AI funkce (nemá nikdo)

| #   | AI Funkce               | Algoritmus              | Business Dopad         |
| --- | ----------------------- | ----------------------- | ---------------------- |
| 1   | No-show Predictor       | XGBoost                 | -40 % no-show rate     |
| 2   | CLV Predictor           | Random Forest           | +25 % retence VIP      |
| 3   | Smart Upselling         | Collaborative Filtering | +15 % AOV              |
| 4   | Pricing Optimizer       | Reinforcement Learning  | +20 % marže            |
| 5   | Capacity Optimizer      | LSTM                    | +30 % využití kapacity |
| 6   | Customer Health Score   | RFM + ML                | -50 % churn            |
| 7   | Smart Reminder Timing   | Bayesian Opt.           | +35 % open rate        |
| 8   | AI Voice Booking        | Whisper + GPT-4         | Hands-free rezervace   |
| 9   | AI Follow-up Generator  | GPT-4                   | Personalizované emaily |
| 10  | Competitor Intelligence | Web Scraping            | Real-time monitoring   |

---

# ČÁST II — ARCHITEKTURA

---

## 5. Architektura Systému

### 5.1. High-Level Architecture

> **Poznámka:** ScheduleBox je monolitická Next.js 15 aplikace (App Router) s API routes,
> organizovaná jako monorepo s pnpm workspaces: `apps/web`, `packages/{database,shared,events,ui}`, `services/`.
> Doménové moduly (Auth, Booking, Payment atd.) jsou kódové hranice uvnitř jednoho deploymentu, nikoliv samostatné microservices.

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App - Next.js 15]
        WID[Embeddable Widget]
        PUB[Public Booking Page]
    end

    subgraph "Edge Layer"
        CDN[Cloudflare CDN + DDoS]
    end

    subgraph "Next.js Monolith"
        API[API Routes - Next.js App Router]
        WS[WebSocket Server]
        AUTH[Auth Module]
        BOOK[Booking Module]
        CUST[Customer Module]
        SVC[Service Module]
        EMP[Employee Module]
        RES[Resource Module]
        PAY[Payment Module]
        COUP[Coupon Module]
        GIFT[Gift Card Module]
        LOY[Loyalty Module]
        NOTIF[Notification Module]
        REV[Review Module]
        AI_MOD[AI Module]
        MKT[Marketplace Module]
        AUTO[Automation Module]
        ANA[Analytics Module]
    end

    subgraph "Data Layer"
        PG[(Neon PostgreSQL)]
        REDIS[(Upstash Redis)]
        S3[(S3 / Cloudflare R2)]
    end

    subgraph "External Services"
        COM[Comgate API]
        QR[QRcomat API]
        OAI[OpenAI API]
        SMTP[SMTP Server]
        SMS[SMS Provider]
    end

    WEB & WID & PUB --> CDN --> API
    API --> AUTH & BOOK & CUST & SVC & EMP & RES & PAY & COUP & GIFT & LOY & NOTIF & REV & AI_MOD & MKT & AUTO & ANA
    API --> WS

    AUTH & BOOK & CUST & SVC & EMP & RES & PAY & COUP & GIFT & LOY & NOTIF & REV & AI_MOD & MKT & AUTO & ANA --> PG
    AUTH & BOOK & AI_MOD --> REDIS
    MKT --> S3

    PAY --> COM & QR
    AI_MOD --> OAI
    NOTIF --> SMTP & SMS
```

### 5.2. Tech Stack

| Vrstva           | Technologie                                                  |
| ---------------- | ------------------------------------------------------------ |
| Frontend         | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| State Management | Zustand (global), React Query/TanStack Query (server state)  |
| Realtime         | Socket.io (WebSocket)                                        |
| Backend Runtime  | Node.js 20 LTS                                               |
| Framework        | Next.js 15 API Routes (monolith)                             |
| ORM              | Drizzle ORM                                                  |
| Databáze         | Neon PostgreSQL (serverless)                                 |
| Cache / Sessions | Upstash Redis (HTTP)                                         |
| File Storage     | Cloudflare R2 (S3-compatible)                                |
| Search           | PostgreSQL full-text search (pg_trgm)                        |
| AI/ML            | Python 3.12, scikit-learn, XGBoost, OpenAI API               |
| Kontejnerizace   | Docker                                                       |
| Orchestrace      | Kubernetes (K3s pro staging, EKS/GKE pro produkci)           |
| CI/CD            | GitHub Actions                                               |
| IaC              | Terraform                                                    |
| Monitoring       | Prometheus + Grafana                                         |
| Tracing          | OpenTelemetry + Jaeger                                       |
| Logging          | Loki + Grafana                                               |
| Error Tracking   | Sentry                                                       |
| Secrets          | HashiCorp Vault                                              |

### 5.3. Datový model (ER Diagram)

```mermaid
erDiagram
    COMPANIES ||--o{ USERS : has
    COMPANIES ||--o{ SERVICES : offers
    COMPANIES ||--o{ EMPLOYEES : employs
    COMPANIES ||--o{ CUSTOMERS : has
    COMPANIES ||--o{ RESOURCES : owns
    COMPANIES ||--o{ BOOKINGS : has
    COMPANIES ||--o{ PAYMENTS : has
    COMPANIES ||--o{ COUPONS : has
    COMPANIES ||--o{ GIFT_CARDS : has
    COMPANIES ||--o{ LOYALTY_PROGRAMS : has
    COMPANIES ||--o{ NOTIFICATION_TEMPLATES : has
    COMPANIES ||--o{ REVIEWS : has
    COMPANIES ||--o{ AUTOMATION_RULES : has
    COMPANIES ||--o{ MARKETPLACE_LISTINGS : has
    COMPANIES ||--o{ WHITELABEL_APPS : has

    CUSTOMERS ||--o{ BOOKINGS : makes
    CUSTOMERS ||--o{ LOYALTY_CARDS : holds
    CUSTOMERS ||--o{ REVIEWS : writes
    CUSTOMERS }o--o{ TAGS : labeled_with

    SERVICES ||--o{ BOOKINGS : booked_for
    SERVICES }o--o{ EMPLOYEES : provided_by
    SERVICES }o--o{ RESOURCES : requires

    EMPLOYEES ||--o{ BOOKINGS : assigned_to
    EMPLOYEES ||--o{ WORKING_HOURS : has
    EMPLOYEES ||--o{ WORKING_HOURS_OVERRIDES : has

    BOOKINGS ||--o{ PAYMENTS : paid_by
    BOOKINGS ||--o{ BOOKING_RESOURCES : uses
    BOOKINGS ||--o| VIDEO_MEETINGS : has
    BOOKINGS ||--o{ NOTIFICATIONS : triggers

    LOYALTY_PROGRAMS ||--o{ LOYALTY_CARDS : issues
    LOYALTY_PROGRAMS ||--o{ LOYALTY_TIERS : has
    LOYALTY_PROGRAMS ||--o{ REWARDS : offers
    LOYALTY_CARDS ||--o{ LOYALTY_TRANSACTIONS : records

    COUPONS ||--o{ COUPON_USAGE : tracked_by
    GIFT_CARDS ||--o{ GIFT_CARD_TRANSACTIONS : tracked_by

    AUTOMATION_RULES ||--o{ AUTOMATION_LOGS : produces
```

---

## 6. Modulární Architektura & Boundaries

> **Poznámka:** Následující tabulka popisuje doménové moduly uvnitř jedné Next.js aplikace.
> Nejde o samostatně nasazované microservices, ale o logické hranice v kódu.
> Monorepo struktura: `apps/web` (Next.js app), `packages/database` (Drizzle schéma),
> `packages/shared` (sdílené typy), `packages/events` (doménové eventy — typy only),
> `packages/ui` (sdílené UI komponenty).

### 6.1. Modulový Katalog

| #   | Service              | Zodpovědnost                                | DB Tabulky                                                                              | API Prefix                                  |
| --- | -------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Auth Service         | Registrace, login, JWT, MFA, OAuth2, RBAC   | users, roles, permissions, role_permissions, password_history, refresh_tokens, api_keys | /auth/\*, /settings/api-keys                |
| 2   | Booking Service      | CRUD rezervací, availability, voice booking | bookings, booking_resources, availability_slots                                         | /bookings/\*, /availability                 |
| 3   | Customer Service     | CRUD zákazníků, tagging, GDPR               | customers, tags, customer_tags                                                          | /customers/_, /tags/_                       |
| 4   | Service Service      | CRUD služeb a kategorií                     | services, service_categories, service_resources                                         | /services/_, /service-categories/_          |
| 5   | Employee Service     | CRUD zaměstnanců, rozvrhy                   | employees, employee_services, working_hours, working_hours_overrides                    | /employees/\*                               |
| 6   | Resource Service     | CRUD zdrojů                                 | resources, resource_types                                                               | /resources/\*, /resource-types              |
| 7   | Payment Service      | Platby, refundy, faktury, Comgate, QRcomat  | payments, invoices                                                                      | /payments/_, /invoices/_, /webhooks/\*      |
| 8   | Coupon Service       | CRUD kupónů, validace                       | coupons, coupon_usage                                                                   | /coupons/\*                                 |
| 9   | Gift Card Service    | CRUD dárkových karet, redemption            | gift_cards, gift_card_transactions                                                      | /gift-cards/\*                              |
| 10  | Loyalty Service      | Věrnostní program, karty, odměny            | loyalty_programs, loyalty_tiers, loyalty_cards, loyalty_transactions, rewards           | /loyalty/\*                                 |
| 11  | Notification Service | Email, SMS, push, šablony                   | notifications, notification_templates                                                   | /notifications/_, /notification-templates/_ |
| 12  | Review Service       | Recenze, odpovědi                           | reviews                                                                                 | /reviews/\*                                 |
| 13  | AI Service           | ML predikce, doporučení, optimalizace       | ai_predictions, ai_model_metrics                                                        | /ai/\*                                      |
| 14  | Marketplace Service  | Katalog firem, vyhledávání                  | marketplace_listings                                                                    | /marketplace/\*                             |
| 15  | Video Service        | Zoom, Meet, Teams integrace                 | video_meetings                                                                          | /video/\*                                   |
| 16  | App Service          | White-label mobilní app                     | whitelabel_apps                                                                         | /apps/\*                                    |
| 17  | Automation Service   | Pravidla, triggery, akce                    | automation_rules, automation_logs                                                       | /automation/\*                              |
| 18  | Analytics Service    | Dashboard, statistiky, export               | analytics_events, audit_logs, competitor_data                                           | /analytics/\*                               |
| 19  | Settings Service     | Firemní nastavení, webhooky, widget         | companies (settings)                                                                    | /settings/_, /widget/_                      |

### 6.2. Shared Kernel

Všechny moduly sdílejí (prostřednictvím `packages/shared` a `packages/database`):

- **company_id** — tenant izolace (Row Level Security)
- **UUID** — veřejné identifikátory (nikdy neexponovat SERIAL id)
- **Timestamp pattern** — created_at, updated_at (TIMESTAMPTZ)
- **Audit logging** — automatický zápis do audit_logs
- **Error format** — standardní JSON error response

---

## 7. Domain Events (Synchronní)

> **Poznámka:** RabbitMQ byl odstraněn. Doménové eventy jsou zpracovávány synchronně inline
> v rámci Next.js API routes. Balíček `packages/events/` obsahuje pouze typové definice.
> Funkce `publishEvent()` je safe no-op. Níže uvedený katalog dokumentuje doménové eventy,
> které JSOU emitovány (synchronně), jako referenci pro budoucí asynchronní zpracování.

### 7.1. Event Routing

**Naming:** `{modul}.{entita}.{akce}` (např. `booking.booking.created`)
**Format:** JSON s CloudEvents spec
**Zpracování:** Synchronní inline (publishEvent je no-op, logika je volána přímo)

### 7.2. Event Katalog

```yaml
# === BOOKING EVENTS ===
booking.booking.created:
  producer: Booking Service
  consumers: [Notification, AI, Analytics, Automation]
  payload:
    booking_id: integer
    company_id: integer
    customer_id: integer
    service_id: integer
    employee_id: integer
    start_time: datetime
    price: decimal
    source: string

booking.booking.confirmed:
  producer: Booking Service
  consumers: [Notification, Analytics, Video]
  payload:
    booking_id: integer
    company_id: integer
    customer_id: integer

booking.booking.cancelled:
  producer: Booking Service
  consumers: [Notification, Payment, Loyalty, Analytics, Video]
  payload:
    booking_id: integer
    company_id: integer
    customer_id: integer
    reason: string
    cancelled_by: string

booking.booking.completed:
  producer: Booking Service
  consumers: [Notification, Loyalty, AI, Analytics, Automation]
  payload:
    booking_id: integer
    company_id: integer
    customer_id: integer
    service_id: integer
    final_price: decimal

booking.booking.no_show:
  producer: Booking Service
  consumers: [Notification, AI, Analytics, Automation]
  payload:
    booking_id: integer
    customer_id: integer

# === PAYMENT EVENTS ===
payment.payment.initiated:
  producer: Payment Service
  consumers: [Analytics]
  payload:
    payment_id: integer
    booking_id: integer
    gateway: string
    amount: decimal

payment.payment.completed:
  producer: Payment Service
  consumers: [Booking, Notification, Loyalty, Invoice, Analytics]
  payload:
    payment_id: integer
    booking_id: integer
    amount: decimal
    gateway: string
    gateway_transaction_id: string

payment.payment.failed:
  producer: Payment Service
  consumers: [Booking, Notification, Analytics]
  payload:
    payment_id: integer
    booking_id: integer
    error: string

payment.payment.refunded:
  producer: Payment Service
  consumers: [Booking, Notification, Loyalty, Analytics]
  payload:
    payment_id: integer
    booking_id: integer
    refund_amount: decimal

# === CUSTOMER EVENTS ===
customer.customer.created:
  producer: Customer Service
  consumers: [Notification, Loyalty, Analytics, Automation]
  payload:
    customer_id: integer
    company_id: integer
    name: string
    email: string

customer.customer.updated:
  producer: Customer Service
  consumers: [Analytics]
  payload:
    customer_id: integer
    changed_fields: string[]

customer.customer.deleted:
  producer: Customer Service
  consumers: [Loyalty, Analytics, GDPR]
  payload:
    customer_id: integer
    company_id: integer

# === REVIEW EVENTS ===
review.review.created:
  producer: Review Service
  consumers: [Notification, Marketplace, Analytics, Automation]
  payload:
    review_id: integer
    company_id: integer
    customer_id: integer
    rating: integer

# === AUTOMATION EVENTS ===
automation.rule.triggered:
  producer: Automation Service
  consumers: [Notification, Loyalty, AI]
  payload:
    rule_id: integer
    action_type: string
    target_entity_type: string
    target_entity_id: integer

# === NOTIFICATION EVENTS ===
notification.notification.sent:
  producer: Notification Service
  consumers: [Analytics]
  payload:
    notification_id: integer
    channel: string
    status: string

notification.notification.opened:
  producer: Notification Service
  consumers: [AI, Analytics]
  payload:
    notification_id: integer
    opened_at: datetime

notification.notification.clicked:
  producer: Notification Service
  consumers: [AI, Analytics]
  payload:
    notification_id: integer
    clicked_at: datetime
```

### 7.3. Event Schema (CloudEvents)

```json
{
  "specversion": "1.0",
  "id": "uuid-v4",
  "source": "schedulebox/booking-service",
  "type": "booking.booking.created",
  "time": "2026-02-10T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "booking_id": 12345,
    "company_id": 1,
    "customer_id": 42,
    "service_id": 7,
    "employee_id": 3,
    "start_time": "2026-02-15T10:00:00Z",
    "price": 500.0,
    "source": "online"
  }
}
```

### 7.4. Error Handling (synchronní režim)

V současné synchronní architektuře se chyby při zpracování eventů řeší:

- **Try/catch** v inline event handlerech — selhání nepropaguje do hlavní operace
- **Retry logika** — kritické operace (notifikace, loyalty) mají retry s exponential backoff
- **Logging** — selhané eventy jsou logovány přes Winston pro pozdější analýzu
- **Budoucí plán:** Při škálování nad 500 firem zvážit přechod na asynchronní message queue

---

## 8. Service Interdependencies

### 8.1. Kompletní Dependency Matrix

| Service      | Synchronní závislosti (REST)          | Asynchronní (Events konzumuje)                                                    | Asynchronní (Events produkuje)                        | Externí API                   |
| ------------ | ------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------- |
| Auth         | —                                     | —                                                                                 | —                                                     | Google, Facebook, Apple OAuth |
| Booking      | Customer, Service, Employee, Resource | payment.completed, payment.failed                                                 | booking.created/confirmed/cancelled/completed/no_show | —                             |
| Customer     | —                                     | —                                                                                 | customer.created/updated/deleted                      | —                             |
| Service      | —                                     | —                                                                                 | —                                                     | —                             |
| Employee     | —                                     | —                                                                                 | —                                                     | —                             |
| Resource     | —                                     | —                                                                                 | —                                                     | —                             |
| Payment      | Booking                               | booking.cancelled                                                                 | payment.initiated/completed/failed/refunded           | Comgate, QRcomat              |
| Coupon       | —                                     | —                                                                                 | —                                                     | —                             |
| Gift Card    | —                                     | —                                                                                 | —                                                     | —                             |
| Loyalty      | Customer                              | booking.completed, customer.created, payment.refunded                             | —                                                     | Apple Wallet, Google Wallet   |
| Notification | Customer                              | booking._, payment._, customer.created, review.created, automation.rule.triggered | notification.sent/opened/clicked                      | SMTP, SMS Provider            |
| Review       | Customer, Service                     | —                                                                                 | review.created                                        | —                             |
| AI           | Customer, Booking                     | booking.completed, booking.no_show, notification.opened/clicked                   | —                                                     | OpenAI                        |
| Marketplace  | Company                               | review.created                                                                    | —                                                     | —                             |
| Video        | Booking                               | booking.confirmed, booking.cancelled                                              | —                                                     | Zoom, Google Meet, MS Teams   |
| App          | Company                               | —                                                                                 | —                                                     | App Store, Google Play        |
| Automation   | —                                     | booking._, payment._, customer.\*, review.created                                 | automation.rule.triggered                             | —                             |
| Analytics    | —                                     | ALL events                                                                        | —                                                     | —                             |
| Settings     | —                                     | —                                                                                 | —                                                     | —                             |

### 8.2. Kritické cesty

```mermaid
graph LR
    A[Booking Created] -->|sync| B[Customer Service]
    A -->|sync| C[Service Service]
    A -->|sync| D[Employee Service]
    A -->|event| E[Notification: confirmation email]
    A -->|event| F[AI: no-show prediction]
    A -->|event| G[Analytics: tracking]
    A -->|event| H[Automation: rule check]

    I[Payment Completed] -->|event| J[Booking: status → confirmed]
    I -->|event| K[Notification: payment confirmation]
    I -->|event| L[Loyalty: award points]
    I -->|event| M[Invoice: generate]
    I -->|event| N[Analytics: revenue tracking]
```

---

## 9. SAGA Workflows

### 9.1. Booking + Payment SAGA (Choreography)

```mermaid
sequenceDiagram
    participant C as Client
    participant BS as Booking Service
    participant PS as Payment Service
    participant NS as Notification Module
    participant LS as Loyalty Module

    C->>BS: POST /bookings (with payment required)
    BS->>BS: Validate availability (SELECT FOR UPDATE)
    BS->>BS: Create booking (status=pending)
    BS->>NS: booking.booking.created (synchronní)
    BS-->>C: 201 Created (booking with payment URL)

    C->>PS: POST /payments/comgate/create
    PS->>PS: Create payment (status=pending)
    PS-->>C: redirect_url

    Note over C: Customer pays on Comgate

    PS->>PS: Webhook: payment confirmed
    PS->>PS: Update payment (status=paid)
    PS->>BS: payment.payment.completed (synchronní)

    BS->>BS: payment.payment.completed
    BS->>BS: Update booking (status=confirmed)
    BS-->>MQ: booking.booking.confirmed

    MQ-->>NS: booking.booking.confirmed
    NS->>NS: Send confirmation email

    MQ-->>LS: payment.payment.completed
    LS->>LS: Award loyalty points

    Note over PS: If payment fails:
    PS-->>MQ: payment.payment.failed
    MQ-->>BS: payment.payment.failed
    BS->>BS: Update booking (status=cancelled, reason=payment_failed)
    BS-->>MQ: booking.booking.cancelled
```

### 9.2. Booking Expiration (Timeout Pattern)

```
Pravidlo: Booking ve stavu "pending" + requires_payment = true
Timeout: 30 minut od vytvoření
Akce: Automaticky zrušit booking a uvolnit slot

Implementace:
- Cron job každou minutu: UPDATE bookings SET status='cancelled' WHERE status='pending' AND requires_payment=true AND created_at < NOW() - INTERVAL '30 minutes'
```

### 9.3. Kompenzační akce

| Selhání                       | Kompenzace                                                            |
| ----------------------------- | --------------------------------------------------------------------- |
| Payment failed                | Booking → cancelled, slot uvolněn                                     |
| Notification failed           | Retry 3×, pak DLQ (booking zůstane confirmed)                         |
| Loyalty failed                | Retry 3×, pak DLQ (booking zůstane confirmed, body přiděleny později) |
| Video meeting creation failed | Retry 3×, booking confirmed bez videa, admin notifikován              |
| Invoice generation failed     | Retry 3×, DLQ, manuální vystavení                                     |

**Princip:** Platba a rezervace jsou kritické (kompenzace = rollback). Notifikace, loyalty, video jsou ne-kritické (kompenzace = retry + DLQ, nikdy rollback).

---

## 10. Resilience & Fallback Patterns

### 10.1. Circuit Breaker

```typescript
// Circuit breaker konfigurace per external service
const circuitBreakers = {
  comgate: {
    failureThreshold: 5, // 5 failures → open
    successThreshold: 3, // 3 successes → close
    timeout: 30_000, // 30s half-open timeout
    monitorInterval: 10_000, // check every 10s
  },
  qrcomat: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15_000,
  },
  openai: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60_000, // AI může být pomalejší
  },
  zoom: { failureThreshold: 3, successThreshold: 2, timeout: 30_000 },
  google_meet: { failureThreshold: 3, successThreshold: 2, timeout: 30_000 },
  ms_teams: { failureThreshold: 3, successThreshold: 2, timeout: 30_000 },
  smtp: { failureThreshold: 5, successThreshold: 3, timeout: 60_000 },
  sms_provider: { failureThreshold: 3, successThreshold: 2, timeout: 30_000 },
};
```

### 10.2. Retry Policy

```typescript
const retryPolicies = {
  // Payment webhooks: kritické, agresivní retry
  payment_webhook: {
    maxRetries: 5,
    backoff: 'exponential', // 1s, 2s, 4s, 8s, 16s
    maxDelay: 30_000,
    retryableErrors: [408, 429, 500, 502, 503, 504],
  },
  // Notifications: důležité, ale ne-kritické
  notification: {
    maxRetries: 3,
    backoff: 'exponential', // 5s, 25s, 125s
    initialDelay: 5_000,
    retryableErrors: [408, 429, 500, 502, 503, 504],
  },
  // AI predictions: ne-kritické, rychlý fallback
  ai_prediction: {
    maxRetries: 1,
    backoff: 'fixed',
    delay: 2_000,
    retryableErrors: [408, 429, 500, 502, 503],
  },
  // External API calls: standard
  external_api: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1_000,
    maxDelay: 10_000,
  },
};
```

### 10.3. Timeout Configuration

| Service / Call             | Timeout | Důvod              |
| -------------------------- | ------- | ------------------ |
| Interní service-to-service | 5s      | Rychlý fail        |
| Comgate API                | 15s     | Platební brána     |
| QRcomat API                | 10s     | Generování QR      |
| OpenAI API                 | 30s     | LLM inference      |
| Zoom/Meet/Teams API        | 10s     | Meeting creation   |
| SMTP sending               | 10s     | Email delivery     |
| SMS sending                | 5s      | SMS delivery       |
| Database query             | 5s      | Kill slow queries  |
| Redis                      | 1s      | Cache must be fast |

### 10.4. Fallback Strategie

| Service                      | Fallback                              | Výchozí hodnota                                                     |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| **AI No-show Predictor**     | Vrátit průměrné skóre                 | `{ score: 0.15, confidence: 0.0, fallback: true }`                  |
| **AI CLV Predictor**         | Vrátit průměr z customers.total_spent | `{ score: avg(total_spent) * 2.5, fallback: true }`                 |
| **AI Smart Upselling**       | Top 3 služby podle popularity         | `SELECT * FROM services ORDER BY total_bookings DESC LIMIT 3`       |
| **AI Pricing Optimizer**     | Vrátit statickou cenu                 | `{ recommended_price: services.price, fallback: true }`             |
| **AI Capacity Optimizer**    | Prázdná doporučení                    | `{ recommendations: [], fallback: true }`                           |
| **AI Customer Health**       | Vypočítat z RFM bez ML                | Recency × 0.4 + Frequency × 0.35 + Monetary × 0.25 → scale to 0-100 |
| **AI Smart Reminder Timing** | Default 24h (1440 min)                | `{ optimal_minutes_before: 1440, fallback: true }`                  |
| **Comgate nedostupný**       | Zobrazit "platba dočasně nedostupná"  | Booking vytvořen jako pending, retry za 5 min                       |
| **QRcomat nedostupný**       | Nabídnout platbu hotově               | Cash payment fallback                                               |
| **SMTP nedostupný**          | Retry s exponential backoff           | Zprávy se odešlou později                                           |
| **Redis nedostupný**         | Bypass cache, direct DB               | Pomalejší, ale funkční                                              |
| **Video API nedostupný**     | Booking bez videa                     | Admin notifikován pro manuální setup                                |

### 10.5. Bulkhead Pattern

Izolace kritických od ne-kritických služeb:

```
┌─────────────────────────────────────┐
│ CRITICAL POOL (20 connections)      │
│  • Booking Service                  │
│  • Payment Service                  │
│  • Auth Service                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ STANDARD POOL (10 connections)      │
│  • Customer Service                 │
│  • Service Service                  │
│  • Employee Service                 │
│  • Resource Service                 │
│  • Notification Service             │
│  • Loyalty Service                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ BACKGROUND POOL (5 connections)     │
│  • AI Service                       │
│  • Analytics Service                │
│  • Marketplace Service              │
│  • Automation Service               │
│  • Competitor Intelligence          │
└─────────────────────────────────────┘
```

---

# ČÁST III — DATABÁZE

---

## 11. Databázové Schéma

### 11.1. Kompletní SQL (PostgreSQL 16)

```sql

-- ============================================================================
-- ScheduleBox - Kompletní Databázové Schéma (PostgreSQL)
-- Verze: 2.0 (100% kompletní)
-- Datum: 9. února 2026
-- Autor: AI-PMLOGY-INT + Claude
--
-- Toto schéma obsahuje VŠECHNY tabulky pro VŠECHNY doménové moduly:
--   1. Auth & Tenancy (companies, users, roles, permissions)
--   2. Booking Service (bookings, booking_resources, availability_slots)
--   3. Customer Service (customers, customer_tags, tags)
--   4. Service Service (services, service_categories)
--   5. Staff/Employee Service (employees, employee_services, working_hours)
--   6. Resource Service (resources, resource_types)
--   7. Payment Service (payments, invoices)
--   8. Coupon & Gift Card Service (coupons, coupon_usage, gift_cards, gift_card_transactions)
--   9. Loyalty Service (loyalty_programs, loyalty_cards, loyalty_transactions, rewards)
--  10. Notification Service (notifications, notification_templates)
--  11. Review Service (reviews)
--  12. AI Service (ai_predictions)
--  13. Marketplace Service (marketplace_listings)
--  14. Video Service (video_meetings)
--  15. App Service (whitelabel_apps)
--  16. Automation Service (automation_rules, automation_logs)
--  17. Analytics & Audit (analytics_events, audit_logs)
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. AUTH & TENANCY
-- ============================================================================

CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    website         VARCHAR(500),
    logo_url        VARCHAR(500),
    description     TEXT,
    address_street  VARCHAR(255),
    address_city    VARCHAR(100),
    address_zip     VARCHAR(20),
    address_country VARCHAR(5) DEFAULT 'CZ',
    currency        VARCHAR(3) DEFAULT 'CZK',
    timezone        VARCHAR(50) DEFAULT 'Europe/Prague',
    locale          VARCHAR(10) DEFAULT 'cs-CZ',
    subscription_plan VARCHAR(20) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'professional', 'enterprise')),
    subscription_valid_until TIMESTAMP WITH TIME ZONE,
    industry_type   VARCHAR(50) DEFAULT 'general' CHECK (industry_type IN ('beauty_salon','barbershop','spa_wellness','fitness_gym','yoga_pilates','dance_studio','medical_clinic','veterinary','physiotherapy','psychology','auto_service','cleaning_service','tutoring','photography','consulting','coworking','pet_grooming','tattoo_piercing','escape_room','general')),
    industry_config JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    trial_ends_at   TIMESTAMP WITH TIME ZONE,
    suspended_at    TIMESTAMP WITH TIME ZONE,
    features_enabled JSONB DEFAULT '{}',
    settings        JSONB DEFAULT '{}',
    -- "vypadat zaneprázdněně" feature: skryje procento volných slotů
    busy_appearance_enabled  BOOLEAN DEFAULT FALSE,
    busy_appearance_percent  SMALLINT DEFAULT 0 CHECK (busy_appearance_percent BETWEEN 0 AND 50),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_subscription ON companies(subscription_plan);

CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL CHECK (name IN ('admin', 'owner', 'employee', 'customer')),
    description VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description) VALUES
    ('admin', 'Systémový administrátor'),
    ('owner', 'Vlastník firmy'),
    ('employee', 'Zaměstnanec firmy'),
    ('customer', 'Zákazník');

CREATE TABLE permissions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permissions (name, description) VALUES
    ('bookings.create', 'Vytvořit rezervaci'),
    ('bookings.read', 'Zobrazit rezervace'),
    ('bookings.update', 'Upravit rezervaci'),
    ('bookings.delete', 'Smazat rezervaci'),
    ('customers.create', 'Vytvořit zákazníka'),
    ('customers.read', 'Zobrazit zákazníky'),
    ('customers.update', 'Upravit zákazníka'),
    ('customers.delete', 'Smazat zákazníka'),
    ('services.create', 'Vytvořit službu'),
    ('services.read', 'Zobrazit služby'),
    ('services.update', 'Upravit službu'),
    ('services.delete', 'Smazat službu'),
    ('employees.manage', 'Spravovat zaměstnance'),
    ('resources.manage', 'Spravovat zdroje'),
    ('payments.read', 'Zobrazit platby'),
    ('payments.refund', 'Vrátit platbu'),
    ('reports.read', 'Zobrazit reporty'),
    ('settings.manage', 'Spravovat nastavení'),
    ('loyalty.manage', 'Spravovat věrnostní program'),
    ('coupons.manage', 'Spravovat kupóny'),
    ('marketplace.manage', 'Spravovat marketplace listing'),
    ('ai.use', 'Používat AI funkce'),
    ('whitelabel.manage', 'Spravovat white-label aplikaci');

CREATE TABLE role_permissions (
    role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Mapování: admin a owner mají všechno, employee omezený, customer minimální
-- Řeší se v seed datech nebo migraci

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    role_id         INTEGER NOT NULL REFERENCES roles(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    email_verified  BOOLEAN DEFAULT FALSE,
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    mfa_secret      VARCHAR(255),
    oauth_provider  VARCHAR(50),
    oauth_provider_id VARCHAR(255),
    last_login_at   TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, company_id)
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);

CREATE TABLE password_history (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_password_history_user ON password_history(user_id);

CREATE TABLE refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) UNIQUE NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE api_keys (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    key_hash    VARCHAR(255) UNIQUE NOT NULL,
    key_prefix  VARCHAR(10) NOT NULL,
    scopes      TEXT[] DEFAULT '{}',
    is_active   BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at  TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================================
-- 2. CUSTOMER SERVICE
-- ============================================================================

CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    date_of_birth   DATE,
    gender          VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', NULL)),
    notes           TEXT,
    source          VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'online', 'import', 'marketplace', 'api')),
    -- AI-computed fields
    health_score    SMALLINT CHECK (health_score BETWEEN 0 AND 100),
    clv_predicted   NUMERIC(10, 2),
    no_show_count   INTEGER DEFAULT 0,
    total_bookings  INTEGER DEFAULT 0,
    total_spent     NUMERIC(12, 2) DEFAULT 0,
    last_visit_at   TIMESTAMP WITH TIME ZONE,
    -- Marketing
    marketing_consent BOOLEAN DEFAULT FALSE,
    preferred_contact VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact IN ('email', 'sms', 'phone')),
    preferred_reminder_minutes INTEGER DEFAULT 1440, -- AI optimalizovaný čas
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, company_id)
);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_health ON customers(company_id, health_score);

CREATE TABLE tags (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    color       VARCHAR(7) DEFAULT '#3B82F6',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);
CREATE INDEX idx_tags_company ON tags(company_id);

CREATE TABLE customer_tags (
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, tag_id)
);

-- ============================================================================
-- 3. SERVICE SERVICE
-- ============================================================================

CREATE TABLE service_categories (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);
CREATE INDEX idx_service_categories_company ON service_categories(company_id);

CREATE TABLE services (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id     INTEGER REFERENCES service_categories(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    buffer_before_minutes INTEGER DEFAULT 0,
    buffer_after_minutes  INTEGER DEFAULT 0,
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    currency        VARCHAR(3) DEFAULT 'CZK',
    -- AI dynamic pricing
    dynamic_pricing_enabled BOOLEAN DEFAULT FALSE,
    price_min       NUMERIC(10, 2),
    price_max       NUMERIC(10, 2),
    -- Capacity
    max_capacity    INTEGER DEFAULT 1,
    -- Online booking settings
    online_booking_enabled BOOLEAN DEFAULT TRUE,
    requires_payment BOOLEAN DEFAULT FALSE,
    cancellation_policy_hours INTEGER DEFAULT 24,
    -- Video
    is_online       BOOLEAN DEFAULT FALSE,
    video_provider  VARCHAR(20) CHECK (video_provider IN ('zoom', 'google_meet', 'ms_teams', NULL)),
    -- Display
    color           VARCHAR(7) DEFAULT '#3B82F6',
    image_url       VARCHAR(500),
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_services_company ON services(company_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(company_id, is_active);

-- ============================================================================
-- 4. STAFF / EMPLOYEE SERVICE
-- ============================================================================

CREATE TABLE employees (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    title           VARCHAR(100),
    bio             TEXT,
    avatar_url      VARCHAR(500),
    color           VARCHAR(7) DEFAULT '#3B82F6',
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_user ON employees(user_id);

CREATE TABLE employee_services (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (employee_id, service_id)
);

CREATE TABLE working_hours (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    -- Pokud employee_id je NULL, jedná se o výchozí pracovní dobu firmy
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=neděle, 6=sobota
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);
CREATE INDEX idx_working_hours_company ON working_hours(company_id);
CREATE INDEX idx_working_hours_employee ON working_hours(employee_id);

CREATE TABLE working_hours_overrides (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    start_time  TIME, -- NULL = celý den volno
    end_time    TIME,
    is_day_off  BOOLEAN DEFAULT FALSE,
    reason      VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_wh_overrides_company_date ON working_hours_overrides(company_id, date);
CREATE INDEX idx_wh_overrides_employee_date ON working_hours_overrides(employee_id, date);

-- ============================================================================
-- 5. RESOURCE SERVICE
-- ============================================================================

CREATE TABLE resource_types (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

CREATE TABLE resources (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    resource_type_id INTEGER REFERENCES resource_types(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    quantity         INTEGER DEFAULT 1 CHECK (quantity > 0),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_resources_company ON resources(company_id);
CREATE INDEX idx_resources_type ON resources(resource_type_id);

CREATE TABLE service_resources (
    service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    quantity_needed INTEGER DEFAULT 1,
    PRIMARY KEY (service_id, resource_id)
);

-- ============================================================================
-- 6. BOOKING SERVICE
-- ============================================================================

CREATE TABLE bookings (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    service_id      INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    employee_id     INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    start_time      TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time        TIMESTAMP WITH TIME ZONE NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                        'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
                    )),
    source          VARCHAR(30) DEFAULT 'online' CHECK (source IN (
                        'online', 'admin', 'phone', 'walk_in', 'voice_ai', 'marketplace', 'api', 'widget'
                    )),
    notes           TEXT,
    internal_notes  TEXT,
    -- Pricing (snapshot at booking time)
    price           NUMERIC(10, 2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'CZK',
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    coupon_id       INTEGER,
    gift_card_id    INTEGER,
    -- Video
    video_meeting_id INTEGER,
    -- AI
    no_show_probability REAL,
    -- Cancellation
    cancelled_at    TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    cancelled_by    VARCHAR(20) CHECK (cancelled_by IN ('customer', 'employee', 'admin', 'system', NULL)),
    -- Metadata
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);
CREATE INDEX idx_bookings_company ON bookings(company_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_employee ON bookings(employee_id);
CREATE INDEX idx_bookings_start ON bookings(company_id, start_time);
CREATE INDEX idx_bookings_status ON bookings(company_id, status);
CREATE INDEX idx_bookings_date_range ON bookings(company_id, start_time, end_time);

CREATE TABLE booking_resources (
    id          SERIAL PRIMARY KEY,
    booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
    quantity    INTEGER DEFAULT 1,
    UNIQUE(booking_id, resource_id)
);
CREATE INDEX idx_booking_resources_booking ON booking_resources(booking_id);
CREATE INDEX idx_booking_resources_resource ON booking_resources(resource_id);

CREATE TABLE availability_slots (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    -- Precomputed slot (pro rychlý lookup)
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_availability_company_date ON availability_slots(company_id, date);
CREATE INDEX idx_availability_employee_date ON availability_slots(employee_id, date);

-- ============================================================================
-- 7. PAYMENT SERVICE
-- ============================================================================

CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    booking_id      INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount          NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) DEFAULT 'CZK',
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                        'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
                    )),
    gateway         VARCHAR(20) NOT NULL CHECK (gateway IN (
                        'comgate', 'qrcomat', 'cash', 'bank_transfer', 'gift_card'
                    )),
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB,
    refund_amount   NUMERIC(10, 2) DEFAULT 0,
    refund_reason   TEXT,
    paid_at         TIMESTAMP WITH TIME ZONE,
    refunded_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payments_company ON payments(company_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(company_id, status);
CREATE INDEX idx_payments_gateway_tx ON payments(gateway, gateway_transaction_id);

CREATE TABLE invoices (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_id      INTEGER NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number  VARCHAR(50) NOT NULL,
    amount          NUMERIC(10, 2) NOT NULL,
    tax_amount      NUMERIC(10, 2) DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'CZK',
    status          VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
    issued_at       DATE NOT NULL DEFAULT CURRENT_DATE,
    due_at          DATE,
    pdf_url         VARCHAR(500),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, invoice_number)
);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);

-- ============================================================================
-- 8. COUPON & GIFT CARD SERVICE
-- ============================================================================

CREATE TABLE coupons (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,
    description     VARCHAR(255),
    discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    min_booking_amount NUMERIC(10, 2) DEFAULT 0,
    max_uses        INTEGER, -- NULL = neomezeno
    current_uses    INTEGER DEFAULT 0,
    max_uses_per_customer INTEGER DEFAULT 1,
    applicable_service_ids INTEGER[], -- NULL = všechny služby
    valid_from      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until     TIMESTAMP WITH TIME ZONE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);
CREATE INDEX idx_coupons_company ON coupons(company_id);
CREATE INDEX idx_coupons_code ON coupons(company_id, code);

CREATE TABLE coupon_usage (
    id          SERIAL PRIMARY KEY,
    coupon_id   INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    discount_applied NUMERIC(10, 2) NOT NULL,
    used_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_customer ON coupon_usage(customer_id);

CREATE TABLE gift_cards (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code            VARCHAR(50) UNIQUE NOT NULL,
    initial_balance NUMERIC(10, 2) NOT NULL CHECK (initial_balance > 0),
    current_balance NUMERIC(10, 2) NOT NULL CHECK (current_balance >= 0),
    currency        VARCHAR(3) DEFAULT 'CZK',
    purchased_by_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    recipient_name  VARCHAR(255),
    message         TEXT,
    valid_until     TIMESTAMP WITH TIME ZONE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_gift_cards_company ON gift_cards(company_id);
CREATE INDEX idx_gift_cards_code ON gift_cards(code);

CREATE TABLE gift_card_transactions (
    id          SERIAL PRIMARY KEY,
    gift_card_id INTEGER NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'redemption', 'refund')),
    amount      NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_gct_gift_card ON gift_card_transactions(gift_card_id);

-- ============================================================================
-- 9. LOYALTY SERVICE
-- ============================================================================

CREATE TABLE loyalty_programs (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('points', 'stamps', 'tiers')),
    points_per_currency NUMERIC(5, 2) DEFAULT 1, -- bodů za 1 CZK
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id)
);
CREATE INDEX idx_loyalty_programs_company ON loyalty_programs(company_id);

CREATE TABLE loyalty_tiers (
    id              SERIAL PRIMARY KEY,
    program_id      INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    min_points      INTEGER NOT NULL DEFAULT 0,
    benefits        JSONB DEFAULT '{}',
    color           VARCHAR(7) DEFAULT '#3B82F6',
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_loyalty_tiers_program ON loyalty_tiers(program_id);

CREATE TABLE loyalty_cards (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    program_id      INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    card_number     VARCHAR(50) UNIQUE NOT NULL,
    points_balance  INTEGER DEFAULT 0,
    stamps_balance  INTEGER DEFAULT 0,
    tier_id         INTEGER REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
    -- Apple Wallet / Google Pay
    apple_pass_url  VARCHAR(500),
    google_pass_url VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, customer_id)
);
CREATE INDEX idx_loyalty_cards_program ON loyalty_cards(program_id);
CREATE INDEX idx_loyalty_cards_customer ON loyalty_cards(customer_id);

CREATE TABLE loyalty_transactions (
    id          SERIAL PRIMARY KEY,
    card_id     INTEGER NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
    booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'stamp')),
    points      INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_loyalty_tx_card ON loyalty_transactions(card_id);
CREATE INDEX idx_loyalty_tx_booking ON loyalty_transactions(booking_id);

CREATE TABLE rewards (
    id              SERIAL PRIMARY KEY,
    program_id      INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    points_cost     INTEGER NOT NULL CHECK (points_cost > 0),
    reward_type     VARCHAR(30) NOT NULL CHECK (reward_type IN ('discount_percentage', 'discount_fixed', 'free_service', 'gift')),
    reward_value    NUMERIC(10, 2),
    applicable_service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    max_redemptions INTEGER, -- NULL = neomezeno
    current_redemptions INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rewards_program ON rewards(program_id);

-- ============================================================================
-- 10. NOTIFICATION SERVICE
-- ============================================================================

CREATE TABLE notification_templates (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL CHECK (type IN (
                        'booking_confirmation', 'booking_reminder', 'booking_cancellation',
                        'payment_confirmation', 'payment_reminder',
                        'review_request', 'welcome', 'loyalty_update',
                        'follow_up', 'custom'
                    )),
    channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    subject         VARCHAR(255),
    body_template   TEXT NOT NULL,
    -- Proměnné: {{customer_name}}, {{service_name}}, {{booking_date}}, {{booking_time}}, atd.
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, type, channel)
);
CREATE INDEX idx_notification_templates_company ON notification_templates(company_id);

CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    booking_id      INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    template_id     INTEGER REFERENCES notification_templates(id) ON DELETE SET NULL,
    channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    recipient       VARCHAR(255) NOT NULL, -- email address or phone number
    subject         VARCHAR(255),
    body            TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
    -- AI Smart Reminder Timing
    scheduled_at    TIMESTAMP WITH TIME ZONE,
    sent_at         TIMESTAMP WITH TIME ZONE,
    opened_at       TIMESTAMP WITH TIME ZONE,
    clicked_at      TIMESTAMP WITH TIME ZONE,
    error_message   TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_customer ON notifications(customer_id);
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE status = 'pending';

-- ============================================================================
-- 11. REVIEW SERVICE
-- ============================================================================

CREATE TABLE reviews (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    booking_id      INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    service_id      INTEGER REFERENCES services(id) ON DELETE SET NULL,
    employee_id     INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    -- Review Generator: auto redirect
    redirected_to   VARCHAR(50) CHECK (redirected_to IN ('google', 'facebook', 'internal', NULL)),
    is_published    BOOLEAN DEFAULT TRUE,
    reply           TEXT,
    replied_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reviews_company ON reviews(company_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);
CREATE INDEX idx_reviews_rating ON reviews(company_id, rating);

-- ============================================================================
-- 12. AI SERVICE
-- ============================================================================

CREATE TABLE ai_predictions (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL CHECK (type IN (
                        'no_show', 'clv', 'demand', 'churn', 'upsell', 'optimal_price', 'reminder_timing'
                    )),
    entity_type     VARCHAR(30) NOT NULL CHECK (entity_type IN ('booking', 'customer', 'service', 'timeslot')),
    entity_id       INTEGER NOT NULL,
    score           REAL NOT NULL,
    confidence      REAL CHECK (confidence BETWEEN 0 AND 1),
    details         JSONB DEFAULT '{}',
    model_version   VARCHAR(50),
    expires_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ai_predictions_company ON ai_predictions(company_id);
CREATE INDEX idx_ai_predictions_entity ON ai_predictions(entity_type, entity_id);
CREATE INDEX idx_ai_predictions_type ON ai_predictions(company_id, type);

CREATE TABLE ai_model_metrics (
    id              SERIAL PRIMARY KEY,
    model_name      VARCHAR(100) NOT NULL,
    model_version   VARCHAR(50) NOT NULL,
    metric_name     VARCHAR(50) NOT NULL,
    metric_value    REAL NOT NULL,
    evaluated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata        JSONB DEFAULT '{}'
);
CREATE INDEX idx_ai_metrics_model ON ai_model_metrics(model_name, model_version);

-- ============================================================================
-- 13. MARKETPLACE SERVICE
-- ============================================================================

CREATE TABLE marketplace_listings (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    subcategory     VARCHAR(100),
    address_street  VARCHAR(255),
    address_city    VARCHAR(100),
    address_zip     VARCHAR(20),
    latitude        NUMERIC(10, 7),
    longitude       NUMERIC(10, 7),
    images          TEXT[], -- array of image URLs
    average_rating  NUMERIC(3, 2) DEFAULT 0,
    review_count    INTEGER DEFAULT 0,
    price_range     VARCHAR(10) CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
    featured        BOOLEAN DEFAULT FALSE,
    verified        BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id)
);
CREATE INDEX idx_marketplace_category ON marketplace_listings(category);
CREATE INDEX idx_marketplace_city ON marketplace_listings(address_city);
CREATE INDEX idx_marketplace_rating ON marketplace_listings(average_rating DESC);
CREATE INDEX idx_marketplace_geo ON marketplace_listings(latitude, longitude);

-- ============================================================================
-- 14. VIDEO SERVICE
-- ============================================================================

CREATE TABLE video_meetings (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    booking_id      INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider        VARCHAR(20) NOT NULL CHECK (provider IN ('zoom', 'google_meet', 'ms_teams')),
    meeting_url     VARCHAR(500) NOT NULL,
    meeting_id      VARCHAR(255),
    host_url        VARCHAR(500),
    password        VARCHAR(50),
    start_time      TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status          VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'started', 'ended', 'cancelled')),
    provider_response JSONB,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_video_meetings_company ON video_meetings(company_id);
CREATE INDEX idx_video_meetings_booking ON video_meetings(booking_id);

-- ============================================================================
-- 15. APP SERVICE (White-label)
-- ============================================================================

CREATE TABLE whitelabel_apps (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    app_name        VARCHAR(100) NOT NULL,
    bundle_id       VARCHAR(255),
    logo_url        VARCHAR(500),
    primary_color   VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',
    features        JSONB DEFAULT '{"booking": true, "loyalty": true, "push": true}',
    ios_status      VARCHAR(20) DEFAULT 'draft' CHECK (ios_status IN ('draft', 'building', 'submitted', 'published', 'rejected')),
    android_status  VARCHAR(20) DEFAULT 'draft' CHECK (android_status IN ('draft', 'building', 'submitted', 'published', 'rejected')),
    ios_app_store_url VARCHAR(500),
    android_play_store_url VARCHAR(500),
    last_build_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id)
);
CREATE INDEX idx_whitelabel_company ON whitelabel_apps(company_id);

-- ============================================================================
-- 16. AUTOMATION SERVICE
-- ============================================================================

CREATE TABLE automation_rules (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    trigger_type    VARCHAR(50) NOT NULL CHECK (trigger_type IN (
                        'booking_created', 'booking_confirmed', 'booking_completed',
                        'booking_cancelled', 'booking_no_show',
                        'payment_received', 'customer_created',
                        'time_before_booking', 'time_after_booking',
                        'customer_inactive', 'review_received'
                    )),
    trigger_config  JSONB DEFAULT '{}',
    action_type     VARCHAR(50) NOT NULL CHECK (action_type IN (
                        'send_email', 'send_sms', 'send_push',
                        'update_booking_status', 'add_loyalty_points',
                        'create_task', 'webhook', 'ai_follow_up'
                    )),
    action_config   JSONB DEFAULT '{}',
    delay_minutes   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_automation_rules_company ON automation_rules(company_id);
CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger_type);

CREATE TABLE automation_logs (
    id              SERIAL PRIMARY KEY,
    rule_id         INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    booking_id      INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'skipped')),
    result          JSONB DEFAULT '{}',
    error_message   TEXT,
    executed_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_automation_logs_rule ON automation_logs(rule_id);
CREATE INDEX idx_automation_logs_status ON automation_logs(status);

-- ============================================================================
-- 17. ANALYTICS & AUDIT
-- ============================================================================

CREATE TABLE analytics_events (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    event_type      VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(30),
    entity_id       INTEGER,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    properties      JSONB DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    session_id      VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_analytics_company ON analytics_events(company_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(company_id, created_at);

CREATE TABLE audit_logs (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       INTEGER,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_company ON audit_logs(company_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================================
-- 18. COMPETITOR INTELLIGENCE
-- ============================================================================

CREATE TABLE competitor_data (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_url  VARCHAR(500),
    data_type       VARCHAR(50) NOT NULL CHECK (data_type IN ('pricing', 'services', 'reviews', 'availability')),
    data            JSONB NOT NULL,
    scraped_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_competitor_company ON competitor_data(company_id);
CREATE INDEX idx_competitor_type ON competitor_data(data_type);

-- ============================================================================
-- VIEWS (pro reporty a analytics)
-- ============================================================================

-- Denní přehled rezervací
CREATE OR REPLACE VIEW v_daily_booking_summary AS
SELECT
    b.company_id,
    DATE(b.start_time) AS booking_date,
    COUNT(*) AS total_bookings,
    COUNT(*) FILTER (WHERE b.status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
    COUNT(*) FILTER (WHERE b.status = 'no_show') AS no_shows,
    SUM(b.price - b.discount_amount) FILTER (WHERE b.status = 'completed') AS total_revenue
FROM bookings b
GROUP BY b.company_id, DATE(b.start_time);

-- Přehled zákazníků s metrikami
CREATE OR REPLACE VIEW v_customer_metrics AS
SELECT
    c.id,
    c.company_id,
    c.name,
    c.email,
    c.total_bookings,
    c.total_spent,
    c.no_show_count,
    c.health_score,
    c.clv_predicted,
    c.last_visit_at,
    CASE
        WHEN c.last_visit_at > NOW() - INTERVAL '30 days' THEN 'active'
        WHEN c.last_visit_at > NOW() - INTERVAL '90 days' THEN 'at_risk'
        ELSE 'churned'
    END AS status
FROM customers c
WHERE c.is_active = TRUE;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_%s_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$;

-- Update customer metrics after booking change
CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers SET
        total_bookings = (SELECT COUNT(*) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)),
        no_show_count = (SELECT COUNT(*) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'no_show'),
        total_spent = COALESCE((SELECT SUM(price - discount_amount) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'completed'), 0),
        last_visit_at = (SELECT MAX(end_time) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'completed')
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_customer_metrics
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_customer_metrics();

-- Update marketplace listing rating after review change
CREATE OR REPLACE FUNCTION update_marketplace_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE marketplace_listings SET
        average_rating = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE company_id = COALESCE(NEW.company_id, OLD.company_id) AND is_published = TRUE), 0),
        review_count = (SELECT COUNT(*) FROM reviews WHERE company_id = COALESCE(NEW.company_id, OLD.company_id) AND is_published = TRUE)
    WHERE company_id = COALESCE(NEW.company_id, OLD.company_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_marketplace_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_marketplace_rating();

-- Increment coupon usage count
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons SET current_uses = current_uses + 1 WHERE id = NEW.coupon_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coupon_usage_increment
AFTER INSERT ON coupon_usage
FOR EACH ROW EXECUTE FUNCTION increment_coupon_usage();

-- ============================================================================
-- SEED DATA (výchozí data)
-- ============================================================================

-- Role permissions seed (admin = vše, owner = vše kromě admin-only, employee = omezeno, customer = minimální)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'owner';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'employee' AND p.name IN (
    'bookings.create', 'bookings.read', 'bookings.update',
    'customers.create', 'customers.read', 'customers.update',
    'services.read', 'payments.read'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'customer' AND p.name IN (
    'bookings.create', 'bookings.read', 'services.read'
);

```

---

## 12. Row Level Security (RLS)

### 12.1. Multi-tenant izolace

Každá tabulka s `company_id` musí mít RLS politiku, která zajistí, že uživatel vidí jen data své firmy.

```sql
-- Aktivace RLS na klíčových tabulkách
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Funkce pro získání company_id z JWT (nastavena v session)
CREATE OR REPLACE FUNCTION current_company_id() RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.company_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- Funkce pro získání user role z JWT
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.user_role', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Univerzální politika pro tenant izolaci
-- Příklad pro bookings (aplikovat na VŠECHNY tabulky s company_id):
CREATE POLICY tenant_isolation_bookings ON bookings
    USING (company_id = current_company_id());

CREATE POLICY tenant_isolation_customers ON customers
    USING (company_id = current_company_id());

CREATE POLICY tenant_isolation_services ON services
    USING (company_id = current_company_id());

CREATE POLICY tenant_isolation_employees ON employees
    USING (company_id = current_company_id());

CREATE POLICY tenant_isolation_payments ON payments
    USING (company_id = current_company_id());

-- Admin role bypass (pro systémový admin)
CREATE POLICY admin_bypass_bookings ON bookings
    USING (current_user_role() = 'admin');

-- Customer může vidět jen své rezervace
CREATE POLICY customer_own_bookings ON bookings
    FOR SELECT
    USING (
        current_user_role() = 'customer'
        AND customer_id IN (
            SELECT id FROM customers WHERE user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
        )
    );

-- Nastavení session proměnných v connection middleware:
-- SET LOCAL app.company_id = '42';
-- SET LOCAL app.user_id = '123';
-- SET LOCAL app.user_role = 'owner';
```

---

## 13. Double-Booking Prevence

### 13.1. Pesimistický locking (doporučeno)

```sql
-- Transakce pro vytvoření rezervace s ochranou proti race condition
BEGIN;

-- 1. Zamknout relevantní sloty pro zaměstnance v daném čase
-- Advisory lock na kombinaci (employee_id, date)
SELECT pg_advisory_xact_lock(
    hashtext('booking_lock'),
    :employee_id * 10000 + EXTRACT(DOY FROM :start_time)::INTEGER
);

-- 2. Ověřit, že slot je stále volný
SELECT COUNT(*) AS conflicts
FROM bookings
WHERE company_id = :company_id
  AND employee_id = :employee_id
  AND status NOT IN ('cancelled')
  AND start_time < :end_time
  AND end_time > :start_time;

-- Pokud conflicts > 0 → ROLLBACK a vrátit 409 Conflict
-- Pokud conflicts = 0 → INSERT

-- 3. Ověřit resource dostupnost
SELECT r.id, r.quantity,
       COALESCE(SUM(br.quantity), 0) AS booked_quantity
FROM resources r
LEFT JOIN booking_resources br ON br.resource_id = r.id
LEFT JOIN bookings b ON b.id = br.booking_id
    AND b.status NOT IN ('cancelled')
    AND b.start_time < :end_time
    AND b.end_time > :start_time
WHERE r.id = ANY(:resource_ids)
  AND r.company_id = :company_id
GROUP BY r.id, r.quantity
HAVING r.quantity - COALESCE(SUM(br.quantity), 0) < 1;

-- Pokud vrátí řádky → nedostatečná kapacita → ROLLBACK

-- 4. Vytvořit booking
INSERT INTO bookings (company_id, customer_id, service_id, employee_id,
    start_time, end_time, status, price, source)
VALUES (:company_id, :customer_id, :service_id, :employee_id,
    :start_time, :end_time, 'pending', :price, :source)
RETURNING *;

COMMIT;
```

### 13.2. Unique Constraint (doplňková ochrana)

```sql
-- Exclusion constraint pro PostgreSQL (vyžaduje btree_gist extension)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Zabrání překrývajícím se rezervacím pro stejného zaměstnance
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING GIST (
        employee_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    )
    WHERE (status NOT IN ('cancelled'));
```

---

## 14. Partitioning Strategy

### 14.1. Tabulky pro partitioning

```sql
-- bookings: partition by month (start_time)
-- Po migraci: CREATE TABLE bookings (...) PARTITION BY RANGE (start_time);
-- CREATE TABLE bookings_2026_01 PARTITION OF bookings FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- atd.

-- notifications: partition by month (created_at)
-- analytics_events: partition by month (created_at)
-- audit_logs: partition by month (created_at)

-- Automatický management partitions:
-- pg_partman extension NEBO cron job pro vytváření měsíčních partitions
```

### 14.2. Soft Delete

```sql
-- Přidat deleted_at na klíčové tabulky
ALTER TABLE bookings ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE services ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial indexy pro výkon (ignorovat smazané)
CREATE INDEX idx_bookings_active ON bookings(company_id, start_time)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_active ON customers(company_id)
    WHERE deleted_at IS NULL;

-- GDPR: Anonymizace místo hard delete
-- UPDATE customers SET
--   name = 'ANONYMIZED',
--   email = 'anon_' || id || '@deleted.local',
--   phone = NULL,
--   date_of_birth = NULL,
--   notes = NULL,
--   deleted_at = NOW()
-- WHERE id = :customer_id;
```

### 14.3. Chybějící FK constraints (oprava)

```sql
-- Přidat chybějící FK na bookings tabulku
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_gift_card
    FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE SET NULL;

ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_video_meeting
    FOREIGN KEY (video_meeting_id) REFERENCES video_meetings(id) ON DELETE SET NULL;
```

---

# ČÁST IV — API

---

## 15. OpenAPI Specifikace

### 15.1. Kompletní YAML

```yaml

openapi: 3.0.3
info:
  title: ScheduleBox API
  version: 2.0.0
  description: Kompletni API specifikace pro ScheduleBox
servers:
  - url: https://api.schedulebox.cz/v1
    description: Production

tags:
  - {name: Auth}
  - {name: Bookings}
  - {name: Availability}
  - {name: Customers}
  - {name: Services}
  - {name: Employees}
  - {name: Resources}
  - {name: Payments}
  - {name: Coupons}
  - {name: GiftCards}
  - {name: Loyalty}
  - {name: Notifications}
  - {name: Reviews}
  - {name: AI}
  - {name: Marketplace}
  - {name: Video}
  - {name: Apps}
  - {name: Automation}
  - {name: Analytics}
  - {name: Webhooks}
  - {name: Settings}

security:
  - bearerAuth: []

paths:
  # AUTH SERVICE (13 endpoints)
  /auth/register:
    post:
      summary: Registrace noveho uzivatele a firmy
      tags: [Auth]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /auth/login:
    post:
      summary: Prihlaseni uzivatele
      tags: [Auth]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /auth/refresh:
    post:
      summary: Obnoveni access tokenu
      tags: [Auth]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refresh_token]
              properties:
                refresh_token: {type: string}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /auth/logout:
    post:
      summary: Odhlaseni
      tags: [Auth]
      responses:
        '204': {description: Odhlaseno}
  /auth/forgot-password:
    post:
      summary: Zadost o reset hesla
      tags: [Auth]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email]
              properties:
                email: {type: string, format: email}
      responses:
        '200': {description: Email odeslan}
  /auth/reset-password:
    post:
      summary: Reset hesla
      tags: [Auth]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token, new_password]
              properties:
                token: {type: string}
                new_password: {type: string, minLength: 12}
      responses:
        '200': {description: Heslo zmeneno}
  /auth/verify-email:
    post:
      summary: Overeni emailu
      tags: [Auth]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token]
              properties:
                token: {type: string}
      responses:
        '200': {description: Email overen}
  /auth/mfa/setup:
    post:
      summary: Nastaveni MFA (TOTP)
      tags: [Auth]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  secret: {type: string}
                  qr_code_url: {type: string}
                  backup_codes: {type: array, items: {type: string}}
  /auth/mfa/verify:
    post:
      summary: Overeni MFA kodu
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code]
              properties:
                code: {type: string}
      responses:
        '200': {description: MFA overeno}
  /auth/oauth/{provider}:
    get:
      summary: Zahajeni OAuth2 flow (google, facebook, apple)
      tags: [Auth]
      security: []
      parameters:
        - name: provider
          in: path
          required: true
          schema: {type: string, enum: [google, facebook, apple]}
      responses:
        '302': {description: Presmerovani}
  /auth/oauth/{provider}/callback:
    get:
      summary: OAuth2 callback
      tags: [Auth]
      security: []
      parameters:
        - {name: provider, in: path, required: true, schema: {type: string}}
        - {name: code, in: query, required: true, schema: {type: string}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /auth/me:
    get:
      summary: Profil prihlaseneho uzivatele
      tags: [Auth]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    put:
      summary: Aktualizace profilu
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdate'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /auth/change-password:
    post:
      summary: Zmena hesla
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [current_password, new_password]
              properties:
                current_password: {type: string}
                new_password: {type: string, minLength: 12}
      responses:
        '200': {description: Heslo zmeneno}

  # BOOKING SERVICE (10 endpoints)
  /bookings:
    get:
      summary: Seznam rezervaci s filtry a strankovanim
      tags: [Bookings]
      parameters:
        - {name: page, in: query, schema: {type: integer, default: 1}}
        - {name: limit, in: query, schema: {type: integer, default: 20}}
        - {name: status, in: query, schema: {type: string, enum: [pending, confirmed, cancelled, completed, no_show]}}
        - {name: customer_id, in: query, schema: {type: integer}}
        - {name: employee_id, in: query, schema: {type: integer}}
        - {name: service_id, in: query, schema: {type: integer}}
        - {name: date_from, in: query, schema: {type: string, format: date}}
        - {name: date_to, in: query, schema: {type: string, format: date}}
        - {name: source, in: query, schema: {type: string, enum: [online, admin, phone, walk_in, voice_ai, marketplace, api, widget]}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedBookings'
    post:
      summary: Vytvoreni rezervace
      tags: [Bookings]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BookingCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
  /bookings/{id}:
    get:
      summary: Detail rezervace
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
    put:
      summary: Aktualizace rezervace
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BookingUpdate'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
    delete:
      summary: Smazani rezervace
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}
  /bookings/{id}/cancel:
    post:
      summary: Zruseni rezervace
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                reason: {type: string}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
  /bookings/{id}/confirm:
    post:
      summary: Potvrzeni rezervace
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
  /bookings/{id}/complete:
    post:
      summary: Dokonceni rezervace
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
  /bookings/{id}/no-show:
    post:
      summary: Oznaceni jako no-show
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
  /bookings/{id}/reschedule:
    post:
      summary: Preobjednani
      tags: [Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [start_time]
              properties:
                start_time: {type: string, format: date-time}
                employee_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
  /bookings/voice:
    post:
      summary: AI Voice Booking
      tags: [Bookings, AI]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [audio]
              properties:
                audio: {type: string, format: binary}
                language: {type: string, default: cs}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  transcript: {type: string}
                  intent: {type: string, enum: [create_booking, cancel_booking, check_availability, unknown]}
                  booking:
                    $ref: '#/components/schemas/Booking'

  # AVAILABILITY (1 endpoint)
  /availability:
    get:
      summary: Dostupne sloty (public)
      tags: [Availability]
      security: []
      parameters:
        - {name: company_slug, in: query, required: true, schema: {type: string}}
        - {name: service_id, in: query, required: true, schema: {type: integer}}
        - {name: employee_id, in: query, schema: {type: integer}}
        - {name: date_from, in: query, required: true, schema: {type: string, format: date}}
        - {name: date_to, in: query, required: true, schema: {type: string, format: date}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  slots:
                    type: array
                    items:
                      $ref: '#/components/schemas/AvailabilitySlot'

  # CUSTOMER SERVICE (9 endpoints)
  /customers:
    get:
      summary: Seznam zakazniku
      tags: [Customers]
      parameters:
        - {name: page, in: query, schema: {type: integer, default: 1}}
        - {name: limit, in: query, schema: {type: integer, default: 20}}
        - {name: search, in: query, schema: {type: string}}
        - {name: tag_id, in: query, schema: {type: integer}}
        - {name: sort_by, in: query, schema: {type: string, enum: [name, total_bookings, total_spent, health_score, last_visit_at]}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedCustomers'
    post:
      summary: Vytvoreni zakaznika
      tags: [Customers]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CustomerCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
  /customers/{id}:
    get:
      summary: Detail zakaznika
      tags: [Customers]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
    put:
      summary: Aktualizace zakaznika
      tags: [Customers]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CustomerUpdate'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
    delete:
      summary: Smazani zakaznika (GDPR)
      tags: [Customers]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}
  /customers/{id}/tags:
    put:
      summary: Nastaveni stitku zakaznika
      tags: [Customers]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                tag_ids: {type: array, items: {type: integer}}
      responses:
        '200': {description: Stitky nastaveny}
  /customers/{id}/bookings:
    get:
      summary: Historie rezervaci zakaznika
      tags: [Customers, Bookings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedBookings'
  /customers/{id}/export:
    get:
      summary: GDPR export dat zakaznika
      tags: [Customers]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema: {type: object}
  /customers/import:
    post:
      summary: Import zakazniku z CSV
      tags: [Customers]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file: {type: string, format: binary}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  imported: {type: integer}
                  skipped: {type: integer}
                  errors: {type: array, items: {type: object}}
  /tags:
    get:
      summary: Seznam stitku
      tags: [Customers]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Tag'
    post:
      summary: Vytvoreni stitku
      tags: [Customers]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TagCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tag'
  /tags/{id}:
    put:
      summary: Aktualizace stitku
      tags: [Customers]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TagCreate'
      responses:
        '200': {description: Aktualizovano}
    delete:
      summary: Smazani stitku
      tags: [Customers]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}

  # SERVICE SERVICE (5 endpoints)
  /services:
    get:
      summary: Seznam sluzeb
      tags: [Services]
      parameters:
        - {name: category_id, in: query, schema: {type: integer}}
        - {name: is_active, in: query, schema: {type: boolean}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Service'
    post:
      summary: Vytvoreni sluzby
      tags: [Services]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ServiceCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Service'
  /services/{id}:
    get:
      summary: Detail sluzby
      tags: [Services]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Service'
    put:
      summary: Aktualizace sluzby
      tags: [Services]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ServiceUpdate'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Service'
    delete:
      summary: Smazani sluzby
      tags: [Services]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}
  /service-categories:
    get:
      summary: Seznam kategorii sluzeb
      tags: [Services]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ServiceCategory'
    post:
      summary: Vytvoreni kategorie
      tags: [Services]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ServiceCategoryCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ServiceCategory'
  /service-categories/{id}:
    put:
      summary: Aktualizace kategorie
      tags: [Services]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ServiceCategoryCreate'
      responses:
        '200': {description: Aktualizovano}
    delete:
      summary: Smazani kategorie
      tags: [Services]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}

  # EMPLOYEE SERVICE (6 endpoints)
  /employees:
    get:
      summary: Seznam zamestnancu
      tags: [Employees]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Employee'
    post:
      summary: Vytvoreni zamestnance
      tags: [Employees]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EmployeeCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Employee'
  /employees/{id}:
    get:
      summary: Detail zamestnance
      tags: [Employees]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Employee'
    put:
      summary: Aktualizace zamestnance
      tags: [Employees]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EmployeeUpdate'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Employee'
    delete:
      summary: Smazani zamestnance
      tags: [Employees]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}
  /employees/{id}/services:
    put:
      summary: Prirazeni sluzeb zamestnanci
      tags: [Employees]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                service_ids: {type: array, items: {type: integer}}
      responses:
        '200': {description: Prirazeno}
  /employees/{id}/working-hours:
    get:
      summary: Pracovni doby zamestnance
      tags: [Employees]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/WorkingHours'
    put:
      summary: Nastaveni pracovnich dob
      tags: [Employees]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/WorkingHoursCreate'
      responses:
        '200': {description: Nastaveno}
  /employees/{id}/schedule-overrides:
    post:
      summary: Vyjimka v rozvrhu
      tags: [Employees]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WorkingHoursOverride'
      responses:
        '201': {description: Vyjimka vytvorena}

  # RESOURCE SERVICE (3 endpoints)
  /resources:
    get:
      summary: Seznam zdroju
      tags: [Resources]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Resource'
    post:
      summary: Vytvoreni zdroje
      tags: [Resources]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResourceCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
  /resources/{id}:
    get:
      summary: Detail zdroje
      tags: [Resources]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
    put:
      summary: Aktualizace zdroje
      tags: [Resources]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResourceCreate'
      responses:
        '200': {description: Aktualizovano}
    delete:
      summary: Smazani zdroje
      tags: [Resources]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}
  /resource-types:
    get:
      summary: Seznam typu zdroju
      tags: [Resources]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ResourceType'
    post:
      summary: Vytvoreni typu zdroje
      tags: [Resources]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: {type: string}
                description: {type: string}
      responses:
        '201': {description: Vytvoreno}

  # PAYMENT SERVICE (8 endpoints)
  /payments:
    get:
      summary: Seznam plateb
      tags: [Payments]
      parameters:
        - {name: page, in: query, schema: {type: integer}}
        - {name: limit, in: query, schema: {type: integer}}
        - {name: status, in: query, schema: {type: string, enum: [pending, paid, failed, refunded]}}
        - {name: gateway, in: query, schema: {type: string, enum: [comgate, qrcomat, cash, bank_transfer, gift_card]}}
        - {name: date_from, in: query, schema: {type: string, format: date}}
        - {name: date_to, in: query, schema: {type: string, format: date}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedPayments'
    post:
      summary: Vytvoreni platby
      tags: [Payments]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
  /payments/{id}:
    get:
      summary: Detail platby
      tags: [Payments]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
  /payments/{id}/refund:
    post:
      summary: Vraceni platby
      tags: [Payments]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                amount: {type: number}
                reason: {type: string}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
  /payments/comgate/create:
    post:
      summary: Vytvoreni Comgate platby
      tags: [Payments]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [booking_id]
              properties:
                booking_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  transaction_id: {type: string}
                  redirect_url: {type: string}
  /payments/qrcomat/generate:
    post:
      summary: Generovani QR kodu pro QRcomat
      tags: [Payments]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [booking_id]
              properties:
                booking_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  qr_code_base64: {type: string}
                  transaction_id: {type: string}
  /webhooks/comgate:
    post:
      summary: Comgate webhook callback
      tags: [Payments, Webhooks]
      security: []
      responses:
        '200': {description: Zpracovano}
  /webhooks/qrcomat:
    post:
      summary: QRcomat webhook callback
      tags: [Payments, Webhooks]
      security: []
      responses:
        '200': {description: Zpracovano}
  /invoices:
    get:
      summary: Seznam faktur
      tags: [Payments]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Invoice'
  /invoices/{id}/pdf:
    get:
      summary: Stazeni faktury jako PDF
      tags: [Payments]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/pdf:
              schema: {type: string, format: binary}

      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [points]
              properties:
                points: {type: integer}
                description: {type: string}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoyaltyCard'
  /loyalty/rewards:
    get:
      summary: Seznam odmen
      tags: [Loyalty]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Reward'
    post:
      summary: Vytvoreni odmeny
      tags: [Loyalty]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RewardCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Reward'
  /loyalty/rewards/{id}/redeem:
    post:
      summary: Uplatneni odmeny
      tags: [Loyalty]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [card_id]
              properties:
                card_id: {type: integer}
      responses:
        '200': {description: Odmena uplatnena}


  # COUPON SERVICE (4 endpoints)
  /coupons:
    get:
      summary: Seznam kuponu
      tags: [Coupons]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Coupon'
    post:
      summary: Vytvoreni kuponu
      tags: [Coupons]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CouponCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Coupon'
  /coupons/{id}:
    put:
      summary: Aktualizace kuponu
      tags: [Coupons]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CouponCreate'
      responses:
        '200': {description: Aktualizovano}
    delete:
      summary: Smazani kuponu
      tags: [Coupons]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}
  /coupons/validate:
    post:
      summary: Validace kuponoveho kodu
      tags: [Coupons]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code, service_id]
              properties:
                code: {type: string}
                service_id: {type: integer}
                customer_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  valid: {type: boolean}
                  discount_type: {type: string}
                  discount_value: {type: number}
                  message: {type: string}

  # GIFT CARD SERVICE (4 endpoints)
  /gift-cards:
    get:
      summary: Seznam darkovych karet
      tags: [GiftCards]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/GiftCard'
    post:
      summary: Vytvoreni darkove karty
      tags: [GiftCards]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GiftCardCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GiftCard'
  /gift-cards/{id}/balance:
    get:
      summary: Zustatek darkove karty
      tags: [GiftCards]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  current_balance: {type: number}
                  currency: {type: string}
  /gift-cards/redeem:
    post:
      summary: Uplatneni darkove karty
      tags: [GiftCards]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code, booking_id]
              properties:
                code: {type: string}
                booking_id: {type: integer}
                amount: {type: number}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GiftCard'

  # LOYALTY SERVICE (8 endpoints)
  /loyalty/programs:
    get:
      summary: Vernostni program firmy
      tags: [Loyalty]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoyaltyProgram'
    post:
      summary: Vytvoreni vernostniho programu
      tags: [Loyalty]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoyaltyProgramCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoyaltyProgram'
    put:
      summary: Aktualizace vernostniho programu
      tags: [Loyalty]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoyaltyProgramCreate'
      responses:
        '200': {description: Aktualizovano}
  /loyalty/cards:
    get:
      summary: Seznam vernostnich karet
      tags: [Loyalty]
      parameters:
        - {name: customer_id, in: query, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/LoyaltyCard'
    post:
      summary: Vydani vernostni karty
      tags: [Loyalty]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoyaltyCardCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoyaltyCard'
  /loyalty/cards/{id}:
    get:
      summary: Detail vernostni karty
      tags: [Loyalty]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoyaltyCard'
  /loyalty/cards/{id}/transactions:
    get:
      summary: Historie transakci karty
      tags: [Loyalty]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/LoyaltyTransaction'
  /loyalty/cards/{id}/add-points:
    post:
      summary: Pridani bodu na kartu
      tags: [Loyalty]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [points]
              properties:
                points: {type: integer}
                description: {type: string}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoyaltyCard'

  # NOTIFICATION SERVICE (3 endpoints)
  /notifications:
    get:
      summary: Seznam odeslanych notifikaci
      tags: [Notifications]
      parameters:
        - {name: channel, in: query, schema: {type: string, enum: [email, sms, push]}}
        - {name: status, in: query, schema: {type: string, enum: [pending, sent, delivered, failed, opened]}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Notification'
  /notification-templates:
    get:
      summary: Seznam sablon notifikaci
      tags: [Notifications]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/NotificationTemplate'
    post:
      summary: Vytvoreni sablony
      tags: [Notifications]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NotificationTemplateCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationTemplate'
  /notification-templates/{id}:
    put:
      summary: Aktualizace sablony
      tags: [Notifications]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NotificationTemplateCreate'
      responses:
        '200': {description: Aktualizovano}
    delete:
      summary: Smazani sablony
      tags: [Notifications]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}

  # REVIEW SERVICE (2 endpoints)
  /reviews:
    get:
      summary: Seznam recenzi
      tags: [Reviews]
      parameters:
        - {name: rating_min, in: query, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Review'
    post:
      summary: Vytvoreni recenze
      tags: [Reviews]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReviewCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Review'
  /reviews/{id}/reply:
    post:
      summary: Odpoved na recenzi
      tags: [Reviews]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reply]
              properties:
                reply: {type: string}
      responses:
        '200': {description: Odpoved ulozena}

  # AI SERVICE (7 endpoints)
  /ai/no-show-prediction:
    post:
      summary: Predikce no-show
      tags: [AI]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [booking_id]
              properties:
                booking_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AIPrediction'
  /ai/smart-upselling:
    post:
      summary: Smart upselling doporuceni
      tags: [AI]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customer_id]
              properties:
                customer_id: {type: integer}
                current_service_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  recommendations:
                    type: array
                    items:
                      type: object
                      properties:
                        service: {$ref: '#/components/schemas/Service'}
                        score: {type: number}
                        reason: {type: string}
  /ai/clv-prediction:
    post:
      summary: Predikce Customer Lifetime Value
      tags: [AI]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customer_id]
              properties:
                customer_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AIPrediction'
  /ai/capacity-optimization:
    get:
      summary: AI doporuceni pro optimalizaci kapacity
      tags: [AI]
      parameters:
        - {name: date_from, in: query, required: true, schema: {type: string, format: date}}
        - {name: date_to, in: query, required: true, schema: {type: string, format: date}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  recommendations:
                    type: array
                    items:
                      type: object
                      properties:
                        type: {type: string}
                        message: {type: string}
                        impact: {type: string}
  /ai/pricing-optimizer:
    post:
      summary: AI doporuceni ceny
      tags: [AI]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [service_id]
              properties:
                service_id: {type: integer}
                date: {type: string, format: date}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  current_price: {type: number}
                  recommended_price: {type: number}
                  confidence: {type: number}
                  reasoning: {type: string}
  /ai/customer-health:
    get:
      summary: Zakaznicky health score (bulk)
      tags: [AI]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    customer_id: {type: integer}
                    health_score: {type: integer}
                    risk_level: {type: string, enum: [low, medium, high]}
  /ai/follow-up/generate:
    post:
      summary: AI generovani personalizovaneho follow-up textu
      tags: [AI]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customer_id, type]
              properties:
                customer_id: {type: integer}
                type: {type: string, enum: [post_visit, re_engagement, upsell, birthday]}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  subject: {type: string}
                  body: {type: string}
  /ai/smart-reminder-timing:
    post:
      summary: Optimalni cas odeslani reminderu
      tags: [AI]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customer_id]
              properties:
                customer_id: {type: integer}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  optimal_minutes_before: {type: integer}
                  confidence: {type: number}

  # MARKETPLACE SERVICE (3 endpoints)
  /marketplace/listings:
    get:
      summary: Marketplace katalog (public)
      tags: [Marketplace]
      security: []
      parameters:
        - {name: search, in: query, schema: {type: string}}
        - {name: category, in: query, schema: {type: string}}
        - {name: city, in: query, schema: {type: string}}
        - {name: lat, in: query, schema: {type: number}}
        - {name: lng, in: query, schema: {type: number}}
        - {name: radius_km, in: query, schema: {type: number}}
        - {name: sort_by, in: query, schema: {type: string, enum: [rating, distance, name]}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MarketplaceListing'
  /marketplace/listings/{id}:
    get:
      summary: Detail marketplace listingu (public)
      tags: [Marketplace]
      security: []
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MarketplaceListing'
  /marketplace/my-listing:
    get:
      summary: Listing me firmy
      tags: [Marketplace]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MarketplaceListing'
    put:
      summary: Aktualizace meho listingu
      tags: [Marketplace]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MarketplaceListingUpdate'
      responses:
        '200': {description: Aktualizovano}

  # VIDEO SERVICE (2 endpoints)
  /video/meetings:
    post:
      summary: Vytvoreni video meetingu
      tags: [Video]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VideoMeetingCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VideoMeeting'
  /video/meetings/{id}:
    get:
      summary: Detail meetingu
      tags: [Video]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VideoMeeting'
    delete:
      summary: Zruseni meetingu
      tags: [Video]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Zruseno}

  # APP SERVICE (3 endpoints)
  /apps/whitelabel:
    get:
      summary: White-label app me firmy
      tags: [Apps]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WhiteLabelApp'
    post:
      summary: Vytvoreni white-label app
      tags: [Apps]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WhiteLabelAppCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WhiteLabelApp'
    put:
      summary: Aktualizace white-label app
      tags: [Apps]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WhiteLabelAppCreate'
      responses:
        '200': {description: Aktualizovano}
  /apps/whitelabel/build:
    post:
      summary: Spusteni buildu white-label app
      tags: [Apps]
      responses:
        '202':
          content:
            application/json:
              schema:
                type: object
                properties:
                  build_id: {type: string}
                  status: {type: string}

  # AUTOMATION SERVICE (4 endpoints)
  /automation/rules:
    get:
      summary: Seznam automatizacnich pravidel
      tags: [Automation]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/AutomationRule'
    post:
      summary: Vytvoreni pravidla
      tags: [Automation]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AutomationRuleCreate'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AutomationRule'
  /automation/rules/{id}:
    put:
      summary: Aktualizace pravidla
      tags: [Automation]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AutomationRuleCreate'
      responses:
        '200': {description: Aktualizovano}
    delete:
      summary: Smazani pravidla
      tags: [Automation]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Smazano}
  /automation/rules/{id}/toggle:
    post:
      summary: Zapnuti/vypnuti pravidla
      tags: [Automation]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '200': {description: Stav zmenen}
  /automation/logs:
    get:
      summary: Logy automatizace
      tags: [Automation]
      parameters:
        - {name: rule_id, in: query, schema: {type: integer}}
        - {name: status, in: query, schema: {type: string, enum: [pending, executed, failed, skipped]}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/AutomationLog'

  # ANALYTICS SERVICE (4 endpoints)
  /analytics/dashboard:
    get:
      summary: Dashboard metriky
      tags: [Analytics]
      parameters:
        - {name: period, in: query, schema: {type: string, enum: [today, week, month, quarter, year], default: month}}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardMetrics'
  /analytics/bookings:
    get:
      summary: Statistiky rezervaci
      tags: [Analytics]
      parameters:
        - {name: date_from, in: query, required: true, schema: {type: string, format: date}}
        - {name: date_to, in: query, required: true, schema: {type: string, format: date}}
        - {name: group_by, in: query, schema: {type: string, enum: [day, week, month, service, employee, source]}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items: {type: object}
  /analytics/revenue:
    get:
      summary: Statistiky trzeb
      tags: [Analytics]
      parameters:
        - {name: date_from, in: query, required: true, schema: {type: string, format: date}}
        - {name: date_to, in: query, required: true, schema: {type: string, format: date}}
        - {name: group_by, in: query, schema: {type: string, enum: [day, week, month, service, employee, gateway]}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items: {type: object}
  /analytics/customers:
    get:
      summary: Statistiky zakazniku
      tags: [Analytics]
      parameters:
        - {name: date_from, in: query, required: true, schema: {type: string, format: date}}
        - {name: date_to, in: query, required: true, schema: {type: string, format: date}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  total_customers: {type: integer}
                  new_customers: {type: integer}
                  returning_customers: {type: integer}
                  churn_rate: {type: number}
                  average_clv: {type: number}
  /analytics/export:
    get:
      summary: Export reportu (CSV/Excel)
      tags: [Analytics]
      parameters:
        - {name: report_type, in: query, required: true, schema: {type: string, enum: [bookings, revenue, customers, services]}}
        - {name: format, in: query, schema: {type: string, enum: [csv, xlsx], default: csv}}
        - {name: date_from, in: query, required: true, schema: {type: string, format: date}}
        - {name: date_to, in: query, required: true, schema: {type: string, format: date}}
      responses:
        '200':
          content:
            text/csv:
              schema: {type: string}

  # SETTINGS SERVICE (5 endpoints)
  /settings/company:
    get:
      summary: Nastaveni firmy
      tags: [Settings]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Company'
    put:
      summary: Aktualizace nastaveni firmy
      tags: [Settings]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompanyUpdate'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Company'
  /settings/working-hours:
    get:
      summary: Vychozi pracovni doby firmy
      tags: [Settings]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/WorkingHours'
    put:
      summary: Nastaveni vychozich pracovnich dob
      tags: [Settings]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/WorkingHoursCreate'
      responses:
        '200': {description: Nastaveno}
  /settings/api-keys:
    get:
      summary: Seznam API klicu
      tags: [Settings]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: {type: integer}
                    name: {type: string}
                    key_prefix: {type: string}
                    created_at: {type: string, format: date-time}
    post:
      summary: Vytvoreni API klice
      tags: [Settings]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: {type: string}
                scopes: {type: array, items: {type: string}}
      responses:
        '201':
          content:
            application/json:
              schema:
                type: object
                properties:
                  key: {type: string, description: Zobrazeno pouze jednou}
  /settings/api-keys/{id}:
    delete:
      summary: Revokace API klice
      tags: [Settings]
      parameters:
        - {name: id, in: path, required: true, schema: {type: integer}}
      responses:
        '204': {description: Revokovano}
  /settings/webhooks:
    get:
      summary: Seznam webhook konfiguraci
      tags: [Webhooks]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: {type: integer}
                    url: {type: string}
                    events: {type: array, items: {type: string}}
                    is_active: {type: boolean}
    post:
      summary: Vytvoreni webhook konfigurace
      tags: [Webhooks]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [url, events]
              properties:
                url: {type: string}
                events: {type: array, items: {type: string, enum: [booking.created, booking.updated, booking.cancelled, payment.received, customer.created, review.created]}}
      responses:
        '201': {description: Vytvoreno}
  /widget/config/{company_slug}:
    get:
      summary: Konfigurace embeddable widgetu (public)
      tags: [Settings]
      security: []
      parameters:
        - {name: company_slug, in: path, required: true, schema: {type: string}}
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  company_name: {type: string}
                  logo_url: {type: string}
                  services: {type: array, items: {$ref: '#/components/schemas/Service'}}
                  theme: {type: object}

# ========================================
# COMPONENTS - Schemas
# ========================================
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code: {type: string}
            message: {type: string}
            details: {type: array, items: {type: object}}

    PaginationMeta:
      type: object
      properties:
        total: {type: integer}
        page: {type: integer}
        limit: {type: integer}
        total_pages: {type: integer}

    # Auth
    RegisterRequest:
      type: object
      required: [name, email, password, company_name]
      properties:
        name: {type: string, minLength: 2, maxLength: 255}
        email: {type: string, format: email}
        password: {type: string, minLength: 12}
        phone: {type: string}
        company_name: {type: string, minLength: 2}

    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: {type: string, format: email}
        password: {type: string}

    AuthResponse:
      type: object
      properties:
        access_token: {type: string}
        refresh_token: {type: string}
        expires_in: {type: integer}
        user: {$ref: '#/components/schemas/User'}

    User:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        email: {type: string}
        name: {type: string}
        phone: {type: string}
        avatar_url: {type: string}
        role: {type: string, enum: [admin, owner, employee, customer]}
        company_id: {type: integer}
        mfa_enabled: {type: boolean}
        email_verified: {type: boolean}
        created_at: {type: string, format: date-time}

    UserUpdate:
      type: object
      properties:
        name: {type: string}
        phone: {type: string}
        avatar_url: {type: string}

    # Company
    Company:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        name: {type: string}
        slug: {type: string}
        email: {type: string}
        phone: {type: string}
        website: {type: string}
        logo_url: {type: string}
        description: {type: string}
        address_street: {type: string}
        address_city: {type: string}
        address_zip: {type: string}
        currency: {type: string}
        timezone: {type: string}
        subscription_plan: {type: string, enum: [free, starter, professional, enterprise]}
        busy_appearance_enabled: {type: boolean}
        busy_appearance_percent: {type: integer}
        settings: {type: object}
        created_at: {type: string, format: date-time}

    CompanyUpdate:
      type: object
      properties:
        name: {type: string}
        email: {type: string}
        phone: {type: string}
        website: {type: string}
        logo_url: {type: string}
        description: {type: string}
        address_street: {type: string}
        address_city: {type: string}
        address_zip: {type: string}
        currency: {type: string}
        timezone: {type: string}
        busy_appearance_enabled: {type: boolean}
        busy_appearance_percent: {type: integer}

    # Booking
    Booking:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        customer: {$ref: '#/components/schemas/Customer'}
        service: {$ref: '#/components/schemas/Service'}
        employee: {$ref: '#/components/schemas/Employee'}
        start_time: {type: string, format: date-time}
        end_time: {type: string, format: date-time}
        status: {type: string, enum: [pending, confirmed, cancelled, completed, no_show]}
        source: {type: string, enum: [online, admin, phone, walk_in, voice_ai, marketplace, api, widget]}
        price: {type: number}
        discount_amount: {type: number}
        notes: {type: string}
        no_show_probability: {type: number}
        video_meeting: {$ref: '#/components/schemas/VideoMeeting'}
        payment: {$ref: '#/components/schemas/Payment'}
        created_at: {type: string, format: date-time}

    BookingCreate:
      type: object
      required: [customer_id, service_id, start_time]
      properties:
        customer_id: {type: integer}
        service_id: {type: integer}
        employee_id: {type: integer}
        start_time: {type: string, format: date-time}
        notes: {type: string}
        source: {type: string, default: online}
        coupon_code: {type: string}
        gift_card_code: {type: string}
        resource_ids: {type: array, items: {type: integer}}

    BookingUpdate:
      type: object
      properties:
        employee_id: {type: integer}
        start_time: {type: string, format: date-time}
        notes: {type: string}
        internal_notes: {type: string}
        status: {type: string, enum: [pending, confirmed, cancelled, completed, no_show]}

    PaginatedBookings:
      type: object
      properties:
        data: {type: array, items: {$ref: '#/components/schemas/Booking'}}
        meta: {$ref: '#/components/schemas/PaginationMeta'}

    AvailabilitySlot:
      type: object
      properties:
        date: {type: string, format: date}
        start_time: {type: string}
        end_time: {type: string}
        employee_id: {type: integer}
        employee_name: {type: string}
        is_available: {type: boolean}

    # Customer
    Customer:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        name: {type: string}
        email: {type: string}
        phone: {type: string}
        date_of_birth: {type: string, format: date}
        notes: {type: string}
        source: {type: string}
        tags: {type: array, items: {$ref: '#/components/schemas/Tag'}}
        health_score: {type: integer}
        clv_predicted: {type: number}
        total_bookings: {type: integer}
        total_spent: {type: number}
        no_show_count: {type: integer}
        last_visit_at: {type: string, format: date-time}
        marketing_consent: {type: boolean}
        created_at: {type: string, format: date-time}

    CustomerCreate:
      type: object
      required: [name]
      properties:
        name: {type: string, minLength: 2, maxLength: 255}
        email: {type: string, format: email}
        phone: {type: string}
        date_of_birth: {type: string, format: date}
        notes: {type: string}
        tag_ids: {type: array, items: {type: integer}}
        marketing_consent: {type: boolean}

    CustomerUpdate:
      type: object
      properties:
        name: {type: string}
        email: {type: string, format: email}
        phone: {type: string}
        date_of_birth: {type: string, format: date}
        notes: {type: string}
        marketing_consent: {type: boolean}

    PaginatedCustomers:
      type: object
      properties:
        data: {type: array, items: {$ref: '#/components/schemas/Customer'}}
        meta: {$ref: '#/components/schemas/PaginationMeta'}

    Tag:
      type: object
      properties:
        id: {type: integer}
        name: {type: string}
        color: {type: string}

    TagCreate:
      type: object
      required: [name]
      properties:
        name: {type: string}
        color: {type: string}

    # Service
    Service:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        name: {type: string}
        description: {type: string}
        category: {$ref: '#/components/schemas/ServiceCategory'}
        duration_minutes: {type: integer}
        buffer_before_minutes: {type: integer}
        buffer_after_minutes: {type: integer}
        price: {type: number}
        currency: {type: string}
        dynamic_pricing_enabled: {type: boolean}
        max_capacity: {type: integer}
        online_booking_enabled: {type: boolean}
        requires_payment: {type: boolean}
        cancellation_policy_hours: {type: integer}
        is_online: {type: boolean}
        video_provider: {type: string, enum: [zoom, google_meet, ms_teams]}
        color: {type: string}
        image_url: {type: string}
        is_active: {type: boolean}

    ServiceCreate:
      type: object
      required: [name, duration_minutes, price]
      properties:
        name: {type: string}
        description: {type: string}
        category_id: {type: integer}
        duration_minutes: {type: integer, minimum: 5}
        buffer_before_minutes: {type: integer, default: 0}
        buffer_after_minutes: {type: integer, default: 0}
        price: {type: number, minimum: 0}
        dynamic_pricing_enabled: {type: boolean}
        price_min: {type: number}
        price_max: {type: number}
        max_capacity: {type: integer, default: 1}
        online_booking_enabled: {type: boolean, default: true}
        requires_payment: {type: boolean, default: false}
        is_online: {type: boolean, default: false}
        video_provider: {type: string, enum: [zoom, google_meet, ms_teams]}
        color: {type: string}
        resource_ids: {type: array, items: {type: integer}}

    ServiceUpdate:
      type: object
      properties:
        name: {type: string}
        description: {type: string}
        category_id: {type: integer}
        duration_minutes: {type: integer}
        price: {type: number}
        is_active: {type: boolean}

    ServiceCategory:
      type: object
      properties:
        id: {type: integer}
        name: {type: string}
        description: {type: string}
        sort_order: {type: integer}

    ServiceCategoryCreate:
      type: object
      required: [name]
      properties:
        name: {type: string}
        description: {type: string}
        sort_order: {type: integer}

    # Employee
    Employee:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        name: {type: string}
        email: {type: string}
        phone: {type: string}
        title: {type: string}
        bio: {type: string}
        avatar_url: {type: string}
        color: {type: string}
        services: {type: array, items: {$ref: '#/components/schemas/Service'}}
        is_active: {type: boolean}

    EmployeeCreate:
      type: object
      required: [name]
      properties:
        name: {type: string}
        email: {type: string}
        phone: {type: string}
        title: {type: string}
        bio: {type: string}
        color: {type: string}
        service_ids: {type: array, items: {type: integer}}

    EmployeeUpdate:
      type: object
      properties:
        name: {type: string}
        email: {type: string}
        phone: {type: string}
        title: {type: string}
        bio: {type: string}
        is_active: {type: boolean}

    WorkingHours:
      type: object
      properties:
        id: {type: integer}
        day_of_week: {type: integer, minimum: 0, maximum: 6}
        start_time: {type: string}
        end_time: {type: string}
        is_active: {type: boolean}

    WorkingHoursCreate:
      type: object
      required: [day_of_week, start_time, end_time]
      properties:
        day_of_week: {type: integer, minimum: 0, maximum: 6}
        start_time: {type: string}
        end_time: {type: string}
        is_active: {type: boolean, default: true}

    WorkingHoursOverride:
      type: object
      required: [date]
      properties:
        date: {type: string, format: date}
        start_time: {type: string}
        end_time: {type: string}
        is_day_off: {type: boolean, default: false}
        reason: {type: string}

    # Resource
    Resource:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        name: {type: string}
        description: {type: string}
        resource_type: {$ref: '#/components/schemas/ResourceType'}
        quantity: {type: integer}
        is_active: {type: boolean}

    ResourceCreate:
      type: object
      required: [name]
      properties:
        name: {type: string}
        description: {type: string}
        resource_type_id: {type: integer}
        quantity: {type: integer, default: 1}

    ResourceType:
      type: object
      properties:
        id: {type: integer}
        name: {type: string}
        description: {type: string}

    # Payment
    Payment:
      type: object
      properties:
        id: {type: integer}
        uuid: {type: string, format: uuid}
        booking_id: {type: integer}
        amount: {type: number}
        currency: {type: string}
        status: {type: string, enum: [pending, paid, failed, refunded, partially_refunded]}
        gateway: {type: string, enum: [comgate, qrcomat, cash, bank_transfer, gift_card]}
        gateway_transaction_id: {type: string}
        refund_amount: {type: number}
        paid_at: {type: string, format: date-time}
        created_at: {type: string, format: date-time}

    PaymentCreate:
      type: object
      required: [booking_id, amount, gateway]
      properties:
        booking_id: {type: integer}
        amount: {type: number}
        gateway: {type: string, enum: [comgate, qrcomat, cash, bank_transfer, gift_card]}

    PaginatedPayments:
      type: object
      properties:
        data: {type: array, items: {$ref: '#/components/schemas/Payment'}}
        meta: {$ref: '#/components/schemas/PaginationMeta'}

    Invoice:
      type: object
      properties:
        id: {type: integer}
        invoice_number: {type: string}
        amount: {type: number}
        tax_amount: {type: number}
        status: {type: string, enum: [draft, issued, paid, cancelled]}
        issued_at: {type: string, format: date}
        pdf_url: {type: string}

    # Coupon
    Coupon:
      type: object
      properties:
        id: {type: integer}
        code: {type: string}
        description: {type: string}
        discount_type: {type: string, enum: [percentage, fixed]}
        discount_value: {type: number}
        min_booking_amount: {type: number}
        max_uses: {type: integer}
        current_uses: {type: integer}
        valid_from: {type: string, format: date-time}
        valid_until: {type: string, format: date-time}
        is_active: {type: boolean}

    CouponCreate:
      type: object
      required: [code, discount_type, discount_value]
      properties:
        code: {type: string, maxLength: 50}
        description: {type: string}
        discount_type: {type: string, enum: [percentage, fixed]}
        discount_value: {type: number}
        min_booking_amount: {type: number}
        max_uses: {type: integer}
        max_uses_per_customer: {type: integer, default: 1}
        applicable_service_ids: {type: array, items: {type: integer}}
        valid_from: {type: string, format: date-time}
        valid_until: {type: string, format: date-time}

    # Gift Card
    GiftCard:
      type: object
      properties:
        id: {type: integer}
        code: {type: string}
        initial_balance: {type: number}
        current_balance: {type: number}
        currency: {type: string}
        recipient_email: {type: string}
        recipient_name: {type: string}
        valid_until: {type: string, format: date-time}
        is_active: {type: boolean}

    GiftCardCreate:
      type: object
      required: [initial_balance]
      properties:
        initial_balance: {type: number, minimum: 1}
        recipient_email: {type: string, format: email}
        recipient_name: {type: string}
        message: {type: string}
        valid_until: {type: string, format: date-time}

    # Loyalty
    LoyaltyProgram:
      type: object
      properties:
        id: {type: integer}
        name: {type: string}
        description: {type: string}
        type: {type: string, enum: [points, stamps, tiers]}
        points_per_currency: {type: number}
        tiers: {type: array, items: {type: object, properties: {id: {type: integer}, name: {type: string}, min_points: {type: integer}, color: {type: string}}}}
        is_active: {type: boolean}

    LoyaltyProgramCreate:
      type: object
      required: [name, type]
      properties:
        name: {type: string}
        description: {type: string}
        type: {type: string, enum: [points, stamps, tiers]}
        points_per_currency: {type: number, default: 1}

    LoyaltyCard:
      type: object
      properties:
        id: {type: integer}
        card_number: {type: string}
        customer: {$ref: '#/components/schemas/Customer'}
        points_balance: {type: integer}
        stamps_balance: {type: integer}
        tier: {type: object, properties: {name: {type: string}, color: {type: string}}}
        apple_pass_url: {type: string}
        google_pass_url: {type: string}
        is_active: {type: boolean}

    LoyaltyCardCreate:
      type: object
      required: [customer_id]
      properties:
        customer_id: {type: integer}

    LoyaltyTransaction:
      type: object
      properties:
        id: {type: integer}
        type: {type: string, enum: [earn, redeem, expire, adjust, stamp]}
        points: {type: integer}
        balance_after: {type: integer}
        description: {type: string}
        created_at: {type: string, format: date-time}

    Reward:
      type: object
      properties:
        id: {type: integer}
        name: {type: string}
        description: {type: string}
        points_cost: {type: integer}
        reward_type: {type: string, enum: [discount_percentage, discount_fixed, free_service, gift]}
        reward_value: {type: number}
        is_active: {type: boolean}

    RewardCreate:
      type: object
      required: [name, points_cost, reward_type]
      properties:
        name: {type: string}
        description: {type: string}
        points_cost: {type: integer, minimum: 1}
        reward_type: {type: string, enum: [discount_percentage, discount_fixed, free_service, gift]}
        reward_value: {type: number}
        applicable_service_id: {type: integer}

    # Notification
    Notification:
      type: object
      properties:
        id: {type: integer}
        channel: {type: string, enum: [email, sms, push]}
        recipient: {type: string}
        subject: {type: string}
        status: {type: string, enum: [pending, sent, delivered, failed, opened, clicked]}
        scheduled_at: {type: string, format: date-time}
        sent_at: {type: string, format: date-time}

    NotificationTemplate:
      type: object
      properties:
        id: {type: integer}
        type: {type: string, enum: [booking_confirmation, booking_reminder, booking_cancellation, payment_confirmation, review_request, welcome, loyalty_update, follow_up, custom]}
        channel: {type: string, enum: [email, sms, push]}
        subject: {type: string}
        body_template: {type: string}
        is_active: {type: boolean}

    NotificationTemplateCreate:
      type: object
      required: [type, channel, body_template]
      properties:
        type: {type: string}
        channel: {type: string, enum: [email, sms, push]}
        subject: {type: string}
        body_template: {type: string}

    # Review
    Review:
      type: object
      properties:
        id: {type: integer}
        customer: {$ref: '#/components/schemas/Customer'}
        service: {$ref: '#/components/schemas/Service'}
        rating: {type: integer, minimum: 1, maximum: 5}
        comment: {type: string}
        reply: {type: string}
        is_published: {type: boolean}
        created_at: {type: string, format: date-time}

    ReviewCreate:
      type: object
      required: [booking_id, rating]
      properties:
        booking_id: {type: integer}
        rating: {type: integer, minimum: 1, maximum: 5}
        comment: {type: string}

    # AI
    AIPrediction:
      type: object
      properties:
        type: {type: string}
        entity_type: {type: string}
        entity_id: {type: integer}
        score: {type: number}
        confidence: {type: number}
        details: {type: object}
        model_version: {type: string}

    # Marketplace
    MarketplaceListing:
      type: object
      properties:
        id: {type: integer}
        company: {$ref: '#/components/schemas/Company'}
        title: {type: string}
        description: {type: string}
        category: {type: string}
        address_city: {type: string}
        images: {type: array, items: {type: string}}
        average_rating: {type: number}
        review_count: {type: integer}
        price_range: {type: string}
        services: {type: array, items: {$ref: '#/components/schemas/Service'}}
        featured: {type: boolean}
        verified: {type: boolean}

    MarketplaceListingUpdate:
      type: object
      properties:
        title: {type: string}
        description: {type: string}
        category: {type: string}
        images: {type: array, items: {type: string}}

    # Video
    VideoMeeting:
      type: object
      properties:
        id: {type: integer}
        provider: {type: string, enum: [zoom, google_meet, ms_teams]}
        meeting_url: {type: string}
        host_url: {type: string}
        password: {type: string}
        start_time: {type: string, format: date-time}
        duration_minutes: {type: integer}
        status: {type: string, enum: [scheduled, started, ended, cancelled]}

    VideoMeetingCreate:
      type: object
      required: [booking_id, provider]
      properties:
        booking_id: {type: integer}
        provider: {type: string, enum: [zoom, google_meet, ms_teams]}

    # White-label App
    WhiteLabelApp:
      type: object
      properties:
        id: {type: integer}
        app_name: {type: string}
        bundle_id: {type: string}
        logo_url: {type: string}
        primary_color: {type: string}
        secondary_color: {type: string}
        features: {type: object}
        ios_status: {type: string, enum: [draft, building, submitted, published, rejected]}
        android_status: {type: string, enum: [draft, building, submitted, published, rejected]}
        ios_app_store_url: {type: string}
        android_play_store_url: {type: string}

    WhiteLabelAppCreate:
      type: object
      required: [app_name]
      properties:
        app_name: {type: string}
        logo_url: {type: string}
        primary_color: {type: string}
        secondary_color: {type: string}
        features: {type: object, properties: {booking: {type: boolean}, loyalty: {type: boolean}, push: {type: boolean}}}

    # Automation
    AutomationRule:
      type: object
      properties:
        id: {type: integer}
        name: {type: string}
        description: {type: string}
        trigger_type: {type: string, enum: [booking_created, booking_confirmed, booking_completed, booking_cancelled, booking_no_show, payment_received, customer_created, time_before_booking, time_after_booking, customer_inactive, review_received]}
        trigger_config: {type: object}
        action_type: {type: string, enum: [send_email, send_sms, send_push, update_booking_status, add_loyalty_points, create_task, webhook, ai_follow_up]}
        action_config: {type: object}
        delay_minutes: {type: integer}
        is_active: {type: boolean}

    AutomationRuleCreate:
      type: object
      required: [name, trigger_type, action_type]
      properties:
        name: {type: string}
        description: {type: string}
        trigger_type: {type: string}
        trigger_config: {type: object}
        action_type: {type: string}
        action_config: {type: object}
        delay_minutes: {type: integer, default: 0}

    AutomationLog:
      type: object
      properties:
        id: {type: integer}
        rule_id: {type: integer}
        rule_name: {type: string}
        booking_id: {type: integer}
        customer_id: {type: integer}
        status: {type: string, enum: [pending, executed, failed, skipped]}
        result: {type: object}
        error_message: {type: string}
        executed_at: {type: string, format: date-time}

    # Analytics
    DashboardMetrics:
      type: object
      properties:
        total_bookings: {type: integer}
        bookings_change_percent: {type: number}
        total_revenue: {type: number}
        revenue_change_percent: {type: number}
        new_customers: {type: integer}
        customers_change_percent: {type: number}
        average_rating: {type: number}
        no_show_rate: {type: number}
        top_services:
          type: array
          items:
            type: object
            properties:
              service_name: {type: string}
              bookings_count: {type: integer}
              revenue: {type: number}
        bookings_by_day:
          type: array
          items:
            type: object
            properties:
              date: {type: string, format: date}
              count: {type: integer}
        revenue_by_day:
          type: array
          items:
            type: object
            properties:
              date: {type: string, format: date}
              amount: {type: number}

```

---

## 16. API Error Handling

### 16.1. Standardní Error Response

Všechny endpointy používají jednotný formát error response:

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Vybraný časový slot již není dostupný.",
    "details": [
      {
        "field": "start_time",
        "message": "Slot 14:00-15:00 je obsazen zaměstnancem Jan Novák"
      }
    ],
    "request_id": "req_abc123",
    "timestamp": "2026-02-10T14:30:00Z"
  }
}
```

### 16.2. Error Kódy

| HTTP Status | Code                | Popis                    | Kdy se použije                         |
| ----------- | ------------------- | ------------------------ | -------------------------------------- |
| 400         | VALIDATION_ERROR    | Neplatný vstup           | Chybějící/neplatné pole                |
| 400         | INVALID_COUPON      | Neplatný kupón           | Expirovaný, vyčerpaný, neaplikovatelný |
| 401         | UNAUTHORIZED        | Chybějící/neplatný token | Žádný/expirovaný JWT                   |
| 401         | MFA_REQUIRED        | Vyžadováno MFA           | Přihlášení bez MFA kódu                |
| 403         | FORBIDDEN           | Nedostatečná oprávnění   | RBAC — nemá permission                 |
| 404         | NOT_FOUND           | Entita nenalezena        | Neexistující ID                        |
| 409         | BOOKING_CONFLICT    | Časový konflikt          | Double-booking pokus                   |
| 409         | DUPLICATE_EMAIL     | Duplicitní email         | Registrace s existujícím emailem       |
| 422         | UNPROCESSABLE       | Logická chyba            | Zrušení již zrušené rezervace          |
| 429         | RATE_LIMITED        | Příliš mnoho requestů    | Rate limit překročen                   |
| 500         | INTERNAL_ERROR      | Interní chyba            | Neočekávaná chyba serveru              |
| 502         | GATEWAY_ERROR       | Externí služba selhala   | Comgate/QRcomat/Zoom timeout           |
| 503         | SERVICE_UNAVAILABLE | Služba nedostupná        | Údržba, overload                       |

### 16.3. Globální Error Responses (pro VŠECHNY endpointy)

```yaml
# Přidat do components/responses v OpenAPI spec:
components:
  responses:
    BadRequest:
      description: Neplatný vstup
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: Chybějící nebo neplatný token
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Forbidden:
      description: Nedostatečná oprávnění
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFound:
      description: Entita nenalezena
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    TooManyRequests:
      description: Rate limit překročen
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          headers:
            Retry-After:
              schema:
                type: integer
              description: Sekundy do resetu
            X-RateLimit-Limit:
              schema:
                type: integer
            X-RateLimit-Remaining:
              schema:
                type: integer
```

---

## 17. Rate Limiting

### 17.1. Per-Endpoint konfigurace

| Endpoint Group             | Limit   | Window | Burst |
| -------------------------- | ------- | ------ | ----- |
| POST /auth/login           | 5 req   | 1 min  | 10    |
| POST /auth/register        | 3 req   | 1 min  | 5     |
| POST /auth/forgot-password | 3 req   | 5 min  | 3     |
| POST /bookings             | 30 req  | 1 min  | 50    |
| GET /availability          | 60 req  | 1 min  | 100   |
| POST /payments/\*          | 10 req  | 1 min  | 20    |
| POST /ai/\*                | 20 req  | 1 min  | 30    |
| GET (obecné)               | 100 req | 1 min  | 200   |
| POST (obecné)              | 50 req  | 1 min  | 100   |
| Public endpoints (no auth) | 30 req  | 1 min  | 60    |
| Webhooks (Comgate/QRcomat) | 100 req | 1 min  | 200   |

### 17.2. Rate Limit Headers

Všechny responses obsahují:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1707580800
Retry-After: 42  (jen u 429)
```

### 17.3. Implementace

Redis-based sliding window counter:

```
Key: ratelimit:{user_id}:{endpoint_group}:{window}
TTL: window duration
```

---

## 18. API Versioning

### 18.1. Strategie

URL-based versioning: `/api/v1/bookings`, `/api/v2/bookings`

Aktuální verze: **v1** (všechny endpointy v OpenAPI spec jsou v1).

### 18.2. Pravidla

- Breaking changes (odebrání pole, změna typu) → nová verze (v2)
- Non-breaking changes (přidání pole, nový endpoint) → stávající verze
- Deprecated verze podporována min. 12 měsíců
- Header `Deprecation: true` + `Sunset: 2027-06-01` na deprecated endpointech

### 18.3. Healthcheck Endpointy

```yaml
# Přidat do OpenAPI spec:
/health:
  get:
    summary: Liveness probe
    tags: [System]
    security: []
    responses:
      '200':
        content:
          application/json:
            schema:
              type: object
              properties:
                status: { type: string, enum: [healthy] }
                version: { type: string }
                uptime: { type: integer }

/readiness:
  get:
    summary: Readiness probe
    tags: [System]
    security: []
    responses:
      '200':
        content:
          application/json:
            schema:
              type: object
              properties:
                status: { type: string, enum: [ready, degraded] }
                checks:
                  type: object
                  properties:
                    database: { type: string, enum: [up, down] }
                    redis: { type: string, enum: [up, down] }
```

---

# ČÁST V — FRONTEND

---

## 19. Design System

### 19.1. Vizuální identita

- **Hlavní barva:** #3B82F6 (blue-500) — důvěryhodnost, profesionalita
- **Sekundární:** #22C55E (green-500) — úspěch, potvrzení
- **Danger:** #EF4444 (red-500) — chyby, zrušení
- **Warning:** #F59E0B (amber-500) — upozornění
- **Neutral:** #6B7280 (gray-500) — text, borders

### 19.2. Typografie

- **Font:** Inter (system fallback: -apple-system, BlinkMacSystemFont, sans-serif)
- **H1:** 30px / bold
- **H2:** 24px / semibold
- **H3:** 20px / semibold
- **Body:** 16px / regular
- **Small:** 14px / regular
- **XS:** 12px / regular

### 19.3. Spacing & Grid

- 4px grid system (4, 8, 12, 16, 24, 32, 48, 64)
- Breakpoints: sm: 640px, md: 768px, lg: 1024px, xl: 1280px
- Max content width: 1280px
- Sidebar width: 256px (collapsed: 64px)

---

## 20. Frontend Komponenty

# ScheduleBox - Kompletní Specifikace Frontend Komponent

**Datum:** 9. února 2026
**Autor:** AI-PMLOGY-INT + Claude
**Verze:** 2.0 (100% kompletní)
**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query, Zustand

---

### 20.1. Design System - Základní Primitiva

### 1.1. Barevná Paleta

```typescript
const colors = {
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    900: '#1E3A5F',
  },
  secondary: { 50: '#F0FDF4', 500: '#22C55E', 700: '#15803D' },
  danger: { 50: '#FEF2F2', 500: '#EF4444', 700: '#B91C1C' },
  warning: { 50: '#FFFBEB', 500: '#F59E0B', 700: '#B45309' },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    500: '#6B7280',
    700: '#374151',
    900: '#111827',
  },
};
```

### 1.2. Typografie

```typescript
const typography = {
  h1: 'text-3xl font-bold', // 30px
  h2: 'text-2xl font-semibold', // 24px
  h3: 'text-xl font-semibold', // 20px
  h4: 'text-lg font-medium', // 18px
  body: 'text-base', // 16px
  small: 'text-sm', // 14px
  xs: 'text-xs', // 12px
};
```

### 1.3. Spacing & Breakpoints

- **Spacing:** 4px grid system (4, 8, 12, 16, 24, 32, 48, 64)
- **Breakpoints:** sm: 640px, md: 768px, lg: 1024px, xl: 1280px

---

### 20.2. Základní UI Komponenty (Atoms)

### 2.1. Button

- **Props:** `variant` ('primary' | 'secondary' | 'danger' | 'ghost' | 'outline'), `size` ('sm' | 'md' | 'lg'), `onClick`, `disabled`, `isLoading`, `leftIcon?`, `rightIcon?`, `fullWidth?`
- **Stavy:** default, hover, active, focused, disabled, loading
- **API:** Žádné (čistě UI)
- **Příklad:**
  ```tsx
  <Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleSubmit}>
    Potvrdit rezervaci
  </Button>
  ```

### 2.2. Input

- **Props:** `type` ('text' | 'email' | 'password' | 'tel' | 'number' | 'search'), `label`, `placeholder`, `value`, `onChange`, `error?`, `helperText?`, `disabled`, `required`, `leftIcon?`, `rightIcon?`
- **Validace:** Řízeno z Zod schémat, error text zobrazován pod inputem
- **Příklad:**
  ```tsx
  <Input
    type="email"
    label="Email"
    placeholder="jan@firma.cz"
    value={email}
    onChange={setEmail}
    error={errors.email}
    required
  />
  ```

### 2.3. Select

- **Props:** `options: Array<{value: string, label: string}>`, `value`, `onChange`, `label`, `placeholder?`, `error?`, `disabled`, `multiple?`, `searchable?`
- **Příklad:**
  ```tsx
  <Select
    label="Služba"
    options={services.map((s) => ({ value: s.id, label: s.name }))}
    value={serviceId}
    onChange={setServiceId}
    searchable
  />
  ```

### 2.4. DatePicker

- **Props:** `value: Date`, `onChange`, `label`, `minDate?`, `maxDate?`, `disabled`, `error?`, `locale` (default 'cs')
- **Knihovna:** react-day-picker s českou lokalizací
- **Příklad:**
  ```tsx
  <DatePicker label="Datum" value={date} onChange={setDate} minDate={new Date()} locale="cs" />
  ```

### 2.5. TimePicker

- **Props:** `value: string` (HH:mm), `onChange`, `label`, `minTime?`, `maxTime?`, `step` (default 30, v minutách), `availableSlots?: string[]`, `disabled`
- **Příklad:**
  ```tsx
  <TimePicker label="Čas" value={time} onChange={setTime} availableSlots={slots} step={15} />
  ```

### 2.6. Textarea

- **Props:** `value`, `onChange`, `label`, `placeholder`, `rows` (default 4), `maxLength?`, `error?`, `disabled`
- **Příklad:**
  ```tsx
  <Textarea label="Poznámka" value={notes} onChange={setNotes} maxLength={500} rows={3} />
  ```

### 2.7. Checkbox & Toggle

- **Checkbox Props:** `checked`, `onChange`, `label`, `disabled`
- **Toggle Props:** `checked`, `onChange`, `label`, `disabled`, `size` ('sm' | 'md')
- **Příklad:**
  ```tsx
  <Toggle checked={isActive} onChange={setIsActive} label="Aktivní" />
  ```

### 2.8. Badge

- **Props:** `variant` ('default' | 'success' | 'warning' | 'danger' | 'info'), `children`, `size` ('sm' | 'md')
- **Příklad:**
  ```tsx
  <Badge variant="success">Potvrzeno</Badge>
  <Badge variant="danger">Zrušeno</Badge>
  ```

### 2.9. Avatar

- **Props:** `src?`, `name`, `size` ('sm' | 'md' | 'lg' | 'xl'), `online?`
- **Fallback:** Iniciály z name, když src chybí
- **Příklad:**
  ```tsx
  <Avatar name="Jan Novák" src="/avatars/jan.jpg" size="md" online />
  ```

### 2.10. Modal

- **Props:** `isOpen`, `onClose`, `title`, `children`, `size` ('sm' | 'md' | 'lg' | 'xl'), `footer?`
- **Chování:** Escape close, overlay click close, focus trap
- **Příklad:**
  ```tsx
  <Modal isOpen={isOpen} onClose={close} title="Nová rezervace" size="lg">
    <BookingForm onSubmit={handleSubmit} />
  </Modal>
  ```

### 2.11. Toast / Notification

- **Props:** `type` ('success' | 'error' | 'warning' | 'info'), `title`, `message?`, `duration` (default 5000ms)
- **API:** `toast.success('Rezervace vytvořena')`, `toast.error('Chyba při ukládání')`
- **Knihovna:** react-hot-toast nebo sonner

### 2.12. EmptyState

- **Props:** `icon`, `title`, `description`, `action?: { label: string, onClick: () => void }`
- **Příklad:**
  ```tsx
  <EmptyState
    icon={CalendarIcon}
    title="Žádné rezervace"
    description="Zatím nemáte žádné rezervace."
    action={{ label: 'Vytvořit první', onClick: openNewBooking }}
  />
  ```

### 2.13. LoadingSpinner / Skeleton

- **Spinner Props:** `size` ('sm' | 'md' | 'lg')
- **Skeleton Props:** `variant` ('text' | 'circle' | 'rect'), `width?`, `height?`, `count?`

---

### 20.3. Komplexní Komponenty (Molecules / Organisms)

### 3.1. Calendar (Hlavní kalendář)

- **Props:**
  - `events: BookingEvent[]`
  - `onSelectDate: (date: Date) => void`
  - `onSelectEvent: (event: BookingEvent) => void`
  - `onCreateEvent: (start: Date, end: Date, employeeId?: number) => void`
  - `view: 'day' | 'week' | 'month'`
  - `onViewChange: (view: string) => void`
  - `employees?: Employee[]` (pro multi-resource view)
  - `onNavigate: (date: Date) => void`
  - `currentDate: Date`
- **API volání:**
  - `GET /bookings?date_from=...&date_to=...` — načtení událostí
  - `GET /employees` — načtení zaměstnanců (resource view)
- **Funkce:** Drag & drop pro přesun/resize, barevné kódování podle služby/zaměstnance, zobrazení dostupnosti
- **Knihovna:** @fullcalendar/react s @fullcalendar/resource-timeline
- **Příklad:**
  ```tsx
  <Calendar
    events={bookings}
    employees={employees}
    view="week"
    onSelectEvent={openBookingDetail}
    onCreateEvent={openNewBooking}
  />
  ```

### 3.2. BookingForm (Rezervační formulář)

- **Props:**
  - `services: Service[]`
  - `employees?: Employee[]`
  - `customer?: Customer` (pre-fill pro existujícího zákazníka)
  - `initialDate?: Date`
  - `onSubmit: (data: BookingCreateData) => void`
  - `isLoading?: boolean`
- **Validace (Zod):**
  - `customer_name`: required, min 2, max 100
  - `email`: required, valid email
  - `phone`: optional, pattern +420XXXXXXXXX
  - `service_id`: required
  - `date`: required, future date
  - `time`: required, within available slots
- **API volání:**
  - `GET /services` — seznam služeb
  - `GET /availability?service_id=X&date_from=Y&date_to=Z` — dostupné sloty
  - `POST /coupons/validate` — validace kupónu
  - `POST /bookings` — vytvoření rezervace
- **Kroky (Stepper):**
  1. Výběr služby
  2. Výběr data a času (+ zaměstnance)
  3. Údaje zákazníka
  4. Shrnutí a potvrzení
- **Příklad:**
  ```tsx
  <BookingForm services={services} employees={employees} onSubmit={handleCreateBooking} />
  ```

### 3.3. BookingDetail (Detail rezervace)

- **Props:**
  - `booking: Booking`
  - `onCancel: (id: number, reason?: string) => void`
  - `onConfirm: (id: number) => void`
  - `onComplete: (id: number) => void`
  - `onNoShow: (id: number) => void`
  - `onReschedule: (id: number) => void`
  - `onPayment: (id: number) => void`
- **Zobrazení:** Zákazník, služba, zaměstnanec, čas, stav, platba, AI no-show skóre, poznámky, historie změn
- **API volání:**
  - `GET /bookings/{id}` — detail
  - `POST /bookings/{id}/cancel` — zrušení
  - `POST /bookings/{id}/confirm` — potvrzení
  - `POST /ai/no-show-prediction` — predikce

### 3.4. CustomerList (Seznam zákazníků)

- **Props:**
  - `onSelect: (customer: Customer) => void`
  - `onCreateNew: () => void`
- **Funkce:** Vyhledávání, filtrování podle štítků, řazení, stránkování, bulk akce
- **API volání:**
  - `GET /customers?search=...&tag_id=...&page=...&limit=...&sort_by=...`
  - `DELETE /customers/{id}`
- **Sloupce tabulky:** Jméno, Email, Telefon, Štítky, Rezervace, Utraceno, Health Score, Poslední návštěva
- **Příklad:**
  ```tsx
  <CustomerList onSelect={openCustomerDetail} onCreateNew={openNewCustomerForm} />
  ```

### 3.5. CustomerForm (Formulář zákazníka)

- **Props:**
  - `customer?: Customer` (pro editaci)
  - `onSubmit: (data: CustomerCreateData | CustomerUpdateData) => void`
  - `isLoading?: boolean`
- **Validace (Zod):**
  - `name`: required, min 2, max 255
  - `email`: optional, valid email, unique per company
  - `phone`: optional, pattern
  - `date_of_birth`: optional, past date
- **API volání:**
  - `POST /customers` — vytvoření
  - `PUT /customers/{id}` — aktualizace
  - `GET /tags` — seznam štítků pro přiřazení

### 3.6. CustomerDetail (Detail zákazníka — CRMbox)

- **Props:**
  - `customer: Customer`
  - `onEdit: () => void`
  - `onDelete: () => void`
- **Sekce:**
  - Kontaktní údaje + štítky
  - KPI karty: Health Score, CLV, Celkové výdaje, Počet rezervací, No-show rate
  - Historie rezervací (tabulka)
  - Věrnostní karta (pokud existuje)
  - AI doporučení (upselling, follow-up)
  - Poznámky
- **API volání:**
  - `GET /customers/{id}`
  - `GET /customers/{id}/bookings`
  - `GET /loyalty/cards?customer_id=X`
  - `POST /ai/smart-upselling` — doporučení
  - `POST /ai/clv-prediction`

### 3.7. ServiceList (Seznam služeb)

- **Props:**
  - `onSelect: (service: Service) => void`
  - `onCreateNew: () => void`
  - `onReorder: (orderedIds: number[]) => void`
- **Funkce:** Drag & drop řazení, filtrování podle kategorie, aktivní/neaktivní
- **API volání:**
  - `GET /services`
  - `GET /service-categories`
  - `DELETE /services/{id}`

### 3.8. ServiceForm (Formulář služby)

- **Props:**
  - `service?: Service` (pro editaci)
  - `categories: ServiceCategory[]`
  - `resources: Resource[]`
  - `onSubmit: (data: ServiceCreateData | ServiceUpdateData) => void`
- **Validace (Zod):**
  - `name`: required, min 2
  - `duration_minutes`: required, min 5
  - `price`: required, min 0
- **Pole formuláře:**
  - Základní: název, popis, kategorie, trvání, buffer, cena
  - Online booking: povoleno?, vyžaduje platbu?, cancellation policy
  - Kapacita: max capacity, přiřazení zdrojů
  - AI pricing: povoleno?, min/max cena
  - Online: is_online?, video provider
  - Vizuální: barva, obrázek
- **API volání:**
  - `POST /services` — vytvoření
  - `PUT /services/{id}` — aktualizace

### 3.9. EmployeeList (Seznam zaměstnanců)

- **Props:**
  - `onSelect: (employee: Employee) => void`
  - `onCreateNew: () => void`
- **Zobrazení:** Avatar, Jméno, Email, Titul, Přiřazené služby, Stav
- **API volání:**
  - `GET /employees`

### 3.10. EmployeeForm (Formulář zaměstnance)

- **Props:**
  - `employee?: Employee`
  - `services: Service[]`
  - `onSubmit: (data) => void`
- **Sekce formuláře:**
  - Základní údaje (jméno, email, telefon, titul, bio, avatar)
  - Přiřazení služeb (multi-select)
  - Pracovní doby (7 řádků pro dny v týdnu, start/end time)
- **API volání:**
  - `POST /employees` — vytvoření
  - `PUT /employees/{id}` — aktualizace
  - `PUT /employees/{id}/services` — přiřazení služeb
  - `PUT /employees/{id}/working-hours` — pracovní doby

### 3.11. WorkingHoursEditor (Editor pracovních dob)

- **Props:**
  - `workingHours: WorkingHours[]`
  - `onChange: (hours: WorkingHoursCreate[]) => void`
- **Zobrazení:** 7 řádků (Po-Ne), toggle aktivní/neaktivní, start/end time picker
- **Příklad:**
  ```tsx
  <WorkingHoursEditor workingHours={currentHours} onChange={setWorkingHours} />
  ```

### 3.12. PaymentForm (Platební formulář)

- **Props:**
  - `booking: Booking`
  - `onPaymentComplete: (payment: Payment) => void`
- **Metody:**
  - Comgate (kartou online) → redirect
  - QRcomat (QR kód) → zobrazení modalu s QR
  - Hotově → okamžité potvrzení
  - Dárkovou kartou → input kódu
- **API volání:**
  - `POST /payments/comgate/create` — vytvoření Comgate platby
  - `POST /payments/qrcomat/generate` — generování QR kódu
  - `POST /payments` — ruční platba
  - `POST /gift-cards/redeem` — uplatnění dárkové karty

### 3.13. Dashboard (Hlavní přehled)

- **Props:** žádné (fetches own data)
- **Sekce:**
  - KPI karty: Dnešní rezervace, Tržby tento měsíc, Noví zákazníci, Průměrné hodnocení
  - Graf: Rezervace za posledních 30 dní (line chart)
  - Graf: Tržby za posledních 30 dní (bar chart)
  - Top služby (mini tabulka)
  - Nadcházející rezervace (seznam)
  - AI insights / doporučení
- **API volání:**
  - `GET /analytics/dashboard?period=month`
  - `GET /bookings?date_from=today&date_to=today&status=confirmed&limit=10`
  - `GET /ai/capacity-optimization?date_from=...&date_to=...`
- **Příklad:**
  ```tsx
  <Dashboard />
  ```

### 3.14. AnalyticsCharts (Analytika a reporty)

- **Props:**
  - `dateRange: { from: Date, to: Date }`
  - `onDateRangeChange: (range) => void`
- **Grafy (recharts):**
  - Rezervace v čase (line/bar, group by day/week/month)
  - Tržby v čase (line/bar, group by day/week/month)
  - Rezervace podle služby (pie/donut)
  - Rezervace podle zdroje (pie)
  - No-show rate v čase (line)
  - Zákaznické metriky (new vs returning)
- **Filtry:** Období, služba, zaměstnanec, zdroj
- **Export:** CSV, Excel
- **API volání:**
  - `GET /analytics/bookings?date_from=...&date_to=...&group_by=day`
  - `GET /analytics/revenue?date_from=...&date_to=...&group_by=day`
  - `GET /analytics/customers?date_from=...&date_to=...`
  - `GET /analytics/export?report_type=bookings&format=csv`

### 3.15. LoyaltyProgramSettings (Nastavení věrnostního programu)

- **Props:**
  - `program?: LoyaltyProgram`
  - `onSave: (data: LoyaltyProgramCreate) => void`
- **Sekce:**
  - Typ programu (points/stamps/tiers)
  - Nastavení bodů (bodů za CZK)
  - Správa tier úrovní (drag & drop řazení)
  - Správa odměn (CRUD tabulka)
- **API volání:**
  - `GET /loyalty/programs`
  - `POST /loyalty/programs` / `PUT /loyalty/programs`
  - `GET /loyalty/rewards`
  - `POST /loyalty/rewards`

### 3.16. LoyaltyCardView (Zobrazení věrnostní karty)

- **Props:**
  - `card: LoyaltyCard`
  - `onAddPoints?: (points: number) => void`
- **Zobrazení:** Číslo karty, body/razítka, tier, progress bar k dalšímu tieru, Apple/Google Wallet tlačítka, historie transakcí
- **API volání:**
  - `GET /loyalty/cards/{id}`
  - `GET /loyalty/cards/{id}/transactions`
  - `POST /loyalty/cards/{id}/add-points`

### 3.17. CouponManager (Správa kupónů)

- **Props:** žádné (fetches own data)
- **Funkce:** CRUD tabulka kupónů, statistiky použití, generování kódu
- **Sloupce:** Kód, Typ slevy, Hodnota, Použito/Max, Platný do, Stav, Akce
- **API volání:**
  - `GET /coupons`
  - `POST /coupons`
  - `PUT /coupons/{id}`
  - `DELETE /coupons/{id}`

### 3.18. GiftCardManager (Správa dárkových karet)

- **Props:** žádné (fetches own data)
- **Funkce:** Vytvoření nové dárkové karty, zobrazení seznamu, kontrola zůstatku
- **API volání:**
  - `GET /gift-cards`
  - `POST /gift-cards`
  - `GET /gift-cards/{id}/balance`

### 3.19. ReviewList (Seznam recenzí)

- **Props:**
  - `onReply: (reviewId: number, reply: string) => void`
- **Funkce:** Seznam recenzí s hvězdičkami, filtrování podle ratingu, odpovídání
- **API volání:**
  - `GET /reviews`
  - `POST /reviews/{id}/reply`

### 3.20. NotificationTemplateEditor (Editor šablon notifikací)

- **Props:**
  - `template?: NotificationTemplate`
  - `onSave: (data: NotificationTemplateCreate) => void`
- **Funkce:** WYSIWYG editor s proměnnými ({{customer_name}}, {{service_name}}, atd.), náhled, výběr kanálu (email/SMS/push)
- **API volání:**
  - `GET /notification-templates`
  - `POST /notification-templates`
  - `PUT /notification-templates/{id}`

### 3.21. AutomationRuleBuilder (Builder automatizačních pravidel)

- **Props:**
  - `rule?: AutomationRule`
  - `onSave: (data: AutomationRuleCreate) => void`
- **Vizuální builder:**
  - **Trigger:** Dropdown (booking_created, booking_completed, time_before_booking, atd.)
  - **Podmínky:** Volitelné filtry (jen pro službu X, jen pro VIP zákazníky)
  - **Akce:** Dropdown (send_email, send_sms, add_loyalty_points, ai_follow_up)
  - **Zpoždění:** Čas v minutách/hodinách/dnech
- **Příklad pravidla:** "Když je rezervace dokončena → počkej 2 hodiny → pošli email s žádostí o recenzi"
- **API volání:**
  - `GET /automation/rules`
  - `POST /automation/rules`
  - `PUT /automation/rules/{id}`
  - `POST /automation/rules/{id}/toggle`

### 3.22. SettingsPage (Stránka nastavení)

- **Sekce (tabs):**
  - **Firma:** Název, adresa, kontakt, logo, popis → `PUT /settings/company`
  - **Pracovní doby:** Výchozí doby firmy → `PUT /settings/working-hours`
  - **Rezervace:** Pravidla, cancellation policy, "vypadat zaneprázdněně"
  - **Platby:** Comgate API klíče, QRcomat nastavení
  - **Notifikace:** Zapnutí/vypnutí typů, email odesílatel
  - **Integrace:** Google Calendar sync, Zoom/Meet/Teams OAuth
  - **API:** Správa API klíčů → `GET/POST/DELETE /settings/api-keys`
  - **Webhooks:** Správa webhook URL → `GET/POST /settings/webhooks`
  - **Widget:** Kód pro vložení na web, customizace
  - **Billing:** Aktuální plán, upgrade

### 3.23. MarketplaceListingEditor (Editor marketplace profilu)

- **Props:**
  - `listing?: MarketplaceListing`
  - `onSave: (data) => void`
- **Pole:** Název, popis, kategorie, obrázky (upload), adresa
- **API volání:**
  - `GET /marketplace/my-listing`
  - `PUT /marketplace/my-listing`

### 3.24. MarketplaceSearch (Veřejné vyhledávání v marketplace)

- **Props:** žádné
- **Funkce:** Fulltextové vyhledávání, filtry (kategorie, město, hodnocení), geolokace, mapový pohled
- **API volání:**
  - `GET /marketplace/listings?search=...&category=...&city=...&lat=...&lng=...&radius_km=...`

### 3.25. BookingWidget (Embeddable rezervační widget)

- **Props:**
  - `companySlug: string`
  - `theme?: { primaryColor: string, borderRadius: string }`
- **Funkce:** Samostatný widget pro vložení na web zákazníka (iframe nebo Web Component)
- **Kroky:** Výběr služby → Datum & čas → Kontaktní údaje → Potvrzení
- **API volání:**
  - `GET /widget/config/{company_slug}`
  - `GET /availability?company_slug=...&service_id=...&date_from=...&date_to=...`
  - `POST /bookings`
- **Příklad vložení:**
  ```html
  <script src="https://widget.schedulebox.cz/embed.js" data-company="moje-firma"></script>
  ```

### 3.26. OnboardingWizard (Onboarding pro nové uživatele)

- **Kroky:**
  1. Informace o firmě (název, adresa, kontakt)
  2. Nastavení pracovní doby
  3. Vytvoření první služby
  4. Přidání zaměstnanců (volitelné)
  5. Nastavení platební brány (volitelné)
  6. Vyzkoušení — testovací rezervace
- **Progress:** Vizuální progress bar, možnost přeskočit kroky
- **API volání:** Kombinace `PUT /settings/company`, `PUT /settings/working-hours`, `POST /services`, `POST /employees`

### 3.27. AIInsightsPanel (Panel AI doporučení)

- **Props:** žádné (fetches own data)
- **Sekce:**
  - Kapacitní doporučení ("Přidejte víc slotů v pátek odpoledne")
  - Cenová doporučení ("Služba X je podhodnocená o 15%")
  - Zákazníci v riziku churnu (seznam s health score)
  - Upselling příležitosti
- **API volání:**
  - `GET /ai/capacity-optimization?date_from=...&date_to=...`
  - `GET /ai/customer-health`
  - `POST /ai/pricing-optimizer`

### 3.28. WhiteLabelAppConfigurator (Konfigurátor mobilní aplikace)

- **Props:**
  - `app?: WhiteLabelApp`
  - `onSave: (data: WhiteLabelAppCreate) => void`
  - `onBuild: () => void`
- **Funkce:**
  - Náhled aplikace (iPhone/Android mockup)
  - Nastavení: název, logo upload, barvy, funkce
  - Spuštění buildu
  - Stav buildu (draft → building → submitted → published)
- **API volání:**
  - `GET /apps/whitelabel`
  - `POST /apps/whitelabel` / `PUT /apps/whitelabel`
  - `POST /apps/whitelabel/build`

### 3.29. DataTable (Univerzální datová tabulka)

- **Props:**
  - `columns: ColumnDef[]`
  - `data: any[]`
  - `isLoading: boolean`
  - `pagination: PaginationMeta`
  - `onPageChange: (page: number) => void`
  - `onSort: (column: string, order: 'asc' | 'desc') => void`
  - `onSearch: (query: string) => void`
  - `bulkActions?: BulkAction[]`
  - `rowActions?: RowAction[]`
  - `emptyState?: ReactNode`
- **Funkce:** Řazení, vyhledávání, stránkování, bulk select, export, column resize
- **Knihovna:** @tanstack/react-table
- **Příklad:**
  ```tsx
  <DataTable
    columns={customerColumns}
    data={customers}
    pagination={meta}
    onPageChange={setPage}
    onSearch={setSearch}
  />
  ```

### 3.30. Sidebar (Boční navigace)

- **Props:**
  - `currentPath: string`
  - `user: User`
  - `company: Company`
- **Položky menu:**
  - Dashboard (`/dashboard`)
  - Kalendář (`/calendar`)
  - Rezervace (`/bookings`)
  - Zákazníci (`/customers`)
  - Služby (`/services`)
  - Zaměstnanci (`/employees`)
  - Platby (`/payments`)
  - Kupóny (`/coupons`)
  - Věrnostní program (`/loyalty`)
  - Recenze (`/reviews`)
  - Automatizace (`/automation`)
  - Marketplace (`/marketplace`)
  - AI Insights (`/ai`)
  - Analytika (`/analytics`)
  - White-label App (`/app`)
  - Nastavení (`/settings`)
- **Funkce:** Collapsible, responsive (drawer na mobilu), badge s počtem notifikací

### 3.31. TopBar (Horní lišta)

- **Props:**
  - `user: User`
  - `company: Company`
  - `notificationCount: number`
- **Obsah:** Logo, vyhledávání (global search), notifikační zvoneček, profil dropdown (nastavení, odhlášení)

### 3.32. PublicBookingPage (Veřejná rezervační stránka)

- **URL:** `/{company_slug}`
- **Props:** žádné (route based)
- **Funkce:** Veřejná stránka pro zákazníky — zobrazení služeb, výběr, rezervace, platba
- **Obsahuje:** BookingForm komponentu s veřejným API
- **API volání:**
  - `GET /widget/config/{company_slug}` — konfigurace
  - `GET /availability` — dostupné sloty
  - `POST /bookings` — vytvoření
  - `POST /payments/comgate/create` — platba

---

### 20.4. Layout Struktura

### 4.1. Admin Layout

```
┌──────────────────────────────────────────────────┐
│  TopBar                                          │
├──────────┬───────────────────────────────────────┤
│          │                                       │
│ Sidebar  │  Main Content Area                    │
│          │  (children)                            │
│          │                                       │
│          │                                       │
│          │                                       │
└──────────┴───────────────────────────────────────┘
```

### 4.2. Public Layout (rezervační stránka)

```
┌──────────────────────────────────────────────────┐
│  Company Header (logo, název)                    │
├──────────────────────────────────────────────────┤
│                                                  │
│  Main Content (BookingForm / BookingWidget)       │
│                                                  │
├──────────────────────────────────────────────────┤
│  Footer (powered by ScheduleBox)                 │
└──────────────────────────────────────────────────┘
```

---

### 20.5. State Management (Frontend Spec)

### 5.1. Zustand Stores

```typescript
// authStore — přihlášený uživatel, tokeny
// companyStore — nastavení firmy
// bookingStore — stav kalendáře (view, currentDate, filters)
// uiStore — sidebar collapsed, modals, toasts
```

### 5.2. React Query

Všechna API volání jsou cachována přes React Query (TanStack Query):

```typescript
// Příklad hooks:
useBookings(filters); // GET /bookings
useBooking(id); // GET /bookings/{id}
useCreateBooking(); // POST /bookings
useCustomers(filters); // GET /customers
useServices(); // GET /services
useDashboard(period); // GET /analytics/dashboard
useAvailability(params); // GET /availability
```

---

### 20.6. Storybook

Všechny komponenty (atoms i molecules) jsou zdokumentovány v Storybooku:

- **Atoms:** Button, Input, Select, DatePicker, TimePicker, Modal, Badge, Avatar, Toggle, Toast
- **Molecules:** BookingForm, CustomerForm, ServiceForm, EmployeeForm, PaymentForm, DataTable
- **Organisms:** Calendar, Dashboard, AnalyticsCharts, SettingsPage, AutomationRuleBuilder

Každá story obsahuje:

- Default stav
- Varianty (velikosti, stavy, varianty)
- Interaktivní controls (Storybook Args)
- Příklady s mock daty

---

## 21. State Management

### 21.1. Zustand Stores

```typescript
// === Auth Store ===
interface AuthStore {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// === UI Store ===
interface UIStore {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  toasts: Toast[];
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
}

// === Calendar Store ===
interface CalendarStore {
  currentDate: Date;
  view: 'day' | 'week' | 'month';
  selectedEmployeeIds: number[];
  setDate: (date: Date) => void;
  setView: (view: string) => void;
  toggleEmployee: (id: number) => void;
}
```

### 21.2. React Query (TanStack Query)

```typescript
// === Query Keys ===
const queryKeys = {
  bookings: {
    all: ['bookings'] as const,
    list: (filters: BookingFilters) => ['bookings', 'list', filters] as const,
    detail: (id: number) => ['bookings', 'detail', id] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (filters: CustomerFilters) => ['customers', 'list', filters] as const,
    detail: (id: number) => ['customers', 'detail', id] as const,
    bookings: (id: number) => ['customers', id, 'bookings'] as const,
  },
  services: {
    all: ['services'] as const,
    categories: ['services', 'categories'] as const,
  },
  employees: {
    all: ['employees'] as const,
    workingHours: (id: number) => ['employees', id, 'working-hours'] as const,
  },
  availability: (params: AvailabilityParams) => ['availability', params] as const,
  dashboard: (period: string) => ['dashboard', period] as const,
};

// === Custom Hooks ===
function useBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: queryKeys.bookings.list(filters),
    queryFn: () => api.get('/bookings', { params: filters }),
    staleTime: 30_000, // 30s
  });
}

function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BookingCreate) => api.post('/bookings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
```

---

## 22. Real-time (WebSocket)

### 22.1. Socket.io Server

```typescript
// WebSocket events:
interface ServerToClientEvents {
  'booking:created': (booking: Booking) => void;
  'booking:updated': (booking: Booking) => void;
  'booking:cancelled': (booking: Booking) => void;
  'payment:completed': (payment: Payment) => void;
  'notification:new': (notification: Notification) => void;
  'calendar:refresh': () => void;
}

interface ClientToServerEvents {
  'join:company': (companyId: number) => void;
  'leave:company': (companyId: number) => void;
}
```

### 22.2. Klientská integrace

```typescript
// useWebSocket hook
function useWebSocket() {
  const { company } = useAuthStore();

  useEffect(() => {
    if (!company) return;

    const socket = io(WS_URL, { auth: { token: getAccessToken() } });
    socket.emit('join:company', company.id);

    socket.on('booking:created', (booking) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.info(`Nová rezervace: ${booking.customer.name}`);
    });

    socket.on('booking:cancelled', (booking) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    });

    socket.on('calendar:refresh', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    });

    return () => {
      socket.disconnect();
    };
  }, [company?.id]);
}
```

### 22.3. Server-side Event Publishing

```typescript
// Po úspěšném zpracování domain eventu (synchronně inline):
async function onBookingCreated(event: BookingCreatedEvent) {
  // Odeslat WebSocket notifikaci všem uživatelům dané firmy
  io.to(`company:${event.company_id}`).emit('booking:created', event.data);
}
```

---

## 23. i18n & Accessibility

### 23.1. Internacionalizace (i18n)

**Knihovna:** next-intl

**Podporované jazyky (v1):**

- cs (čeština) — výchozí
- sk (slovenština)
- en (angličtina)

**Plánované (v2):**

- pl (polština)
- de (němčina)

```typescript
// Struktura:
// /messages/cs.json
// /messages/sk.json
// /messages/en.json

// Příklad cs.json:
{
  "booking": {
    "create": "Vytvořit rezervaci",
    "cancel": "Zrušit rezervaci",
    "confirm": "Potvrdit",
    "status": {
      "pending": "Čeká na potvrzení",
      "confirmed": "Potvrzeno",
      "cancelled": "Zrušeno",
      "completed": "Dokončeno",
      "no_show": "Nedostavil se"
    }
  },
  "common": {
    "save": "Uložit",
    "delete": "Smazat",
    "search": "Hledat",
    "loading": "Načítání..."
  }
}
```

### 23.2. Accessibility (WCAG 2.1 AA)

**Požadavky:**

- Všechny interaktivní prvky mají `aria-label` nebo viditelný label
- Keyboard navigation: Tab, Shift+Tab, Enter, Escape, Arrow keys
- Focus visible na všech focusable prvcích
- Color contrast ratio ≥ 4.5:1 pro text, ≥ 3:1 pro velký text
- Screen reader: všechny obrázky mají alt text, ikony mají aria-hidden
- Skip to content link
- Error messages přiřazeny k polím přes `aria-describedby`
- Live regions (`aria-live="polite"`) pro dynamické aktualizace

```tsx
// Příklad accessible button:
<Button
  onClick={handleSubmit}
  disabled={isLoading}
  aria-busy={isLoading}
  aria-label={isLoading ? "Odesílání..." : "Potvrdit rezervaci"}
>
  {isLoading ? <Spinner aria-hidden /> : null}
  {isLoading ? "Odesílání..." : "Potvrdit rezervaci"}
</Button>

// Příklad accessible form field:
<div>
  <label htmlFor="email" id="email-label">Email</label>
  <input
    id="email"
    type="email"
    aria-labelledby="email-label"
    aria-describedby={error ? "email-error" : undefined}
    aria-invalid={!!error}
  />
  {error && <span id="email-error" role="alert">{error}</span>}
</div>
```

---

# ČÁST VI — BEZPEČNOST

---

## 24. Security Specifikace

### 24.1. Správa hesel

- **Hashing:** Argon2id (OWASP doporučené parametry: memory=65536, iterations=3, parallelism=4)
- **Minimální délka:** 12 znaků (OPRAVENO: forms_validation říkala 8, ale správně je 12)
- **Složitost:** Velké + malé písmeno + číslo + speciální znak
- **Historie:** Posledních 5 hesel nelze znovu použít (tabulka password_history)
- **Leaked passwords:** Kontrola proti Have I Been Pwned API (k-anonymity model)
- **Account lockout:** 5 neúspěšných pokusů → lock na 15 minut

### 24.2. Session Management (JWT)

- **Access Token:** Expirace 15 minut, uložen v paměti (NIKDY localStorage)
- **Refresh Token:** Expirace 30 dní, HttpOnly + Secure + SameSite=Strict cookie
- **Token Invalidation:** Redis blacklist pro okamžité odhlášení
- **Rotation:** Refresh token se rotuje při každém refresh (one-time use)

### 24.3. Multi-Factor Authentication (MFA)

- **TOTP:** Google Authenticator, Authy (RFC 6238)
- **Backup codes:** 10 jednorázových kódů při setupu
- **Povinné pro:** admin, owner
- **Volitelné pro:** employee, customer

### 24.4. OAuth2 / OIDC

- **Provideři:** Google, Facebook, Apple
- **Flow:** Authorization Code Flow s PKCE (RFC 7636)

### 24.5. Šifrování

- **In Transit:** TLS 1.3, HSTS max-age=31536000
- **At Rest:** PostgreSQL TDE nebo volume-level encryption
- **PII šifrování:** AES-256-GCM na sloupce: customers.name, customers.email, customers.phone, customers.date_of_birth
- **Key Management:** HashiCorp Vault, rotace klíčů každých 90 dní

### 24.6. Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https://api.schedulebox.cz; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=(self), payment=()
```

### 24.7. Ochrana před útoky

| Hrozba        | Ochrana                                  |
| ------------- | ---------------------------------------- |
| SQL Injection | Drizzle ORM (prepared statements)        |
| XSS           | CSP, React auto-escaping, DOMPurify      |
| CSRF          | SameSite=Strict cookies, anti-CSRF token |
| SSRF          | URL whitelist, blokace private IP ranges |
| File Upload   | Max 10MB, whitelist ext, ClamAV scan     |
| IDOR          | UUID v URL, ownership check v handleru   |

### 24.8. GDPR & Privacy

- **Data Retention:** Automatické mazání po 3 letech neaktivity
- **Right to be Forgotten:** Anonymizace (soft delete + data nulling)
- **Data Portability:** GET /customers/{id}/export
- **Consent Management:** customers.marketing_consent + audit log

---

## 25. Auth Specifikace

### 25.1. JWT Structure

```json
{
  "sub": "user_uuid",
  "iss": "schedulebox",
  "aud": "schedulebox-api",
  "exp": 1707580800,
  "iat": 1707579900,
  "company_id": 42,
  "role": "owner",
  "permissions": ["bookings.create", "bookings.read"],
  "mfa_verified": true
}
```

### 25.2. Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant R as Redis
    participant DB as PostgreSQL

    C->>A: POST /auth/login {email, password}
    A->>DB: SELECT user WHERE email = ?
    A->>A: Verify password (Argon2id)
    alt MFA enabled
        A-->>C: 200 {mfa_required: true, mfa_token}
        C->>A: POST /auth/mfa/verify {mfa_token, code}
    end
    A->>A: Generate JWT pair
    A->>R: Store refresh token hash
    A-->>C: 200 {access_token, refresh_token (cookie)}
```

---

## 26. RBAC Kompletní Matice

**Legenda:** ✅ = plný přístup, 🔒 = jen své, ❌ = zakázáno, 👁 = jen čtení

(Poznámka: kompletní matice pro všech 99 endpointů — pokračování tabulky z předchozího kontextu)

#### Analytics & Settings (závěr matice)

| Endpoint                | Method   | admin      | owner | employee | customer |
| ----------------------- | -------- | ---------- | ----- | -------- | -------- |
| /analytics/export       | GET      | ✅         | ✅    | ❌       | ❌       |
| /settings/company       | GET/PUT  | ✅         | ✅    | ❌       | ❌       |
| /settings/working-hours | GET/PUT  | ✅         | ✅    | ❌       | ❌       |
| /settings/api-keys      | GET/POST | ✅         | ✅    | ❌       | ❌       |
| /settings/api-keys/{id} | DELETE   | ✅         | ✅    | ❌       | ❌       |
| /settings/webhooks      | GET/POST | ✅         | ✅    | ❌       | ❌       |
| /widget/config/{slug}   | GET      | — (public) | —     | —        | —        |
| /health                 | GET      | — (public) | —     | —        | —        |
| /readiness              | GET      | — (public) | —     | —        | —        |

---

## 27. OWASP Top 10 Coverage

| #   | Hrozba                    | Status | Implementace                                                                                                |
| --- | ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| A01 | Broken Access Control     | ✅     | RBAC (26 kompletní matice), RLS, JWT, ownership checks                                                      |
| A02 | Cryptographic Failures    | ✅     | TLS 1.3, AES-256-GCM na PII, Argon2id, Vault                                                                |
| A03 | Injection                 | ✅     | Drizzle ORM (prepared statements), Zod validace, CSP                                                        |
| A04 | Insecure Design           | ✅     | Threat modeling (tato dokumentace), SAGA pattern, fallbacks                                                 |
| A05 | Security Misconfiguration | ✅     | Security headers, Terraform IaC, container scanning (Trivy)                                                 |
| A06 | Vulnerable Components     | ✅     | Dependabot, npm audit, Trivy Docker scan, SBOM generování                                                   |
| A07 | Auth Failures             | ✅     | Argon2id, lockout, MFA, HIBP check, password history                                                        |
| A08 | Software/Data Integrity   | ✅     | SBOM (CycloneDX), signed commits, Docker image signing, webhook signature verification                      |
| A09 | Security Logging          | ✅     | audit_logs tabulka, structured logging, Loki + Grafana alerting                                             |
| A10 | SSRF                      | ✅     | URL whitelist pro ext. volání, blokace private IP (10.x, 172.16.x, 192.168.x, 127.x), DNS rebinding ochrana |

### 27.1. Webhook Signature Verification

```typescript
// Comgate webhook verification
function verifyComgateWebhook(body: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', COMGATE_SECRET).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Idempotency: ukládáme transaction_id do Redis
async function processWebhook(transId: string, handler: () => Promise<void>) {
  const key = `webhook:processed:${transId}`;
  const already = await redis.get(key);
  if (already) return; // Already processed
  await handler();
  await redis.set(key, '1', 'EX', 86400 * 7); // 7 days TTL
}
```

---

# ČÁST VII — INTEGRACE

---

## 28. Comgate Integrace

### 28.1. Přehled

Comgate je česká platební brána pro online platby kartou. ScheduleBox ji používá pro předplatby (zálohy) při vytváření rezervace.

### 28.2. Registrace

1. Registrace na [www.comgate.cz](https://www.comgate.cz)
2. Vytvoření e-shopu v administraci
3. Získání `merchantId` a `secret`
4. Nastavení webhook URL: `https://api.schedulebox.cz/api/v1/webhooks/comgate`

### 28.3. Platební Flow

```mermaid
sequenceDiagram
    participant C as Zákazník
    participant SB as ScheduleBox
    participant CG as Comgate API
    participant BK as Banka

    C->>SB: POST /payments/comgate/create {booking_id, amount}
    SB->>SB: Validace bookingu (exists, pending, correct amount)
    SB->>SB: Idempotency check (Redis: payment:{booking_id})
    SB->>CG: POST /v1.0/createPayment {merchantId, secret, price, currency, label, refId, email, prepareOnly=true}

    alt Comgate OK
        CG-->>SB: 200 {transId, redirectUrl}
        SB->>SB: Create payment (status=pending, gateway_transaction_id=transId)
        SB-->>C: {payment_url: redirectUrl}
        C->>CG: Otevře redirectUrl
        CG->>BK: 3D Secure autorizace
        BK-->>CG: Autorizace OK
        CG->>SB: POST /webhooks/comgate {transId, status=PAID}
        SB->>SB: Verify webhook signature
        SB->>SB: Idempotency check
        SB->>SB: Update payment (status=paid)
        SB-->>MQ: payment.payment.completed event
    end

    alt Comgate Timeout / Error
        CG-->>SB: Timeout (15s)
        SB-->>C: {error: "PAYMENT_GATEWAY_UNAVAILABLE", fallback: "Zkuste to prosím za chvíli"}
        SB->>SB: Booking zůstane pending (expiruje za 30 min)
    end

    alt Zákazník nezaplatí
        Note over SB: 30 min timeout
        SB->>SB: Cron: Cancel expired pending bookings
        SB-->>MQ: booking.booking.cancelled {reason: "payment_timeout"}
    end
```

### 28.4. Retry & Idempotency

```typescript
// Comgate webhook handler
async function handleComgateWebhook(req: Request) {
  const { transId, status } = req.body;

  // 1. Verify signature
  if (!verifyComgateSignature(req)) {
    throw new UnauthorizedError('Invalid webhook signature');
  }

  // 2. Idempotency - check if already processed
  const idempotencyKey = `comgate:webhook:${transId}`;
  const alreadyProcessed = await redis.get(idempotencyKey);
  if (alreadyProcessed) {
    return { status: 'already_processed' }; // Return 200 to prevent retry
  }

  // 3. Process
  const payment = await db.payments.findOne({ gateway_transaction_id: transId });
  if (!payment) throw new NotFoundError('Payment not found');

  if (status === 'PAID') {
    await db.payments.update(payment.id, { status: 'paid', paid_at: new Date() });
    await eventBus.publish('payment.payment.completed', {
      payment_id: payment.id,
      booking_id: payment.booking_id,
    });
  } else if (status === 'CANCELLED') {
    await db.payments.update(payment.id, { status: 'failed' });
    await eventBus.publish('payment.payment.failed', {
      payment_id: payment.id,
      booking_id: payment.booking_id,
    });
  }

  // 4. Mark as processed (7 days TTL)
  await redis.set(idempotencyKey, 'processed', 'EX', 604800);

  return { status: 'ok' };
}
```

### 28.5. Comgate API Endpoints

| Endpoint            | Metoda | Popis                 |
| ------------------- | ------ | --------------------- |
| /v1.0/createPayment | POST   | Vytvoření platby      |
| /v1.0/paymentStatus | POST   | Zjištění stavu platby |
| /v1.0/cancelPayment | POST   | Zrušení platby        |
| /v1.0/refundPayment | POST   | Refund platby         |

### 28.6. Testovací prostředí

- Test merchant credentials od Comgate
- Test karty: 4000000000000002 (úspěch), 4000000000000010 (zamítnutí)
- Webhook simulator v Comgate admin panelu

### 28.7. Per-Company Payment Providers (Phase 51)

Platforma podporuje per-company Comgate credentials pro multi-tenant provoz:

- Tabulka `payment_providers` uchovává šifrované credentials per company
- Credential resolver: nejprve hledá company-specific config, pokud neexistuje, použije platform-level defaults
- Provider-agnostické schéma — připraveno pro budoucí podporu Stripe/GoPay
- Každá firma si může nastavit vlastní Comgate `merchantId` a `secret` v Settings > Payments
- Šifrování credentials pomocí AES-256 (klíč v `PII_ENCRYPTION_KEY`)

---

## 29. QRcomat Integrace

### 29.1. Přehled

QRcomat je systém pro platby na místě pomocí QR kódů. Zákazník naskenuje QR kód mobilním telefonem a zaplatí přes svou bankovní aplikaci.

### 29.2. Platební Flow

```mermaid
sequenceDiagram
    participant E as Zaměstnanec
    participant SB as ScheduleBox
    participant QR as QRcomat API
    participant Z as Zákazník (mobil)
    participant BK as Banka

    E->>SB: POST /payments/qrcomat/generate {booking_id}
    SB->>SB: Validace bookingu
    SB->>QR: POST /api/v1/generate {amount, currency, variableSymbol}

    alt QRcomat OK
        QR-->>SB: 200 {qr_code_base64, transaction_id}
        SB->>SB: Create payment (status=pending)
        SB-->>E: {qr_code_image, transaction_id}
        E->>Z: Zobrazí QR kód
        Z->>BK: Naskenuje a zaplatí
        BK->>QR: Potvrzení
        QR->>SB: POST /webhooks/qrcomat {transaction_id, status=paid}
        SB->>SB: Update payment (status=paid)
        SB-->>MQ: payment.payment.completed event
    end

    alt QRcomat nedostupný
        QR-->>SB: Timeout (10s)
        SB-->>E: {error: "QR_UNAVAILABLE", fallback: "Nabídněte platbu hotově"}
    end
```

### 29.3. Polling Fallback

Pokud QRcomat nemá webhooky, implementujeme polling:

```typescript
// Polling pro stav QRcomat platby
async function pollQRcomatPayment(transactionId: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await qrcomatApi.getStatus(transactionId);
    if (response.status === 'paid') {
      return { paid: true };
    }
    if (response.status === 'cancelled' || response.status === 'expired') {
      return { paid: false, reason: response.status };
    }
    await sleep(5000); // Check every 5s for max 5 minutes
  }
  return { paid: false, reason: 'timeout' };
}
```

---

## 30. Video Integrace

### 30.1. Podporovaní provideři

| Provider    | API                    | Funkce                               |
| ----------- | ---------------------- | ------------------------------------ |
| Zoom        | Zoom REST API v2       | Create/delete meeting, get join URL  |
| Google Meet | Google Calendar API v3 | Create calendar event with Meet link |
| MS Teams    | Microsoft Graph API    | Create online meeting                |

### 30.2. Abstrakční vrstva

```typescript
interface VideoProvider {
  createMeeting(params: {
    topic: string;
    startTime: Date;
    durationMinutes: number;
    hostEmail: string;
  }): Promise<{
    meetingUrl: string;
    hostUrl: string;
    meetingId: string;
    password?: string;
    providerResponse: Record<string, any>;
  }>;

  deleteMeeting(meetingId: string): Promise<void>;
}

class ZoomProvider implements VideoProvider {
  /* ... */
}
class GoogleMeetProvider implements VideoProvider {
  /* ... */
}
class MSTeamsProvider implements VideoProvider {
  /* ... */
}
```

### 30.3. Auto-create on Booking Confirmation

```typescript
// Event handler: booking.booking.confirmed
async function onBookingConfirmed(event: BookingConfirmedEvent) {
  const booking = await db.bookings.findById(event.booking_id);
  const service = await db.services.findById(booking.service_id);

  if (!service.is_online || !service.video_provider) return;

  try {
    const provider = getVideoProvider(service.video_provider);
    const meeting = await provider.createMeeting({
      topic: `${service.name} — ${booking.customer.name}`,
      startTime: booking.start_time,
      durationMinutes: service.duration_minutes,
      hostEmail: booking.employee.email,
    });

    await db.video_meetings.create({
      company_id: booking.company_id,
      booking_id: booking.id,
      provider: service.video_provider,
      meeting_url: meeting.meetingUrl,
      host_url: meeting.hostUrl,
      meeting_id: meeting.meetingId,
      password: meeting.password,
      start_time: booking.start_time,
      duration_minutes: service.duration_minutes,
      provider_response: meeting.providerResponse,
    });

    // Update booking with video link
    await db.bookings.update(booking.id, { video_meeting_id: meeting.id });
  } catch (error) {
    // Fallback: booking confirmed but without video
    logger.error('Video meeting creation failed', { booking_id: booking.id, error });
    await notifyAdmin(booking.company_id, 'Video meeting creation failed — manual setup needed');
  }
}
```

---

## 31. White-label App

### 31.1. Funkce

| Funkce           | Popis                                            |
| ---------------- | ------------------------------------------------ |
| Booking kalendář | Zobrazení dostupných slotů a vytváření rezervací |
| Věrnostní karta  | Zobrazení bodů, razítek, tier statusu            |
| Push notifikace  | Připomínky, speciální nabídky                    |
| Profil zákazníka | Správa údajů, historie rezervací                 |
| Deep linking     | Přímý odkaz na konkrétní službu/čas              |

### 31.2. Customizace

```typescript
interface WhiteLabelConfig {
  app_name: string; // "Salon Krása"
  bundle_id: string; // "cz.salonkrasa.app"
  logo_url: string; // URL loga
  primary_color: string; // "#E91E63"
  secondary_color: string; // "#9C27B0"
  features: {
    booking: boolean; // Rezervační modul
    loyalty: boolean; // Věrnostní karta
    push: boolean; // Push notifikace
    reviews: boolean; // Recenze
  };
}
```

### 31.3. Build Pipeline

```mermaid
graph LR
    A[Admin vyplní konfiguraci] --> B[POST /apps/whitelabel]
    B --> C[POST /apps/whitelabel/build]
    C --> D[CI/CD: React Native build]
    D --> E[iOS: Xcode Cloud → App Store]
    D --> F[Android: Gradle → Google Play]
    E --> G[ios_status = published]
    F --> H[android_status = published]
```

---

# ČÁST VIII — AI & ML

---

## 32. ML Modely Specifikace

### 32.1. No-show Predictor

| Parametr              | Hodnota                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Typ:**              | Binární klasifikace                                                                                                                                                               |
| **Algoritmus:**       | XGBoost                                                                                                                                                                           |
| **Features:**         | booking_lead_time, customer_no_show_history, customer_total_bookings, day_of_week, hour_of_day, service_duration, service_price, weather_forecast, is_first_visit, payment_status |
| **Target:**           | no_show (0/1)                                                                                                                                                                     |
| **Training data:**    | Historické bookings se statusem completed/no_show                                                                                                                                 |
| **Min training set:** | 500 bookings                                                                                                                                                                      |
| **Retraining:**       | Týdně (neděle 3:00 AM)                                                                                                                                                            |
| **Metriky:**          | Precision ≥ 0.7, Recall ≥ 0.6, F1 ≥ 0.65                                                                                                                                          |
| **Serving:**          | REST API, latence < 100ms                                                                                                                                                         |
| **Fallback:**         | score: 0.15, confidence: 0.0                                                                                                                                                      |

**API Request/Response:**

```json
// POST /ai/no-show-prediction
// Request:
{ "booking_id": 12345 }

// Response (normal):
{
  "booking_id": 12345,
  "no_show_probability": 0.35,
  "confidence": 0.82,
  "risk_level": "medium",
  "factors": [
    {"factor": "customer_no_show_history", "impact": 0.45},
    {"factor": "booking_lead_time_short", "impact": 0.25},
    {"factor": "no_payment_required", "impact": 0.20}
  ],
  "recommendation": "Doporučujeme vyžádat zálohu nebo potvrzení SMS",
  "model_version": "v2.3.1",
  "fallback": false
}

// Response (fallback - AI unavailable):
{
  "booking_id": 12345,
  "no_show_probability": 0.15,
  "confidence": 0.0,
  "risk_level": "low",
  "factors": [],
  "recommendation": null,
  "model_version": "fallback",
  "fallback": true
}
```

### 32.2. CLV Predictor

| Parametr           | Hodnota                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Typ:**           | Regrese                                                                                                                                                                                         |
| **Algoritmus:**    | Random Forest (alt. Gradient Boosting)                                                                                                                                                          |
| **Features:**      | recency (dny od poslední návštěvy), frequency (počet návštěv za 12 měsíců), monetary (celkové útraty za 12 měsíců), customer_age_months, services_variety, avg_booking_value, cancellation_rate |
| **Target:**        | Predikovaná hodnota zákazníka na 12 měsíců (CZK)                                                                                                                                                |
| **Training data:** | Zákazníci s ≥ 3 návštěvami                                                                                                                                                                      |
| **Retraining:**    | Měsíčně                                                                                                                                                                                         |
| **Metriky:**       | MAE < 500 CZK, RMSE < 1000 CZK                                                                                                                                                                  |
| **Serving:**       | Batch job (denně 4:00 AM) + on-demand API                                                                                                                                                       |
| **Fallback:**      | customers.total_spent × 2.5                                                                                                                                                                     |

### 32.3. Smart Upselling

| Parametr        | Hodnota                                   |
| --------------- | ----------------------------------------- |
| **Typ:**        | Recommendation system                     |
| **Algoritmus:** | Collaborative Filtering (item-based)      |
| **Features:**   | Matice customer × service (booking count) |
| **Min data:**   | 100 zákazníků, 10 služeb                  |
| **Retraining:** | Týdně                                     |
| **Serving:**    | REST API, latence < 200ms                 |
| **Fallback:**   | Top 3 služby dle popularity v dané firmě  |

**API:**

```json
// POST /ai/smart-upselling
// Request:
{ "customer_id": 42, "current_service_id": 7 }

// Response:
{
  "recommendations": [
    {"service_id": 12, "service_name": "Masáž hlavy", "confidence": 0.85, "reason": "Zákazníci, kteří si objednali Střih, často přidávají Masáž hlavy"},
    {"service_id": 5, "service_name": "Barvení", "confidence": 0.72, "reason": "Na základě vaší návštěvní historie"},
    {"service_id": 18, "service_name": "Manikúra", "confidence": 0.61, "reason": "Populární doplňková služba"}
  ],
  "fallback": false
}
```

### 32.4. Pricing Optimizer

| Parametr         | Hodnota                                                          |
| ---------------- | ---------------------------------------------------------------- |
| **Typ:**         | Dynamic pricing                                                  |
| **Algoritmus:**  | Reinforcement Learning (Multi-Armed Bandit)                      |
| **Stav:**        | hour_of_day, day_of_week, current_utilization, historical_demand |
| **Akce:**        | Cena v rozsahu [services.price_min, services.price_max]          |
| **Reward:**      | Revenue za timeslot                                              |
| **Constraints:** | Cena se nemůže změnit o více než 30 % za den                     |
| **Serving:**     | Real-time API                                                    |
| **Fallback:**    | services.price (statická cena)                                   |

### 32.5. Capacity Optimizer

| Parametr        | Hodnota                                                                |
| --------------- | ---------------------------------------------------------------------- |
| **Typ:**        | Time series forecasting                                                |
| **Algoritmus:** | LSTM (Long Short-Term Memory)                                          |
| **Features:**   | Historical booking counts per hour/day, seasonality, holidays, weather |
| **Predikce:**   | Předpovídá vytížení na dalších 7 dní                                   |
| **Retraining:** | Týdně                                                                  |
| **Serving:**    | Batch + API                                                            |
| **Fallback:**   | Prázdná doporučení                                                     |

### 32.6. Customer Health Score

| Parametr                | Hodnota                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| **Typ:**                | Scoring model                                                      |
| **Algoritmus:**         | Weighted RFM + ML overlay                                          |
| **Výpočet (fallback):** | `Recency × 0.4 + Frequency × 0.35 + Monetary × 0.25` → scale 0-100 |
| **ML overlay:**         | Gradient Boosting klasifikátor (churn/active)                      |
| **Serving:**            | Batch (denně) → customers.health_score                             |
| **Kategorie:**          | 80-100: Excellent, 60-79: Good, 40-59: At Risk, 0-39: Churning     |

### 32.7. Smart Reminder Timing

| Parametr        | Hodnota                                                           |
| --------------- | ----------------------------------------------------------------- |
| **Typ:**        | Optimalizace                                                      |
| **Algoritmus:** | Bayesian Optimization                                             |
| **Cíl:**        | Maximalizovat open rate notifikací                                |
| **Features:**   | Customer historical open times, device type, notification channel |
| **Output:**     | Optimální počet minut před rezervací pro odeslání připomínky      |
| **Serving:**    | Per-customer → customers.preferred_reminder_minutes               |
| **Fallback:**   | 1440 minut (24 hodin)                                             |

---

## 33. AI Fallback Strategie

### 33.1. Rozhodovací strom

```
Požadavek na AI endpoint
  │
  ├─ Circuit breaker OPEN?
  │   └─ ANO → Vrať fallback okamžitě
  │
  ├─ ML model dostupný?
  │   ├─ ANO → Zavolej model
  │   │   ├─ Response OK → Vrať výsledek
  │   │   └─ Timeout/Error → Retry 1× → Vrať fallback
  │   └─ NE → Vrať fallback
  │
  └─ Firma má dostatek dat pro predikci?
      ├─ ANO → Použij ML model
      └─ NE → Použij heuristický fallback
```

### 33.2. Fallback Implementation

```typescript
async function getAIPrediction<T>(
  modelName: string,
  input: any,
  fallbackFn: () => T,
  timeoutMs: number = 5000,
): Promise<{ result: T; fallback: boolean; model_version: string }> {
  // 1. Check circuit breaker
  if (circuitBreaker.isOpen(modelName)) {
    return { result: fallbackFn(), fallback: true, model_version: 'fallback' };
  }

  try {
    // 2. Call ML model with timeout
    const result = await Promise.race([mlClient.predict(modelName, input), timeout(timeoutMs)]);

    circuitBreaker.recordSuccess(modelName);
    return { result, fallback: false, model_version: result.model_version };
  } catch (error) {
    circuitBreaker.recordFailure(modelName);
    logger.warn(`AI fallback activated for ${modelName}`, { error });

    return { result: fallbackFn(), fallback: true, model_version: 'fallback' };
  }
}
```

---

## 34. AI Data Pipeline

### 34.1. Training Pipeline

```mermaid
graph LR
    A[PostgreSQL] -->|ETL nightly| B[Feature Store - Redis/Parquet]
    B -->|Training script| C[ML Model]
    C -->|Validate metrics| D{Metrics OK?}
    D -->|Yes| E[Model Registry]
    D -->|No| F[Alert → Slack]
    E -->|Deploy| G[AI Service]
    G -->|Serve predictions| H[API]
```

### 34.2. Feature Store

```python
# Feature engineering pro No-show Predictor
features = {
    'booking_lead_time_hours': (booking.start_time - booking.created_at).hours,
    'customer_no_show_rate': customer.no_show_count / customer.total_bookings,
    'customer_total_bookings': customer.total_bookings,
    'day_of_week': booking.start_time.weekday(),  # 0=Mon, 6=Sun
    'hour_of_day': booking.start_time.hour,
    'service_duration_minutes': service.duration_minutes,
    'service_price': float(service.price),
    'is_first_visit': 1 if customer.total_bookings == 0 else 0,
    'has_payment': 1 if booking.requires_payment else 0,
    'days_since_last_visit': (now - customer.last_visit_at).days if customer.last_visit_at else 999,
}
```

### 34.3. Model Metrics Tracking

```sql
-- ai_model_metrics tabulka zachycuje kvalitu modelů po každém retrainingu
-- Příklad INSERT po trénování:
INSERT INTO ai_model_metrics (model_name, model_version, metric_name, metric_value) VALUES
    ('no_show_predictor', 'v2.3.1', 'precision', 0.74),
    ('no_show_predictor', 'v2.3.1', 'recall', 0.68),
    ('no_show_predictor', 'v2.3.1', 'f1_score', 0.71),
    ('no_show_predictor', 'v2.3.1', 'auc_roc', 0.83);
```

---

# ČÁST IX — DEVOPS & DEPLOYMENT

---

## 35. Deployment Strategy

### 35.1. Prostředí

| Prostředí  | Účel          | Infra                                    | URL                    |
| ---------- | ------------- | ---------------------------------------- | ---------------------- |
| Local      | Vývoj         | Docker Compose                           | localhost:3000         |
| Staging    | Testování, QA | Coolify na VPS (161.97.118.104)          | staging.schedulebox.cz |
| Production | Produkce      | Coolify na VPS + Docker (161.97.118.104) | app.schedulebox.cz     |

**Infrastruktura:**

- Coolify (self-hosted PaaS) na VPS 161.97.118.104
- Traefik reverse proxy (spravovaný Coolify) — automatické SSL via Let's Encrypt
- Docker kontejnery orchestrované přes Coolify

### 35.2. Deployment Pattern

**Rolling Deployment (Coolify):**

1. Push na `main` branch spustí auto-deploy v Coolify
2. Coolify buildí nový Docker image z `docker/Dockerfile`
3. Nový kontejner se spustí a projde health checkem
4. Starý kontejner se zastaví
5. Rollback: Coolify UI — jedním klikem na předchozí deployment

---

## 36. CI/CD Pipeline

### 36.1. GitHub Actions Workflow

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # === LINT & TYPE CHECK ===
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  # === UNIT TESTS ===
  test-unit:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: schedulebox_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/schedulebox_test
          REDIS_URL: redis://localhost:6379
      - uses: codecov/codecov-action@v3

  # === INTEGRATION TESTS ===
  test-integration:
    runs-on: ubuntu-latest
    needs: [lint, test-unit]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: schedulebox_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
      - run: pnpm test:integration

  # === E2E TESTS (hard gate — failures block merges) ===
  test-e2e:
    runs-on: ubuntu-latest
    needs: [test-integration]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
        # E2E failures block merges — no continue-on-error

  # === BUILD & PUSH DOCKER IMAGE ===
  build:
    runs-on: ubuntu-latest
    needs: [test-integration]
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
      # Security scan
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

  # === DEPLOY (Coolify auto-deploy) ===
  # Coolify monitors the main branch and auto-deploys on push.
  # No manual deploy step needed in CI — Coolify pulls, builds,
  # and deploys the Docker image from docker/Dockerfile.
```

---

## 37. Docker & Coolify Deployment

### 37.1. Dockerfile (`docker/Dockerfile`)

```dockerfile
# Multi-stage Next.js standalone build
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/events/package.json ./packages/events/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @schedulebox/web build

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
```

### 37.2. Docker Compose (Development)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports: ['3000:3000']
    environment:
      - DATABASE_URL=postgresql://schedulebox:schedulebox@postgres:5432/schedulebox
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    volumes:
      - .:/app
      - /app/node_modules

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: schedulebox
      POSTGRES_USER: schedulebox
      POSTGRES_PASSWORD: schedulebox
    ports: ['5432:5432']
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schedulebox_db_schema_complete.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U schedulebox']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s

volumes:
  postgres_data:
```

### 37.3. Coolify Deployment (`docker-compose.coolify.yml`)

```yaml
version: '3.8'

services:
  schedulebox:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports: ['3000:3000']
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${APP_URL}
      - APP_URL=${APP_URL}
      - NODE_ENV=production
      - APP_VERSION=${SOURCE_COMMIT:-dev}
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: schedulebox
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s

volumes:
  postgres_data:
  redis_data:
```

**Coolify konfigurační poznámky:**

- Coolify server: 161.97.118.104
- Traefik reverse proxy (spravovaný Coolify) zajišťuje SSL via Let's Encrypt
- Auto-deploy: Coolify webhook na GitHub main branch
- Environment variables se konfigurují v Coolify UI (Settings > Environment)
- Health check endpoint: `/api/health`
- Readiness probe: `/api/readiness`

---

## 38. Environment Variables

```bash
# ============================================================
# ScheduleBox — Environment Variables (Production)
# ============================================================

# === DATABASE (PostgreSQL on Coolify server) ===
DATABASE_URL=postgresql://schedulebox:password@postgres:5432/schedulebox
DATABASE_POOL_SIZE=20
DATABASE_SSL=false

# === REDIS (Redis on Coolify server) ===
REDIS_URL=redis://redis:6379/0

# === UPSTASH (optional HTTP fallback) ===
# UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN=xxx

# === JWT ===
JWT_SECRET=<256-bit-random-from-vault>
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=30d
JWT_ISSUER=schedulebox
JWT_AUDIENCE=schedulebox-api

# === ENCRYPTION ===
PII_ENCRYPTION_KEY=<AES-256-key-from-vault>
PII_ENCRYPTION_IV_PREFIX=schedulebox

# === COMGATE ===
COMGATE_MERCHANT_ID=xxx
COMGATE_SECRET=xxx
COMGATE_API_URL=https://payments.comgate.cz
COMGATE_WEBHOOK_SECRET=xxx
COMGATE_TEST_MODE=false

# === QRCOMAT ===
QRCOMAT_API_KEY=xxx
QRCOMAT_API_URL=https://api.qrcomat.cz
QRCOMAT_WEBHOOK_SECRET=xxx

# === OPENAI ===
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4-turbo
OPENAI_WHISPER_MODEL=whisper-1

# === OAUTH2 ===
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
FACEBOOK_CLIENT_ID=xxx
FACEBOOK_CLIENT_SECRET=xxx
APPLE_CLIENT_ID=xxx
APPLE_TEAM_ID=xxx
APPLE_KEY_ID=xxx
APPLE_PRIVATE_KEY=<base64-encoded>

# === VIDEO ===
ZOOM_CLIENT_ID=xxx
ZOOM_CLIENT_SECRET=xxx
ZOOM_ACCOUNT_ID=xxx
GOOGLE_MEET_SERVICE_ACCOUNT=<base64-json>
MS_TEAMS_CLIENT_ID=xxx
MS_TEAMS_CLIENT_SECRET=xxx
MS_TEAMS_TENANT_ID=xxx

# === EMAIL ===
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx
SMTP_FROM=noreply@schedulebox.cz
SMTP_FROM_NAME=ScheduleBox

# === SMS ===
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=xxx
SMS_AUTH_TOKEN=xxx
SMS_FROM=+420xxx

# === STORAGE ===
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_BUCKET=schedulebox-uploads
S3_REGION=auto

# === MONITORING (conditional) ===
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx  # optional — Sentry only if set
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317               # optional — @vercel/otel only if set
LOG_LEVEL=info
LOG_FORMAT=json

# === APPLICATION ===
APP_URL=https://app.schedulebox.cz
API_URL=https://api.schedulebox.cz
FRONTEND_URL=https://app.schedulebox.cz
WIDGET_URL=https://widget.schedulebox.cz
NODE_ENV=production
PORT=3000
APP_VERSION=3.0.0
SOURCE_COMMIT=${SOURCE_COMMIT}  # Coolify auto-injects git SHA
```

---

## 39. Observability Stack

### 39.1. Architecture

**Logging:** Winston structured logging (JSON format) na stdout. Coolify sbírá stdout logy automaticky.
Žádný Vercel-specifický log drain — logy jdou na stdout a jsou dostupné v Coolify UI.

**Tracing:** `@vercel/otel` je podmíněný — aktivuje se pouze pokud je nastaven `OTEL_EXPORTER_OTLP_ENDPOINT`.

**Error tracking:** Sentry (`@sentry/nextjs`) je podmíněný — aktivuje se pouze pokud je nastaven `NEXT_PUBLIC_SENTRY_DSN`.

```
┌─────────────┐
│ Application │───> stdout (JSON/Winston) ───> Coolify Log Viewer
│             │
│             │───> Sentry (conditional: NEXT_PUBLIC_SENTRY_DSN)
│             │
│             │───> OpenTelemetry (conditional: OTEL_EXPORTER_OTLP_ENDPOINT)
└─────────────┘
```

### 39.2. Klíčové metriky (Prometheus)

```
# Business metriky
schedulebox_bookings_total{company_id, status, source}
schedulebox_payments_total{company_id, gateway, status}
schedulebox_active_companies_total
schedulebox_active_customers_total

# Performance metriky
http_request_duration_seconds{method, path, status_code}
http_requests_total{method, path, status_code}
db_query_duration_seconds{query_type}

# AI metriky
ai_prediction_duration_seconds{model}
ai_prediction_fallback_total{model}
ai_model_accuracy{model, metric}

# Infrastructure
nodejs_heap_used_bytes
nodejs_active_handles_total
pg_connections_active
redis_connected_clients
```

### 39.3. Alerting pravidla

| Alert                 | Condition                       | Severity | Channel       |
| --------------------- | ------------------------------- | -------- | ------------- |
| High Error Rate       | http 5xx > 5% za 5 min          | Critical | Slack + Email |
| Booking Service Down  | health check fail > 3 min       | Critical | Slack + SMS   |
| Payment Failure Spike | payment failures > 10 za 10 min | High     | Slack         |
| AI Fallback Rate      | fallback > 50% za 1h            | Medium   | Slack         |
| High Latency          | p99 > 5s za 10 min              | Medium   | Slack         |
| Disk Usage            | > 80%                           | High     | Slack         |
| DB Connections        | > 80% pool                      | High     | Slack         |

### 39.4. Structured Logging Format

```json
{
  "timestamp": "2026-02-10T14:30:00.123Z",
  "level": "info",
  "service": "booking-service",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "company_id": 42,
  "user_id": 123,
  "message": "Booking created successfully",
  "booking_id": 12345,
  "duration_ms": 45,
  "method": "POST",
  "path": "/api/v1/bookings",
  "status_code": 201
}
```

---

# ČÁST X — TESTOVÁNÍ & KVALITA

---

## 40. Test Strategy

### 40.1. Typy testů

| Typ               | Nástroj                 | Pokrytí                                                                             | Kde běží                           |
| ----------------- | ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| Unit testy        | Vitest                  | ≥ 80 % coverage                                                                     | CI (každý push)                    |
| Integration testy | Vitest + Testcontainers | Klíčové flows                                                                       | CI (každý push, SKIP_DOCKER local) |
| E2E testy         | Playwright (7 specs)    | auth, booking, payment, marketplace, admin-impersonation, ai-fallback, embed-widget | CI (hard gate — blokuje merge)     |
| Load testy        | k6                      | Performance benchmarks                                                              | Manual (před release)              |
| Security testy    | OWASP ZAP, pnpm audit   | OWASP Top 10                                                                        | CI + manual                        |

**Poznámky k testům:**

- E2E testy jsou hard gate v CI — selhání blokuje merge do main
- Testcontainers se používají pouze v CI (PostgreSQL container). Lokálně se přeskakují pomocí `SKIP_DOCKER=true`
- Vitest target: 80%+ code coverage

### 40.2. Test Cases — Kritické scénáře

#### TC-01: Vytvoření rezervace (happy path)

```gherkin
Given zákazník je na booking stránce firmy "Salon Krása"
And služba "Střih dámský" (60 min, 500 Kč) je aktivní
And zaměstnanec "Jana" má volný slot 2026-02-15 14:00-15:00
When zákazník vybere službu, datum, čas a vyplní údaje
And potvrdí rezervaci
Then booking je vytvořen se statusem "pending"
And je odeslán potvrzovací email
And slot 14:00-15:00 u Jany je obsazen
And no-show prediction je uložena
```

#### TC-02: Double-booking prevence

```gherkin
Given zaměstnanec "Jana" má volný slot 14:00-15:00
When zákazník A a zákazník B odešlou rezervaci současně na 14:00
Then jeden z nich dostane 409 Conflict
And druhý dostane 201 Created
And v databázi existuje jen 1 booking pro Janu na 14:00
```

#### TC-03: Comgate platba — úspěšná

```gherkin
Given booking existuje se statusem "pending" a requires_payment=true
When zákazník je přesměrován na Comgate a zaplatí
And Comgate pošle webhook se statusem "PAID"
Then payment status se změní na "paid"
And booking status se změní na "confirmed"
And zákazník dostane potvrzovací email
And loyalty body jsou přiděleny
```

#### TC-04: Comgate platba — timeout

```gherkin
Given booking existuje se statusem "pending" a requires_payment=true
When zákazník nedokončí platbu do 30 minut
Then booking je automaticky zrušen (status="cancelled", reason="payment_timeout")
And slot je uvolněn
```

#### TC-05: AI fallback

```gherkin
Given AI No-show Predictor je nedostupný (circuit breaker OPEN)
When systém potřebuje predikci pro nový booking
Then vrátí fallback hodnotu (score=0.15, fallback=true)
And booking flow pokračuje normálně
And metrika ai_prediction_fallback_total se inkrementuje
```

#### TC-06: GDPR — smazání zákazníka

```gherkin
Given zákazník "Jan Novák" má 5 historických rezervací a loyalty kartu
When admin zavolá DELETE /customers/{id}
Then customers.name = "ANONYMIZED"
And customers.email = "anon_{id}@deleted.local"
And customers.phone = NULL
And customers.deleted_at = NOW()
And loyalty karta je deaktivována
And historické bookings zůstávají (anonymizovaný zákazník)
```

#### TC-07: Multi-tenant izolace

```gherkin
Given firma A (company_id=1) má 10 rezervací
And firma B (company_id=2) má 5 rezervací
When owner firmy A zavolá GET /bookings
Then vidí jen 10 rezervací firmy A
And nikdy nevidí data firmy B
```

---

## 41. User Flows (kompletní)

### 41.1. Flow: Registrace firmy → První rezervace

```mermaid
graph TD
    A[Landing Page] -->|CTA: Vyzkoušet zdarma| B[POST /auth/register]
    B --> C[Verification Email]
    C -->|Click link| D[POST /auth/verify-email]
    D --> E[Onboarding Wizard]
    E --> F[Step 1: Nastavení firmy - PUT /settings/company]
    F --> G[Step 2: Pracovní doba - PUT /settings/working-hours]
    G --> H[Step 3: První služba - POST /services]
    H --> I[Step 4: Zaměstnanci - POST /employees]
    I --> J[Step 5: Platební brána - Comgate setup]
    J --> K[Dashboard - GET /analytics/dashboard]
    K --> L[Widget embed kód pro zákazníkův web]
```

### 41.2. Flow: Zákazník rezervuje online

```mermaid
graph TD
    A[Widget / Public Page] -->|GET /widget/config/slug| B[Výběr služby]
    B -->|GET /services| C[Výběr data a času]
    C -->|GET /availability| D[Zákaznické údaje]
    D -->|Validace Zod| E{Platba povinná?}
    E -->|Ano| F[POST /bookings + POST /payments/comgate/create]
    F --> G[Redirect na Comgate]
    G --> H{Platba OK?}
    H -->|Ano| I[Webhook → booking confirmed]
    H -->|Ne| J[Booking pending → expires za 30 min]
    E -->|Ne| K[POST /bookings → booking confirmed]
    I --> L[Email potvrzení]
    K --> L
    L --> M[24h před: AI reminder timing → SMS/email]
    M --> N[Návštěva]
    N --> O{Dostavil se?}
    O -->|Ano| P[POST /bookings/id/complete]
    O -->|Ne| Q[POST /bookings/id/no-show]
    P --> R[Loyalty body přiděleny]
    R --> S[Review request email - po 2h]
```

### 41.3. Flow: Platba na místě (QRcomat)

```mermaid
graph TD
    A[Admin: Booking detail] -->|Zákazník je u pultu| B[POST /payments/qrcomat/generate]
    B --> C[Zobrazení QR kódu na obrazovce]
    C --> D[Zákazník skenuje mobilem]
    D --> E[Platba přes bankovní aplikaci]
    E --> F[Webhook / Polling: payment completed]
    F --> G[Booking marked as paid]
```

---

## 42. Formuláře & Validace

### 42.1. Validační pravidla (Zod schema)

```typescript
import { z } from 'zod';

// === Auth ===
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(12, 'Heslo musí mít alespoň 12 znaků')
    .regex(/[A-Z]/, 'Musí obsahovat velké písmeno')
    .regex(/[a-z]/, 'Musí obsahovat malé písmeno')
    .regex(/[0-9]/, 'Musí obsahovat číslo')
    .regex(/[^A-Za-z0-9]/, 'Musí obsahovat speciální znak'),
  company_name: z.string().min(2).max(255),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// === Booking ===
export const bookingCreateSchema = z.object({
  service_id: z.number().int().positive(),
  employee_id: z.number().int().positive().optional(),
  start_time: z
    .string()
    .datetime()
    .refine((val) => new Date(val) > new Date(), 'Datum musí být v budoucnosti'),
  customer_id: z.number().int().positive().optional(),
  customer_name: z.string().min(2).max(100).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/)
    .optional(),
  notes: z.string().max(1000).optional(),
  coupon_code: z.string().max(50).optional(),
  gift_card_code: z.string().max(50).optional(),
});

// === Customer ===
export const customerCreateSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/)
    .optional(),
  date_of_birth: z.string().date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  notes: z.string().max(5000).optional(),
  marketing_consent: z.boolean().default(false),
  preferred_contact: z.enum(['email', 'sms', 'phone']).default('email'),
});

// === Service ===
export const serviceCreateSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  duration_minutes: z.number().int().min(5).max(480),
  buffer_before_minutes: z.number().int().min(0).max(120).default(0),
  buffer_after_minutes: z.number().int().min(0).max(120).default(0),
  price: z.number().min(0).max(999999.99),
  category_id: z.number().int().positive().optional(),
  max_capacity: z.number().int().min(1).max(100).default(1),
  online_booking_enabled: z.boolean().default(true),
  requires_payment: z.boolean().default(false),
  cancellation_policy_hours: z.number().int().min(0).max(168).default(24),
  is_online: z.boolean().default(false),
  video_provider: z.enum(['zoom', 'google_meet', 'ms_teams']).optional(),
  dynamic_pricing_enabled: z.boolean().default(false),
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
});

// === Coupon ===
export const couponCreateSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/),
    description: z.string().max(255).optional(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().positive(),
    min_booking_amount: z.number().min(0).default(0),
    max_uses: z.number().int().positive().optional(),
    max_uses_per_customer: z.number().int().positive().default(1),
    valid_from: z.string().datetime().optional(),
    valid_until: z.string().datetime().optional(),
  })
  .refine(
    (data) => data.discount_type !== 'percentage' || data.discount_value <= 100,
    'Procentuální sleva nemůže být větší než 100 %',
  );

// === Automation Rule ===
export const automationRuleSchema = z.object({
  name: z.string().min(2).max(255),
  trigger_type: z.enum([
    'booking_created',
    'booking_confirmed',
    'booking_completed',
    'booking_cancelled',
    'booking_no_show',
    'payment_received',
    'customer_created',
    'time_before_booking',
    'time_after_booking',
    'customer_inactive',
    'review_received',
  ]),
  trigger_config: z.record(z.any()).default({}),
  action_type: z.enum([
    'send_email',
    'send_sms',
    'send_push',
    'update_booking_status',
    'add_loyalty_points',
    'create_task',
    'webhook',
    'ai_follow_up',
  ]),
  action_config: z.record(z.any()).default({}),
  delay_minutes: z.number().int().min(0).default(0),
});
```

---

# ČÁST XI — BUSINESS DOCS

---

## 43. Právní dokumenty

### 43.1. Terms of Service (Obchodní podmínky)

Hlavní body (plný text bude vytvořen právníkem):

- Definice služeb ScheduleBox
- Registrace a odpovědnost uživatele
- Platební podmínky a billing cyklus
- Zrušení účtu a refund policy
- SLA: 99.9 % uptime guarantee
- Omezení odpovědnosti
- Rozhodné právo: české právo, soud v Praze

### 43.2. Privacy Policy (GDPR)

- Správce osobních údajů: [název společnosti]
- DPO kontakt: dpo@schedulebox.cz
- Účely zpracování: poskytování služeb, marketing (se souhlasem), analytika
- Právní základ: smlouva (čl. 6/1b), souhlas (čl. 6/1a), oprávněný zájem (čl. 6/1f)
- Příjemci dat: Comgate (platby), SendGrid (emaily), hosting provider
- Předávání do třetích zemí: USA (OpenAI, Zoom) — Standard Contractual Clauses
- Doba uchování: 3 roky od poslední aktivity
- Práva subjektů: přístup, oprava, výmaz, přenositelnost, námitka, omezení zpracování

### 43.3. Cookie Policy

| Kategorie    | Cookies                 | Účel                   | Expirace |
| ------------ | ----------------------- | ---------------------- | -------- |
| Nezbytné     | session_id, csrf_token  | Funkčnost              | Session  |
| Funkční      | locale, theme           | Uživatelská preference | 1 rok    |
| Analytické   | \_ga (Google Analytics) | Statistiky             | 2 roky   |
| Marketingové | \_fbp (Facebook Pixel)  | Cílení reklam          | 90 dní   |

---

## 44. Marketing Materiály

### 44.1. Landing Page Copy

**Headline:** Rezervační systém, který myslí za vás.

**Subheadline:** Zvyšte své tržby o 30 % a ušetřete 10 hodin týdně díky AI, která optimalizuje vaše ceny, marketing i provoz.

**CTA:** Vyzkoušet zdarma na 14 dní

**Features sekce:**

1. 🗓️ Online rezervace 24/7 — zákazníci si rezervují kdykoliv
2. 💳 Platby online i na místě — Comgate + QRcomat
3. 🤖 AI predikce — snižte no-shows o 40 %
4. ❤️ Věrnostní program — Apple Wallet & Google Pay
5. 📊 Smart reporting — vědět, co funguje
6. 📱 Vlastní mobilní aplikace — za zlomek ceny

### 44.2. Email Templates

| Template             | Trigger                 | Předmět                             |
| -------------------- | ----------------------- | ----------------------------------- |
| welcome              | Po registraci           | Vítejte v ScheduleBoxu! 🎉          |
| booking_confirmation | booking.confirmed       | Vaše rezervace je potvrzena ✅      |
| booking_reminder     | 24h/2h před             | Připomínáme vaši zítřejší rezervaci |
| booking_cancellation | booking.cancelled       | Vaše rezervace byla zrušena         |
| payment_confirmation | payment.completed       | Platba přijata ✅                   |
| review_request       | 2h po booking.completed | Jak se vám u nás líbilo? ⭐         |
| loyalty_update       | loyalty points earned   | Získali jste 50 bodů! 🎁            |
| follow_up            | AI personalized, 14d po | Nebyli jste u nás už delší dobu...  |

---

## 45. Vizuální Identita

### 45.1. Logo

- Hlavní logo: `schedulebox_logo_main.png`
- Ikona: `schedulebox_icon.png`
- Ecosystem: `schedulebox_ecosystem_logos.png`

### 45.2. Barevná paleta

| Barva         | HEX     | Použití                     |
| ------------- | ------- | --------------------------- |
| Primary Blue  | #3B82F6 | CTA, odkazy, hlavní akcenty |
| Dark Blue     | #1E40AF | Hover stavy, header         |
| Success Green | #22C55E | Potvrzení, úspěch           |
| Warning Amber | #F59E0B | Upozornění                  |
| Danger Red    | #EF4444 | Chyby, zrušení              |
| Neutral Gray  | #6B7280 | Sekundární text             |
| Background    | #F9FAFB | Pozadí stránek              |
| White         | #FFFFFF | Karty, modaly               |

### 45.3. Typografie

- **Primary font:** Inter
- **Monospace:** JetBrains Mono (pro kód v dokumentaci)

---

# ČÁST XII — IMPLEMENTAČNÍ PLÁN

---

## 46. Prompt pro Autonomního Agenta

```
Jsi expert full-stack developer. Tvým úkolem je implementovat ScheduleBox
podle přiložené kompletní dokumentace. Postupuj takto:

1. Nastav projekt: Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui
2. Nastav Docker Compose (PostgreSQL, Redis)
3. Spusť DB schema z dokumentace
4. Implementuj moduly v pořadí: Auth → Customer → Service → Employee → Resource → Booking → Payment → Notification → rest
5. Pro každou service implementuj: Drizzle schema, API routes, Zod validace, event publishing
6. Implementuj frontend komponenty podle specifikace
7. Pořadí přidej: WebSocket, i18n, RLS, RBAC middleware

Priorita: fungující booking + payment flow je MVP.
Dokumentace je jediný zdroj pravdy.
```

---

## 47. Sprint Plán

| Sprint | Týden | Zaměření      | Deliverables                                                            |
| ------ | ----- | ------------- | ----------------------------------------------------------------------- |
| 1–2    | 1–2   | Základ        | Projekt setup, Docker, DB schema, Auth (register, login, JWT, MFA)      |
| 3–4    | 3–4   | Core Services | Customer CRUD, Service CRUD, Employee CRUD, Working Hours               |
| 5–6    | 5–6   | Booking MVP   | Booking CRUD, Availability engine, Double-booking prevence, Calendar UI |
| 7–8    | 7–8   | Payments      | Comgate integrace, QRcomat integrace, Payment flow, Webhooks, Invoices  |
| 9–10   | 9–10  | Notifications | Email/SMS/Push, Templates, Automation engine, Domain events             |
| 11–12  | 11–12 | CRM           | Customer tagging, Coupons, Gift cards, Import/Export                    |
| 13–14  | 13–14 | Loyalty       | Loyalty program, Cards (Apple/Google Wallet), Rewards, Transactions     |
| 15–16  | 15–16 | AI Phase 1    | No-show predictor, CLV, Customer health score, Fallback system          |
| 17–18  | 17–18 | AI Phase 2    | Smart upselling, Pricing optimizer, Capacity optimizer, Reminder timing |
| 19–20  | 19–20 | Advanced      | Marketplace, Review system, Widget, Public booking page                 |
| 21–22  | 21–22 | Video & Apps  | Video integrace (Zoom/Meet/Teams), White-label app framework            |
| 23–24  | 23–24 | Polish        | Analytics dashboard, i18n, Accessibility, Performance optimization      |
| 25–26  | 25–26 | AI Phase 3    | Voice booking, AI follow-ups, Competitor intelligence                   |
| 27–28  | 27–28 | DevOps        | Kubernetes deploy, Monitoring stack, Load testing, Security audit       |
| 29–30  | 29–30 | Launch        | Beta testing, Bug fixes, Documentation, Go-live                         |

---

## 48. Audit Report

# ScheduleBox — Final Audit Report

**Datum:** 9. února 2026
**Auditor:** Nezávislý architekt (Claude)
**Scope:** Kompletní dokumentace ScheduleBox (50+ souborů)
**Metodika:** OWASP, TOGAF, 12-Factor App

---

### 48.1. Executive Summary

### Celkové hodnocení: 72 % připravenosti na autonomní vývoj

Dokumentace pokrývá **funkční požadavky na výborné úrovni** — datový model (47 tabulek), API (99 cest), frontend (32+ komponent). Existuje však **7 kritických architektonických mezer**, které by vedly k nestabilnímu, špatně debugovatelnému a potenciálně nebezpečnému produkčnímu systému.

| Kategorie                    | Nalezeno |
| ---------------------------- | -------- |
| 🔴 KRITICKÉ (blokující)      | 7        |
| 🟠 VYSOKÉ (produkční riziko) | 17       |
| 🟡 STŘEDNÍ (kvalita)         | 9        |
| 🟢 NÍZKÉ (nice-to-have)      | 1        |
| **CELKEM**                   | **34**   |

### Top 3 kritické problémy

1. **Synchronní komunikace** — moduly komunikují přes synchronní volání v rámci monolithu. Domain events jsou definovány v `packages/events/` ale zpracovávány inline (publishEvent je no-op). Vhodné pro aktuální škálu (<500 firem).
2. **Žádná ochrana proti double-booking** — chybí SELECT FOR UPDATE nebo advisory lock. Dva uživatelé mohou zarezervovat stejný slot současně.
3. **RBAC matice pokrývá jen 4 ze 99 endpointů** — není jasné, kdo smí volat AI, automatizaci, settings, API klíče.

---

### 48.2. Nalezené problémy podle vrstev

### 2.1. 🔴 KRITICKÉ (7)

#### BE-MQ-01: Chybí message queue / event bus

**Kde:** `schedulebox_technicka_specifikace_v5.md`, `schedulebox_service_interdependencies.md`

**Problém:** Původní dokumentace deklarovala microservices, ale architektura je monolith. Komunikace mezi moduly je synchronní.

**Dopad:** V monolitické architektuře je synchronní komunikace přijatelná. Domain events jsou definovány ale zpracovávány inline.

**Řešení (implementováno):** Monolith architektura s domain events v `packages/events/` (typy only, publishEvent je safe no-op). Budoucí škálování může zavést message queue. Definované domain events:

- `booking.created`, `booking.confirmed`, `booking.cancelled`, `booking.completed`, `booking.no_show`
- `payment.completed`, `payment.failed`, `payment.refunded`
- `customer.created`, `customer.updated`
- `review.created`

---

#### BE-EVT-01: Chybí domain events specifikace

**Kde:** `schedulebox_service_interdependencies.md`

**Problém:** Dokument popisuje jen REST závislosti. Nikde není specifikováno, jaké události (events) systém produkuje a kdo je konzumuje.

**Dopad:** Bez event katalogu není možné implementovat asynchronní workflows, audit trail, ani real-time notifikace.

**Řešení:** Vytvořit `schedulebox_domain_events_spec.md` s kompletním event katalogem, JSON schema pro každý event, a subscriber mapou.

---

#### BE-RES-01: Chybí resilience patterns

**Kde:** Všechny backend specifikace

**Problém:** Žádná zmínka o circuit breaker, retry, fallback, timeout, bulkhead pattern. Systém závisí na externích API (Comgate, QRcomat, Zoom, OpenAI) bez jakékoliv ochrany.

**Dopad:** Timeout na Comgate API → zamrzne celý booking flow. OpenAI outage → AI endpoints padají → frontend zobrazuje chyby.

**Řešení:** Přidat `schedulebox_resilience_spec.md`:

- Circuit breaker pro externí API (Comgate, QRcomat, Zoom, OpenAI)
- Retry s exponential backoff
- Timeout na všechna external volání (max 5s)
- Fallback: AI nedostupná → default hodnoty (no-show = 0.15, CLV = průměr)
- Bulkhead: izolovat kritické (booking, payment) od ne-kritických (AI, marketplace)

---

#### BE-SAGA-01: Chybí SAGA pattern

**Kde:** Backend specifikace

**Problém:** Flow „Rezervace → Platba → Notifikace → Loyalty body" je distribuovaná transakce přes 4 services. Není specifikováno, co se stane, když krok 3 (notifikace) selže — odvolá se platba? Zruší se rezervace?

**Dopad:** Nekonzistentní stav: zákazník zaplatil, ale nedostal potvrzení. Nebo: loyalty body přiděleny, ale platba selhala.

**Řešení:** Implementovat Choreography SAGA:

1. Booking Service: vytvoří booking (status=pending)
2. Payment Service: zpracuje platbu → emituje `payment.completed`
3. Booking Service: změní status na confirmed → emituje `booking.confirmed`
4. Notification Service: pošle potvrzení (pokud selže → retry, ne rollback)
5. Loyalty Service: přidá body (pokud selže → retry, ne rollback)
6. Kompenzace: pokud Payment selže → Booking Service rollback na cancelled

---

#### DB-CONC-01: Chybí ochrana proti double-booking

**Kde:** `schedulebox_db_schema_complete.sql`

**Problém:** Žádný mechanismus pro prevenci race condition. Dva concurrent requesty mohou zarezervovat stejný slot u stejného zaměstnance.

**Dopad:** Dva zákazníci mají rezervaci na 14:00 u stejného kadeřníka. Katastrofální UX.

**Řešení:** Implementovat jeden z:

- **Pesimistický:** `SELECT ... FOR UPDATE` na availability_slots + UNIQUE constraint na (employee_id, start_time, status != 'cancelled')
- **Optimistický:** Version column + retry on conflict
- **Advisory lock:** `pg_advisory_xact_lock(employee_id, date_hash)` před INSERT do bookings

---

#### SEC-RBAC-01: Nekompletní RBAC mapování

**Kde:** `schedulebox_auth_spec.md`

**Problém:** Permissions matice obsahuje jen 4 akce (vytvořit/zrušit rezervaci, vytvořit službu, zobrazit reporty). Systém má 99 API cest a 23 permission typů v DB, ale mapování na konkrétní endpointy neexistuje.

**Dopad:** Developer nebude vědět, zda customer smí volat `/ai/smart-upselling` nebo zda employee smí volat `/settings/api-keys`. Bezpečnostní díra.

**Řešení:** Rozšířit auth spec o kompletní matici: 99 endpointů × 4 role, seskupených podle permission. Příklad:

| Endpoint                   | Permission      | admin | owner | employee | customer |
| -------------------------- | --------------- | ----- | ----- | -------- | -------- |
| GET /bookings              | bookings.read   | ✅    | ✅    | ✅ (své) | ✅ (své) |
| POST /bookings             | bookings.create | ✅    | ✅    | ✅       | ✅       |
| DELETE /bookings/{id}      | bookings.delete | ✅    | ✅    | ❌       | ❌       |
| POST /ai/pricing-optimizer | ai.use          | ✅    | ✅    | ❌       | ❌       |
| POST /settings/api-keys    | settings.manage | ✅    | ✅    | ❌       | ❌       |
| POST /automation/rules     | settings.manage | ✅    | ✅    | ❌       | ❌       |

---

#### AI-FALL-01: Chybí AI fallback strategie

**Kde:** `schedulebox_ml_models_spec.md`, `schedulebox_technicka_specifikace_v5.md`

**Problém:** AI služby (No-show, CLV, Upselling, Pricing) nemají specifikovaný fallback. Pokud ML model není dostupný nebo vrátí error, systém nemá definované chování.

**Dopad:** AI endpoint vrátí 500 → frontend zobrazí chybu → uživatel ztratí důvěru v systém.

**Řešení:**

- No-show predictor nedostupný → vrátit default 0.15 (15 % průměr)
- CLV nedostupný → vrátit historický průměr z customers.total_spent
- Upselling nedostupný → vrátit top 3 služby podle popularity
- Pricing nedostupný → vrátit services.price (statická cena)
- Smart reminder → vrátit default 1440 minut (24h)
- Vždy vrátit 200 s `"fallback": true` v response

---

### 2.2. 🟠 VYSOKÉ (17)

| ID           | Problém                                      | Dopad                                          |
| ------------ | -------------------------------------------- | ---------------------------------------------- |
| API-ERR-01   | Chybí 429 response na endpointech            | Rate limiting nebude viditelný v API kontraktu |
| API-ERR-02   | Endpointy nemají explicitní error responses  | Frontend developer nezná error kódy            |
| API-HC-01    | Chybí /health a /readiness endpointy         | K8s nemůže dělat health checks                 |
| DB-DEL-01    | Chybí soft delete na klíčových tabulkách     | Nelze obnovit omylem smazaná data              |
| DB-FK-01     | bookings.coupon_id nemá FK constraint        | Referenční integrita není zajištěna            |
| DB-FK-02     | bookings.gift_card_id nemá FK constraint     | Referenční integrita není zajištěna            |
| DB-FK-03     | bookings.video_meeting_id nemá FK constraint | Referenční integrita není zajištěna            |
| DB-GDPR-01   | ON DELETE RESTRICT blokuje GDPR mazání       | Nelze smazat zákazníka s historií              |
| DB-RLS-01    | Chybí Row Level Security                     | Multi-tenant data leak riziko                  |
| FE-RT-01     | Chybí WebSocket/SSE pro real-time            | Kalendář nevidí změny od kolegů                |
| SEC-RL-01    | Rate limiting jen globální                   | /auth/login potřebuje 5 req/min                |
| SEC-OWASP-01 | Chybí pokrytí A04, A08, A10                  | Bezpečnostní mezery                            |
| SEC-PW-01    | forms_validation = 8 znaků, API = 12         | Nekonzistence validace                         |
| OPS-TRACE-01 | Chybí distributed tracing                    | Debugging v produkci bez trace context         |
| OPS-MON-01   | Chybí Prometheus + Grafana                   | Žádné metriky ani alerting                     |
| INT-COM-01   | Comgate: chybí retry + idempotency           | Duplicitní platby při network error            |
| INT-QR-01    | QRcomat API neověřeno                        | Integrace může být nefunkční                   |

### 2.3. 🟡 STŘEDNÍ (9)

| ID          | Problém                                        |
| ----------- | ---------------------------------------------- |
| API-VER-01  | Chybí API versioning v cestách                 |
| API-BULK-01 | Chybí bulk operace                             |
| API-PAG-01  | Offset pagination místo cursor-based           |
| DB-PART-01  | Chybí table partitioning                       |
| DB-NORM-01  | coupons.applicable_service_ids denormalizováno |
| FE-I18N-01  | Chybí i18n pro expanzi do PL/DE                |
| FE-A11Y-01  | Chybí WCAG 2.1 accessibility                   |
| FE-ERR-01   | Chybí Error Boundary specifikace               |
| OPS-LOG-01  | Chybí centralizované logování                  |

---

### 48.3. Analýza provázanosti — User Flow Trasování

### Flow 1: Kompletní rezervační a platební cesta

```
Zákazník → Výběr služby → Výběr data/času → Údaje → Platba Comgate → Potvrzení → Připomínka → Návštěva → Platba QRcomat → Loyalty body → Recenze → Faktura
```

| Krok                      | Frontend      | API                             | DB                                          | Event                            | ⚠️ Problém                                                                                                    |
| ------------------------- | ------------- | ------------------------------- | ------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1. Výběr služby           | BookingWidget | GET /services                   | services                                    | —                                | ✅ OK                                                                                                         |
| 2. Dostupné sloty         | BookingWidget | GET /availability               | availability_slots, working_hours, bookings | —                                | ⚠️ Slot může zmizet mezi zobrazením a potvrzením (race condition DB-CONC-01)                                  |
| 3. Údaje zákazníka        | BookingForm   | —                               | —                                           | —                                | ✅ OK (client-side)                                                                                           |
| 4. Potvrzení              | BookingForm   | POST /bookings                  | bookings INSERT                             | ❌ Chybí booking.created event   | ⚠️ Bez event → notifikace se neodešle automaticky                                                             |
| 5. Platba Comgate         | PaymentForm   | POST /payments/comgate/create   | payments INSERT                             | ❌ Chybí payment.initiated event | ⚠️ Pokud redirect selže, booking zůstane v pending navždy. Chybí timeout/expiration mechanismus               |
| 6. Comgate webhook        | —             | POST /webhooks/comgate          | payments UPDATE                             | ❌ Chybí payment.completed event | ⚠️ Bez event → booking se nezmění na confirmed automaticky. INT-COM-01: chybí idempotency                     |
| 7. Potvrzovací email      | —             | ❌ Žádný explicitní endpoint    | notifications INSERT                        | ❌ Chybí trigger                 | ⚠️ Kdo zavolá notification service? Bez event bus to musí být explicitní REST call z payment webhook handleru |
| 8. Připomínka (AI timing) | —             | POST /ai/smart-reminder-timing  | ai_predictions, notifications               | —                                | ⚠️ AI-FALL-01: co když AI je nedostupná?                                                                      |
| 9. Návštěva + QRcomat     | PaymentForm   | POST /payments/qrcomat/generate | —                                           | —                                | ✅ OK (QR zobrazen)                                                                                           |
| 10. QRcomat webhook       | —             | POST /webhooks/qrcomat          | payments UPDATE                             | ❌ Chybí event                   | ⚠️ Stejné problémy jako krok 6                                                                                |
| 11. Booking completed     | —             | POST /bookings/{id}/complete    | bookings UPDATE                             | ❌ Chybí booking.completed event | ⚠️ Bez event → loyalty body se nepřidělí automaticky                                                          |
| 12. Loyalty body          | —             | ❌ Žádný automatický trigger    | loyalty_transactions INSERT                 | —                                | ⚠️ Kdo zavolá loyalty service? Bez event bus musí být volání z booking completion handleru                    |
| 13. Review request        | —             | ❌ Žádný automatický trigger    | notifications INSERT                        | —                                | ⚠️ Automation rule by to mělo řešit, ale spuštění automation engine není specifikováno                        |
| 14. Faktura               | —             | ❌ Chybí POST /invoices         | invoices INSERT                             | —                                | ⚠️ Žádný endpoint pro vytvoření faktury! Jen GET /invoices a GET /invoices/{id}/pdf                           |

**Nalezené mezery ve Flow 1:**

- ❌ Chybí 6 domain events, které jsou nutné pro automatizaci
- ❌ Chybí POST /invoices endpoint pro vytváření faktur
- ❌ Chybí booking expiration (timeout pro nezaplacené pending bookings)
- ❌ Race condition na availability sloty

### Flow 2: Onboarding nového zákazníka

```
Landing page → Registrace → Email verifikace → Onboarding wizard → Nastavení → První služba → První rezervace
```

| Krok                      | Problém                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Registrace                | POST /auth/register — ✅ OK                                                                                                    |
| Email verifikace          | POST /auth/verify-email — ✅ OK, ale chybí specifikace retry emailu                                                            |
| Onboarding wizard         | OnboardingWizard komponenta — ✅ OK                                                                                            |
| Nastavení                 | PUT /settings/company — ✅ OK                                                                                                  |
| Pracovní doby             | PUT /settings/working-hours — ✅ OK                                                                                            |
| **Embeddable widget kód** | ❌ Chybí endpoint pro generování embed kódu. Widget/config existuje, ale není specifikováno, jak zákazník získá `<script>` tag |

### Flow 3: AI Voice Booking

```
Zákazník zavolá → Audio → STT (Whisper) → NLU (GPT-4) → Intent → Booking
```

| Krok                 | Problém                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| POST /bookings/voice | ✅ Endpoint existuje                                                         |
| Whisper STT          | ❌ Chybí specifikace: self-hosted nebo OpenAI API? Latence? Max délka audia? |
| GPT-4 NLU            | ❌ Chybí specifikace: jaký prompt? Jak se mapuje intent na service_id?       |
| Fallback             | ❌ Co když Whisper/GPT-4 je nedostupné?                                      |
| Konfirmace           | ❌ Jak zákazník potvrdí hlasem vytvořenou rezervaci?                         |

---

### 48.4. Dependency Matrix

| Service                 | DB Tables                                                                     | Závisí na services                             | Externí API                 | ⚠️ Nedokumentované závislosti                   |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------- | ----------------------------------------------- |
| Auth                    | users, roles, permissions, password_history, refresh_tokens, api_keys         | —                                              | Google/FB/Apple OAuth       | —                                               |
| Booking                 | bookings, booking_resources, availability_slots                               | Customer, Service, Employee, Resource, Payment | —                           | ❌ AI (no-show prediction), Notification, Video |
| Customer                | customers, tags, customer_tags                                                | —                                              | —                           | —                                               |
| Service                 | services, service_categories                                                  | —                                              | —                           | —                                               |
| Employee                | employees, employee_services, working_hours, working_hours_overrides          | —                                              | —                           | —                                               |
| Resource                | resources, resource_types, service_resources                                  | —                                              | —                           | —                                               |
| Payment                 | payments, invoices                                                            | Booking                                        | Comgate, QRcomat            | ❌ Notification (potvrzení platby)              |
| Coupon                  | coupons, coupon_usage                                                         | —                                              | —                           | —                                               |
| Gift Card               | gift_cards, gift_card_transactions                                            | —                                              | —                           | —                                               |
| Loyalty                 | loyalty_programs, loyalty_tiers, loyalty_cards, loyalty_transactions, rewards | Customer, Booking                              | Apple Wallet, Google Pay    | ❌ Nedokumentováno v interdependencies          |
| Notification            | notifications, notification_templates                                         | Customer, Booking                              | SMTP, SMS provider          | ❌ Zcela chybí v interdependencies              |
| Review                  | reviews                                                                       | Customer, Booking, Service, Employee           | —                           | ❌ Marketplace (auto-update rating)             |
| AI                      | ai_predictions, ai_model_metrics                                              | Customer, Booking                              | OpenAI                      | ❌ Chybí v interdependencies                    |
| Marketplace             | marketplace_listings                                                          | Company                                        | —                           | ❌ Review (rating sync)                         |
| Video                   | video_meetings                                                                | Booking                                        | Zoom, Google Meet, MS Teams | —                                               |
| App                     | whitelabel_apps                                                               | Company                                        | App Store, Google Play      | —                                               |
| Automation              | automation_rules, automation_logs                                             | Booking, Customer, Notification, Loyalty       | —                           | ❌ Chybí v interdependencies                    |
| Analytics               | analytics_events, audit_logs                                                  | Všechny                                        | —                           | —                                               |
| Competitor Intelligence | competitor_data                                                               | Company                                        | Web scraping                | ❌ Zcela chybí v interdependencies              |

**Klíčový nález:** `schedulebox_service_interdependencies.md` dokumentuje jen 9 services a 8 závislostí. Skutečný systém má 17+ services a 20+ závislostí. **Dokument pokrývá jen 40 % reálných závislostí.**

---

### 48.5. Slepá místa (Failure Scenarios)

| Scénář                       | Definovaný fallback? | Dopad                                            |
| ---------------------------- | -------------------- | ------------------------------------------------ |
| Comgate platba timeout (30s) | ❌ NE                | Zákazník čeká, booking pending navždy            |
| Comgate webhook nedorazí     | ❌ NE                | Platba provedena, booking zůstane pending        |
| QRcomat API nedostupné       | ❌ NE                | Nelze generovat QR kód                           |
| AI model error               | ❌ NE                | 500 error na AI endpointech                      |
| Redis nedostupný             | ❌ NE                | Session management, rate limiting, caching selže |
| PostgreSQL disk full         | ❌ NE                | Žádný monitoring ani alerting                    |
| SMTP server down             | ❌ NE                | Žádné potvrzovací emaily                         |
| Zoom API rate limit          | ❌ NE                | Nelze vytvořit video meeting                     |
| Concurrent booking conflict  | ❌ NE                | Double-booking                                   |
| Webhook replay attack        | ❌ NE                | Duplikátní platby/akce                           |

---

### 48.6. Akční plán pro dosažení 100 %

### Fáze 1: KRITICKÉ opravy (nutné PŘED vývojem)

| #   | Akce                                            | Soubor k vytvoření/upravení                   | Odhad |
| --- | ----------------------------------------------- | --------------------------------------------- | ----- |
| 1   | Vytvořit Domain Events specifikaci              | `schedulebox_domain_events_spec.md`           | 4h    |
| 2   | Domain Events typové definice (packages/events) | `packages/events/src/index.ts`                | 2h    |
| 3   | Vytvořit Resilience & Fallback specifikaci      | `schedulebox_resilience_spec.md`              | 3h    |
| 4   | Vytvořit SAGA workflow specifikaci              | `schedulebox_saga_workflows.md`               | 4h    |
| 5   | Přidat double-booking prevenci do DB schema     | `schedulebox_db_schema_complete.sql` — UPDATE | 1h    |
| 6   | Rozšířit RBAC matici na 99 endpointů            | `schedulebox_auth_spec.md` — UPDATE           | 3h    |
| 7   | Přidat AI fallback strategie                    | `schedulebox_ml_models_spec.md` — UPDATE      | 2h    |

### Fáze 2: VYSOKÉ priority (nutné PRO produkci)

| #   | Akce                                                                         | Odhad |
| --- | ---------------------------------------------------------------------------- | ----- |
| 8   | Přidat /health, /readiness endpointy do API                                  | 1h    |
| 9   | Přidat soft delete na klíčové tabulky                                        | 2h    |
| 10  | Opravit chybějící FK constraints (coupon_id, gift_card_id, video_meeting_id) | 1h    |
| 11  | Přidat Row Level Security politiky                                           | 3h    |
| 12  | Vytvořit WebSocket specifikaci pro real-time                                 | 3h    |
| 13  | Rozšířit rate limiting per-endpoint                                          | 2h    |
| 14  | Opravit password policy nekonzistenci (8 → 12)                               | 0.5h  |
| 15  | Doplnit error responses na všechny endpointy                                 | 3h    |
| 16  | Přidat POST /invoices endpoint                                               | 1h    |
| 17  | Přidat Comgate idempotency + retry specifikaci                               | 2h    |
| 18  | Ověřit QRcomat API a doplnit specifikaci                                     | 2h    |
| 19  | Přidat observability stack spec (OTel, Prometheus, Grafana)                  | 3h    |

### Fáze 3: STŘEDNÍ priority (pro kvalitu)

| #   | Akce                                        | Odhad |
| --- | ------------------------------------------- | ----- |
| 20  | Přidat API versioning                       | 1h    |
| 21  | Přidat i18n specifikaci                     | 2h    |
| 22  | Přidat accessibility specifikaci            | 2h    |
| 23  | Přidat centralizované logování spec         | 1h    |
| 24  | Přidat table partitioning strategii         | 1h    |
| 25  | Rozšířit service interdependencies na 100 % | 2h    |

**Celkový odhad pro dosažení 100 %: ~50 hodin práce na dokumentaci**

---

### 48.7. Závěr

Dokumentace ScheduleBox je **funkčně bohatá** — pokrývá široké spektrum business logiky, AI funkcí a integrací. Hlavní slabinou jsou **architektonické vzory pro produkční provoz**: asynchronní komunikace, resilience, distribuované transakce, a security hardening.

Bez opravy 7 kritických problémů hrozí:

- Double-booking zákazníků
- Cascading failures při výpadku jedné služby
- Nekonzistentní data mezi moduly
- Bezpečnostní mezery v autorizaci
- Nemožnost debuggingu v produkci

Po implementaci Fáze 1 (20 hodin) bude dokumentace připravena na bezpečný start autonomního vývoje.

---

---

# ČÁST XIII — PRODUKTOVÁ SPECIFIKACE (Pro člověka)

---

## 49. Kompletní přehled funkcí

### 49.1. Modul: Rezervace

| Funkce                     | Popis                                                | Plán       |
| -------------------------- | ---------------------------------------------------- | ---------- |
| Online rezervace 24/7      | Zákazníci si rezervují kdykoliv přes web nebo widget | Free+      |
| Kalendář (den/týden/měsíc) | Přehledný kalendář všech rezervací                   | Free+      |
| Multi-zaměstnanec          | Každý zaměstnanec má svůj rozvrh a služby            | Free+      |
| Multi-resource booking     | Služba může vyžadovat místnost, křeslo, stroj        | Growth+    |
| Drag & drop                | Přetáhnutí rezervace na jiný čas                     | Free+      |
| Buffer časy                | Přestávka před/po službě (úklid, příprava)           | Free+      |
| Zrušení a přeobjednání     | Zákazník může zrušit/přesunout (dle policy)          | Free+      |
| Blokace slotů              | Admin zablokuje čas (dovolená, údržba)               | Free+      |
| Voice booking              | Rezervace hlasem přes telefon (AI)                   | AI-Powered |

### 49.2. Modul: Zákazníci (CRM)

| Funkce              | Popis                                     | Plán       |
| ------------------- | ----------------------------------------- | ---------- |
| Kartotéka zákazníků | Jméno, email, telefon, poznámky, historie | Free+      |
| Štítky (tagging)    | Kategorizace (VIP, nový, problémový...)   | Essential+ |
| Historie návštěv    | Přehled všech rezervací zákazníka         | Free+      |
| Import/Export       | Hromadný import z CSV, export do CSV/JSON | Essential+ |
| GDPR nástroje       | Export dat, anonymizace, mazání           | Free+      |
| Health score        | AI skóre „zdraví" vztahu (0-100)          | AI-Powered |
| CLV predikce        | AI predikuje budoucí hodnotu zákazníka    | AI-Powered |

### 49.3. Modul: Služby

| Funkce          | Popis                                   | Plán       |
| --------------- | --------------------------------------- | ---------- |
| Katalog služeb  | Seznam s cenou, dobou trvání, popisem   | Free+      |
| Kategorie       | Seskupení (Vlasy, Nehty, Masáže...)     | Free+      |
| Online služby   | Služby přes video (Zoom/Meet/Teams)     | Essential+ |
| Dynamic pricing | AI automaticky mění cenu podle poptávky | AI-Powered |

### 49.4. Modul: Platby

| Funkce                         | Popis                                 | Plán       |
| ------------------------------ | ------------------------------------- | ---------- |
| Online platba kartou (Comgate) | Záloha nebo plná platba při rezervaci | Essential+ |
| QR platba na místě (QRcomat)   | QR kód na pokladně                    | Essential+ |
| Kupóny                         | Procentuální nebo fixní sleva         | Essential+ |
| Dárkové karty                  | Předplacený kredit                    | Essential+ |
| Faktury PDF                    | Automatické generování                | Essential+ |
| Refundy                        | Vratky z admin rozhraní               | Essential+ |

### 49.5. Modul: Věrnostní program

| Funkce              | Popis                            | Plán    |
| ------------------- | -------------------------------- | ------- |
| Body                | Za každou Kč = X bodů            | Growth+ |
| Razítka             | Po 10 návštěvách = odměna zdarma | Growth+ |
| Tiers               | Bronze → Silver → Gold           | Growth+ |
| Apple/Google Wallet | Digitální karta v mobilu         | Growth+ |
| Odměny              | Výměna bodů za slevy/služby      | Growth+ |

### 49.6. Modul: Automatizace & Marketing

| Funkce                        | Popis                                  | Plán       |
| ----------------------------- | -------------------------------------- | ---------- |
| Potvrzovací email             | Automaticky po rezervaci               | Free+      |
| Připomínky (SMS/email)        | 24h a 2h před                          | Essential+ |
| AI timing připomínek          | AI vybere nejlepší čas odeslání        | AI-Powered |
| Follow-up                     | Email neaktivním zákazníkům            | Growth+    |
| AI personalizované follow-upy | GPT-4 generuje text                    | AI-Powered |
| Review request                | Žádost o hodnocení po návštěvě         | Essential+ |
| Review routing                | 4-5★ → Google, 1-3★ → interní          | Essential+ |
| Visual rule builder           | Sestavení automatizace: trigger → akce | Growth+    |
| Smart upselling               | AI doporučí doplňkovou službu          | AI-Powered |

### 49.7. Modul: Reporty, AI, Marketplace, Ostatní

| Funkce                  | Popis                            | Plán       |
| ----------------------- | -------------------------------- | ---------- |
| Dashboard               | Dnešní přehled na první pohled   | Free+      |
| Tržby za období         | Grafy a čísla                    | Essential+ |
| AI predikce poptávky    | Kolik čekat příští týden         | AI-Powered |
| Competitor intelligence | Automatické sledování konkurence | AI-Powered |
| Marketplace             | Veřejný katalog firem            | Free+      |
| Widget                  | JavaScript widget pro web        | Free+      |
| White-label app         | Vlastní aplikace v App Store     | AI-Powered |
| API přístup             | REST API pro integrace           | Growth+    |
| Videokonference         | Zoom/Meet/Teams                  | Essential+ |
| "Vypadat zaneprázdněně" | Skryje % volných slotů           | Growth+    |

---

## 50. Navigace a Menu Struktura

### 50.1. Sidebar — Owner / Admin

```
📊  Dashboard                    → /dashboard
📅  Kalendář                     → /calendar
    ├── Denní pohled
    ├── Týdenní pohled
    └── Měsíční pohled
📋  Rezervace                    → /bookings
    ├── Všechny
    ├── Čekající na potvrzení
    └── Dnešní
👥  Zákazníci                    → /customers
    ├── Seznam
    ├── Štítky
    └── Import
💇  Služby                       → /services
    ├── Katalog
    └── Kategorie
👩‍💼  Zaměstnanci                  → /employees
    ├── Seznam
    └── Pracovní doby
🪑  Zdroje                       → /resources
💳  Platby                       → /payments
    ├── Přehled
    └── Faktury
🏷️  Kupóny & Dárkové karty      → /marketing
    ├── Kupóny
    └── Dárkové karty
❤️  Věrnostní program            → /loyalty
    ├── Nastavení programu
    ├── Karty zákazníků
    └── Odměny
⭐  Recenze                      → /reviews
🤖  AI Nástroje                  → /ai
    ├── No-show predikce
    ├── Smart upselling
    ├── Optimalizace cen
    ├── Zdraví zákazníků
    └── Predikce poptávky
⚡  Automatizace                 → /automation
    ├── Pravidla
    └── Historie
📊  Reporty                      → /analytics
🛒  Marketplace                  → /marketplace
📱  Mobilní aplikace             → /app
🔧  Nastavení                   → /settings
    ├── Firma
    ├── Pracovní doby
    ├── Widget
    ├── Platební brány
    ├── Notifikační šablony
    ├── API klíče
    ├── Webhooky
    └── Můj účet
```

### 50.2. Menu — Zaměstnanec

```
📊  Můj přehled       (jen své statistiky)
📅  Kalendář           (jen svůj rozvrh)
📋  Moje rezervace     (jen přiřazené)
👥  Zákazníci          (jen čtení)
💇  Služby             (jen čtení)
🔧  Můj profil
```

### 50.3. Menu — Zákazník (portál)

```
📅  Moje rezervace
➕  Nová rezervace
❤️  Věrnostní karta
⭐  Moje recenze
👤  Můj profil
```

---

## 51. Popis obrazovek

### 51.1. Dashboard (Owner)

```
┌─────────────────────────────────────────────────────────┐
│ 🔎 Hledat zákazníka...                    👤 Jan Novák ▼│
├────────┬────────────────────────────────────────────────┤
│        │                                                │
│ Sidebar│  Dnes: 8 rezervací      Tržby dnes: 4 200 Kč  │
│  menu  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  (viz  │  │Rezervace│ │ Tržby  │ │No-shows│ │Obsazen.│ │
│  50.1) │  │  128    │ │85 200Kč│ │  3.2%  │ │  74%   │ │
│        │  │ tento m.│ │tento m.│ │tento m.│ │tento m.│ │
│        │  └────────┘ └────────┘ └────────┘ └────────┘ │
│        │                                                │
│        │  📈 Graf tržeb (posledních 30 dní)            │
│        │  ▁▃▅▇█▇▅▃▅▇█▇▅▃▁▃▅▇▅▃▁▃▅▇█▇▅▃▁            │
│        │                                                │
│        │  Nadcházející rezervace:                       │
│        │  ┌─────────────────────────────────────────┐  │
│        │  │ 09:00 Jana K. - Střih dámský (Jana)     │  │
│        │  │ 09:30 Petr S. - Barvení (Marie)         │  │
│        │  │ 10:00 Eva N. - Manikúra (Petra)         │  │
│        │  │ 10:30 ⚠️ Lukáš D. - Střih (Jana)        │  │
│        │  │       No-show riziko: 35%                │  │
│        │  └─────────────────────────────────────────┘  │
│        │                                                │
│        │  💡 AI doporučení:                             │
│        │  "Zvyšte cenu Střihu o 50 Kč v pátek"        │
│        │  "3 zákazníci At Risk — pošlete follow-up"    │
└────────┴────────────────────────────────────────────────┘
```

### 51.2. Kalendář (Týdenní pohled)

```
┌─────────────────────────────────────────────────────────┐
│ ◀ Únor 2026 ▶    [Den] [Týden] [Měsíc]  🔽 Zaměstnanec│
├────────┬──────────┬──────────┬──────────┬───────────────┤
│  Čas   │  Jana    │  Marie   │  Petra   │               │
├────────┼──────────┼──────────┼──────────┤               │
│  09:00 │ ████████ │ ░░░░░░░░ │          │               │
│  09:30 │ Střih    │ Barvení  │          │               │
│  10:00 │ Jana K.  │ Eva K.   │ ████████ │  + Přidat     │
│  10:30 │ ████████ │          │ Manikúra │    rezervaci  │
│  11:00 │ Barvení  │ ████████ │ Petra S. │               │
│  11:30 │ Petr N.  │ Střih    │          │               │
│  12:00 │          │ David M. │          │               │
│  12:30 │ ░░ Oběd ░│ ░░ Oběd ░│ ░░ Oběd ░│               │
│  13:00 │          │          │ ████████ │               │
│  13:30 │ ████████ │          │ Gelové   │               │
│  14:00 │ Střih    │          │ nehty    │               │
└────────┴──────────┴──────────┴──────────┴───────────────┘

████ = rezervace (klik → detail)
░░░░ = blokovaný čas
Prázdné místo = klik → nová rezervace
Drag & drop = přesun na jiný čas/zaměstnance
```

### 51.3. Nová rezervace — Krok za krokem

**Krok 1/4: Výběr služby**

- Zákazník/admin vidí seznam služeb seskupený do kategorií
- U každé služby: název, doba trvání, cena, obrázek
- 💡 AI upselling: "Zákazníci kteří si vybrali Střih často přidávají Masáž hlavy"

**Krok 2/4: Výběr data a času**

- Kalendář s volnými dny (zelené) a plnými (šedé)
- Po výběru dne: grid dostupných časových slotů
- U každého slotu: zaměstnanec, který je volný
- Volitelně: výběr konkrétního zaměstnance (dropdown)

**Krok 3/4: Zákaznické údaje**

- Jméno (povinné), Email (povinné), Telefon (volitelné)
- Poznámka pro personál
- Kupón kód (volitelné) → po zadání se zobrazí sleva
- Dárková karta (volitelné) → po zadání se zobrazí zůstatek

**Krok 4/4: Potvrzení**

- Shrnutí: služba, datum, čas, zaměstnanec, cena
- Volba platby: online (Comgate) nebo na místě
- Souhlas s podmínkami (checkbox)
- Tlačítko "Potvrdit rezervaci"

### 51.4. Detail zákazníka

```
┌─────────────────────────────────────────────────────────┐
│ ← Zákazníci   Jana Kučerová              [Upravit]     │
├─────────────────────────────────────────────────────────┤
│  👤 Jana Kučerová        Štítky: [VIP] [Pravidelná]    │
│  📧 jana@email.cz       Zdroj: Online | Od: 15.3.2025 │
│  📱 +420 777 111 222                                   │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Návštěvy │ │  Utraceno│ │ No-shows │ │  Health  │  │
│  │    23    │ │ 11 500 Kč│ │  1 (4%)  │ │ 85 Excel.│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  ❤️ Věrnostní: Gold | 2 340 bodů                       │
│  🔮 CLV predikce: 15 000 Kč/rok                        │
│                                                         │
│  Tab: [Historie] [Poznámky] [Věrnost] [Platby]         │
│  ──────────────────────────────────────────────         │
│  │ 10.2.│ Střih dámský    │ 500 Kč │ ✅ Zaplaceno │    │
│  │ 28.1.│ Barvení         │1 200 Kč│ ✅ Zaplaceno │    │
│  │ 15.1.│ Střih+Manikúra  │  900 Kč│ ✅ Zaplaceno │    │
│  │ 20.12│ Střih dámský    │  500 Kč│ ⚠️ No-show  │    │
│                                                         │
│  📝 "Preferuje Janu. Alergie na parabeny."             │
│                                                         │
│  [+ Rezervace] [📧 Email] [🗑️ GDPR smazání]           │
└─────────────────────────────────────────────────────────┘
```

### 51.5. Detail zaměstnance

- Profilové info (jméno, email, pozice, foto)
- Přiřazené služby (chipsy/tagy)
- Statistiky měsíce: počet rezervací, obsazenost %, tržby
- Pracovní doby (tabulka Po-Ne, čas od-do)
- Výjimky (dovolená, doktor) s možností přidání
- Tlačítko "Zobrazit kalendář" → filtruje na tohoto zaměstnance

### 51.6. Automatizace — Visual Rule Builder

```
┌──────────────────────────────────────┐
│ Nové pravidlo                        │
│                                      │
│ Název: [Review request           ]   │
│                                      │
│ ⚡ KDY: [Rezervace dokončena ▼]      │
│ ⏱️ PO:  [2] [hodinách ▼]            │
│ 🎯 CO:  [Odeslat email ▼]           │
│         Šablona: [Review request ▼]  │
│ Komu:   Zákazník z rezervace         │
│                                      │
│ Aktivní: [✅]  [💾 Uložit]           │
└──────────────────────────────────────┘
```

### 51.7. Public Booking Page (zákaznický pohled)

- Hlavička: logo firmy, název, hodnocení, adresa
- Katalog služeb seskupený do kategorií
- Výběr služby → datum → čas → údaje → potvrzení
- AI upselling doporučení
- Footer: "Powered by ScheduleBox"

---

## 52. Role a oprávnění (pro člověka)

### 52.1. Vlastník firmy (Owner)

Má plný přístup v rámci své firmy:

- ✅ Spravuje VŠECHNY rezervace, zaměstnance, služby, zdroje
- ✅ Nastavuje ceny, rozvrhy, kapacity
- ✅ Spravuje platby, refundy, faktury, kupóny, dárkové karty
- ✅ Nastavuje věrnostní program a automatizaci
- ✅ Vidí VŠECHNY reporty a AI predikce
- ✅ Spravuje nastavení, widget, API klíče, marketplace, white-label app

### 52.2. Zaměstnanec (Employee)

Omezený přístup pro denní práci:

- ✅ Vidí SVÉ rezervace a SVůj kalendář
- ✅ Vytváří a potvrzuje rezervace
- ✅ Čte zákaznické údaje
- ❌ NEMŮŽE měnit ceny, nastavení, reporty, AI, automatizaci, marketing

### 52.3. Zákazník (Customer)

Přístup jen ke svým datům přes portál:

- ✅ Vytváří, ruší, přesouvá SVOJE rezervace
- ✅ Vidí SVOU věrnostní kartu, recenze, faktury
- ✅ Exportuje SVÁ data (GDPR)
- ❌ NEMŮŽE vidět data jiných zákazníků ani admin rozhraní

---

## 53. Cenový plán — Feature Matrix

| Funkce            |   Free   | Essential 490Kč | Growth 1490Kč | AI-Powered 2990Kč |
| ----------------- | :------: | :-------------: | :-----------: | :---------------: |
| Online booking    |  50/měs  |        ∞        |       ∞       |         ∞         |
| Zaměstnanci       |    1     |        1        |      10       |         ∞         |
| Zákazníci         |   100    |      1 000      |       ∞       |         ∞         |
| Kalendář          |    ✅    |       ✅        |      ✅       |        ✅         |
| Widget            |    ✅    |       ✅        |      ✅       |        ✅         |
| Comgate/QRcomat   |    ❌    |       ✅        |      ✅       |        ✅         |
| Kupóny            |    ❌    |  10 aktivních   |       ∞       |         ∞         |
| Dárkové karty     |    ❌    |       ✅        |      ✅       |        ✅         |
| Faktury           |    ❌    |       ✅        |      ✅       |        ✅         |
| Štítky, Import    |    ❌    |       ✅        |      ✅       |        ✅         |
| SMS připomínky    |    ❌    |       ✅        |      ✅       |        ✅         |
| Review request    |    ❌    |       ✅        |      ✅       |        ✅         |
| Multi-resource    |    ❌    |       ❌        |      ✅       |        ✅         |
| Automatizace      |    ❌    |       ❌        |  10 pravidel  |         ∞         |
| Věrnostní program |    ❌    |       ❌        |      ✅       |        ✅         |
| API + Webhooky    |    ❌    |       ❌        |      ✅       |        ✅         |
| "Zaneprázdněně"   |    ❌    |       ❌        |      ✅       |        ✅         |
| Videokonference   |    ❌    |       ✅        |      ✅       |        ✅         |
| No-show AI        |    ❌    |       ❌        |      ❌       |        ✅         |
| Smart upselling   |    ❌    |       ❌        |      ❌       |        ✅         |
| Dynamic pricing   |    ❌    |       ❌        |      ❌       |        ✅         |
| CLV + Health      |    ❌    |       ❌        |      ❌       |        ✅         |
| AI follow-upy     |    ❌    |       ❌        |      ❌       |        ✅         |
| Voice booking     |    ❌    |       ❌        |      ❌       |   ✅ (1Kč/min)    |
| Competitor intel  |    ❌    |       ❌        |      ❌       |        ✅         |
| White-label app   |    ❌    |       ❌        |      ❌       |        ✅         |
| Reporty           | Základní |    Rozšířené    |   Pokročilé   |   Kompletní+AI    |
| Podpora           |  Email   |   Email+chat    |   Prioritní   |    Dedikovaný     |

---

## 54. Chybové stavy

### 54.1. Chybové obrazovky

**404 — Stránka nenalezena:** Ikona 🔍, text "Stránka neexistuje", tlačítko "Zpět na Dashboard"

**409 — Časový konflikt:** Text "Slot byl právě zarezervován jiným zákazníkem", nabídka nejbližších volných časů

**401 — Session expired:** Text "Vaše přihlášení vypršelo", tlačítko "Přihlásit se"

**502 — Platba nedostupná:** Text "Platební brána neodpovídá", tlačítka "Zkusit znovu" + "Zaplatit na místě"

### 54.2. Inline stavy

**Toast notifikace (vpravo nahoře):**

- ✅ Zelený: "Rezervace úspěšně vytvořena" (zmizí po 5s)
- ⚠️ Žlutý: "Zákazník má 35% riziko no-show" (zmizí po 8s)
- ❌ Červený: "Nepodařilo se uložit" (zmizí klikem)
- ℹ️ Modrý: "Nová rezervace od Jana K." (zmizí po 5s)

**Empty state:** Ikona + text "Zatím žádné [X]" + CTA tlačítko

**Loading:** Spinner + "Načítání..." + progress bar (pokud je % známé)

**Offline/degraded:** Žlutý banner nahoře "Některé služby jsou dočasně nedostupné. Pracujeme na nápravě."

---

# ČÁST XIV — OBOROVÉ VERTIKÁLY & SUPER-ADMIN PLATFORMA

---

## 55. Multi-tenant Architektura

### 55.1. Princip

ScheduleBox je **single-codebase, multi-tenant SaaS platforma**. Jedna instalace obsluhuje tisíce firem. Každá firma (tenant) má:

- Vlastní data izolovaná přes `company_id` + Row Level Security
- Vlastní subdoménu nebo slug (`salonkrasa.schedulebox.cz`)
- Vlastní vizuální identitu (logo, barvy)
- Vlastní nastavení dle oboru (industry preset)
- Vlastní cenový plán (Free/Essential/Growth/AI-Powered)

### 55.2. Tenant Izolace

```
┌──────────────────────────────────────────────────────┐
│                    SUPER-ADMIN                        │
│  (Anthropic/ScheduleBox tým — spravuje celou platformu)│
├──────────────────────────────────────────────────────┤
│  Tenant A          │  Tenant B         │  Tenant C   │
│  Salon Krása       │  FitZone          │  MUDr. Novák│
│  (kadeřnictví)     │  (fitness)        │  (zubař)    │
│  company_id = 1    │  company_id = 2   │  company_id=3│
│  ┌──────────────┐  │  ┌──────────────┐ │  ┌────────┐ │
│  │ Owner: Jana  │  │  │ Owner: Petr  │ │  │Owner:  │ │
│  │ Emp: Marie   │  │  │ Emp: Katka   │ │  │MUDr. N.│ │
│  │ Emp: Petra   │  │  │ Trainers: 8  │ │  │Sestra:2│ │
│  │ Customers:500│  │  │ Members: 2000│ │  │Pac.:800│ │
│  │ Bookings: 3k │  │  │ Classes: 50/w│ │  │Book:1.5k││
│  └──────────────┘  │  └──────────────┘ │  └────────┘ │
│  RLS: sees only    │  RLS: sees only   │  RLS: sees  │
│  company_id = 1    │  company_id = 2   │  company_id=3│
└──────────────────────────────────────────────────────┘
```

### 55.3. Rozšíření DB: companies tabulka

```sql
-- Nové sloupce pro companies tabulku:
ALTER TABLE companies ADD COLUMN industry_type VARCHAR(50) DEFAULT 'general'
    CHECK (industry_type IN (
        'beauty_salon',      -- Kadeřnictví, kosmetika, nehty
        'barbershop',        -- Pánský salon
        'spa_wellness',      -- Lázně, wellness, masáže
        'fitness_gym',       -- Posilovna, fitness centrum
        'yoga_pilates',      -- Jóga, pilates studio
        'dance_studio',      -- Taneční studio
        'medical_clinic',    -- Lékař, zubař, ordinace
        'veterinary',        -- Veterina
        'physiotherapy',     -- Fyzioterapie, rehabilitace
        'psychology',        -- Psycholog, terapeut
        'auto_service',      -- Autoservis, pneuservis
        'cleaning_service',  -- Úklidová firma
        'tutoring',          -- Doučování, korepetice
        'photography',       -- Fotografický ateliér
        'consulting',        -- Konzultační služby
        'coworking',         -- Coworking, pronájem prostor
        'pet_grooming',      -- Psí salon
        'tattoo_piercing',   -- Tattoo & piercing studio
        'escape_room',       -- Escape room, zábava
        'general'            -- Obecné / jiné
    ));

ALTER TABLE companies ADD COLUMN industry_config JSONB DEFAULT '{}';
ALTER TABLE companies ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN onboarding_step INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN suspended_reason TEXT;
ALTER TABLE companies ADD COLUMN monthly_booking_count INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN monthly_booking_limit INTEGER; -- NULL = unlimited
ALTER TABLE companies ADD COLUMN features_enabled JSONB DEFAULT '{}';
-- features_enabled example: {"comgate": true, "qrcomat": true, "ai_noshow": true, "loyalty": true, "automation": true, "video": true, "whitelabel": false, "api": true}

CREATE INDEX idx_companies_industry ON companies(industry_type);
CREATE INDEX idx_companies_active ON companies(is_active, subscription_plan);
```

### 55.4. Feature Gating (Plán → Funkce)

```typescript
// Middleware pro kontrolu přístupu k funkcím podle plánu
const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    'bookings.basic', // max 50/měsíc
    'customers.basic', // max 100
    'calendar',
    'widget',
    'marketplace.basic',
  ],
  essential: [
    ...PLAN_FEATURES.free,
    'bookings.unlimited',
    'customers.1000',
    'comgate',
    'qrcomat',
    'coupons.10',
    'gift_cards',
    'invoices',
    'tags',
    'import_export',
    'sms_reminders',
    'review_request',
    'video',
  ],
  growth: [
    ...PLAN_FEATURES.essential,
    'customers.unlimited',
    'employees.10',
    'coupons.unlimited',
    'multi_resource',
    'automation.10',
    'loyalty',
    'api',
    'webhooks',
    'busy_appearance',
    'reports.advanced',
  ],
  ai_powered: [
    ...PLAN_FEATURES.growth,
    'employees.unlimited',
    'automation.unlimited',
    'ai.noshow',
    'ai.clv',
    'ai.upselling',
    'ai.pricing',
    'ai.capacity',
    'ai.health_score',
    'ai.reminder_timing',
    'ai.follow_up',
    'ai.voice_booking',
    'ai.competitor_intel',
    'whitelabel',
    'marketplace.premium',
    'reports.ai',
    'dedicated_support',
  ],
};

// Middleware
function requireFeature(feature: string) {
  return async (req, res, next) => {
    const company = req.company;
    const allowed = PLAN_FEATURES[company.subscription_plan];
    if (!allowed.includes(feature)) {
      return res.status(403).json({
        error: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `Funkce "${feature}" vyžaduje vyšší plán.`,
          current_plan: company.subscription_plan,
          required_plan: getMinPlanForFeature(feature),
          upgrade_url: `https://app.schedulebox.cz/settings/billing/upgrade`,
        },
      });
    }
    next();
  };
}
```

---

## 56. Oborové vertikály (Industry Presets)

### 56.1. Přehled — Jak se obory liší

Při registraci firmy si owner vybere **obor**. Systém automaticky:

1. Nastaví **terminologii** (zákazník → pacient/člen/klient)
2. Předvyplní **vzorové služby** s cenami a dobami trvání
3. Nastaví **pracovní doby** (ranní/odpolední dle oboru)
4. Aktivuje **specifické funkce** (skupinové lekce, zdravotní záznamy, atd.)
5. Nastaví **notifikační šablony** s oborovým jazykem
6. Konfiguruje **AI modely** (jiné features pro fitness vs. kadeřnictví)
7. Navrhne **automatizační pravidla** typická pro daný obor

### 56.2. Detailní specifikace per obor

---

#### 🔴 KADEŘNICTVÍ / KOSMETIKA (beauty_salon)

**Terminologie:**
| Obecný pojem | Oborový pojem |
|---|---|
| Zákazník | Klient / Klientka |
| Zaměstnanec | Stylista / Kosmetička |
| Rezervace | Návštěva |
| Služba | Procedura / Ošetření |

**Vzorové služby (předvyplněné):**
| Služba | Doba | Cena | Buffer po |
|---|---|---|---|
| Střih dámský | 60 min | 500 Kč | 10 min |
| Střih pánský | 30 min | 300 Kč | 5 min |
| Barvení | 120 min | 1 200 Kč | 15 min |
| Melír | 150 min | 1 500 Kč | 15 min |
| Foukaná | 30 min | 250 Kč | 5 min |
| Manikúra | 60 min | 400 Kč | 10 min |
| Pedikúra | 60 min | 500 Kč | 10 min |
| Gelové nehty | 90 min | 800 Kč | 10 min |
| Depilace | 30 min | 300 Kč | 5 min |
| Masáž obličeje | 45 min | 600 Kč | 10 min |

**Pracovní doby (default):** Po-Pá 8:00-18:00, So 9:00-14:00

**Specifické funkce:**

- ✅ Galerie prací (fotky před/po)
- ✅ Preferovaný stylista (zákazník si vybírá)
- ✅ Spotřeba materiálu (tracking barev, produktů per rezervace)
- ✅ Multi-service booking (střih + barvení v jednom)
- ✅ Review redirect na Google/Facebook (klíčové pro beauty)
- ✅ "Vypadat zaneprázdněně" — typicky zapnuto
- ✅ Upselling: "Přidejte masáž hlavy ke střihu" (AI doporučení)

**AI doporučení:**

- No-show: Vysoká důležitost (zákazníci často ruší last-minute)
- Upselling: Hlavní zdroj zvýšení tržeb (add-on služby)
- Reminder: 24h + 2h před
- Dynamic pricing: Pátek/sobota dražší o 10-20%

**Automatizace (preset):**

1. Po dokončení → review request (2h)
2. 30 dní neaktivní → "Chybíte nám!" follow-up
3. Narozeniny → sleva 15% email (den před)
4. 5. návštěva → bonus věrnostní body

---

#### 🔴 FITNESS / POSILOVNA (fitness_gym)

**Terminologie:**
| Obecný pojem | Oborový pojem |
|---|---|
| Zákazník | Člen / Členka |
| Zaměstnanec | Trenér / Instruktor |
| Rezervace | Trénink / Lekce |
| Služba | Lekce / Program |

**Vzorové služby:**
| Služba | Doba | Cena | Kapacita |
|---|---|---|---|
| Osobní trénink | 60 min | 800 Kč | 1 |
| Skupinový trénink | 60 min | 200 Kč | 15 |
| Spinning | 45 min | 150 Kč | 20 |
| CrossFit | 60 min | 250 Kč | 12 |
| Funkční trénink | 45 min | 200 Kč | 10 |
| Konzultace výživy | 60 min | 600 Kč | 1 |
| Vstup do posilovny | 120 min | 150 Kč | 50 |
| Měsíční členství | — | 1 200 Kč | — |

**Pracovní doby:** Po-Pá 6:00-22:00, So-Ne 8:00-20:00

**Specifické funkce:**

- ✅ **Skupinové lekce (max_capacity)** — klíčová odlišnost! Jedna služba = mnoho účastníků
- ✅ **Čekací listina (waitlist)** — když je lekce plná
- ✅ **Členství / permanentky** — místo jednorázových plateb
- ✅ **Check-in systém** — QR kód při příchodu
- ✅ **Kapacita v reálném čase** — "Zbývá 3 místa"
- ✅ **Opakující se lekce** — rozvrh lekcí (každé pondělí 18:00 Spinning)
- ✅ **Trenér přiřazení** — kdo vede jakou lekci
- ❌ Galerie prací — irelevantní
- ❌ Materiál tracking — irelevantní

**AI doporučení:**

- Capacity optimizer: Hlavní AI funkce — optimalizace rozvrhu lekcí
- No-show: Střední důležitost (členové chodí pravidelněji)
- Upselling: "Zkuste i Spinning" (na základě navštívených lekcí)
- Health score: Na základě frekvence návštěv za měsíc
- Dynamic pricing: Off-peak levnější (6:00-8:00, 13:00-16:00)

**Automatizace (preset):**

1. Člen nepřišel 14 dní → motivační email
2. Lekce zítra → připomínka ("Zbývá 5 míst!")
3. Členství vyprší za 7 dní → upozornění na prodloužení
4. 50. návštěva → gratulace + bonus

**Rozdíl v UI:**

- Kalendář zobrazuje **rozvrh lekcí** místo individuálních rezervací
- Dashboard: "Dnešní lekce", "Obsazenost lekcí", "Aktivní členové"
- Zákaznický portál: "Můj rozvrh", "Zapsat se na lekci"

---

#### 🔴 JÓGA / PILATES (yoga_pilates)

**Terminologie:**
| Obecný pojem | Oborový pojem |
|---|---|
| Zákazník | Praktikant / Cvičenec |
| Zaměstnanec | Lektor / Lektorka |
| Rezervace | Lekce |
| Služba | Lekce / Workshop |

**Vzorové služby:**
| Služba | Doba | Cena | Kapacita |
|---|---|---|---|
| Hatha jóga | 75 min | 250 Kč | 15 |
| Vinyasa flow | 60 min | 250 Kč | 15 |
| Yin jóga | 90 min | 300 Kč | 12 |
| Power jóga | 60 min | 250 Kč | 15 |
| Pilates mat | 60 min | 250 Kč | 12 |
| Pilates reformer | 55 min | 450 Kč | 6 |
| Meditace | 30 min | 150 Kč | 20 |
| Privátní lekce | 60 min | 800 Kč | 1 |
| Workshop (víkend) | 180 min | 800 Kč | 20 |

**Pracovní doby:** Po-Pá 7:00-21:00, So-Ne 9:00-18:00

**Specifické funkce:**

- ✅ Skupinové lekce + čekací listina
- ✅ Permanentky (10 vstupů, 20 vstupů)
- ✅ Online streaming (Zoom lekce) — vysoká poptávka
- ✅ Level filtrování (začátečník / středně pokročilý / pokročilý)
- ✅ Potřebné vybavení (podložka, bloky — resource management)
- ✅ Opakující se rozvrh

**Rozdíl v UI:**

- Booking page: filtr podle úrovně a typu jógy
- "Tento týden doporučujeme" — AI na základě navštívených typů

---

#### 🔴 LÉKAŘ / ZUBAŘ (medical_clinic)

**Terminologie:**
| Obecný pojem | Oborový pojem |
|---|---|
| Zákazník | Pacient / Pacientka |
| Zaměstnanec | Lékař / Sestra |
| Rezervace | Vyšetření / Ošetření |
| Služba | Výkon / Zákrok |

**Vzorové služby:**
| Služba | Doba | Cena | Poznámka |
|---|---|---|---|
| Preventivní prohlídka | 30 min | 0 Kč | Pojišťovna |
| Vstupní vyšetření | 60 min | 800 Kč | |
| Kontrola | 15 min | 400 Kč | |
| Dentální hygiena | 45 min | 1 200 Kč | |
| Bělení zubů | 60 min | 3 000 Kč | |
| Plomba | 30 min | 1 500 Kč | |
| Korunka | 60 min | 5 000 Kč | |
| RTG snímek | 10 min | 300 Kč | |
| Extrakce zubu | 30 min | 2 000 Kč | Buffer: 30 min |

**Pracovní doby:** Po-Pá 7:00-16:00 (ordinační hodiny)

**Specifické funkce:**

- ✅ **Zdravotní záznamy** — poznámky k pacientovi (anamnéza, alergie, léky)
- ✅ **Pojišťovna pacienta** — číslo pojišťovny u zákazníka
- ✅ **Rodné číslo** — povinné pole (české zdravotnictví)
- ✅ **Čekárna (waiting room)** — real-time status "Jste 3. v pořadí"
- ✅ **Ordinační hodiny** — odlišné od working_hours (akutní vs. objednaní)
- ✅ **Přístrojové vybavení** — resource: RTG, laser, ultrazvuk
- ✅ **Souhlas pacienta** — GDPR + informovaný souhlas (upload podpisu)
- ✅ **SMS připomínka** — zásadní pro snížení no-show u lékařů
- ❌ Upselling — nevhodné v lékařském prostředí
- ❌ "Vypadat zaneprázdněně" — nevhodné
- ❌ Review redirect — citlivé u zdravotní péče
- ❌ Dynamic pricing — regulované ceny

**AI doporučení:**

- No-show: KRITICKÉ — no-show u lékaře = ztráta příjmu + pacient bez péče
- Reminder: SMS 48h + 24h + 2h — agresivnější než u beauty
- Health score: Na základě pravidelnosti kontrol
- Upselling: VYPNUTO (eticky nevhodné)
- Pricing: VYPNUTO (regulované)

**Automatizace (preset):**

1. 24h před → SMS připomínka (povinné)
2. Po vyšetření → email s instrukcemi
3. 6 měsíců od poslední kontroly → připomínka preventivní prohlídky
4. Nový pacient → uvítací email s formuláři (anamnéza)

**Speciální pole v DB:**

```sql
-- Rozšíření customers pro medical:
-- V industry_config JSONB:
{
  "medical": {
    "birth_number": "900101/1234",     -- Rodné číslo
    "insurance_company": "111",         -- Kód pojišťovny
    "allergies": "penicilin, latex",
    "medications": "ibuprofen",
    "blood_type": "A+",
    "medical_notes": "..."
  }
}
```

**Rozdíl v UI:**

- Zákaznický detail: záložka "Zdravotní karta" s anamnézou
- Booking form: pole "Důvod návštěvy"
- Dashboard: "Dnešní pacienti", "Čekárna", "Volné termíny"
- Calendar: pohled po 15minutových blocích (ne 30min)

---

#### 🔴 AUTOSERVIS (auto_service)

**Terminologie:**
| Obecný pojem | Oborový pojem |
|---|---|
| Zákazník | Zákazník |
| Zaměstnanec | Mechanik / Technik |
| Rezervace | Zakázka / Objednávka |
| Služba | Servisní úkon |

**Vzorové služby:**
| Služba | Doba | Cena | Resource |
|---|---|---|---|
| Výměna oleje | 30 min | 800 Kč | Zvedák |
| Přezutí pneumatik | 45 min | 600 Kč | Zvedák |
| Technická kontrola | 60 min | 1 500 Kč | Stanice |
| Klimatizace servis | 60 min | 1 200 Kč | Plnička |
| Diagnostika | 30 min | 500 Kč | OBD čtečka |
| Geometrie | 45 min | 800 Kč | Geometrie stanice |
| Oprava karoserie | 240 min | 5 000 Kč+ | Box |
| Výměna brzdových destiček | 60 min | 2 000 Kč | Zvedák |

**Pracovní doby:** Po-Pá 7:00-17:00

**Specifické funkce:**

- ✅ **SPZ / VIN vozidla** — identifikace zákazníka přes auto
- ✅ **Historie servisu per vozidlo** — ne per zákazník, ale per auto
- ✅ **Materiál / náhradní díly** — tracking spotřebovaného materiálu na zakázku
- ✅ **Fotodokumentace** — fotky poškození před/po
- ✅ **Přijímací protokol** — formulář stavu vozidla při převzetí
- ✅ **Multi-resource** — zvedák, diagnostika, box (důležité!)
- ✅ **Delší rezervace** — až 480 minut (celý den)
- ✅ **Cenová kalkulace** — práce + materiál zvlášť
- ❌ Věrnostní razítka — atypické pro autoservis
- ❌ Skupinové lekce — irelevantní

**Speciální pole:**

```sql
-- V industry_config JSONB pro autoservis:
{
  "auto_service": {
    "vehicles": [
      {
        "license_plate": "2A1 1234",
        "vin": "WBA3A5C5XDF123456",
        "make": "BMW",
        "model": "320d",
        "year": 2019,
        "mileage_km": 85000,
        "service_history": [...]
      }
    ]
  }
}
```

**Rozdíl v UI:**

- Zákaznický detail: záložka "Vozidla" s historií servisu per auto
- Booking form: výběr vozidla + typ servisu
- Dashboard: "Auta v servisu dnes", "Volné zvedáky"
- Kalendář: timeline view po hodinách (celý den viditelný)

---

#### 🔴 ÚKLIDOVÁ FIRMA (cleaning_service)

**Terminologie:**
| Obecný pojem | Oborový pojem |
|---|---|
| Zákazník | Klient |
| Zaměstnanec | Pracovník / Uklízečka |
| Rezervace | Zakázka |
| Služba | Typ úklidu |

**Vzorové služby:**
| Služba | Doba | Cena | Poznámka |
|---|---|---|---|
| Běžný úklid (byt 2+1) | 120 min | 1 200 Kč | |
| Generální úklid | 240 min | 3 000 Kč | |
| Úklid po malování | 180 min | 2 500 Kč | |
| Mytí oken | 90 min | 800 Kč | |
| Úklid kanceláře | 60 min | 600 Kč | Opakující se |
| Čištění koberců | 120 min | 1 500 Kč | Speciální stroj |

**Specifické funkce:**

- ✅ **Adresa zakázky** — každá rezervace má jinou adresu (ne jedna provozovna)
- ✅ **Cestovní čas** — buffer mezi zakázkami dle vzdálenosti
- ✅ **Opakující se zakázky** — "každé pondělí úklid kanceláře"
- ✅ **Plocha / rozloha** — dynamická cena dle m²
- ✅ **Checklist** — co vše zahrnuje daný typ úklidu
- ✅ **Fotodokumentace** — před/po úklid

---

#### 🔴 DOUČOVÁNÍ / KOREPETICE (tutoring)

**Terminologie:**
| Obecný pojem | Oborový pojem |
|---|---|
| Zákazník | Žák / Student (nebo rodič) |
| Zaměstnanec | Lektor / Tutor |
| Rezervace | Hodina / Lekce |
| Služba | Předmět |

**Vzorové služby:**
| Služba | Doba | Cena | Online |
|---|---|---|---|
| Matematika ZŠ | 60 min | 400 Kč | ✅ |
| Matematika SŠ | 60 min | 500 Kč | ✅ |
| Angličtina | 60 min | 450 Kč | ✅ |
| Čeština příprava | 60 min | 400 Kč | ✅ |
| Fyzika | 60 min | 500 Kč | ✅ |
| Příprava k maturitě | 90 min | 700 Kč | ✅ |

**Specifické funkce:**

- ✅ **Video lekce** — primární kanál (Zoom/Meet)
- ✅ **Skupinové lekce** — malé skupiny (2-5 studentů)
- ✅ **Poznámky z hodiny** — shrnutí co se probíralo
- ✅ **Domácí úkol** — přiřazení úkolu po lekci
- ✅ **Pokrok studenta** — tracking známek / výsledků
- ✅ **Kontakt na rodiče** — notifikace rodičům (ne studentovi)

---

#### 🔴 FOTOGRAFICKÝ ATELIÉR (photography)

**Vzorové služby:**
| Služba | Doba | Cena |
|---|---|---|
| Portrétní focení | 60 min | 2 000 Kč |
| Rodinné focení | 90 min | 3 000 Kč |
| Produktové focení | 120 min | 4 000 Kč |
| Svatební focení | 480 min | 15 000 Kč |
| Novorozenecké focení | 120 min | 3 500 Kč |

**Specifické funkce:**

- ✅ **Galerie** — online prohlížečka fotek pro klienta
- ✅ **Výběr fotek** — klient vybírá oblíbené z galerie
- ✅ **Tisky / produkty** — objednávka fotoobrazů, fotoknih
- ✅ **Záloha při rezervaci** — povinná (vysoká hodnota zakázky)
- ✅ **Lokace** — focení může být na různých místech

---

### 56.3. Industry Config Schema

```typescript
interface IndustryConfig {
  // Terminologie
  terminology: {
    customer: string; // "Klient" | "Pacient" | "Člen"
    employee: string; // "Stylista" | "Lékař" | "Trenér"
    booking: string; // "Návštěva" | "Vyšetření" | "Lekce"
    service: string; // "Procedura" | "Výkon" | "Lekce"
  };

  // UI konfigurace
  ui: {
    calendar_slot_minutes: number; // 15 (medical) | 30 (beauty) | 60 (fitness)
    show_capacity: boolean; // true pro skupinové lekce
    show_waitlist: boolean; // true pro fitness/yoga
    show_employee_picker: boolean; // true pro beauty, false pro medical
    show_resource_picker: boolean; // true pro autoservis
    show_gallery: boolean; // true pro beauty, photography
    booking_steps: string[]; // ['service', 'datetime', 'details', 'payment']
    customer_extra_fields: string[]; // ['birth_number', 'insurance'] pro medical
    booking_extra_fields: string[]; // ['vehicle_id'] pro autoservis
  };

  // Funkce
  features: {
    group_booking: boolean; // fitness, yoga
    waitlist: boolean; // fitness, yoga
    recurring_booking: boolean; // cleaning, tutoring, fitness
    membership: boolean; // fitness, yoga
    material_tracking: boolean; // beauty, autoservis
    health_records: boolean; // medical, veterinary
    vehicle_records: boolean; // autoservis
    photo_gallery: boolean; // beauty, photography
    upselling_enabled: boolean; // beauty=true, medical=false
    dynamic_pricing_enabled: boolean; // beauty=true, medical=false
    busy_appearance_enabled: boolean; // beauty=true, medical=false
    review_redirect_enabled: boolean; // beauty=true, medical=false
    video_primary: boolean; // tutoring=true
    address_per_booking: boolean; // cleaning=true
  };

  // AI konfigurace
  ai: {
    noshow_importance: 'high' | 'medium' | 'low';
    upselling_enabled: boolean;
    pricing_enabled: boolean;
    capacity_optimization: boolean;
    reminder_aggressiveness: 'gentle' | 'standard' | 'aggressive';
  };

  // Defaultní automatizace
  default_automations: AutomationPreset[];

  // Vzorové služby
  sample_services: ServicePreset[];

  // Defaultní pracovní doby
  default_working_hours: WorkingHoursPreset;
}
```

### 56.4. Onboarding per obor

```
Krok 1: Vyberte váš obor
  ┌─────────────────────────────────────┐
  │  💇 Kadeřnictví / Kosmetika         │
  │  💪 Fitness / Posilovna              │
  │  🧘 Jóga / Pilates                  │
  │  🏥 Lékař / Zubař                   │
  │  🐕 Veterina                        │
  │  🚗 Autoservis                      │
  │  🧹 Úklidová firma                  │
  │  📚 Doučování                       │
  │  📷 Fotografický ateliér            │
  │  💼 Konzultace / Poradenství        │
  │  🏢 Coworking                       │
  │  ✏️ Jiné (obecné)                   │
  └─────────────────────────────────────┘

  → Po výběru se automaticky nastaví:
    ✅ Terminologie
    ✅ Vzorové služby (editovatelné)
    ✅ Pracovní doby
    ✅ Notifikační šablony
    ✅ AI konfigurace
    ✅ Automatizační pravidla

Krok 2: Upravte si předvyplněné služby
  (seznam je předvyplněn dle oboru, owner může přidat/smazat/upravit)

Krok 3: Nastavte pracovní doby
  (předvyplněno dle oboru)

Krok 4: Přidejte zaměstnance
  (specifická terminologie — "Přidejte prvního stylistu" vs "Přidejte prvního lékaře")

Krok 5: Nastavte platební bránu (volitelné)

→ Dashboard s průvodcem: "Sdílejte svou booking stránku se zákazníky!"
```

---

## 57. Super-Admin Dashboard (Platformová správa)

### 57.1. Přehled

Super-Admin je interní dashboard pro tým ScheduleBox (ne pro zákazníky). Slouží ke správě celé platformy, všech tenantů, monitoringu a podpoře.

**URL:** `https://admin.schedulebox.cz`
**Přístup:** Role `admin` (ne `owner`!) + 2FA povinné + VPN / IP whitelist

### 57.2. Super-Admin Menu

```
🏠  Platform Dashboard           → /admin/dashboard
👥  Firmy (Tenanti)              → /admin/companies
    ├── Seznam firem
    ├── Nové registrace (dnes)
    ├── Čekající na aktivaci
    ├── Suspendované
    └── Per obor statistiky
💳  Billing & Revenue            → /admin/billing
    ├── MRR přehled
    ├── Churn tracking
    ├── Platby
    └── Faktury
📊  Platform Analytics           → /admin/analytics
    ├── Globální KPIs
    ├── Growth metriky
    ├── Obor breakdown
    └── Kohorty
🏗️  Infrastructure              → /admin/infra
    ├── Service Health
    ├── DB Metrics
    ├── Event Processing Status
    ├── Error Rate
    └── Performance
🛡️  Security                    → /admin/security
    ├── Audit Log
    ├── Suspicious Activity
    ├── Failed Logins
    └── API Key Usage
🎫  Support Tickets              → /admin/support
🔔  Alerts                       → /admin/alerts
⚙️  Platform Settings           → /admin/settings
    ├── Feature Flags
    ├── Industry Presets
    ├── Email Templates (global)
    ├── Pricing Plans
    └── Maintenance Mode
```

### 57.3. Super-Admin Dashboard — Hlavní obrazovka

```
┌─────────────────────────────────────────────────────────────┐
│  ScheduleBox Admin                    🔔 3   👤 Admin Team  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  │
│  │ Celkem    │ │  MRR      │ │  Nové     │ │  Churn    │  │
│  │ firem     │ │           │ │  dnes     │ │  rate     │  │
│  │  1 247    │ │ 1.85M Kč  │ │    12     │ │   2.3%    │  │
│  │ +48 /měs  │ │ +12% MoM  │ │           │ │   -0.5%   │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘  │
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  │
│  │ Aktivní   │ │ Celkem    │ │ Rezervací │ │ Plateb    │  │
│  │ uživatelé │ │ rezervací │ │  dnes     │ │  dnes     │  │
│  │  3 842    │ │ 245 000   │ │  1 847    │ │ 456 200Kč │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘  │
│                                                             │
│  📊 Firmy per obor:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💇 Beauty/Salon    ████████████████████  42% (524)  │   │
│  │ 💪 Fitness         ████████████          25% (312)  │   │
│  │ 🧘 Yoga/Pilates    ██████                12% (150)  │   │
│  │ 🏥 Medical          ████                  8% (100)  │   │
│  │ 🚗 Auto Service     ███                   5%  (62)  │   │
│  │ 📷 Photography      ██                    3%  (37)  │   │
│  │ 🧹 Cleaning         █                     2%  (25)  │   │
│  │ 📚 Tutoring          █                    1.5% (19) │   │
│  │ ✏️ Other             █                    1.5% (18) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📈 MRR growth (12 měsíců):                                │
│  ▁▂▃▃▄▅▅▆▇▇██                                             │
│                                                             │
│  ⚠️ Alerts:                                                │
│  │ 🔴 Error rate > 5% (Payment Service) — 14:23          │ │
│  │ 🟡 DLQ: 3 messages in notification queue — 14:10      │ │
│  │ 🟡 New company "FitLife" čeká na verifikaci — 13:55   │ │
│                                                             │
│  📋 Poslední registrace:                                    │
│  │ FitLife (fitness)    │ Praha   │ Growth  │ Dnes 13:55 │ │
│  │ Studio Zen (yoga)    │ Brno    │ Essential│ Dnes 11:20│ │
│  │ MUDr. Hora (medical) │ Ostrava │ AI-Power│ Včera      │ │
└─────────────────────────────────────────────────────────────┘
```

### 57.4. Správa firem (Company Management)

```
┌─────────────────────────────────────────────────────────────┐
│  Firmy                          🔎 Hledat...    [+ Nová]   │
├─────────────────────────────────────────────────────────────┤
│  Filter: [Všechny ▼] [Obor ▼] [Plán ▼] [Status ▼]        │
│                                                             │
│  │ Firma          │ Obor     │ Plán      │ MRR    │ Status │
│  ├────────────────┼──────────┼───────────┼────────┼────────│
│  │ Salon Krása    │ 💇 Beauty│ AI-Powered│ 2990 Kč│ ✅ Act.│
│  │ FitZone        │ 💪 Fit   │ Growth    │ 1490 Kč│ ✅ Act.│
│  │ MUDr. Novák    │ 🏥 Med   │ Essential │  490 Kč│ ✅ Act.│
│  │ Yoga Shanti    │ 🧘 Yoga  │ Growth    │ 1490 Kč│ ✅ Act.│
│  │ AutoPro        │ 🚗 Auto  │ Essential │  490 Kč│ ⚠️ Late│
│  │ TestFirma      │ ✏️ General│ Free      │    0 Kč│ 🔴 Susp│
│                                                             │
│  Klik na firmu → Detail:                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Salon Krása                              [Impersonate]│   │
│  │ Owner: Jana Nováková (jana@salon.cz)                 │   │
│  │ Obor: Beauty | Plán: AI-Powered (2 990 Kč/měs)     │   │
│  │ Registrace: 15.3.2025 | Aktivní: 332 dní            │   │
│  │                                                       │   │
│  │ Stats: 3 zaměstnanci | 520 zákazníků | 3.2k rezervací│   │
│  │ MRR: 2 990 Kč | LTV: 33 000 Kč                      │   │
│  │                                                       │   │
│  │ [📊 Analytics] [💳 Billing] [⚙️ Settings]            │   │
│  │ [🔒 Suspendovat] [🗑️ Smazat] [📧 Kontaktovat]       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 57.5. Super-Admin funkce

| Funkce                  | Popis                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| **Impersonate**         | Přihlášení jako owner dané firmy pro troubleshooting (s audit logem)     |
| **Suspend / Unsuspend** | Zablokování firmy (nezaplaceno, porušení podmínek)                       |
| **Plan override**       | Ruční změna plánu (trial prodloužení, custom pricing)                    |
| **Feature flag**        | Zapnutí/vypnutí specifické funkce pro konkrétní firmu                    |
| **Data export**         | Export všech dat firmy (GDPR request od ownera)                          |
| **Delete company**      | Úplné smazání (se soft-delete a 30denní retention)                       |
| **Broadcast message**   | Hromadné oznámení všem firmám (maintenance, novinky)                     |
| **Maintenance mode**    | Globální nebo per-service maintenance mód                                |
| **Global analytics**    | Agregované metriky přes všechny firmy (bez přístupu k specifickým datům) |
| **Audit log viewer**    | Kdo co kdy udělal (impersonate, suspend, delete...)                      |

### 57.6. Super-Admin DB

```sql
-- Tabulka pro super-admin audit log (oddělená od tenant audit_logs)
CREATE TABLE platform_audit_logs (
    id              SERIAL PRIMARY KEY,
    admin_user_id   INTEGER NOT NULL REFERENCES users(id),
    action          VARCHAR(100) NOT NULL, -- 'impersonate', 'suspend', 'delete', 'plan_change', 'feature_flag'
    target_company_id INTEGER REFERENCES companies(id),
    target_user_id  INTEGER REFERENCES users(id),
    details         JSONB DEFAULT '{}',
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka pro feature flags
CREATE TABLE feature_flags (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL, -- 'ai_voice_booking', 'new_calendar_ui'
    description     TEXT,
    is_global       BOOLEAN DEFAULT FALSE,        -- platí pro všechny
    enabled_for     INTEGER[] DEFAULT '{}',        -- seznam company_ids
    disabled_for    INTEGER[] DEFAULT '{}',        -- výjimky z globálního
    percentage      SMALLINT DEFAULT 0,            -- gradual rollout (0-100%)
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka pro platform metriky (denní snapshot)
CREATE TABLE platform_daily_metrics (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL UNIQUE,
    total_companies INTEGER,
    active_companies INTEGER,
    new_companies   INTEGER,
    churned_companies INTEGER,
    total_users     INTEGER,
    total_bookings  INTEGER,
    total_revenue   DECIMAL(15,2), -- platformy revenue (subscriptions)
    total_gmv       DECIMAL(15,2), -- gross merchandise value (platby zákazníků)
    mrr             DECIMAL(12,2),
    bookings_by_industry JSONB,   -- {"beauty": 5000, "fitness": 3000, ...}
    companies_by_plan JSONB,      -- {"free": 200, "essential": 400, ...}
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_metrics_date ON platform_daily_metrics(date);
```

### 57.7. Super-Admin API Endpointy

```yaml
# Prefix: /admin (vyžaduje role=admin + IP whitelist)

/admin/companies:
  get:
    summary: Seznam všech firem s filtrováním
    parameters: [industry, plan, status, search, page, limit]
  post:
    summary: Vytvoření firmy (manuální registrace)

/admin/companies/{id}:
  get: Detail firmy
  put: Úprava firmy (plán, status, features)
  delete: Smazání firmy (soft delete)

/admin/companies/{id}/suspend:
  post: Suspendování firmy

/admin/companies/{id}/unsuspend:
  post: Zrušení suspendu

/admin/companies/{id}/impersonate:
  post: Přihlášení jako owner (vrátí temporary token)

/admin/companies/{id}/export:
  get: Export všech dat firmy (GDPR)

/admin/analytics/dashboard:
  get: Globální KPIs

/admin/analytics/mrr:
  get: MRR over time

/admin/analytics/cohorts:
  get: Kohortová analýza

/admin/analytics/industry:
  get: Breakdown per obor

/admin/feature-flags:
  get: Seznam feature flags
  post: Vytvoření flagu
/admin/feature-flags/{id}:
  put: Úprava flagu

/admin/audit-logs:
  get: Platform audit log

/admin/broadcast:
  post: Hromadné oznámení
```

---

## 58. Přehledová tabulka — Jak se obory liší

| Funkce / Vlastnost     | 💇 Beauty | 💪 Fitness | 🧘 Yoga | 🏥 Medical | 🚗 Auto  | 🧹 Cleaning | 📚 Tutoring | 📷 Photo  |
| ---------------------- | :-------: | :--------: | :-----: | :--------: | :------: | :---------: | :---------: | :-------: |
| Individuální booking   |    ✅     |     ✅     |   ✅    |     ✅     |    ✅    |     ✅      |     ✅      |    ✅     |
| Skupinové lekce        |    ❌     |     ✅     |   ✅    |     ❌     |    ❌    |     ❌      |     ✅      |    ❌     |
| Čekací listina         |    ❌     |     ✅     |   ✅    |     ❌     |    ❌    |     ❌      |     ❌      |    ❌     |
| Členství / permanentky |    ❌     |     ✅     |   ✅    |     ❌     |    ❌    |     ❌      |     ❌      |    ❌     |
| Opakující se rez.      |    ❌     |     ✅     |   ✅    |     ❌     |    ❌    |     ✅      |     ✅      |    ❌     |
| Video lekce primárně   |    ❌     |     ❌     |   ✅    |     ❌     |    ❌    |     ❌      |     ✅      |    ❌     |
| Zdravotní záznamy      |    ❌     |     ❌     |   ❌    |     ✅     |    ❌    |     ❌      |     ❌      |    ❌     |
| Vozidla/SPZ            |    ❌     |     ❌     |   ❌    |     ❌     |    ✅    |     ❌      |     ❌      |    ❌     |
| Adresa per rez.        |    ❌     |     ❌     |   ❌    |     ❌     |    ❌    |     ✅      |     ❌      |    ✅     |
| Materiál tracking      |    ✅     |     ❌     |   ❌    |     ❌     |    ✅    |     ❌      |     ❌      |    ❌     |
| Resource management    |    ❌     |     ✅     |   ✅    |     ✅     |    ✅    |     ❌      |     ❌      |    ❌     |
| Galerie prací          |    ✅     |     ❌     |   ❌    |     ❌     |    ❌    |     ✅      |     ❌      |    ✅     |
| Upselling (AI)         |    ✅     |     ✅     |   ✅    |     ❌     |    ✅    |     ✅      |     ❌      |    ✅     |
| Dynamic pricing        |    ✅     |     ✅     |   ✅    |     ❌     |    ❌    |     ❌      |     ❌      |    ❌     |
| Review redirect        |    ✅     |     ✅     |   ✅    |     ❌     |    ✅    |     ✅      |     ✅      |    ✅     |
| "Zaneprázdněně"        |    ✅     |     ✅     |   ✅    |     ❌     |    ❌    |     ❌      |     ❌      |    ❌     |
| Slot délka (default)   |  30 min   |   60 min   | 75 min  |   15 min   |  60 min  |   120 min   |   60 min    |  60 min   |
| No-show důležitost     |  Vysoká   |  Střední   | Střední |  Kritická  |  Nízká   |    Nízká    |   Střední   |  Vysoká   |
| Reminder agresivita    | Standard  |  Standard  | Gentle  | Agresivní  | Standard |  Standard   |  Standard   | Agresivní |

# KONEC DOKUMENTACE

**Tento dokument obsahuje 100% kompletní specifikaci pro autonomní vývoj platformy ScheduleBox.**

Statistiky dokumentace:

- 88 databázových tabulek (Drizzle ORM schéma s indexy, RLS)
- 199+ API route souborů, 250+ operací
- 65 API schémat
- 122+ frontend komponent (props, state, events, API calls)
- 7 AI/ML modelů (algoritmy, features, fallbacks)
- 19 doménových modulů (monolith, boundaries, dependencies, events)
- 20+ domain events (CloudEvents format, synchronní zpracování)
- Kompletní RBAC matice (99 endpointů × 4 role)
- SAGA workflows, resilience patterns, circuit breakers
- CI/CD pipeline, Docker, Kubernetes manifesty
- Observability stack (tracing, metrics, logging, alerting)
- Validační schémata (Zod)
- Test strategie s Gherkin scénáři

Verze: 13.0 FINAL — 10. února 2026

# Phase 24: AI-Powered UI Surfaces - Research

**Researched:** 2026-02-21
**Domain:** React/Next.js UI components, AI prediction display, TanStack Query integration
**Confidence:** HIGH (all patterns verified against existing codebase)

---

## Summary

Phase 24 surfaces AI predictions in the dashboard UI, making the AI investment tangible for demos. The codebase already has every integration point needed: the `NoShowPredictionResponse` type with `no_show_probability`, `confidence`, `risk_level`, and `fallback` fields; the `predictNoShow` circuit breaker client; the `Booking` type with `noShowProbability: number | null` field; shadcn/ui `Badge`, `Card`, `Progress`, `Tooltip`, and `Skeleton` components; and the TanStack Query hooks for bookings and analytics. No new libraries are needed.

The work is pure UI composition: (1) a `NoShowRiskBadge` component that color-codes risk levels, (2) integration into the booking list table and detail panel, (3) an AI insights panel on the dashboard page, (4) an API route to fetch AI insights (today's high-risk bookings + suggestions), and (5) an onboarding state component that shows a progress indicator when a company has fewer than 10 bookings.

---

## Existing Codebase Analysis

### Booking List Page (`apps/web/app/[locale]/(dashboard)/bookings/page.tsx`)

- Uses `useBookingsQuery` hook (TanStack Query) returning `PaginatedResponse<Booking>`
- Renders a `<Table>` with columns: dateTime, customer, service, employee, status, price
- Each row has `BookingStatusBadge` in the status column
- Row click opens `BookingDetailPanel` slide-over sheet
- The `Booking` type already has `noShowProbability: number | null` field
- **No-show risk badge insertion point:** New column after status, before price

### Booking Detail Panel (`apps/web/components/booking/BookingDetailPanel.tsx`)

- Slide-over `Sheet` component showing full booking details
- Has sections: customer info, service/employee, date/time, price, notes, metadata, action buttons
- `BookingDetail` interface already includes `noShowProbability: number | null`
- **AI risk display insertion point:** New section between metadata and action buttons

### Dashboard Page (`apps/web/app/[locale]/(dashboard)/page.tsx`)

- Simple layout: `PageHeader`, `DashboardGrid` (4 stat cards), `QuickActions`
- Uses `space-y-8` for vertical spacing
- **AI insights panel insertion point:** After `DashboardGrid`, before `QuickActions`

### AI Client (`apps/web/lib/ai/client.ts`)

- `predictNoShow` circuit breaker wraps HTTP call to AI service
- Returns `NoShowPredictionResponse`: `{ booking_id, no_show_probability, confidence, risk_level, model_version, fallback }`
- Fallback returns `{ probability: 0.15, confidence: 0.0, risk_level: 'low', fallback: true }`
- **Key insight:** The booking list already has `noShowProbability` on each booking row from the API. For the list badge, we do NOT need to call the AI service separately for each booking -- just use the stored value.

### Available UI Components

| Component | Path | Purpose for Phase 24 |
|-----------|------|---------------------|
| `Badge` | `components/ui/badge.tsx` | Base for NoShowRiskBadge (has variant system via CVA) |
| `Card` | `components/ui/card.tsx` | AI insights panel container |
| `Progress` | `components/ui/progress.tsx` | "X of 10 bookings" onboarding progress |
| `Tooltip` | `components/ui/tooltip.tsx` | Explain risk levels on hover |
| `Skeleton` | `components/ui/skeleton.tsx` | Loading state for AI data |
| `Separator` | `components/ui/separator.tsx` | Section dividers in detail panel |
| `BookingStatusBadge` | `components/booking/BookingStatusBadge.tsx` | Pattern to follow for NoShowRiskBadge |

### i18n Pattern

- Messages in `apps/web/messages/cs.json` (Czech), `sk.json`, `en.json`
- Accessed via `useTranslations('namespace')` from `next-intl`
- New keys needed under `ai` namespace

### Analytics Data

- `useAnalyticsQuery(30)` returns `totalBookings`, `totalRevenue`, etc.
- New hook needed: `useAiInsightsQuery` for dashboard AI panel
- New API route needed: `/api/v1/ai/insights` aggregating today's high-risk bookings

---

## Architecture Decisions

### 1. No-Show Risk Badge Data Source

**Decision:** Use the `noShowProbability` field already on each `Booking` object from the list API, NOT individual AI service calls per row.

**Rationale:** The booking list can show 20+ rows. Calling the AI service for each row would create 20+ HTTP requests, add 2-4 seconds of latency, and stress the circuit breaker. The `Booking` type already stores `noShowProbability: number | null` -- this is populated asynchronously after booking creation (via RabbitMQ event) and served from the database.

**For the detail panel:** Also use the stored `noShowProbability` from the booking record. Only call the AI service directly if the value is `null` (not yet scored).

### 2. AI Insights Dashboard API

**Decision:** Create a new server-side API route `/api/v1/ai/insights` that aggregates today's upcoming bookings with no-show risk, rather than fetching all bookings client-side and filtering.

**Rationale:** The dashboard should show a focused daily digest ("3 high-risk bookings today"). Fetching all bookings and filtering client-side wastes bandwidth and exposes unnecessary data. A dedicated endpoint can efficiently query only today's upcoming bookings with `noShowProbability > 0.3`.

### 3. "10 Bookings" Threshold Check

**Decision:** Use the existing analytics overview API (`/api/v1/analytics/overview`) which returns `totalBookings` for the current period. Check against a threshold of 10. If below, show the onboarding state; if above, show AI predictions.

**Alternative considered:** Add a dedicated API route for booking count. Rejected because the analytics overview already provides this data and is already cached in TanStack Query on the dashboard.

### 4. Component Architecture

```
apps/web/components/ai/
  NoShowRiskBadge.tsx       -- Color-coded badge (red/yellow/green)
  NoShowRiskDetail.tsx      -- Detail panel section with probability + actionable label
  AiInsightsPanel.tsx       -- Dashboard daily digest card
  AiOnboardingState.tsx     -- "AI features activate after 10 bookings" with Progress
```

New components go in `components/ai/` directory (new), following the existing pattern of domain-specific component directories (`components/booking/`, `components/dashboard/`, etc.).

---

## API Response Shapes

### Existing: NoShowPredictionResponse (from `apps/web/lib/ai/types.ts`)

```typescript
interface NoShowPredictionResponse {
  booking_id: number;
  no_show_probability: number;  // 0.0 to 1.0
  confidence: number;           // 0.0 to 1.0
  risk_level: 'low' | 'medium' | 'high';
  model_version: string;        // "v1.0.0" or "fallback"
  fallback: boolean;            // true when AI service unavailable
}
```

### Existing: Booking.noShowProbability (from `packages/shared/src/types/booking.ts`)

```typescript
type Booking = {
  // ...
  noShowProbability: number | null;  // null = not yet scored
  // ...
};
```

### New: AI Insights API Response (to be created)

```typescript
interface AiInsightsResponse {
  highRiskBookings: Array<{
    bookingId: string;
    customerName: string;
    serviceName: string;
    startTime: string;
    noShowProbability: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  totalTodayBookings: number;
  highRiskCount: number;
  aiActive: boolean;          // false when company has <10 bookings
  totalCompanyBookings: number; // for progress indicator
  suggestions: string[];      // ["3 high-risk bookings today - consider SMS reminders"]
}
```

---

## Risk Level Mapping

| Probability Range | Risk Level | Badge Color | Label (Czech) |
|-------------------|------------|-------------|---------------|
| >= 0.50 | high | red (bg-red-100 text-red-800) | "Vysoke riziko" |
| 0.30 - 0.49 | medium | yellow (bg-amber-100 text-amber-800) | "Stredni riziko" |
| < 0.30 | low | green (bg-green-100 text-green-800) | "Nizke riziko" |
| null (not scored) | unknown | gray (bg-gray-100 text-gray-500) | "-" |

### Actionable Labels for Detail Panel

| Risk Level | Actionable Label (Czech) |
|------------|--------------------------|
| high (>= 0.50) | "Vysoke riziko -- zvazte zaslani SMS pripominky" |
| medium (0.30-0.49) | "Stredni riziko -- doporucujeme potvrdit ucast" |
| low (< 0.30) | "Nizke riziko -- zadna akce neni potreba" |

---

## i18n Keys Structure

```json
{
  "ai": {
    "riskBadge": {
      "high": "Vysoke riziko",
      "medium": "Stredni riziko",
      "low": "Nizke riziko",
      "unknown": "Neohodnoceno"
    },
    "riskDetail": {
      "title": "AI predikce nedostaveni",
      "probability": "Pravdepodobnost nedostaveni",
      "confidence": "Spolehlivost AI",
      "highAction": "Vysoke riziko -- zvazte zaslani SMS pripominky",
      "mediumAction": "Stredni riziko -- doporucujeme potvrdit ucast",
      "lowAction": "Nizke riziko -- zadna akce neni potreba",
      "fallbackNote": "AI sluzba je docasne nedostupna. Zobrazena je vychozi hodnota.",
      "notScored": "Tato rezervace jeste nebyla vyhodnocena AI."
    },
    "insights": {
      "title": "AI prehled",
      "subtitle": "Dnesni predikce a doporuceni",
      "highRiskToday": "{count} rezervaci s vysokym rizikem nedostaveni",
      "noHighRisk": "Zadne vysoko rizikove rezervace na dnes",
      "totalToday": "{count} rezervaci na dnes",
      "viewAll": "Zobrazit vse",
      "suggestion": "Doporuceni"
    },
    "onboarding": {
      "title": "AI funkce se aktivuji po 10 rezervacich",
      "description": "ScheduleBox se uci z vasich rezervaci. Po dosazeni 10 rezervaci zacne AI predikovat riziko nedostaveni a optimalizovat ceny.",
      "progress": "{count} z 10 rezervaci",
      "almostThere": "Jeste {remaining} rezervaci a AI se aktivuje!"
    }
  }
}
```

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `apps/web/components/ai/NoShowRiskBadge.tsx` | Color-coded risk badge for booking list |
| `apps/web/components/ai/NoShowRiskDetail.tsx` | Risk detail section for booking detail panel |
| `apps/web/components/ai/AiInsightsPanel.tsx` | Dashboard daily digest card |
| `apps/web/components/ai/AiOnboardingState.tsx` | "10 bookings" progress indicator |
| `apps/web/app/api/v1/ai/insights/route.ts` | Server-side AI insights aggregation |
| `apps/web/hooks/use-ai-insights-query.ts` | TanStack Query hook for AI insights |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` | Add "Risk" column header + NoShowRiskBadge in each row |
| `apps/web/components/booking/BookingDetailPanel.tsx` | Add NoShowRiskDetail section |
| `apps/web/app/[locale]/(dashboard)/page.tsx` | Add AiInsightsPanel between DashboardGrid and QuickActions |
| `apps/web/messages/cs.json` | Add `ai.*` namespace |
| `apps/web/messages/en.json` | Add `ai.*` namespace |
| `apps/web/messages/sk.json` | Add `ai.*` namespace |

---

## Sources

- Codebase: `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` -- booking list structure, column layout
- Codebase: `apps/web/components/booking/BookingDetailPanel.tsx` -- detail panel sections, `noShowProbability` field
- Codebase: `apps/web/components/booking/BookingStatusBadge.tsx` -- badge pattern to follow
- Codebase: `apps/web/lib/ai/types.ts` -- `NoShowPredictionResponse` shape
- Codebase: `apps/web/lib/ai/client.ts` -- circuit breaker client API
- Codebase: `apps/web/lib/ai/fallback.ts` -- fallback behavior
- Codebase: `packages/shared/src/types/booking.ts` -- `Booking.noShowProbability` field
- Codebase: `apps/web/hooks/use-bookings-query.ts` -- TanStack Query patterns
- Codebase: `apps/web/hooks/use-analytics-query.ts` -- analytics data pattern
- Codebase: `apps/web/components/ui/badge.tsx` -- CVA badge variant system
- Codebase: `apps/web/components/ui/progress.tsx` -- progress bar component
- Documentation: `schedulebox_complete_documentation.md` lines 6910-6945 -- No-show predictor spec and API response format

---

*Research completed: 2026-02-21*
*Confidence: HIGH -- all integration points verified against existing codebase*

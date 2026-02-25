# Phase 35: Dashboard Glass Application — Research

**Researched:** 2026-02-25
**Domain:** Next.js 14 App Router layout composition, CSS stacking context management, glassmorphism application to existing dashboard pages
**Confidence:** HIGH

---

## Summary

Phase 35 applies the Phase 34 glass component library to the logged-in dashboard experience. The work is **purely additive**: existing pages receive `GradientMesh`, `variant="glass"` on selected Cards, and `glass-surface-subtle` on the Header — no new components are built, no APIs change, no existing data tables or calendar canvases are touched. The Glass component library from Phase 34 is fully verified (9/9 truths, 6/6 requirements) and ready to consume.

The dashboard layout file (`apps/web/app/[locale]/(dashboard)/layout.tsx`) is the single control point for the gradient mesh background and for header frosting. The Header (`components/layout/header.tsx`) is a `'use client'` component with a single `<header>` element at `z-10` — adding `glass-surface-subtle` and replacing `bg-background` with the glass surface class is the only change needed. The Sidebar (`components/layout/sidebar.tsx`) already uses `bg-background` — it must remain untouched per the locked decision (DASH-05).

The stacking context audit reveals a clean story: the dashboard layout uses no stacking-context-triggering CSS (`transform`, `filter`, `opacity < 1`, `will-change`) on any layout wrappers. The Header is at `z-10`, Sheet overlays and Dialog overlays are at `z-50` (via Radix Portal), and the GradientMesh sits at `z-index: -10`. No conflicts are expected when GradientMesh is added to the layout. The `flex h-screen` wrapper in the layout and the `overflow-hidden` on the main scroll container are the only layout constraints to watch — they do not create stacking contexts.

**Primary recommendation:** Place `<GradientMesh preset="dashboard" />` in the dashboard layout as the FIRST child of the outermost `flex h-screen` div. Apply `glass-surface-subtle` to the Header element replacing `bg-background`. Apply `variant="glass"` to StatCard's internal `<Card>`. Wrap each sub-page's content section in a `<Card variant="glass">` leaving Table and chart canvas elements as siblings (not children) inside the card, or wrap only the header section of each page in glass.

---

## Standard Stack

No new npm packages. Everything already installed and verified.

### Core (all from Phase 33/34, already complete)

| Library | Version | Purpose | Status |
| ------- | ------- | ------- | ------ |
| `Card` with `variant="glass"` | Phase 34 output | Glass card for KPI stat cards and content section wrappers | COMPLETE — `apps/web/components/ui/card.tsx` |
| `GradientMesh` | Phase 34 output | Fixed `z-index: -10` background mesh for layout | COMPLETE — `apps/web/components/glass/gradient-mesh.tsx` |
| `GlassPanel` | Phase 34 output | Flexible glass wrapper with `intensity` prop | COMPLETE — `apps/web/components/glass/glass-panel.tsx` |
| `glass-surface-subtle` | Phase 33 output | Tailwind utility for subtle glass (8px blur) | COMPLETE — registered in `glass-plugin.ts` |
| `cn()` from `@/lib/utils` | Already installed | Class conflict resolution | COMPLETE |

### Key Component APIs (verified from source)

```typescript
// Card — use variant="glass" for KPI cards and content section wrappers
<Card variant="glass">...</Card>

// GradientMesh — use preset="dashboard" in layout
<GradientMesh preset="dashboard" />

// GlassPanel — fallback for glass wrappers that are not Card-shaped
<GlassPanel intensity="subtle">...</GlassPanel>
```

**Installation:** No packages to install.

---

## Architecture Patterns

### Recommended File Change Map

```
apps/web/
├── app/[locale]/(dashboard)/
│   ├── layout.tsx                    # MODIFIED: add GradientMesh + stacking audit
│   ├── dashboard/page.tsx            # MODIFIED: gradient welcome text
│   ├── analytics/page.tsx            # MODIFIED: glass wrappers on content Cards
│   ├── bookings/page.tsx             # MODIFIED: glass page wrapper Card
│   ├── calendar/page.tsx             # MODIFIED: glass page wrapper Card
│   ├── customers/page.tsx            # MODIFIED: glass page wrapper Card
│   ├── settings/page.tsx             # MODIFIED: glass wrapper on CompanyProfileCard etc.
│   └── settings/billing/page.tsx    # MODIFIED: glass wrappers on plan cards
├── components/layout/
│   ├── header.tsx                    # MODIFIED: bg-background → glass-surface-subtle
│   └── sidebar.tsx                  # NO CHANGE (Decision: solid, legibility)
└── components/dashboard/
    └── stat-card.tsx                 # MODIFIED: Card variant="glass" + gradient welcome text
```

### Pattern 1: GradientMesh in Dashboard Layout

**What:** Add `<GradientMesh preset="dashboard" />` as the first child inside the outermost `div` of the dashboard layout. The `gradient-mesh` CSS class applies `position: fixed; inset: 0; z-index: -10; pointer-events: none` — it does NOT affect the `flex h-screen` layout because `position: fixed` removes it from the document flow.

**When to use:** Once, in the dashboard layout. All dashboard sub-pages automatically get the background.

**Example:**
```typescript
// Source: apps/web/app/[locale]/(dashboard)/layout.tsx (current state)
// + GradientMesh from apps/web/components/glass/gradient-mesh.tsx (Phase 34)

import { GradientMesh } from '@/components/glass/gradient-mesh';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SkipLink />
      <NavigationProgress />
      {/* GradientMesh is position:fixed z-index:-10 — does NOT affect flex layout */}
      <GradientMesh preset="dashboard" />
      <div className="flex h-screen">
        <aside aria-label="Dashboard sidebar">
          <Sidebar />  {/* NO CHANGE — stays bg-background */}
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />   {/* MODIFIED: glass-surface-subtle */}
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <DashboardTour />
    </AuthGuard>
  );
}
```

**Why first child matters:** Placing GradientMesh before the flex container ensures it is siblings with (not children of) the positioned layout elements. Z-index ordering between siblings is determined by DOM order and `z-index` values — GradientMesh at `-10` will always sit below the `flex h-screen` wrapper which has default `z-index: auto`.

### Pattern 2: Frosted Glass Header

**What:** Replace `bg-background` on the Header's `<header>` element with `glass-surface-subtle`. Keep `sticky top-0 z-10`. The `z-10` value is sufficient because the Header's glass surface only needs to be above the main content (no z-index), below dialogs (z-50), and overlays (z-50).

**Critical:** The Header is a `'use client'` component. The glass change is purely className — no behavioral changes. `LocationSwitcher` dropdown and `ThemeToggle` render inside the header and use Radix UI — they already use Portals for their dropdown content, so the header's new glass stacking context does not trap them.

**Example:**
```typescript
// Source: apps/web/components/layout/header.tsx — current state + glass modification
// Current: className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6"
// Modified:

<header
  role="banner"
  className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-glass px-6 glass-surface-subtle"
>
```

**Note:** Replace `border-b` (which uses `--border` CSS variable) with `border-b border-glass` (which uses `--glass-border-light`). This matches the glass aesthetic. Alternatively, keep `border-b` if the existing border line provides better visual separation in light mode — both work, `border-glass` is more on-brand.

### Pattern 3: KPI StatCard Glass Variant

**What:** `StatCard` currently renders a `<Card>` with `className="shadow-sm hover:shadow transition-shadow"`. These custom shadow classes override what `variant="glass"` provides. The fix: add `variant="glass"` and remove the conflicting shadow classes (the glass variant already has `transition-shadow duration-200 hover:shadow-glass-hover`).

**Example:**
```typescript
// Source: apps/web/components/dashboard/stat-card.tsx — current state
// Current:
<Card className={`shadow-sm hover:shadow transition-shadow ${className ?? ''}`}>

// Modified:
<Card variant="glass" className={className}>
```

**Why this works:** `variant="glass"` in `card.tsx` applies `glass-surface border-glass transition-shadow duration-200 hover:shadow-glass-hover`. The old `shadow-sm hover:shadow` classes from `className` would conflict — `tailwind-merge` (via `cn()`) resolves in favor of the last class, but since `variant` classes are computed inside `cardVariants()` and `className` is appended after via `cn(cardVariants({ variant }), className)`, the `className` values actually win over conflicting variant classes. Solution: remove the conflicting shadow classes from StatCard and let the glass variant handle the hover shadow.

**Gradient text on welcome heading:** The `DashboardPage` contains a `PageHeader title={t('dashboard.title')}` which renders as `<h1 className="text-3xl font-bold tracking-tight">`. Gradient text requires `bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`. Apply via `actions` slot or modify PageHeader's title rendering, or add a custom heading before PageHeader in the dashboard page.

Recommended: Add a styled heading directly in `DashboardPage` instead of through `PageHeader`, to avoid modifying PageHeader (used on 10+ pages).

```typescript
// In apps/web/app/[locale]/(dashboard)/dashboard/page.tsx
<h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
  {t('title')}
</h1>
```

### Pattern 4: Sub-Page Glass Card Wrappers

**What:** Each dashboard sub-page has a top-level content container. The goal is to wrap the content section (PageHeader + filter controls + table/chart area) in a glass card for each sub-page. The critical constraint: tables, calendar canvases, and chart canvases inside these pages must remain opaque.

**Strategy:** Wrap the page's non-table UI (title, filters, toolbars) in a glass card header, and keep the table/calendar/chart in a separate opaque container. Do NOT wrap the full page in a single glass card that would contain the table — that creates a stacking context and breaks backdrop-filter.

**Current pattern in bookings/page.tsx:**
```tsx
// Current: table is in a plain div (opaque)
<div className="rounded-lg border bg-card">
  <Table>...</Table>
</div>
```

**Target pattern for bookings/page.tsx:**
```tsx
// Modified: page controls in glass card, table stays opaque
<div className="space-y-4">
  <Card variant="glass" className="p-4">
    {/* Title + Add button */}
    <div className="flex items-center justify-between">...</div>
    {/* Filter inputs */}
    <div className="flex items-center gap-4 mt-4">...</div>
  </Card>

  {/* Table stays opaque — NOT inside glass card */}
  <div className="rounded-lg border bg-card">
    <Table>...</Table>
  </div>
</div>
```

**Analytics page cards:** The `analytics/page.tsx` already uses `<Card>` for each chart section. These can be upgraded to `<Card variant="glass">` for their outer wrappers, but the `CardContent` containing the chart canvas must not have glass-surface applied. Since `CardContent` inherits from `Card`'s outer div (not setting its own glass), and chart canvases are plain `div` + Recharts SVG elements, this is safe.

**Simplified approach for analytics cards:**
```typescript
// Current: <Card>
// Modified: <Card variant="glass">
// The Recharts SVG canvas inside CardContent renders on its own layer — no stacking context interaction
```

### Pattern 5: Stacking Context Audit

**Current dashboard layout stacking contexts identified from source inspection:**

| Element | Position | Z-Index | Creates SC? | Notes |
| ------- | -------- | ------- | ----------- | ----- |
| `GradientMesh` (new) | fixed | -10 | NO | `position: fixed` + `z-index` alone do NOT create SC unless `z-index` is applied with explicit positioning AND other SC triggers |
| `Header` (modified) | sticky | 10 | YES (sticky + z-index) | This is expected; its Portal-rendered dropdowns (Radix) escape via Portal |
| `Sidebar` | static | auto | NO | No positioning |
| `main` scroll container | static | auto | NO | `overflow-y-auto` creates containing block but not stacking context |
| `flex h-screen` wrapper | static | auto | NO | flex container with no z-index |
| `DialogContent` (existing) | fixed | 50 | YES | Radix Portal, renders outside layout DOM |
| `SheetContent` (BookingDetailPanel) | fixed | 50 | YES | Radix Portal, renders outside layout DOM |
| `glass-surface` on Header | sticky | 10 | YES | `position: relative` added by `@supports` in globals.css, but it's on the header element itself which already has sticky + z-10 |

**Key finding:** Radix UI's Portal renders Dialog and Sheet outside the layout `<div>` tree (into `document.body`). This means the header's glass stacking context cannot trap them — they always appear above at `z-50`. No stacking context conflicts expected.

**The only risk:** The `glass-surface` in `@supports` adds `position: relative` to the Header element. Since the header already has `sticky` positioning (and sticky is a type of positioned element), this is redundant but harmless. The `z-10` still applies correctly.

### Anti-Patterns to Avoid

- **Wrapping tables in glass cards:** Do NOT put `<Table>` inside `<Card variant="glass">`. This creates a glass stacking context that traps the table's `bg-card` background, making it look semi-transparent. The table must remain in its own `<div className="rounded-lg border bg-card">`.
- **Wrapping BookingCalendar in glass card:** The `BookingCalendar` component renders a `FullCalendar` instance that uses canvas-like DOM operations. Any `backdrop-filter` parent creates a stacking context that affects FullCalendar's event popover z-indexing. The calendar page should use a glass card ONLY for the toolbar/header section, not the calendar itself.
- **Adding glass-surface to `main` scroll container:** The `main` element uses `overflow-y-auto`. If `glass-surface` (which sets `position: relative` via `@supports`) were added to `main`, it would create a stacking context that traps all child `position: fixed` elements within it. Never glass the scroll container.
- **Using `overflow: hidden` on glass Card wrappers:** The analytics page wraps chart components in `<Card variant="glass">`. If any parent of those cards has `overflow: hidden`, the `backdrop-filter` is confined to that parent's layer and loses the gradient-mesh blur effect.
- **Setting Sidebar to glass:** Decision 20 (DASH-05 exclusion). Sidebar stays solid `bg-background`. Navigation text at 14px (text-sm) requires solid backgrounds for WCAG 4.5:1 contrast.
- **Adding GradientMesh inside `main` instead of layout:** Placing GradientMesh inside the `<main>` element would cause it to be confined to the `overflow-y-auto` scroll container — it would scroll with the content instead of staying fixed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| ------- | ----------- | ----------- | --- |
| Glass KPI card | Custom CSS with inline `backdrop-filter` | `<Card variant="glass">` from Phase 34 | CVA variant handles `@supports` fallback, dark mode, scrim z-index, hover transition |
| Frosted header bar | Custom `backdrop-blur` class on header | `glass-surface-subtle` (Phase 33 plugin) | Plugin handles `-webkit-backdrop-filter`, `@supports` guard, responsive blur degradation |
| Gradient mesh background | Per-page background CSS | `<GradientMesh preset="dashboard">` from Phase 34 | Fixed positioning, correct z-index, aria-hidden, dark mode variants all built in |
| Section content wrapper | Plain `<div className="glass-surface p-4">` | `<Card variant="glass">` | Card already has `position: relative` on sub-components; `CardHeader`/`CardContent` have `relative` class preventing scrim z-index issues |
| Gradient text | Custom CSS in component | Tailwind utilities: `bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent` | Three standard Tailwind utilities, no custom CSS needed |

**Key insight:** Phase 34 was specifically designed so Phase 35 never writes glass CSS directly. Every glass surface in Phase 35 is achieved through component props and Tailwind utility classes only.

---

## Common Pitfalls

### Pitfall 1: StatCard Shadow Class Conflict

**What goes wrong:** `StatCard` currently passes `shadow-sm hover:shadow transition-shadow` via `className`. When `variant="glass"` is added to the `<Card>`, `card.tsx` computes `cn(cardVariants({ variant: 'glass' }), className)`. tailwind-merge will see both `shadow-sm` (from className) and `glass-surface` (from variant) which provides its own box-shadow. The `shadow-sm` from className wins over the plugin utility's box-shadow because className comes last in `cn()`.

**Why it happens:** `cn(cardVariants(...), className)` — the rightmost argument wins in tailwind-merge for conflicting properties. `shadow-sm` (from className) conflicts with `glass-surface`'s box-shadow via `--glass-shadow-light`.

**How to avoid:** Remove `shadow-sm hover:shadow transition-shadow` from StatCard's `className` prop when adding `variant="glass"`. The glass variant already provides `transition-shadow duration-200 hover:shadow-glass-hover`.

**Warning signs:** Glass card shows rectangular box shadow instead of soft glass shadow; hover effect does not intensify.

### Pitfall 2: Header `border-b` Conflicting with `border-glass`

**What goes wrong:** The header has `border-b bg-background`. When `glass-surface-subtle` is added, it provides its own `border` via the `@supports` block in glass-plugin.ts. The existing `border-b` class means the bottom border uses `--border` (shadcn token). The glass border from the plugin uses `--glass-border-light` (rgba transparent). These two border declarations coexist — the `border-b` with `border-border` adds a hard border, while the glass plugin adds a semi-transparent border all around. The result is a solid bottom border plus transparent borders on top/left/right.

**How to avoid:** Explicitly set `border-glass` (the Tailwind extension registered in tailwind.config.ts) to override `border-b`'s color: add `border-b border-glass` to the header className. Or remove `border-b` entirely and let the glass plugin provide a subtle bottom border via its `border: 1px solid var(--glass-border-light)` (this creates a subtle border on all sides including the bottom).

**Warning signs:** Header shows a hard dark line at the bottom instead of a subtle transparent border.

### Pitfall 3: BookingCalendar Popover Trapped by Glass Parent

**What goes wrong:** If the calendar page wraps `<BookingCalendar />` inside a `<Card variant="glass">`, the `glass-surface` class adds `position: relative` (via `@supports`). This creates a stacking context. FullCalendar's event popover uses absolute positioning relative to the calendar's scroll container — not a Portal. This means the popover z-index is evaluated against the glass Card's stacking context, not the page root, and the popover can appear clipped or behind other elements.

**Why it happens:** FullCalendar (and react-big-calendar if used) render their event detail popovers as `position: absolute` elements within the calendar DOM tree — they are NOT Radix Portals. A stacking context parent with `overflow: hidden` would clip them; a stacking context parent without overflow:hidden would affect z-index evaluation.

**How to avoid:** Never wrap `<BookingCalendar />` in a glass card. The calendar page's glass treatment applies only to `<CalendarToolbar />` — the toolbar gets a glass card wrapper, the calendar itself renders without a glass parent.

**Warning signs:** Calendar event click popover appears behind other elements or clips at the card edge.

### Pitfall 4: GradientMesh Opacity Breaking Sidebar Legibility

**What goes wrong:** The gradient-mesh-dashboard orbs extend `position: fixed; inset: 0` — they fill the full viewport including the sidebar area. Even though the sidebar has `bg-background` (solid white/dark), the gradient mesh background shows THROUGH the sidebar in browsers where `bg-background` has an alpha value.

**Why it happens:** In the current globals.css, `--background: 0 0% 100%` (pure white, fully opaque). This means `bg-background` renders as `background-color: hsl(0, 0%, 100%)` — fully opaque. The gradient mesh CANNOT show through. This is safe as-is.

**Risk:** If `--background` were ever changed to an rgba value (e.g., for a tinted dark mode), the sidebar would show the gradient mesh through its background. Document this as a constraint: `--background` must remain fully opaque on sidebar-containing pages.

**Warning signs:** Sidebar background appears slightly tinted with blue/purple orb colors.

### Pitfall 5: Analytics Page Card Wrapping Multiple Charts

**What goes wrong:** The analytics page has many `<Card>` wrappers, each containing a Recharts dynamic import. When `variant="glass"` is added to these Cards, and the chart lazy-loads with a `<ChartSkeleton />` fallback, the Skeleton inside a glass Card may look wrong because `Skeleton` uses `bg-muted/50` — a semi-transparent gray that blends oddly with the glass background.

**How to avoid:** Add `className="bg-card/50"` or similar to Skeleton elements inside glass cards, or leave Skeleton as-is and accept the visual during loading. The loading state is transient — this is LOW severity.

**Warning signs:** Chart loading skeletons inside glass cards have incorrect color.

### Pitfall 6: Sub-Page Filter Bar Not Glassmorphism-Appropriate

**What goes wrong:** The bookings and customers pages have filter bars with `<Input>` and `<Select>` components. If the filter bar is wrapped in a `<Card variant="glass">`, the form inputs render inside a glass surface. Per the v1.4 exclusions, form inputs should NOT receive glass treatment. The fix: when wrapping filter bars in glass cards, the input elements inside are fine — they do not need `variant="glass"`. The glass is on the Card container, not the inputs.

**Why it's safe:** The exclusion "no glass on form inputs" means don't apply `glass-surface` to input elements themselves. Input elements inside a glass Card wrapper are fine — they render with their own `bg-input/bg-background` styling.

**Warning signs:** Input fields looking foggy or illegible because a parent's backdrop-filter is trapping content.

---

## Code Examples

### Dashboard Layout with GradientMesh

```typescript
// Source: apps/web/app/[locale]/(dashboard)/layout.tsx (verified current state)
// Target pattern after Phase 35 modification

import { GradientMesh } from '@/components/glass/gradient-mesh';
import { AuthGuard } from '@/components/layout/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SkipLink } from '@/components/accessibility/skip-link';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { DashboardTour } from '@/components/onboarding/driver-tour';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SkipLink />
      <NavigationProgress />
      {/* Fixed at z-index:-10 — outside document flow, no layout impact */}
      <GradientMesh preset="dashboard" />
      <div className="flex h-screen">
        <aside aria-label="Dashboard sidebar">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <DashboardTour />
    </AuthGuard>
  );
}
```

### Frosted Header

```typescript
// Source: apps/web/components/layout/header.tsx (verified current state)
// Current: className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6"
// Target:

<header
  role="banner"
  className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-glass px-6 glass-surface-subtle"
>
  {/* All children unchanged — LocationSwitcher, ThemeToggle, UserMenu, Breadcrumbs */}
```

### StatCard with Glass Variant

```typescript
// Source: apps/web/components/dashboard/stat-card.tsx (verified current state)
// Current: <Card className={`shadow-sm hover:shadow transition-shadow ${className ?? ''}`}>
// Target: Remove conflicting shadow classes, add variant="glass"

export function StatCard({ title, value, trend, icon: Icon, formatter, className }: StatCardProps) {
  return (
    // variant="glass" provides: glass-surface, border-glass, transition-shadow, hover:shadow-glass-hover
    // Do NOT pass shadow-sm or hover:shadow — they conflict with glass variant's box-shadow
    <Card variant="glass" className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value, formatter)}</div>
        {/* trend display unchanged */}
      </CardContent>
    </Card>
  );
}
```

### Dashboard Welcome Gradient Heading

```typescript
// Source: apps/web/app/[locale]/(dashboard)/dashboard/page.tsx
// Add gradient text on main dashboard heading — not via PageHeader (used on 10+ pages)
// Tailwind: bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent

<h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
  {t('title')}
</h1>
```

### Sub-Page Glass Card Wrapper Pattern (Bookings Example)

```typescript
// Source: apps/web/app/[locale]/(dashboard)/bookings/page.tsx
// Only the header/filter bar section gets glass — table stays opaque

return (
  <>
    <div className="space-y-4">
      {/* Glass card wraps title + filters only */}
      <Card variant="glass" className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader title={t('title')} />
          <Button asChild>
            <Link href="/bookings/new">...</Link>
          </Button>
        </div>
        {/* Filter controls */}
        <div className="flex items-center gap-4">...</div>
      </Card>

      {/* Table container stays opaque — NOT inside glass card */}
      <div className="rounded-lg border bg-card">
        <Table>...</Table>
      </div>

      {/* Pagination stays outside glass */}
      {data && data.meta.total_pages > 1 && (...)}
    </div>

    {/* BookingDetailPanel uses Sheet/Portal — no stacking context conflict */}
    <BookingDetailPanel ... />
  </>
);
```

### Analytics Page Card Upgrade Pattern

```typescript
// Source: apps/web/app/[locale]/(dashboard)/analytics/page.tsx
// Chart-wrapping Cards use variant="glass" — chart canvases inside are safe
// because Recharts renders SVG (not positioned elements) — no stacking context interference

// Current: <Card>
// Modified: <Card variant="glass">

<Card variant="glass">
  <CardHeader>
    <CardTitle>{t('revenue.title')}</CardTitle>
  </CardHeader>
  <CardContent>
    {isLoadingRevenue ? (
      <ChartSkeleton />
    ) : revenueData && revenueData.length > 0 ? (
      <RevenueChart data={revenueData} />  {/* SVG canvas — safe inside glass Card */}
    ) : (
      <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
    )}
  </CardContent>
</Card>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| ------------ | ---------------- | ------------ | ------ |
| Card uses `bg-card shadow-sm` (opaque) | Card `variant="glass"` (frosted) | Phase 34 (this milestone) | Select glass cards get backdrop-filter effect |
| Header uses `bg-background` (opaque solid) | Header uses `glass-surface-subtle` (frosted) | Phase 35 | Content scrolls visibly behind header |
| Dashboard layout: no background | `<GradientMesh preset="dashboard">` | Phase 35 | Gradient orbs visible through glass surfaces |
| Data tables in `rounded-lg border bg-card` | No change — remain opaque | Phase 35 locked decision | Tables always opaque for data legibility |
| Calendar canvas renders on white/dark | No change | Phase 35 locked decision | Calendar opaque by exclusion |

**Excluded from glass treatment (locked decisions):**
- Sidebar: `bg-background` unchanged — legibility constraint at nav-item font size
- Data tables (Table component, TableRow, TableCell): remain in `bg-card` containers
- BookingCalendar canvas area: opaque by exclusion (FullCalendar event popover z-index risk)
- Chart canvases: Recharts SVG elements inside glass cards are safe but the canvas background itself is not glassed
- Form inputs: `<Input>`, `<Select>` — no glass applied to input elements
- Primary CTA buttons: remain solid

---

## Phase Scope Clarification

### DASH-01: Layout + Stacking Context Audit

Scope: `layout.tsx` + stacking context audit document.
- Add `<GradientMesh preset="dashboard" />` to layout
- Audit confirms: Header z-10, Radix Portal overlays z-50, GradientMesh z-(-10), Sheet/Dialog escape via Portal — no conflicts

### DASH-02: KPI Cards + Gradient Welcome Text

Scope: `stat-card.tsx` + `dashboard/page.tsx` welcome heading.
- `StatCard`: Add `variant="glass"`, remove conflicting shadow classes
- Dashboard page: Replace `PageHeader` heading with inline `<h1>` with gradient text classes

### DASH-03: Frosted Header Bar

Scope: `components/layout/header.tsx`.
- Replace `bg-background` with `glass-surface-subtle`
- Replace `border-b` with `border-b border-glass`
- Verify LocationSwitcher dropdown and ThemeToggle still functional (they use Radix Portal — they are)

### DASH-04: Sub-Page Glass Card Wrappers

Scope: 7 sub-pages (calendar, bookings, customers, analytics, settings, billing, organization).
- Each page: glass card wraps title + filter/control sections
- Tables, calendar canvas, chart canvases: remain in their existing opaque containers
- Strategy: split page content into glass header section + opaque data section

### DASH-05: Sidebar Unchanged

Scope: NO CHANGES to `sidebar.tsx` or sidebar area.
- Sidebar background: `bg-background` (unchanged)
- Nav items: existing hover states and active states unchanged
- Locked by: Decision per requirements, v1.4 exclusions, WCAG legibility constraint

---

## Open Questions

1. **KpiComparisonCards in analytics/page.tsx — which variant?**
   - What we know: The analytics page renders `<KpiComparisonCards overview={overview} />` which internally uses `<Card>` components. These are not `StatCard` — they are a separate component.
   - What's unclear: Whether the planner should update `KpiComparisonCards` internals to use `variant="glass"`, or leave them as-is.
   - Recommendation: Update `KpiComparisonCards` component to use `variant="glass"` on its internal Cards, so all dashboard KPI-style cards are consistent. This is a small file change with no risk.

2. **Settings page — which Cards get glass?**
   - What we know: Settings page uses `Card` for `CompanyProfileCard`, `WorkingHoursCard`, etc. These are sub-components of the settings page, not KPI metrics.
   - What's unclear: Whether ALL settings Cards get glass (premium feel) or only section headers.
   - Recommendation: Apply `variant="glass"` to ALL `<Card>` usage on settings page. Settings forms are not data-dense like tables — glass is appropriate here. Form inputs inside remain solid.

3. **DemoDataCard and OnboardingChecklist on dashboard/page.tsx**
   - What we know: These render conditionally above `DashboardGrid` for new users. They are plain `<Card>` components.
   - What's unclear: Whether they should also use `variant="glass"`.
   - Recommendation: Keep these as `variant="default"` (opaque). They are onboarding UI, not primary dashboard chrome. The gradient mesh background will still be visible around them.

4. **Header border — `border-b` vs `border-b border-glass`**
   - What we know: `border-b` applies `border-bottom-width: 1px` with color from `border-border` (CSS variable `--border`). The glass plugin applies `border: 1px solid var(--glass-border-light)` on all sides inside `@supports`. These coexist and the bottom border gets BOTH colors, with the one declared last in the CSS cascade winning.
   - What's unclear: Which border color wins at the bottom — the hard `--border` from `border-b`, or the transparent `--glass-border-light` from `glass-surface-subtle`.
   - Recommendation: Explicitly add `border-glass` class to the header to override `border-b`'s color: `border-b border-glass`. This makes the bottom border use `--glass-border-light` consistently, matching the glass aesthetic.

---

## Sources

### Primary (HIGH confidence)

- **Codebase direct reads** — All findings verified from actual source files:
  - `apps/web/app/[locale]/(dashboard)/layout.tsx` — confirmed layout structure, z-index assignments, no stacking context triggers on layout wrappers
  - `apps/web/components/layout/header.tsx` — confirmed `sticky top-0 z-10 bg-background`; all child components (LocationSwitcher, ThemeToggle) identified
  - `apps/web/components/layout/sidebar.tsx` — confirmed `bg-background`; no glass needed; nav items at `text-sm`
  - `apps/web/components/dashboard/stat-card.tsx` — confirmed `<Card className="shadow-sm hover:shadow transition-shadow">` — conflict identified
  - `apps/web/components/dashboard/dashboard-grid.tsx` — confirmed 4 `<StatCard>` usages
  - `apps/web/app/[locale]/(dashboard)/dashboard/page.tsx` — confirmed `DashboardGrid`, `PageHeader`, composition
  - `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` — confirmed table in `<div className="rounded-lg border bg-card">`, `BookingDetailPanel` uses Sheet/Portal
  - `apps/web/app/[locale]/(dashboard)/calendar/page.tsx` — confirmed `<BookingCalendar>` pattern, dynamic import
  - `apps/web/app/[locale]/(dashboard)/analytics/page.tsx` — confirmed all Chart `<Card>` wrappers, dynamic imports with ChartSkeleton
  - `apps/web/app/[locale]/(dashboard)/customers/page.tsx` — confirmed Dialog usage, table in `bg-card`
  - `apps/web/app/[locale]/(dashboard)/settings/page.tsx` — confirmed Card usage for CompanyProfileCard, WorkingHoursCard
  - `apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx` — confirmed Card, Dialog, Badge usage
  - `apps/web/app/[locale]/(dashboard)/organization/page.tsx` — confirmed Card usage for org/location displays
  - `apps/web/components/ui/sheet.tsx` — confirmed `z-50 fixed`, SheetPortal (Radix), `bg-background` on SheetContent
  - `apps/web/components/ui/card.tsx` — confirmed Phase 34 CVA `variant="glass"` is live
  - `apps/web/components/glass/glass-panel.tsx` — confirmed Phase 34 GlassPanel is live
  - `apps/web/components/glass/gradient-mesh.tsx` — confirmed Phase 34 GradientMesh is live
  - `apps/web/app/globals.css` — confirmed `--glass-shadow-hover-light` in `:root` and `.dark`; gradient-mesh CSS classes; `@supports` scrim block
  - `apps/web/tailwind.config.ts` — confirmed `shadow-glass-hover` and `border-glass` tokens

- `.planning/phases/34-component-glass-variants/34-VERIFICATION.md` — Phase 34 PASSED 9/9; GlassPanel, GradientMesh, Card glass variant, Dialog glass all verified
- `.planning/phases/33-token-foundation/33-RESEARCH.md` — gradient-mesh z-index behavior, stacking context rules, Safari webkit pitfalls

### Secondary (MEDIUM confidence)

- Radix UI Dialog/Sheet Portal behavior — verified from sheet.tsx and dialog.tsx source that both use `DialogPrimitive.Portal` (Sheet) which renders outside the layout DOM tree. This is standard Radix UI behavior documented at radix-ui.com and matches the implementation in the codebase.
- FullCalendar event popover positioning — identified as absolute-positioned within calendar DOM (not Portal) from BookingCalendar structure analysis. Risk flagged under Pitfall 3.

### Tertiary (LOW confidence)

- tailwind-merge resolution of `shadow-sm` (className) vs. `glass-surface`'s box-shadow (variant) — the order of class resolution depends on tailwind-merge's internal handling of plugin utilities. The `cn(cardVariants({ variant }), className)` pattern means className is appended last and tailwind-merge processes it accordingly. The safe approach (removing conflicting shadow classes from StatCard) avoids this entirely.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Phase 34 fully verified; all APIs confirmed from source files
- Architecture patterns: HIGH — layout structure verified from source; stacking context audit based on direct CSS inspection
- Pitfalls: HIGH — all pitfalls grounded in concrete code observations (StatCard shadow conflict, border conflict, FullCalendar popover positioning)
- Sub-page treatment strategy: HIGH — bookings, customers, analytics verified from source; settings/billing/org read partially

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (all APIs are Phase 33/34 outputs — stable; no third-party library versions change)

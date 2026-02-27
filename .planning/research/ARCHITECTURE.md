# Architecture Patterns: Glassmorphism Design System Integration

**Domain:** Glassmorphism design overhaul for existing Next.js 14 + Tailwind + shadcn/ui SaaS app
**Researched:** 2026-02-25
**Confidence:** HIGH (codebase-verified for all integration points; MEDIUM for performance benchmarks which are hardware-dependent)

---

## The Integration Problem

ScheduleBox has ~65,000 LOC already structured around:
- `globals.css` with HSL CSS variables for every shadcn/ui token
- `tailwind.config.ts` mapping those CSS vars to Tailwind color names
- 21 shadcn/ui components in `apps/web/components/ui/` (copy-paste style — owned, not npm)
- `ThemeProvider` via `next-themes` using `attribute="class"` (adds `.dark` to `<html>`)
- Three distinct layout groups: `(marketing)`, `(auth)`, `(dashboard)`

The glassmorphism system must layer on top of this without breaking existing CSS variables, without requiring component replacement, and without creating hydration mismatches.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  DESIGN SYSTEM FOUNDATION (globals.css + tailwind.config.ts)        │
├───────────────────────┬─────────────────────────────────────────────┤
│  Existing tokens      │  New glass tokens (added alongside)         │
│  --primary            │  --glass-bg-light                           │
│  --background         │  --glass-bg-dark                            │
│  --card               │  --glass-border-light                       │
│  --border             │  --glass-border-dark                        │
│  --shadow-*           │  --glass-blur-sm/md/lg                      │
│  (unchanged)          │  --glass-shadow                             │
└───────────────────────┴─────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TAILWIND EXTENSION (tailwind.config.ts)                            │
│  theme.extend: {                                                     │
│    backdropBlur: { glass: 'var(--glass-blur-md)' }                  │
│    backgroundColor: { glass: 'var(--glass-bg)' }                    │
│  }                                                                   │
│  plugins: [ glassPlugin ]  ← NEW: adds .glass-* utility classes     │
└─────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  COMPONENT LAYER                                                     │
├──────────────────────────┬──────────────────────────────────────────┤
│  MODIFIED (add variant)  │  NEW glass-specific components            │
│  Card → +glass variant   │  GlassPanel (pure surface)                │
│  Button → +glass variant │  GlassNavbar (marketing header)           │
│  Dialog → glass bg       │  GlassModal (auth/dashboard dialogs)      │
│  Sheet → glass sidebar   │  GradientMesh (background layer)          │
│                          │  GlassSkeleton (loading states)           │
└──────────────────────────┴──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PAGE LAYOUT LAYER                                                   │
├─────────────────┬──────────────────┬──────────────────┬─────────────┤
│  (marketing)    │  (auth)          │  (dashboard)     │  [company]  │
│  Gradient mesh  │  Frosted card    │  Solid sidebar + │  Public     │
│  Glass navbar   │  on gradient     │  glass header    │  booking    │
│  Glass cards    │  background      │  glass KPI cards │  widget     │
└─────────────────┴──────────────────┴──────────────────┴─────────────┘
```

---

## Token Architecture: Three Layers

### Layer 1 — Primitive Glass Tokens (in `globals.css`)

Define raw values. These never appear in components directly.

```css
/* globals.css — add to :root block */
:root {
  /* Glass blur intensities */
  --glass-blur-sm:  blur(8px);
  --glass-blur-md:  blur(12px);
  --glass-blur-lg:  blur(20px);
  --glass-blur-xl:  blur(32px);

  /* Glass backgrounds — light mode */
  --glass-bg-light:        rgba(255, 255, 255, 0.55);
  --glass-bg-light-subtle: rgba(255, 255, 255, 0.30);
  --glass-bg-light-heavy:  rgba(255, 255, 255, 0.75);

  /* Glass borders — light mode */
  --glass-border-light:    rgba(255, 255, 255, 0.35);
  --glass-border-light-sm: rgba(255, 255, 255, 0.20);

  /* Glass shadows — light mode */
  --glass-shadow-light: 0 8px 32px rgba(31, 38, 135, 0.12),
                        inset 0 1px 0 rgba(255, 255, 255, 0.6);

  /* Gradient mesh colors — light mode */
  --mesh-primary:   hsl(var(--primary) / 0.12);
  --mesh-secondary: hsl(var(--secondary) / 0.08);
  --mesh-accent:    hsl(270 91% 60% / 0.06);
}

.dark {
  /* Glass backgrounds — dark mode */
  --glass-bg-light:        rgba(17, 25, 40, 0.65);
  --glass-bg-light-subtle: rgba(17, 25, 40, 0.45);
  --glass-bg-light-heavy:  rgba(17, 25, 40, 0.80);

  /* Glass borders — dark mode */
  --glass-border-light:    rgba(255, 255, 255, 0.12);
  --glass-border-light-sm: rgba(255, 255, 255, 0.07);

  /* Glass shadows — dark mode */
  --glass-shadow-light: 0 8px 32px rgba(0, 0, 0, 0.40),
                        inset 0 1px 0 rgba(255, 255, 255, 0.08);

  /* Gradient mesh colors — dark mode */
  --mesh-primary:   hsl(var(--primary) / 0.20);
  --mesh-secondary: hsl(var(--secondary) / 0.12);
  --mesh-accent:    hsl(270 91% 60% / 0.10);
}
```

**Why `rgba()` not `hsl() / opacity`:** rgba is required for glassmorphism backgrounds because the glass panel must blend with the backdrop behind it, not just its own background. HSL opacity works for solid colors but not when the background is a separate blurred composite.

**Why `.dark` class not `prefers-color-scheme`:** The existing `ThemeProvider` uses `attribute="class"` — it adds `.dark` to `<html>`. CSS `prefers-color-scheme` would conflict with the user's manual toggle preference. Match the existing system.

### Layer 2 — Semantic Glass Tokens (in `globals.css`)

Map primitives to semantic context. These are what components use.

```css
:root {
  /* Semantic aliases — components reference these */
  --glass-bg:         var(--glass-bg-light);
  --glass-bg-subtle:  var(--glass-bg-light-subtle);
  --glass-bg-heavy:   var(--glass-bg-light-heavy);
  --glass-border:     var(--glass-border-light);
  --glass-shadow:     var(--glass-shadow-light);
  --glass-blur:       var(--glass-blur-md);
}

.dark {
  --glass-bg:         var(--glass-bg-dark);   /* dark mode redefines same names */
  --glass-bg-subtle:  var(--glass-bg-dark-subtle);
  --glass-bg-heavy:   var(--glass-bg-dark-heavy);
  --glass-border:     var(--glass-border-dark);
  --glass-shadow:     var(--glass-shadow-dark);
  --glass-blur:       var(--glass-blur-md);   /* same blur, different bg */
}
```

This is the same pattern shadcn/ui already uses for `--card`, `--border`, etc. The `.dark` selector just redefines the same variable names. Components use `var(--glass-bg)` and automatically adapt.

### Layer 3 — Tailwind Utilities (in `tailwind.config.ts`)

Expose tokens as Tailwind classes.

```typescript
// tailwind.config.ts — extend the existing config
theme: {
  extend: {
    // Existing entries stay untouched
    backdropBlur: {
      'glass-sm': 'var(--glass-blur-sm)',
      'glass':    'var(--glass-blur-md)',
      'glass-lg': 'var(--glass-blur-lg)',
      'glass-xl': 'var(--glass-blur-xl)',
    },
    backgroundColor: {
      'glass':        'var(--glass-bg)',
      'glass-subtle': 'var(--glass-bg-subtle)',
      'glass-heavy':  'var(--glass-bg-heavy)',
    },
    boxShadow: {
      'glass': 'var(--glass-shadow)',
    },
    borderColor: {
      'glass': 'var(--glass-border)',
    },
  }
},
plugins: [
  tailwindcssAnimate,  // existing
  glassPlugin,         // NEW — defined below
],
```

**Glass Plugin** (`apps/web/lib/tailwind/glass-plugin.ts`):

```typescript
import plugin from 'tailwindcss/plugin';

export const glassPlugin = plugin(function ({ addUtilities, addComponents }) {
  // Utility classes for glass surfaces
  addUtilities({
    '.glass-surface': {
      'background': 'var(--glass-bg)',
      'backdrop-filter': 'var(--glass-blur)',
      '-webkit-backdrop-filter': 'var(--glass-blur)',
      'border': '1px solid var(--glass-border)',
      'box-shadow': 'var(--glass-shadow)',
    },
    '.glass-surface-subtle': {
      'background': 'var(--glass-bg-subtle)',
      'backdrop-filter': 'var(--glass-blur-sm)',
      '-webkit-backdrop-filter': 'var(--glass-blur-sm)',
      'border': '1px solid var(--glass-border)',
    },
    '.glass-surface-heavy': {
      'background': 'var(--glass-bg-heavy)',
      'backdrop-filter': 'var(--glass-blur-lg)',
      '-webkit-backdrop-filter': 'var(--glass-blur-lg)',
      'border': '1px solid var(--glass-border)',
      'box-shadow': 'var(--glass-shadow)',
    },
  });

  // Gradient mesh background component
  addComponents({
    '.gradient-mesh': {
      'background-image': `
        radial-gradient(ellipse at 20% 50%, var(--mesh-primary) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, var(--mesh-secondary) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, var(--mesh-accent) 0%, transparent 55%)
      `,
    },
  });
});
```

---

## Component Integration Map

### Modified Components (add `glass` variant to existing CVA)

These components already exist in `apps/web/components/ui/`. Add the `glass` variant to their existing CVA configuration. Do NOT replace the default variant.

#### Card — add glass variant

```typescript
// apps/web/components/ui/card.tsx
// BEFORE: no CVA, static classNames
// AFTER: introduce cardVariants with CVA

import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-lg transition-shadow',
  {
    variants: {
      variant: {
        default: 'border border-border bg-card text-card-foreground shadow-sm',
        glass: [
          'glass-surface',                          // from glass plugin
          'text-card-foreground',
          'supports-[backdrop-filter]:bg-glass',    // progressive enhancement
          'not-supports-[backdrop-filter]:bg-card', // fallback: opaque card
        ].join(' '),
        'glass-subtle': 'glass-surface-subtle text-card-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Card now accepts optional variant prop, default is 'default'
// All existing <Card /> usage unchanged — backward compatible
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  ),
);
```

**Key:** `defaultVariants: { variant: 'default' }` — every existing `<Card />` in the codebase continues working with zero prop changes.

#### Button — add glass variant

```typescript
// apps/web/components/ui/button.tsx — extend existing buttonVariants
// ADD to existing variants.variant object:
glass: [
  'glass-surface-subtle',
  'text-foreground',
  'hover:glass-surface',
  'border border-glass',
].join(' '),
```

#### Dialog — glass background overlay

```typescript
// apps/web/components/ui/dialog.tsx
// The DialogOverlay gets a glass tint instead of pure black:
// CHANGE: 'bg-black/80' → 'bg-black/40 backdrop-blur-glass-sm'
// The DialogContent gets glass-surface treatment
```

### New Components (glass-specific, no existing equivalent)

These do not replace anything. They are new additions to `apps/web/components/ui/`.

| Component | File | Purpose | Used In |
|-----------|------|---------|---------|
| `GlassPanel` | `components/ui/glass-panel.tsx` | Pure glass surface wrapper, no semantics | Dashboard KPI cards, marketing sections |
| `GradientMesh` | `components/ui/gradient-mesh.tsx` | Animated gradient background layer | Page backgrounds, hero section |
| `GlassSkeleton` | `components/ui/glass-skeleton.tsx` | Loading skeleton matching glass card shape | Replaces existing Skeleton inside glass contexts |

---

## Page-Section Glass Strategy

Different page sections require different glass intensities. This prevents the "everything is blurred" anti-pattern.

### Marketing Layout `(marketing)/layout.tsx`

```
Background layer:   gradient-mesh (fixed, behind everything)
Navbar:             glass-surface + sticky + z-50
Hero section:       NO glass on text — glass only on the demo widget card
Feature cards:      glass-surface-subtle on hover (CSS hover transition)
Pricing cards:      glass-surface for featured tier, glass-surface-subtle for others
Social proof:       glass-surface-subtle on testimonial cards
Footer:             solid bg-background (no glass — reduces visual noise at bottom)
```

**Isolation pattern:** The `(marketing)/layout.tsx` wraps the entire page in a positioned container that contains the gradient mesh background. This creates a stacking context so `backdrop-filter` on navbar and cards blurs the gradient mesh correctly.

```tsx
// apps/web/app/[locale]/(marketing)/layout.tsx — MODIFIED
export default async function MarketingLayout({ children }) {
  return (
    // Outermost: relative + min-h-screen creates the stacking context
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Gradient mesh as fixed layer behind content */}
      <div className="fixed inset-0 gradient-mesh -z-10" aria-hidden="true" />
      <MarketingNavbar />  {/* uses glass-surface internally */}
      <main className="flex-1">{children}</main>
      <MarketingFooter />  {/* uses solid bg-background */}
      <CookieConsentBanner />
    </div>
  );
}
```

### Auth Layout `(auth)/layout.tsx`

```
Background:         gradient-mesh (full page)
Auth card:          glass-surface-heavy (most opaque — form readability)
Logo/brand area:    no glass — plain text on gradient
```

```tsx
// apps/web/app/[locale]/(auth)/layout.tsx — MODIFIED
export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 gradient-mesh -z-10" aria-hidden="true" />
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ScheduleBox</h1>
          <p className="text-muted-foreground mt-2">...</p>
        </div>
        {/* Card gets glass variant — heavy opacity for form legibility */}
        <Card variant="glass" className="glass-surface-heavy shadow-glass">
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Dashboard Layout `(dashboard)/layout.tsx`

Dashboard glass is more restrained than marketing. Users spend hours here — aggressive glass causes eye fatigue. Use glass selectively on interactive surfaces, not as a base layer.

```
Sidebar:            SOLID bg-background (NOT glass) — text density + readability
Header:             glass-surface-subtle + sticky + z-10
KPI stat cards:     glass-surface (the primary glass moment in dashboard)
Revenue chart card: glass-surface-subtle
Modal/dialog:       glass overlay + glass-surface-heavy for content
Page background:    subtle gradient-mesh at low opacity (--mesh-primary at 0.06 opacity)
```

```tsx
// apps/web/app/[locale]/(dashboard)/layout.tsx — MODIFIED
export default function DashboardLayout({ children }) {
  return (
    <AuthGuard>
      <SkipLink />
      <NavigationProgress />
      {/* Subtle mesh background — very low opacity, just adds depth */}
      <div className="fixed inset-0 gradient-mesh opacity-40 -z-10" aria-hidden="true" />
      <div className="flex h-screen">
        <aside aria-label="Dashboard sidebar">
          {/* Sidebar stays SOLID — readability over aesthetics */}
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header gets glass treatment */}
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

**Why the sidebar stays solid:** The sidebar contains navigation text at small sizes with icon labels. Blur behind text of this density causes readability problems, especially in dark mode. Reserve glass for surfaces with large content areas or decorative use.

---

## Existing Component Modification Guide

### StatCard (dashboard KPI cards)

The `StatCard` in `apps/web/components/dashboard/stat-card.tsx` is the single highest-impact glass target. It renders in a 4-column grid on every dashboard load.

```typescript
// BEFORE:
<Card className={`shadow-sm hover:shadow transition-shadow ${className ?? ''}`}>

// AFTER:
<Card
  variant="glass"
  className={cn('hover:shadow-glass transition-shadow', className)}
>
```

One line change. Zero prop API changes to callers.

### MarketingNavbar

The existing navbar already has a partial glass implementation:

```tsx
// CURRENT (already glass-ish):
className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"

// REPLACE WITH (proper glass token):
className="sticky top-0 z-50 glass-surface supports-[backdrop-filter]:glass-surface not-supports-[backdrop-filter]:bg-background/95"
```

The `supports-[backdrop-filter]` modifier is native Tailwind CSS — no plugin needed. This is the progressive enhancement pattern.

### Header (dashboard)

```tsx
// CURRENT:
className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6"

// MODIFIED:
className="sticky top-0 z-10 flex h-16 items-center justify-between glass-surface-subtle px-6"
```

---

## Hydration Safety

### The Problem

`next-themes` ThemeProvider with `attribute="class"` applies `.dark` on the client after mount. During SSR, the server doesn't know the user's theme preference. If glass CSS variables reference `.dark` values in server-rendered HTML, there's a brief flash on first paint.

### The Solution (already used in this codebase)

The existing `ThemeToggle` component already uses the correct pattern:

```typescript
// apps/web/components/ui/theme-toggle.tsx — EXISTING correct pattern
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
if (!mounted) return <Button disabled suppressHydrationWarning>...</Button>;
```

**For glass components:** Glass effects are purely CSS-driven (CSS variables + `backdrop-filter`). They have NO JavaScript logic. There is no hydration mismatch risk from glass CSS itself — the browser applies the correct `.dark` class CSS variables immediately on paint without any JS involvement after `next-themes` writes the class.

**SSR note:** `backdrop-filter` is a CSS property applied via Tailwind classes in server-rendered HTML. The browser reads the HTML → sees `class="glass-surface"` → looks up the CSS rule → applies `backdrop-filter`. There is no JS involved in rendering the blur effect itself. No hydration mismatch is possible from the CSS approach.

### The Only Risk: Theme Flash on First Load

`disableTransitionOnChange` is already set in the existing `ThemeProvider`:

```tsx
// apps/web/app/providers.tsx — EXISTING
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
```

This prevents the transition animation from running on theme initialization, which is the main source of flash. No changes needed here.

---

## Performance Architecture

### Compositing Layer Budget

Each element with `backdrop-filter` creates a new GPU compositing layer. Excessive stacking causes frame drops, especially on mobile.

**Rule: Maximum 3-4 simultaneous backdrop-filter elements in any viewport.**

| Context | Allowed Glass Elements | Rationale |
|---------|----------------------|-----------|
| Marketing landing | 1 navbar + up to 4 feature cards | Cards only glass on visible viewport, not all at once |
| Auth page | 1 card | Single form element |
| Dashboard | 1 header + up to 4 KPI cards | KPI cards are the primary glass moment |
| Modal/dialog open | 1 overlay + 1 dialog | Dialog replaces page content visually |

### Blur Value Guidelines

Higher blur values are exponentially more expensive on GPU:

| Blur Value | Use Case | GPU Cost |
|------------|----------|----------|
| `blur(8px)` — `glass-blur-sm` | Subtle surfaces, sidebar overlays | Low |
| `blur(12px)` — `glass-blur-md` | Standard cards, headers | Medium |
| `blur(20px)` — `glass-blur-lg` | Auth cards, modals | High |
| `blur(32px)` — `glass-blur-xl` | Hero centerpiece only | Very High |

The default `--glass-blur-md: blur(12px)` is the safe production value. Do not use `glass-blur-xl` on elements that render multiple times per page.

### will-change Strategy

Do NOT apply `will-change: filter` to glass elements statically. Apply only during animation:

```css
/* Only add will-change during hover transitions, remove after */
.glass-panel {
  transition: transform 0.2s, box-shadow 0.2s;
}
.glass-panel:hover {
  will-change: transform;  /* NOT will-change: filter */
}
```

`will-change: filter` forces a new compositing layer even when the element is not animating, causing unnecessary memory consumption.

### Loading Skeleton Compatibility

The existing `PageSkeleton` component uses `<Skeleton className="h-[120px] rounded-xl" />`. When dashboard cards become glass, the loading skeleton should match the glass shape without applying `backdrop-filter`:

```typescript
// apps/web/components/shared/page-skeleton.tsx
// Skeleton components do NOT use glass-surface
// They are replaced with opaque shimmer skeletons that LOOK like glass cards
// (same border-radius, similar border, shimmer animation)

// The distinction: glass is a live effect; skeletons are placeholder shapes
// Using backdrop-filter on skeletons is wasted GPU during data loading
```

### Prefers-Reduced-Transparency / Reduced-Motion

```css
/* Add to globals.css after the existing @layer base block */
@media (prefers-reduced-transparency: reduce) {
  :root {
    --glass-bg:         hsl(var(--card));
    --glass-bg-subtle:  hsl(var(--card));
    --glass-bg-heavy:   hsl(var(--card));
    --glass-blur:       blur(0px);
  }
  .glass-surface,
  .glass-surface-subtle,
  .glass-surface-heavy {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

`prefers-reduced-transparency` is the correct media query (not `prefers-reduced-motion`) for users who disable translucency in their OS accessibility settings. This provides a proper opaque fallback that uses the existing `--card` token.

---

## Progressive Enhancement Strategy

`@supports (backdrop-filter: blur(1px))` is the standard CSS feature query. Tailwind exposes this as the `supports-[backdrop-filter]` modifier.

**Pattern for every glass component:**

```tsx
// In JSX className:
className={cn(
  // Base styles (always apply — border, radius, shadow)
  'rounded-lg border border-border shadow-sm',
  // Fallback background when backdrop-filter NOT supported
  'bg-card/95',
  // Glass upgrade when backdrop-filter IS supported
  'supports-[backdrop-filter]:bg-glass supports-[backdrop-filter]:backdrop-blur-glass supports-[backdrop-filter]:border-glass',
)}
```

This means:
- Firefox (historically poor `backdrop-filter` support): gets opaque card with `bg-card/95`
- Chrome/Safari/Edge: gets full glass effect
- Users with OS reduced transparency: gets opaque card via CSS media query override

**Browser support for `backdrop-filter` as of 2025-2026:** All major browsers support it — Chrome 76+, Firefox 103+ (with `layout.css.backdrop-filter.enabled` flag, enabled by default from Firefox 103), Safari 9+ (with `-webkit-` prefix). The `-webkit-` prefix must be included alongside the standard property.

---

## Recommended File Structure (Changes Only)

```
apps/web/
├── app/
│   └── globals.css                    MODIFIED — add glass tokens to :root and .dark
├── tailwind.config.ts                 MODIFIED — add backdropBlur, backgroundColor, boxShadow, borderColor extensions + glassPlugin
├── lib/
│   └── tailwind/
│       └── glass-plugin.ts            NEW — Tailwind plugin for .glass-surface utilities
├── components/
│   ├── ui/
│   │   ├── card.tsx                   MODIFIED — add glass variant via CVA
│   │   ├── button.tsx                 MODIFIED — add glass variant to existing buttonVariants
│   │   ├── dialog.tsx                 MODIFIED — glass overlay + content background
│   │   ├── glass-panel.tsx            NEW — generic glass surface component
│   │   └── gradient-mesh.tsx          NEW — animated gradient mesh background
│   ├── layout/
│   │   ├── sidebar.tsx                UNCHANGED — stays solid for readability
│   │   └── header.tsx                 MODIFIED — replace bg-background with glass-surface-subtle
│   ├── dashboard/
│   │   └── stat-card.tsx              MODIFIED — Card variant="glass"
│   └── shared/
│       └── page-skeleton.tsx          UNCHANGED — skeletons stay opaque (correct)
└── app/[locale]/
    ├── (marketing)/
    │   ├── layout.tsx                 MODIFIED — add gradient-mesh background, fix stacking context
    │   └── _components/
    │       └── marketing-navbar.tsx   MODIFIED — replace ad-hoc glass with glass-surface token
    ├── (auth)/
    │   └── layout.tsx                 MODIFIED — add gradient-mesh, switch Card to glass variant
    └── (dashboard)/
        └── layout.tsx                 MODIFIED — add subtle gradient-mesh at low opacity
```

---

## Build Order (Dependency-Sequenced)

The design system foundation MUST be complete before any page-level work begins. Components depend on tokens; pages depend on components.

```
Phase 1: Token Foundation (no visible output yet — unblocks everything)
  ├── globals.css: add --glass-* primitives and semantic tokens to :root and .dark
  ├── tailwind.config.ts: add theme extensions for backdropBlur, backgroundColor, etc.
  └── lib/tailwind/glass-plugin.ts: create plugin with .glass-surface utilities
  Blocks: All other phases
  Risk: LOW — pure CSS/config, no component changes

Phase 2: New Primitive Components (no page changes yet)
  ├── components/ui/glass-panel.tsx: GlassPanel wrapper
  └── components/ui/gradient-mesh.tsx: GradientMesh background
  Blocks: Layout modifications
  Risk: LOW — new files only, nothing existing modified

Phase 3: Existing Component Variants (backward-compatible modifications)
  ├── components/ui/card.tsx: add CVA + glass variant (default unchanged)
  ├── components/ui/button.tsx: add glass variant to buttonVariants
  └── components/ui/dialog.tsx: glass overlay and content styling
  Blocks: Page-level usage of glass components
  Risk: LOW-MEDIUM — CVA introduction changes Card props interface; verify TypeScript

Phase 4: Dashboard Page Sections (highest user time-on-page, most impact)
  ├── components/dashboard/stat-card.tsx: Card variant="glass"
  ├── components/layout/header.tsx: glass-surface-subtle
  └── app/[locale]/(dashboard)/layout.tsx: subtle gradient-mesh + stacking context
  Blocks: Nothing (final consumer)
  Risk: MEDIUM — stacking context changes can affect z-index of dropdowns/tooltips

Phase 5: Marketing Pages
  ├── app/[locale]/(marketing)/layout.tsx: gradient-mesh + stacking context
  └── app/[locale]/(marketing)/_components/marketing-navbar.tsx: glass tokens
  Blocks: Nothing
  Risk: MEDIUM — z-index stacking context must be verified against MobileNav

Phase 6: Auth Pages
  └── app/[locale]/(auth)/layout.tsx: gradient-mesh + heavy glass card
  Blocks: Nothing
  Risk: LOW — simplest page structure, single card component
```

**Why this order:**
- Tokens before components: components cannot use `var(--glass-bg)` until the variable is defined
- New components before modifications: verifies the glass system works before touching existing code
- Dashboard before marketing: dashboard has higher complexity (z-index, dropdowns, mobile nav) and more active users
- Auth last: simplest structure, lowest risk, easiest to verify

---

## Stacking Context Pitfalls

### Dashboard z-index Conflicts

The existing dashboard layout creates stacking contexts at:
- Sidebar: `z-*` from sticky positioning
- Header: `z-10` (explicit)
- Modals/Dialogs: Radix UI portals at `z-50`

Adding `gradient-mesh` as a fixed background with `-z-10` is safe — negative z-index sits below the document flow.

**Verified conflict risk:** The `MobileNav` component in `apps/web/components/layout/` renders a slide-over panel. If the marketing layout's gradient mesh creates a new stacking context via `transform` or `filter`, it can clip the mobile nav. Solution: use `fixed inset-0` with `-z-10` on the mesh, NOT `transform` or `filter` on the mesh container itself. The CSS `gradient-mesh` utility uses only `background-image`, which does NOT create a stacking context.

### Backdrop-Filter Clip Boundary

`backdrop-filter` blurs everything behind an element up to its nearest ancestor that is a "backdrop root" (i.e., has `isolation: isolate` or creates a new stacking context). If the gradient mesh background is behind a parent with `isolation: isolate`, backdrop-filter on child glass cards may blur incorrectly against a white background instead of the gradient.

**Prevention:** Do NOT add `isolation: isolate` or `transform` to the page wrapper that contains both the gradient mesh and the glass cards. The mesh `div` uses `fixed inset-0 -z-10` — it is positioned outside the layout flow, so it is naturally the backdrop for all glass elements in the document without requiring explicit isolation.

---

## Anti-Patterns

### Anti-Pattern 1: Replacing `bg-card` Globally

**What people do:** Change `--card` CSS variable to `rgba(255,255,255,0.55)` to make all cards glass.
**Why it's wrong:** `--card` is used by shadcn/ui in dropdowns, popovers, command palettes, and select menus. A transparent `--card` makes interactive overlays like `<Select>` render with a blurred translucent background that is unreadable. Popover content becomes illegible.
**Do this instead:** Keep `--card` as the opaque solid color. Add separate `--glass-bg` tokens and use them explicitly via the `variant="glass"` prop on individual Card components.

### Anti-Pattern 2: Applying Glass to Text-Dense Surfaces

**What people do:** Glass sidebar navigation, glass data tables, glass form inputs.
**Why it's wrong:** Text at small sizes (12-14px) against a blurred background fails WCAG contrast requirements. Data tables with glass panels behind them become difficult to scan. Form inputs need clear affordances — a translucent input field creates uncertainty about editability.
**Do this instead:** Reserve glass for cards with large text, icon-forward KPI cards, hero sections, and structural containers. Inputs, tables, and navigation items stay on solid backgrounds.

### Anti-Pattern 3: Glass with No Background Behind It

**What people do:** Add `backdrop-blur-lg` to a card that sits on `bg-background` (plain white or plain dark).
**Why it's wrong:** Blurring a solid color produces the same solid color. If there is nothing visually interesting behind the glass, the effect is invisible. The glass surface appears as an ordinary opaque card with slightly reduced performance.
**Do this instead:** Glass only works when there is a gradient, image, or visually distinct layer behind it. The `gradient-mesh` background is the required companion to glass UI in this design system. Always ensure glass elements are positioned over the mesh layer.

### Anti-Pattern 4: will-change: filter on Static Glass Elements

**What people do:** Add `will-change: filter` or `will-change: backdrop-filter` to glass cards to "pre-optimize" them.
**Why it's wrong:** `will-change` allocates a GPU compositing layer immediately and holds it for the element's lifetime. With 4 KPI cards all having `will-change: filter`, that's 4 permanent GPU layers for elements that never animate their filter.
**Do this instead:** No `will-change` on static glass. Add `will-change: transform` only during hover state transitions (scale, translate), not filter. The browser optimizes `backdrop-filter` automatically during compositing.

### Anti-Pattern 5: Nested Glass Elements

**What people do:** A glass card inside a glass panel inside a glass section.
**Why it's wrong:** Each level of `backdrop-filter` compounds. The innermost element blurs what is behind it — which is the parent glass panel — which is itself a blurred, semi-transparent surface. The result is muddy, grey, and loses the visual clarity that makes glass beautiful.
**Do this instead:** Maximum one level of glass nesting per section. If nesting is required (e.g., a modal inside a glass-backgrounded page), use `glass-surface-heavy` on the inner element to make it fully opaque, not glass-on-glass.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Token architecture | HIGH | Based on existing working shadcn/ui CSS variable pattern in codebase; same mechanism |
| Tailwind plugin API | HIGH | Official Tailwind v3 docs verified via WebFetch |
| CVA variant addition | HIGH | Verified against existing `buttonVariants` pattern in codebase |
| ThemeProvider hydration | HIGH | `ThemeToggle` in codebase already uses correct mounted-check pattern |
| Stacking context analysis | HIGH | Verified layout structure from actual component reads |
| backdrop-filter browser support | MEDIUM | Cited sources; caniuse not directly accessible but widely documented as 95%+ global support |
| Performance benchmarks | MEDIUM | GPU cost claims are qualitative consensus across multiple sources; actual values are hardware-dependent |
| `prefers-reduced-transparency` support | MEDIUM | Safari/Chrome supported; Firefox support may vary; always test |

---

## Sources

- Codebase: `apps/web/app/globals.css` — existing CSS variable structure verified — HIGH confidence
- Codebase: `apps/web/tailwind.config.ts` — existing theme extensions verified — HIGH confidence
- Codebase: `apps/web/components/ui/button.tsx` — existing CVA `buttonVariants` pattern verified — HIGH confidence
- Codebase: `apps/web/components/ui/card.tsx` — existing non-CVA Card verified; CVA addition required — HIGH confidence
- Codebase: `apps/web/app/providers.tsx` — ThemeProvider `attribute="class"` confirmed — HIGH confidence
- Codebase: `apps/web/app/[locale]/(marketing)/layout.tsx` — stacking context baseline verified — HIGH confidence
- Codebase: `apps/web/app/[locale]/(dashboard)/layout.tsx` — existing layout structure verified — HIGH confidence
- Codebase: `apps/web/components/layout/header.tsx` — existing `bg-background` class verified — HIGH confidence
- Codebase: `apps/web/components/ui/theme-toggle.tsx` — `mounted` hydration pattern verified — HIGH confidence
- [Tailwind CSS Plugins docs (v3)](https://v3.tailwindcss.com/docs/plugins) — `addUtilities`, `addComponents` API — HIGH confidence
- [Vercel Academy: Extending shadcn/ui](https://vercel.com/academy/shadcn-ui/extending-shadcn-ui-with-custom-components) — CVA variant addition pattern — HIGH confidence
- [glasscn-ui GitHub](https://github.com/itsjavi/glasscn-ui) — reference implementation for shadcn/ui glass variants — MEDIUM confidence
- [shadcn-glass-ui DEV.to](https://dev.to/yhooi2/introducing-shadcn-glass-ui-a-glassmorphism-component-library-for-react-4cpl) — 3-layer token architecture reference — MEDIUM confidence
- [LogRocket: Glassmorphism CSS](https://blog.logrocket.com/implement-glassmorphism-css/) — stacking context and dark mode guidance — MEDIUM confidence
- [Epic Web Dev: Tailwind CSS Glassmorphism](https://www.epicweb.dev/tips/creating-glassmorphism-effects-with-tailwind-css) — `bg-white/10 backdrop-blur-lg` pattern — HIGH confidence
- [Axess Lab: Glassmorphism Accessibility](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/) — `prefers-reduced-transparency` and contrast requirements — HIGH confidence
- [Half Accessible: Glassmorphism Implementation Guide](https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide) — blur value performance guidelines (8-15px threshold) — MEDIUM confidence
- [shadcn/ui issue #327](https://github.com/shadcn-ui/ui/issues/327) — backdrop-filter performance concerns with shadcn/ui — MEDIUM confidence

---

_Architecture research for: Glassmorphism design system integration with Next.js 14 + Tailwind + shadcn/ui_
_Researched: 2026-02-25_

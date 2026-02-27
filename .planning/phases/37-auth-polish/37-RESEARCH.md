# Phase 37: Auth Pages and Polish Pass - Research

**Researched:** 2026-02-25
**Domain:** Auth page glassmorphism layout, Motion stagger animations, shimmer loading skeletons, shadcn component glass overrides, dark mode QA, responsive QA
**Confidence:** HIGH

---

## Summary

Phase 37 is the final v1.4 phase. It has two distinct workstreams: (1) converting the four auth pages (login, register, forgot-password, reset-password) from flat `Card` + `bg-muted/40` to a centered glass card on a gradient mesh background with an entrance animation, and (2) a comprehensive polish pass covering five areas -- KPI card stagger animations, glass shimmer loading skeletons, glass dropdown/tooltip overrides, dark mode QA, and responsive QA across three breakpoints.

The existing codebase is well-prepared for this phase. The auth layout at `apps/web/app/[locale]/(auth)/layout.tsx` is a 24-line server component wrapping children in a centered `Card` with a `bg-muted/40` background. The `GradientMesh` component already supports a `preset="auth"` variant with both light and dark CSS classes (`gradient-mesh-auth`) defined in `globals.css`. The `glass-surface-heavy` utility is already registered in the Tailwind plugin. The auth layout conversion is primarily a matter of swapping the background, replacing `<Card className="shadow-lg">` with a glass-surface-heavy panel, and wrapping the content in a `motion.div` for the entrance animation. The four form components (login-form, register-form, forgot-password-form, reset-password-form) are all client components that render inside the layout's `{children}` slot -- they require NO modifications for glass because the glass treatment goes on the layout card wrapper, not on form inputs (AUTH-02: inputs remain opaque with `bg-background`).

The polish pass requires careful scope management. The `motion` library v12.34.3 is already installed and already used in two places (feature-grid stagger, booking confirmation entrance). The existing `feature-grid.tsx` provides a proven stagger pattern using `variants` + `staggerChildren` + `whileInView` with `viewport={{ once: true }}` that should be adapted for KPI cards. For shimmer skeletons, the project currently has two skeleton systems (`components/shared/page-skeleton.tsx` and `components/shared/loading-skeleton.tsx`) plus a base `Skeleton` UI component using `animate-pulse`. The glass shimmer upgrade replaces the flat `bg-muted animate-pulse` with a glass-shaped shimmer wave using a custom CSS keyframe animation. The shadcn component overrides (Select, DropdownMenu, Tooltip) are surgical edits to three files -- replacing `bg-popover` with glass-surface classes on the `*Content` components. There are 15 loading.tsx files under the dashboard route group that use `PageSkeleton`, and 13 pages that use `SelectContent` or `DropdownMenuContent`.

**Primary recommendation:** Convert the auth layout first (smallest scope, highest visual impact, independent of other work), then implement KPI stagger + shimmer skeletons together (both involve Motion), then do glass component overrides (Select, DropdownMenu, Tooltip), and finish with dark mode + responsive QA passes that verify everything.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| `motion` | ^12.34.3 (installed) | Entrance animations (auth card, KPI stagger) and shimmer wave | Already used in feature-grid.tsx and BookingConfirmationSuccess.tsx; `staggerChildren` variant propagation is the standard pattern |
| `class-variance-authority` | ^0.7.1 (installed) | Glass variant system on Card, Badge, Button | Already in use; Card `variant="glass"` already defined |
| `tailwindcss-animate` | installed | shadcn animation utilities (fade-in, zoom-in, slide-in) on Select/Dropdown/Tooltip | Already a plugin in `tailwind.config.ts` |
| Glass utilities (Phase 33) | Already registered | `glass-surface`, `glass-surface-subtle`, `glass-surface-heavy` | Foundation for all glass treatments in this phase |
| `GradientMesh` component | Already built | `preset="auth"` variant with light/dark CSS | Ready to use in auth layout |
| `GlassPanel` component | Already built | `intensity="heavy"` wraps glass-surface-heavy | Ready to use as auth card wrapper |

### Supporting

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `next-themes` | ^0.4.6 (installed) | Dark mode toggle for QA | Already integrated; ThemeToggle already in auth layout |
| `@radix-ui/react-select` | installed | Select primitive; SelectContent needs glass override | Settings and filter pages |
| `@radix-ui/react-dropdown-menu` | installed | DropdownMenu primitive; DropdownMenuContent needs glass override | Settings and header menus |
| `@radix-ui/react-tooltip` | installed | Tooltip primitive; TooltipContent needs glass override | Sidebar, NoShowRiskBadge, RewardsCatalog |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Motion `staggerChildren` variant propagation | Individual `transition.delay` per card | Variant propagation is cleaner, auto-scales to N children, and matches existing feature-grid pattern |
| Custom CSS `@keyframes shimmer` + Motion | Pure CSS shimmer only | Motion adds JS control for shimmer wave timing sync with entrance animation; CSS-only is simpler but cannot coordinate with layout transitions |
| `GlassPanel intensity="heavy"` for auth card | Direct `glass-surface-heavy` className on div | GlassPanel provides typed intensity prop and consistent rounded-lg; using it is more explicit and self-documenting |

**Installation:** No new packages needed. Everything already installed.

---

## Architecture Patterns

### Files to Modify/Create

```
apps/web/
  app/[locale]/(auth)/
    layout.tsx                    # MODIFY: glass layout with GradientMesh + GlassPanel + Motion entrance
  components/
    dashboard/
      dashboard-grid.tsx          # MODIFY: wrap StatCards in motion.div with stagger variants
    shared/
      page-skeleton.tsx           # MODIFY: glass shimmer variant for dashboard/auth contexts
      glass-shimmer.tsx           # NEW: reusable glass shimmer skeleton component
    ui/
      skeleton.tsx                # MODIFY: add shimmer animation variant alongside pulse
      select.tsx                  # MODIFY: glass treatment on SelectContent
      dropdown-menu.tsx           # MODIFY: glass treatment on DropdownMenuContent + SubContent
      tooltip.tsx                 # MODIFY: frosted glass treatment on TooltipContent
  app/globals.css                 # MODIFY: add shimmer keyframe animation
  tailwind.config.ts              # MODIFY: add shimmer keyframe + animation
```

### Pattern 1: Auth Layout Glass Conversion

**What:** Replace flat `bg-muted/40` background with `GradientMesh preset="auth"` and wrap the card content in a `GlassPanel intensity="heavy"` with a Motion entrance animation. The layout becomes a `'use client'` component to use Motion.

**When to use:** Any full-page centered form layout that should show glass.

**Example:**
```typescript
// Source: Existing GradientMesh preset="auth" in globals.css + GlassPanel in glass-panel.tsx
'use client';

import { motion } from 'motion/react';
import { GradientMesh } from '@/components/glass/gradient-mesh';
import { GlassPanel } from '@/components/glass/glass-panel';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <GradientMesh preset="auth" />
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ScheduleBox</h1>
          <p className="text-muted-foreground mt-2">AI-powered scheduling for SMBs</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassPanel intensity="heavy" className="p-6 rounded-xl">
            {children}
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}
```

**Key constraints:**
- Auth layout becomes `'use client'` because it uses Motion -- this is safe because the child pages (login, register, etc.) are already client components.
- Form inputs inside the glass card remain opaque (`bg-background` via the existing Input component) -- AUTH-02 requirement.
- The `GradientMesh` with `preset="auth"` is already CSS-defined in both light and dark modes.
- The `gradient-mesh-auth` is intentionally muted (slate/gray tones) compared to the marketing blue/indigo mesh.

### Pattern 2: KPI Card Stagger Animation

**What:** Wrap the four StatCard components in a motion container with stagger variant propagation. The animation fires once on initial page load and does not replay on tab switch or re-render.

**When to use:** Grid of cards that should animate in sequentially on page load.

**Example:**
```typescript
// Source: Adapted from existing feature-grid.tsx pattern in the codebase
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 1 }, // Container itself is always visible
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms per card
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1], // ease-out
    },
  },
};

// In DashboardGrid component:
<motion.div
  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
  variants={containerVariants}
  initial="hidden"
  animate="show"
>
  {cards.map((card, i) => (
    <motion.div key={card.key} variants={cardVariants}>
      <StatCard {...card} />
    </motion.div>
  ))}
</motion.div>
```

**Critical detail:** The `animate="show"` (not `whileInView`) fires once on mount. Since `DashboardGrid` is a client component that conditionally renders after `isLoading` resolves, the animation fires when the data arrives, not on every render. The component unmounts on navigation and remounts on return, so the animation replays only on fresh navigation (not tab switch). React Query caching means subsequent visits may render instantly with cached data -- the animation still fires once on mount because Motion tracks initial/animate per mount lifecycle.

### Pattern 3: Glass Shimmer Skeleton

**What:** A shimmer wave effect over glass-shaped skeleton placeholders, replacing the flat `animate-pulse bg-muted` pattern.

**When to use:** Loading states in glass contexts (dashboard sub-pages, auth pending state).

**Example - Shimmer keyframe in tailwind.config.ts:**
```typescript
// Add to theme.extend.keyframes:
shimmer: {
  '0%': { backgroundPosition: '-200% 0' },
  '100%': { backgroundPosition: '200% 0' },
},
// Add to theme.extend.animation:
shimmer: 'shimmer 1.5s ease-in-out infinite',
```

**Example - Glass shimmer skeleton component:**
```typescript
// components/shared/glass-shimmer.tsx
import { cn } from '@/lib/utils';

interface GlassShimmerProps {
  className?: string;
}

export function GlassShimmer({ className }: GlassShimmerProps) {
  return (
    <div
      className={cn(
        'rounded-xl glass-surface-subtle overflow-hidden relative',
        className,
      )}
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
}
```

**Dark mode variant:** The shimmer gradient uses `rgba(255,255,255,0.08)` in light mode and `rgba(255,255,255,0.04)` in dark mode -- defined via CSS variable or `.dark` selector in globals.css.

### Pattern 4: Glass Override on Portaled shadcn Components

**What:** Replace `bg-popover` with glass surface classes on the content elements of Select, DropdownMenu, and Tooltip. These components render via Radix Portal, so they are outside the normal DOM tree and need their own glass treatment.

**When to use:** All Select/DropdownMenu instances in glass contexts (settings, filters), all Tooltip instances.

**Example - SelectContent glass override:**
```typescript
// In select.tsx, change SelectContent className from:
'border border-border bg-popover text-popover-foreground shadow-md ...'
// To:
'glass-surface border-glass text-popover-foreground shadow-glass ...'
```

**Example - TooltipContent glass override:**
```typescript
// In tooltip.tsx, change TooltipContent className from:
'border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md ...'
// To:
'glass-surface-subtle border-glass px-3 py-1.5 text-sm text-popover-foreground shadow-glass ...'
```

**Important:** DropdownMenuSubContent needs the same treatment as DropdownMenuContent.

### Anti-Patterns to Avoid

- **Animating `backdrop-filter` values:** GPU re-paint per frame. Only animate `opacity`, `y`, `scale`, `box-shadow`.
- **Glass on form inputs:** Inputs must stay `bg-background` for clarity. Glass is the card wrapper only (AUTH-02).
- **Re-animating on every render:** KPI stagger must use `initial`/`animate` (not `whileInView`) so it fires once per mount, not on scroll/re-render.
- **Global Skeleton replacement:** Only replace skeletons in glass contexts (dashboard, auth). Non-glass contexts (if any exist) keep the default.
- **Removing existing animation classes from shadcn portaled components:** Keep the `animate-in`/`animate-out` classes -- they handle open/close transitions. Glass is additive to these.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Glass card wrapper | Custom div with backdrop-filter CSS | `GlassPanel intensity="heavy"` | Already built, handles forwardRef, rounded-lg, ::before scrim |
| Gradient background | Inline CSS radial-gradient | `GradientMesh preset="auth"` | Already built with light/dark variants, fixed positioning, pointer-events:none |
| Entrance animation | CSS `@keyframes` for auth card | Motion `initial`/`animate` | JS library already installed; provides interruptibility, reduced-motion support via `useReducedMotion()` |
| Stagger delay math | Manual `transition-delay` per card | Motion `staggerChildren: 0.05` in container variant | Scales to N children, handles enter/exit, matches existing codebase pattern |
| Glass token values | Hardcoded rgba in component files | CSS variables via `glass-surface-*` utilities | Token system already defined in globals.css and glass-plugin.ts |

**Key insight:** Phase 37 should create almost no new infrastructure. The glass token foundation (Phase 33), glass components (Phase 34), dashboard glass layout (Phase 35), and marketing glass (Phase 36) have already established every primitive needed. This phase is pure composition and polish.

---

## Common Pitfalls

### Pitfall 1: Auth Layout `'use client'` Breaks Metadata

**What goes wrong:** Converting the auth layout to `'use client'` for Motion breaks the `metadata` export in child page.tsx files (Next.js requires server components for metadata).
**Why it happens:** Next.js App Router allows `metadata` exports only in server components.
**How to avoid:** The layout itself becomes client, but the page.tsx files (login, register, etc.) remain server components that export `metadata`. Next.js renders page.tsx server-side and passes content as `children` to the client layout. This works because only the layout is client -- the pages stay server. Verify that each page.tsx keeps its `export const metadata` after the layout change.
**Warning signs:** Build errors about `metadata` not being allowed in client components.

### Pitfall 2: Shimmer Animation Performance on Mobile

**What goes wrong:** CSS shimmer with `background-position` animation on many skeleton elements causes frame drops on low-end Android devices.
**Why it happens:** Each shimmer element triggers its own paint operation. Multiple concurrent shimmer animations compound GPU load.
**How to avoid:** Limit shimmer to the visible skeleton containers (4 KPI cards + 1-2 content areas), not every individual skeleton line. Use `will-change: background-position` sparingly (only on the shimmer overlay div). On mobile (`<768px`), the glass degradation already reduces blur -- the shimmer should also be simpler (fewer concurrent instances).
**Warning signs:** Lighthouse performance score drops on mobile audit.

### Pitfall 3: Dark Mode Glass Opacity Too Low

**What goes wrong:** Glass panels on `#191919` base are invisible because opacity is below 50%.
**Why it happens:** The dark mode glass tokens from Phase 33 use `rgba(15, 23, 42, 0.45)` for `glass-surface` and `rgba(15, 23, 42, 0.65)` for `glass-surface-heavy`. On a `#191919` base, the 0.45 medium glass may not be visible enough.
**How to avoid:** POLSH-05 requires verifying all glass components on `#191919` base with correct opacity. During QA, check that glass borders (`--glass-border-light` in dark = `rgba(255, 255, 255, 0.08)`) are visible. If too subtle, increase dark border opacity to `rgba(255, 255, 255, 0.12)`. The success criteria specifies opacity not below 50% -- verify `--glass-bg-heavy-light` in dark mode is `rgba(15, 23, 42, 0.65)` which exceeds 50%.
**Warning signs:** Glass cards blend into background, appearing as borderless rectangles.

### Pitfall 4: Select/Dropdown Glass Breaks Non-Glass Contexts

**What goes wrong:** Applying glass to `SelectContent` globally means Select dropdowns in non-glass contexts (e.g., inside opaque cards, modals) also get glass treatment, looking inconsistent.
**Why it happens:** The shadcn Select component is shared globally -- there is one `SelectContent` definition.
**How to avoid:** The requirement says "in settings and filter contexts" -- but modifying the base component affects all instances. The pragmatic approach: apply glass globally because the dashboard already has a gradient mesh background, so all Select instances are in a glass context. The few non-glass contexts (public booking widget) use different components entirely. Verify visually after applying.
**Warning signs:** Glass dropdown appearing on a flat white background with no gradient mesh behind it.

### Pitfall 5: KPI Animation Replays on Tab Switch

**What goes wrong:** User switches browser tabs and returns -- KPI cards re-animate.
**Why it happens:** Using `whileInView` with `viewport={{ once: true }}` triggers based on intersection observer. If the element leaves and re-enters the viewport (tab switch doesn't cause this, but scroll can), it may retrigger.
**How to avoid:** Use `initial="hidden" animate="show"` (not `whileInView`). This fires once on component mount. React's reconciliation preserves the component across tab switches (no unmount/remount), so the animation state is retained. The animation only replays on fresh navigation that unmounts and remounts the component.
**Warning signs:** Animation replay visible when switching browser tabs or scrolling.

### Pitfall 6: Tooltip Glass Arrow Mismatch

**What goes wrong:** TooltipContent gets glass treatment but the Tooltip arrow (if present) remains solid/opaque.
**Why it happens:** Radix Tooltip arrow is a separate SVG element not covered by backdrop-filter.
**How to avoid:** The current TooltipContent in this codebase has NO arrow element -- it uses padding + sideOffset only. No arrow fix needed. Just apply glass to TooltipContent directly.
**Warning signs:** N/A -- no arrow in current implementation.

---

## Code Examples

### Auth Layout -- Complete Glass Conversion

```typescript
// Source: Codebase analysis of existing layout.tsx + GradientMesh + GlassPanel
'use client';

import { motion } from 'motion/react';
import { GradientMesh } from '@/components/glass/gradient-mesh';
import { GlassPanel } from '@/components/glass/glass-panel';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <GradientMesh preset="auth" />
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">ScheduleBox</h1>
            <p className="text-muted-foreground mt-2">AI-powered scheduling for SMBs</p>
          </div>
          <GlassPanel intensity="heavy" className="p-6 rounded-xl">
            {children}
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}
```

### KPI Stagger -- DashboardGrid Modification

```typescript
// Source: Adapted from existing feature-grid.tsx stagger pattern
'use client';

import { motion } from 'motion/react';
// ... existing imports ...

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05, // 50ms between each card
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function DashboardGrid() {
  const t = useTranslations('dashboard');
  const { data, isLoading } = useAnalyticsQuery(30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassShimmer key={i} className="h-[120px]" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={cardVariants}>
        <StatCard ... />
      </motion.div>
      {/* ... repeat for each card */}
    </motion.div>
  );
}
```

### Shimmer Keyframe -- tailwind.config.ts Addition

```typescript
// Source: Tailwind CSS custom animation pattern (verified via Tailwind docs)
// Add to theme.extend.keyframes:
shimmer: {
  '0%': { backgroundPosition: '-200% 0' },
  '100%': { backgroundPosition: '200% 0' },
},
// Add to theme.extend.animation:
shimmer: 'shimmer 1.5s ease-in-out infinite',
```

### Glass Shimmer Skeleton Component

```typescript
// Source: Composition of existing glass utilities + shimmer animation
import { cn } from '@/lib/utils';

interface GlassShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function GlassShimmer({ className, ...props }: GlassShimmerProps) {
  return (
    <div
      className={cn(
        'rounded-xl glass-surface-subtle overflow-hidden relative',
        className,
      )}
      {...props}
    >
      <div
        className="absolute inset-0 animate-shimmer rounded-xl"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
}
```

### SelectContent Glass Override

```typescript
// Source: Codebase analysis of existing select.tsx
// Change in SelectContent className:
// FROM:
'border border-border bg-popover text-popover-foreground shadow-md'
// TO:
'glass-surface border-glass text-popover-foreground shadow-glass'
```

### TooltipContent Glass Override

```typescript
// Source: Codebase analysis of existing tooltip.tsx
// Change in TooltipContent className:
// FROM:
'border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md'
// TO:
'glass-surface-subtle border-glass px-3 py-1.5 text-sm text-popover-foreground shadow-glass'
```

---

## Existing Codebase Inventory

### Auth Pages (4 pages, 1 layout, 4 form components)

| File | Type | Current State | Phase 37 Action |
| --- | --- | --- | --- |
| `app/[locale]/(auth)/layout.tsx` | Server component | Flat `bg-muted/40`, plain `Card shadow-lg` | Convert to client, add GradientMesh + GlassPanel + Motion |
| `app/[locale]/(auth)/login/page.tsx` | Server component | Renders `<LoginForm />`, exports metadata | NO CHANGE (metadata stays server-side) |
| `app/[locale]/(auth)/register/page.tsx` | Server component | Renders `<RegisterForm />`, exports metadata | NO CHANGE |
| `app/[locale]/(auth)/forgot-password/page.tsx` | Server component | Renders `<ForgotPasswordForm />`, exports metadata | NO CHANGE |
| `app/[locale]/(auth)/reset-password/page.tsx` | Server component | Renders `<ResetPasswordForm />`, exports metadata | NO CHANGE |
| `components/auth/login-form.tsx` | Client component | Form with Input fields | NO CHANGE (inputs stay opaque) |
| `components/auth/register-form.tsx` | Client component | Form with Input fields | NO CHANGE |
| `components/auth/forgot-password-form.tsx` | Client component | Form with Input field | NO CHANGE |
| `components/auth/reset-password-form.tsx` | Client component | Form with Input fields | NO CHANGE |

### Dashboard KPI Components

| File | Current State | Phase 37 Action |
| --- | --- | --- |
| `components/dashboard/dashboard-grid.tsx` | Renders 4 StatCards in grid, flat Skeleton loading | Add Motion stagger variants, glass shimmer loading |
| `components/dashboard/stat-card.tsx` | Already uses `Card variant="glass"` | NO CHANGE (already glass) |

### Skeleton Components

| File | Current State | Phase 37 Action |
| --- | --- | --- |
| `components/ui/skeleton.tsx` | `animate-pulse bg-muted` | Keep as-is; glass shimmer is a separate component |
| `components/shared/page-skeleton.tsx` | 5 variants (dashboard, table, cards, form, detail) | Upgrade dashboard variant to use GlassShimmer |
| `components/shared/table-skeleton.tsx` | Standard table skeleton | Keep as-is (tables stay opaque per Decision 24) |
| `components/shared/loading-skeleton.tsx` | CardSkeleton, TableSkeleton, PageSkeleton, FormSkeleton | Keep as-is (alternative skeleton system, non-glass) |
| NEW: `components/shared/glass-shimmer.tsx` | Does not exist | CREATE: glass shimmer skeleton building block |

### shadcn Components to Override

| File | Component | Current Classes | Glass Override |
| --- | --- | --- | --- |
| `components/ui/select.tsx` | `SelectContent` | `bg-popover border-border shadow-md` | `glass-surface border-glass shadow-glass` |
| `components/ui/dropdown-menu.tsx` | `DropdownMenuContent` | `bg-popover border-border shadow-md` | `glass-surface border-glass shadow-glass` |
| `components/ui/dropdown-menu.tsx` | `DropdownMenuSubContent` | `bg-popover border-border shadow-lg` | `glass-surface border-glass shadow-glass` |
| `components/ui/tooltip.tsx` | `TooltipContent` | `bg-popover border-border shadow-md` | `glass-surface-subtle border-glass shadow-glass` |

### Loading Files (15 files using PageSkeleton)

All under `app/[locale]/(dashboard)/*/loading.tsx`. The dashboard root loading uses `variant="dashboard"` which should show glass shimmers. Other variants (table, form, cards, detail) can optionally be upgraded but are lower priority since tables/forms stay opaque.

### Gradient Mesh Auth (already defined)

```css
/* Light mode - already in globals.css */
.gradient-mesh-auth {
  background:
    radial-gradient(ellipse 70% 50% at 30% 30%, rgba(148, 163, 184, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 70% 70%, rgba(100, 116, 139, 0.08) 0%, transparent 60%);
}

/* Dark mode - already in globals.css */
.dark .gradient-mesh-auth {
  background:
    radial-gradient(ellipse 70% 50% at 30% 30%, rgba(148, 163, 184, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 70% 70%, rgba(100, 116, 139, 0.04) 0%, transparent 60%);
}
```

Note: The auth mesh uses muted slate/gray tones, not the blue/indigo of dashboard/marketing. This is intentional -- auth pages should feel calm and professional, not attention-grabbing.

---

## Dark Mode QA Checklist (POLSH-05)

Based on existing dark mode glass tokens in globals.css:

| Token | Dark Value | Minimum Threshold | Status |
| --- | --- | --- | --- |
| `--glass-bg-light` (medium) | `rgba(15, 23, 42, 0.45)` | 50% opacity minimum | AT RISK (45% < 50%) |
| `--glass-bg-subtle-light` (subtle) | `rgba(15, 23, 42, 0.3)` | 50% opacity minimum | BELOW THRESHOLD (30% < 50%) |
| `--glass-bg-heavy-light` (heavy) | `rgba(15, 23, 42, 0.65)` | 50% opacity minimum | PASSES (65% > 50%) |
| `--glass-border-light` | `rgba(255, 255, 255, 0.08)` | Visible edge definition | AT RISK (very subtle) |
| `--glass-shadow-light` | `0 8px 32px rgba(0,0,0,0.4)` | Visible depth | LIKELY PASSES |

**Critical finding:** The dark mode `glass-surface` (medium) and `glass-surface-subtle` tokens may not meet the POLSH-05 requirement of "not below 50%" opacity on `#191919`. The current dark background is `--background: 222.2 84% 4.9%` which is approximately `#020617` (very dark blue), not exactly `#191919`. The QA pass MUST verify actual rendered appearance and may need to bump:
- `--glass-bg-light` from 0.45 to 0.55 in dark mode
- `--glass-bg-subtle-light` from 0.3 to 0.5 in dark mode
- `--glass-border-light` from 0.08 to 0.12 in dark mode

### Gradient Orb Saturation Check

The dark mode gradient mesh orbs use significantly reduced opacity:
- Dashboard: blue at 0.08, indigo at 0.06, purple at 0.04
- Marketing: blue at 0.12, indigo at 0.10, purple at 0.06
- Auth: slate at 0.06, gray at 0.04

These may need bumping for dark mode visibility. QA should verify gradient orbs are subtly visible through glass panels.

---

## Responsive QA Checklist (POLSH-06)

### 375px (Mobile)

- Glass blur degradation ALREADY active via `@media (max-width: 767px)` in globals.css (surface: 8px, subtle: 4px, heavy: 12px -- reduced from 16/8/24)
- Auth card: `max-w-md` + `px-4` should fit 375px (max-w-md = 448px, constrained by viewport)
- Dashboard KPI grid: `grid-cols-1` on mobile (single column)
- Check: no horizontal scroll on any page
- Check: all tap targets >= 44px (existing buttons use `h-10` = 40px -- may need audit)

### 768px (Tablet)

- Dashboard KPI grid: `sm:grid-cols-2` kicks in at 640px
- Auth card: centered, good width at 768px
- Glass blur at full values (768px is above the 767px breakpoint)

### 1280px (Desktop)

- Dashboard KPI grid: `lg:grid-cols-4` at 1024px
- Full glass effects, no degradation
- Check: max-w-7xl content container (1280px) is properly bounded

### Existing Glass Degradation (already in globals.css)

```css
@media (max-width: 767px) {
  .glass-surface { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .glass-surface-subtle { backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
  .glass-surface-heavy { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| `framer-motion` package | `motion` package (v12+) | 2024-Q4 | Import from `motion/react` not `framer-motion`; same API |
| `animate-pulse` skeletons | Shimmer wave skeletons | 2024+ | Better perceived loading speed; industry standard for premium UI |
| Solid tooltip backgrounds | Frosted glass tooltips | 2024+ | Part of glassmorphism design system; subtle but premium feel |
| `stagger(delay)` function | `staggerChildren` in variants | Stable since v6+ | Variant-based stagger is the recommended approach for React |

**Deprecated/outdated:**
- `framer-motion` import path: Use `motion/react` instead (this project already does)
- `AnimatePresence` for simple entrance animations: Not needed here -- `initial`/`animate` is sufficient for one-time entrance effects

---

## Open Questions

1. **Dark mode opacity thresholds**
   - What we know: The POLSH-05 requirement says "not below 50%", and current dark `glass-surface` is at 45% opacity
   - What's unclear: Whether "50%" refers to the CSS rgba alpha value or perceived visual opacity (they are different due to background blending)
   - Recommendation: Treat it as the CSS alpha value and bump `glass-bg-light` in dark mode from 0.45 to 0.55 during QA pass. Verify visually.

2. **Auth gradient mesh vividness**
   - What we know: The auth mesh uses muted slate/gray tones (0.12/0.08 light, 0.06/0.04 dark)
   - What's unclear: Whether the auth mesh should be more vivid to match the premium feel, or stay muted for a calm auth experience
   - Recommendation: Keep muted for v1.4 launch. The glass card itself provides the premium signal. The mesh is a subtle backdrop that should not compete with the form.

3. **Loading skeleton scope**
   - What we know: POLSH-02 says "glass shimmer loading skeletons replacing flat PageSkeleton/TableSkeleton in glass contexts"
   - What's unclear: Exactly which of the 15 loading.tsx files should use glass shimmer vs keep flat
   - Recommendation: Replace `PageSkeleton variant="dashboard"` with glass shimmer (root dashboard loading). For table/form/cards/detail variants, add glass-shaped containers but keep inner skeleton lines as-is. TableSkeleton stays flat per Decision 24 (tables are opaque).

---

## Sources

### Primary (HIGH confidence)

- **Codebase analysis** -- Direct file reads of all relevant components:
  - `apps/web/app/[locale]/(auth)/layout.tsx` -- current auth layout (24 lines)
  - `apps/web/components/glass/glass-panel.tsx` -- GlassPanel with CVA intensity variants
  - `apps/web/components/glass/gradient-mesh.tsx` -- GradientMesh with auth/dashboard/marketing presets
  - `apps/web/lib/plugins/glass-plugin.ts` -- glass-surface utilities with hardcoded blur values
  - `apps/web/app/globals.css` -- glass tokens, gradient-mesh-auth CSS, mobile degradation, dark mode tokens
  - `apps/web/components/ui/select.tsx`, `dropdown-menu.tsx`, `tooltip.tsx` -- current shadcn components
  - `apps/web/components/dashboard/stat-card.tsx` -- already uses `Card variant="glass"`
  - `apps/web/components/dashboard/dashboard-grid.tsx` -- KPI grid with flat skeleton loading
  - `apps/web/tailwind.config.ts` -- glass extensions, glassPlugin registered
  - `apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx` -- existing Motion stagger pattern
  - `apps/web/components/booking/BookingConfirmationSuccess.tsx` -- existing Motion entrance pattern
- **Phase 34 Research** -- `.planning/phases/34-component-glass-variants/34-RESEARCH.md` -- component architecture patterns
- **Project Research Summary** -- `.planning/research/SUMMARY.md` -- comprehensive glassmorphism stack and patterns

### Secondary (MEDIUM confidence)

- [Motion stagger docs](https://motion.dev/docs/stagger) -- stagger function API with `staggerChildren` and variant propagation
- [Motion React animation docs](https://motion.dev/docs/react-animation) -- `initial`/`animate`/`whileInView` patterns
- [Motion variants tutorial](https://motion.dev/tutorials/react-variants) -- variant propagation to children
- [Tailwind CSS shimmer patterns](https://www.slingacademy.com/article/tailwind-css-creating-shimmer-loading-placeholder-skeleton/) -- Custom keyframe shimmer implementation
- [Tailwind CSS animation docs](https://tailwindcss.com/docs/animation) -- Custom keyframe and animation configuration

### Tertiary (LOW confidence)

- None -- all findings verified against codebase or official docs.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- All libraries already installed and in use; versions verified from package.json
- Architecture: HIGH -- All glass primitives already built; auth layout is a straightforward composition of existing components
- Motion patterns: HIGH -- Existing codebase has two working examples (feature-grid stagger, booking confirmation entrance) that serve as templates
- Dark mode QA: MEDIUM -- Token values verified from globals.css, but actual visual appearance on `#191919` needs runtime verification; opacity thresholds may need adjustment
- Responsive QA: HIGH -- Glass degradation media queries already in place; responsive grid classes already correct; QA is verification, not new implementation
- Shimmer skeletons: MEDIUM -- Pattern is well-understood from industry practice, but the specific glass shimmer composition (glass-surface-subtle + animated gradient overlay) needs visual validation

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable -- all dependencies are locked, no fast-moving APIs)

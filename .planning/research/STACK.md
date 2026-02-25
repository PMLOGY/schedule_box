# Technology Stack — v1.4 Glassmorphism Design Overhaul

**Project:** ScheduleBox v1.4
**Focus:** Glassmorphism design system — frosted glass cards, gradient backgrounds, premium typography, glass transitions
**Researched:** 2026-02-25
**Confidence:** HIGH (verified against official Tailwind docs, Next.js docs, MDN, caniuse.com, Tailwind GitHub issues)

> **Scope:** This document covers ONLY what is new or changed for the v1.4 glassmorphism design overhaul.
> The existing stack (Next.js 15, Tailwind CSS v3.4, shadcn/ui, next-themes, motion ^12.34.3,
> tailwindcss-animate ^1.0.7, tailwind-merge ^3.4.0, class-variance-authority ^0.7.1) is in production
> and already sufficient for glassmorphism. Do NOT re-introduce, re-evaluate, or add redundant packages.
>
> **Current versions confirmed:** tailwindcss ^3.4.0, tailwindcss-animate ^1.0.7, next-themes ^0.4.6,
> motion ^12.34.3, tailwind-merge ^3.4.0, class-variance-authority ^0.7.1, autoprefixer ^10.4.0,
> Inter via `next/font/google`.

---

## Executive Summary

The glassmorphism overhaul requires **zero new npm packages**. Every capability needed is either
already installed or is a native Tailwind CSS utility. The work is entirely in CSS tokens,
component refactoring, and configuration changes.

The four design capabilities and their sources:

1. **Frosted glass (backdrop-blur)** — Tailwind's `backdrop-blur-*` utilities (built-in since v2.1,
   webkit-prefixed automatically since v3.4.5). No plugin needed.

2. **Gradient backgrounds** — Tailwind's `bg-gradient-to-*`, `from-*`, `via-*`, `to-*` utilities
   (built-in). Add custom glass CSS variables to `globals.css`.

3. **Glass animation transitions** — `motion` library (already installed at ^12.34.3). Supports
   `whileHover`, `initial`/`animate` with spring transitions. No new animation library needed.

4. **Typography upgrade** — Switch from Inter to **Plus Jakarta Sans** via `next/font/google`
   (zero bundle cost — self-hosted via Next.js, no new npm package). Plus Jakarta Sans is a
   variable font (weights 200–800), already on Google Fonts, loaded identically to the current
   Inter setup.

**Net new packages:** 0 npm packages. 0 Tailwind plugins. 0 CSS-in-JS.

---

## What Changes vs. What Stays

### Changes (config + code only)

| Area | Current State | v1.4 Change |
|------|--------------|-------------|
| Font | Inter via `next/font/google` | Plus Jakarta Sans via `next/font/google` (same API) |
| CSS tokens | Standard shadcn HSL vars | Add glass-specific CSS custom properties |
| Tailwind config | Standard color/shadow extends | Add `backdropBlur` extend + custom `boxShadow` for glow |
| `globals.css` | Standard shadcn tokens | Add `@layer utilities` glass utility classes |
| shadcn Card | Solid background | Add `glass` CVA variant using existing CVA + tailwind-merge |
| Brand colors | `--primary: 217 91% 60%` (blue-500) | Update to `--primary: 220 100% 50%` (#0057FF target) |

### Stays Unchanged

| Technology | Reason |
|-----------|--------|
| tailwindcss ^3.4.0 | v3.4.5+ already auto-generates `-webkit-backdrop-filter` (confirmed PR #13997 merged July 2024) |
| autoprefixer ^10.4.0 | Already in postcss.config.mjs, already handles remaining vendor prefixes |
| motion ^12.34.3 | Handles all glass hover/enter animations via `whileHover`, `initial`/`animate` |
| tailwindcss-animate ^1.0.7 | Already handles accordion; add glass shimmer keyframes here |
| class-variance-authority ^0.7.1 | Used to create `glass` variants on shadcn components |
| tailwind-merge ^3.4.0 | `cn()` already handles class conflict resolution for glass utilities |
| next-themes ^0.4.6 | Already installed; glass tokens must be defined in both `:root` and `.dark` |

---

## Core Technologies — No Changes

These are confirmed sufficient for glassmorphism. Document them for completeness.

### Tailwind CSS v3.4 — Backdrop-Blur Native Support

| Class | CSS Generated | Use Case |
|-------|--------------|----------|
| `backdrop-blur-sm` | `blur(8px)` + `-webkit-blur(8px)` | Subtle glass nav elements |
| `backdrop-blur-md` | `blur(12px)` + `-webkit-blur(12px)` | Standard glass cards |
| `backdrop-blur-lg` | `blur(16px)` + `-webkit-blur(16px)` | Featured/hero glass panels |
| `backdrop-blur-xl` | `blur(24px)` + `-webkit-blur(24px)` | Modal overlays |
| `backdrop-blur-[20px]` | Arbitrary value | Fine-tuned brand-specific blur |

**Webkit prefix status (HIGH confidence):** PR #13997 merged into Tailwind v3.4.5 on July 13, 2024.
Tailwind now always emits `-webkit-backdrop-filter` alongside `backdrop-filter` for all `backdrop-blur-*`
utilities. The project's existing `autoprefixer ^10.4.0` in `postcss.config.mjs` provides additional
coverage. No manual prefix workaround needed.

**Browser support (HIGH confidence, caniuse.com verified):** 95.76% global coverage. Chrome 76+,
Edge 17+, Safari 9+, Firefox 103+, Opera 64+. Internet Explorer is unsupported and irrelevant for
a B2B SaaS in the CZ/SK market.

### motion ^12.34.3 — Glass Animations

The already-installed `motion` library (formerly Framer Motion) handles all glassmorphism animation
patterns with no additions:

- `whileHover` with `scale`, `y`, `boxShadow` — card lift-on-hover
- `initial`/`animate` with `opacity`, `y` — card entrance fade-in
- `transition={{ type: "spring", stiffness: 300, damping: 30 }}` — spring feel for glass cards
- `layoutId` — shared element transitions between glass components

**CSS property animation note:** `backdropFilter` can be animated via `motion` `style` prop, but
animating blur values is GPU-expensive. The recommended pattern is to use CSS classes for the
static blur state and animate only `opacity`, `y`, `scale` via motion.

---

## New Configuration — globals.css Additions

These are CSS token additions to `apps/web/app/globals.css`. No new packages.

### Glass Design Tokens

```css
@layer base {
  :root {
    /* === BRAND UPDATE: #0057FF target === */
    --primary: 220 100% 50%;          /* #0057FF — Behance blue */
    --primary-foreground: 0 0% 100%;

    /* === GLASS SYSTEM TOKENS === */
    /* Background blur levels */
    --glass-blur-sm: 8px;
    --glass-blur-md: 16px;
    --glass-blur-lg: 24px;

    /* Glass surface opacity (light mode) */
    --glass-bg-light: rgba(255, 255, 255, 0.7);
    --glass-bg-subtle: rgba(255, 255, 255, 0.5);
    --glass-bg-strong: rgba(255, 255, 255, 0.85);

    /* Glass border */
    --glass-border: rgba(255, 255, 255, 0.3);
    --glass-border-strong: rgba(255, 255, 255, 0.5);

    /* Glass glow shadow (blue-tinted for premium feel) */
    --glass-shadow: 0 8px 32px rgba(0, 87, 255, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.3);
    --glass-shadow-hover: 0 16px 48px rgba(0, 87, 255, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.4);

    /* Gradient backgrounds for glass to sit on top of */
    --gradient-hero: linear-gradient(135deg, #f0f4ff 0%, #e8f0ff 50%, #f5f0ff 100%);
    --gradient-card-bg: linear-gradient(135deg, rgba(0, 87, 255, 0.03) 0%, rgba(100, 60, 255, 0.02) 100%);
  }

  .dark {
    /* === BRAND UPDATE: same primary, adjusted for dark === */
    --primary: 220 100% 60%;          /* Slightly lighter in dark mode for contrast */
    --primary-foreground: 0 0% 100%;

    /* === GLASS SYSTEM TOKENS — DARK === */
    --glass-bg-light: rgba(20, 30, 60, 0.6);
    --glass-bg-subtle: rgba(15, 25, 50, 0.4);
    --glass-bg-strong: rgba(25, 35, 70, 0.8);

    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-border-strong: rgba(255, 255, 255, 0.15);

    --glass-shadow: 0 8px 32px rgba(0, 87, 255, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05);
    --glass-shadow-hover: 0 16px 48px rgba(0, 87, 255, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.10);

    --gradient-hero: linear-gradient(135deg, #0a0f1e 0%, #0d1530 50%, #12102a 100%);
    --gradient-card-bg: linear-gradient(135deg, rgba(0, 87, 255, 0.06) 0%, rgba(100, 60, 255, 0.04) 100%);
  }
}
```

### Glass Utility Classes (globals.css @layer utilities)

```css
@layer utilities {
  /* Core glass surface — standard card usage */
  .glass {
    background: var(--glass-bg-light);
    backdrop-filter: blur(var(--glass-blur-md));
    -webkit-backdrop-filter: blur(var(--glass-blur-md));
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  /* Strong glass — hero panels, modals */
  .glass-strong {
    background: var(--glass-bg-strong);
    backdrop-filter: blur(var(--glass-blur-lg));
    -webkit-backdrop-filter: blur(var(--glass-blur-lg));
    border: 1px solid var(--glass-border-strong);
    box-shadow: var(--glass-shadow);
  }

  /* Subtle glass — sidebar, secondary elements */
  .glass-subtle {
    background: var(--glass-bg-subtle);
    backdrop-filter: blur(var(--glass-blur-sm));
    -webkit-backdrop-filter: blur(var(--glass-blur-sm));
    border: 1px solid var(--glass-border);
  }

  /* Hover state */
  .glass-hover {
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }

  .glass-hover:hover {
    box-shadow: var(--glass-shadow-hover);
    transform: translateY(-2px);
  }

  /* Gradient background layers for glass to sit on */
  .gradient-hero {
    background: var(--gradient-hero);
  }
}
```

**Why `@layer utilities` over a Tailwind plugin:** The `@layer utilities` approach works in Tailwind
v3's existing `@tailwind utilities` pipeline. These classes are purged when unused (tree-shaken by
Tailwind's JIT engine). A Tailwind plugin would require modifying `tailwind.config.ts` and adds
indirection with no benefit at this scale. The `@layer` approach is the official Tailwind v3 pattern
for project-specific utilities.

---

## Tailwind Config Additions — tailwind.config.ts

```typescript
// ADD to theme.extend in apps/web/tailwind.config.ts

extend: {
  // ... existing extends unchanged ...

  backdropBlur: {
    'glass': '16px',    // standard glass card
    'glass-lg': '24px', // strong glass
    'glass-sm': '8px',  // subtle glass
  },

  boxShadow: {
    // ... existing shadows unchanged ...
    'glass': 'var(--glass-shadow)',
    'glass-hover': 'var(--glass-shadow-hover)',
    'glow-blue': '0 0 24px rgba(0, 87, 255, 0.25)',
    'glow-blue-lg': '0 0 48px rgba(0, 87, 255, 0.35)',
  },

  backgroundImage: {
    'gradient-hero': 'var(--gradient-hero)',
    'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    'gradient-blue': 'linear-gradient(135deg, #0057FF 0%, #3B82F6 100%)',
    'gradient-premium': 'linear-gradient(135deg, #0057FF 0%, #7C3AED 100%)',
  },

  fontFamily: {
    // Replace Inter with Plus Jakarta Sans
    sans: ['Plus Jakarta Sans', 'var(--font-plus-jakarta-sans)', 'sans-serif'],
  },

  keyframes: {
    // ... existing keyframes unchanged ...
    shimmer: {
      '0%': { backgroundPosition: '-200% center' },
      '100%': { backgroundPosition: '200% center' },
    },
    'glass-in': {
      '0%': { opacity: '0', backdropFilter: 'blur(0px)', transform: 'translateY(8px)' },
      '100%': { opacity: '1', backdropFilter: 'blur(16px)', transform: 'translateY(0)' },
    },
  },

  animation: {
    // ... existing animations unchanged ...
    shimmer: 'shimmer 2s linear infinite',
    'glass-in': 'glass-in 0.3s ease-out',
  },
},
```

---

## Typography Change — Inter to Plus Jakarta Sans

**Why change from Inter:** Inter is ubiquitous in SaaS products (2020–2024 era). Plus Jakarta Sans
has the same geometric legibility but with more personality — stronger character with subtle curves
that differentiate premium products in 2025. Variable font (200–800) so no weight-specific loading.

**Why NOT Geist:** Geist is the Vercel house font (Next.js default). Using it signals "bootstrapped
Next.js template" rather than a custom product. Plus Jakarta Sans has less association with generic
tooling.

**Why NOT Space Grotesk / Satoshi / Manrope:** These are popular but require either self-hosting or
Fontsource. Plus Jakarta Sans is on Google Fonts, loaded via `next/font/google` (auto self-hosted
by Next.js), identical API to the current Inter setup.

### Implementation — layout.tsx

```typescript
// apps/web/app/layout.tsx — REPLACE Inter with Plus Jakarta Sans

import { Plus_Jakarta_Sans } from 'next/font/google';  // note: underscore in import name

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
  preload: true,
  // Variable font — no 'weight' needed; covers 200–800 automatically
});

// In RootLayout:
<body className={`${plusJakartaSans.variable} font-sans`}>
```

**No other changes needed.** The `font-sans` Tailwind class already maps to the CSS variable
via `tailwind.config.ts` `fontFamily.sans` (update as shown in Tailwind Config section above).
The `font-inter` variable currently in `globals.css` can be removed.

---

## shadcn Component Glass Variants — CVA Pattern

No new libraries. Use the existing `class-variance-authority` (already installed) to add a `glass`
variant to shadcn components. `tailwind-merge` (via the existing `cn()` utility) handles class
conflict resolution.

### Pattern: GlassCard

```typescript
// apps/web/components/ui/glass-card.tsx

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassCardVariants = cva(
  // Base: rounded corners, overflow hidden for blur containment
  'rounded-2xl overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-card border border-border shadow',
        glass: 'glass',           // uses @layer utilities .glass class
        'glass-strong': 'glass-strong',
        'glass-subtle': 'glass-subtle',
      },
      hover: {
        true: 'glass-hover cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
    },
  }
);

interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

export function GlassCard({ className, variant, hover, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(glassCardVariants({ variant, hover }), className)}
      {...props}
    />
  );
}
```

**Why this over glasscn-ui / shadcn-glass-ui:** Both third-party libraries exclude components
that ScheduleBox already uses (Calendar, Charts, Form, Sonner). They add bundle weight and version
lock-in for what is a 30-line CVA wrapper. The project already has `class-variance-authority` and
the `cn()` pattern — use what's there.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **tailwind-glassmorphism** (npm pkg) | Last meaningful update >2 years ago; wraps utilities Tailwind v3 provides natively. Adds a dependency for zero capability gain. | Tailwind's built-in `backdrop-blur-*` + `@layer utilities` |
| **glasscn-ui** | Excludes Calendar, Sonner, Charts — components ScheduleBox already uses. Would create two component systems in the same project. | CVA `glass` variant on existing shadcn components |
| **@yhooi2/shadcn-glass-ui** | Small package (low maintenance signal), same exclusion problem as glasscn-ui. | CVA pattern above |
| **@casoon/tailwindcss-glass** | Tailwind v4-targeted plugin; ScheduleBox uses Tailwind v3. Version mismatch. | `@layer utilities` in globals.css |
| **CSS-in-JS (styled-components, vanilla-extract)** | Project uses Tailwind CSS exclusively. Mixing paradigms creates class conflicts and slower builds. | Tailwind utilities + CSS custom properties |
| **Fontsource (@fontsource/plus-jakarta-sans)** | Next.js `next/font/google` already self-hosts Google Fonts with better caching, no extra npm package, and automatic layout shift prevention. | `next/font/google` — already used for Inter |
| **Geist** | Vercel's house font signals "Next.js template" to developers. Reduces perceived distinctiveness of ScheduleBox brand. | Plus Jakarta Sans |
| **Additional animation library (GSAP, anime.js)** | `motion ^12.34.3` is already installed and covers all required glass animation patterns (spring, layout, gesture). | `motion` (already installed) |
| **Framer (design tool) components** | Framer-exported components are not production-grade React — they are Framer-runtime dependent. | Custom CVA components + motion |
| **PostCSS backdrop-filter plugin** | Tailwind v3.4.5+ generates `-webkit-backdrop-filter` automatically (PR #13997 confirmed merged). Autoprefixer is already in postcss.config.mjs. | Current setup — no changes needed |

---

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|-------------------|
| Plus Jakarta Sans via `next/font/google` | Geist | Vercel's default — makes product look like a bootstrapped Next.js project |
| Plus Jakarta Sans via `next/font/google` | Satoshi / Manrope | Requires self-hosting or Fontsource npm package; `next/font/google` is zero-overhead |
| `@layer utilities` custom classes in globals.css | `tailwind-glassmorphism` npm plugin | Plugin is unmaintained; Tailwind v3 native utilities are more capable and already installed |
| CVA `glass` variant on existing shadcn components | glasscn-ui or shadcn-glass-ui | Both exclude components already in use; CVA pattern reuses existing tooling |
| Tailwind `bg-white/70 backdrop-blur-lg` utility classes | CSS-in-JS for glass | Project is Tailwind-native; mixing paradigms adds build complexity |
| CSS custom properties (`--glass-blur-md: 16px`) | Hardcoded Tailwind arbitrary values everywhere | CSS variables allow theme-aware glass that respects dark mode; arbitrary values duplicate values |

---

## Version Compatibility Matrix

| Package | Current Version | v1.4 Requirement | Notes |
|---------|----------------|-----------------|-------|
| tailwindcss | ^3.4.0 | ^3.4.5+ (already satisfied) | v3.4.5 required for auto `-webkit-backdrop-filter` |
| autoprefixer | ^10.4.0 | ^10.4.0 (no change) | Already in postcss pipeline; handles remaining prefix needs |
| class-variance-authority | ^0.7.1 | ^0.7.1 (no change) | Used for glass CVA variants |
| tailwind-merge | ^3.4.0 | ^3.4.0 (no change) | `cn()` handles glass class conflict resolution |
| motion | ^12.34.3 | ^12.34.3 (no change) | Spring animations for glass card hover/entrance |
| tailwindcss-animate | ^1.0.7 | ^1.0.7 (no change) | Add shimmer + glass-in keyframes |
| next-themes | ^0.4.6 | ^0.4.6 (no change) | Glass tokens defined in both `:root` and `.dark` |
| next | ^15.5.10 | ^15.5.10 (no change) | `next/font/google` handles Plus Jakarta Sans self-hosting |

---

## Installation

```bash
# NO new npm packages.

# 1. Font is auto-loaded by Next.js — no install step.
#    Update apps/web/app/layout.tsx to import Plus_Jakarta_Sans from 'next/font/google'

# 2. Update apps/web/tailwind.config.ts with backdropBlur, boxShadow, backgroundImage, fontFamily extends

# 3. Update apps/web/app/globals.css with glass CSS tokens and @layer utilities

# 4. Create apps/web/components/ui/glass-card.tsx using CVA pattern

# 5. Verify tailwindcss version is >=3.4.5:
pnpm --filter @schedulebox/web list tailwindcss
# Expected: tailwindcss 3.4.x where x >= 5
```

---

## Performance Notes

- **Limit `backdrop-blur` to < 10 elements per viewport.** The GPU cost of `backdrop-filter` scales
  linearly with the number of elements and the blur radius. Use `glass-subtle` (blur 8px) for
  repeated list items; reserve `glass-strong` (blur 24px) for singular hero elements.

- **Provide visible background behind glass cards.** `backdrop-filter` is invisible without content
  or color behind the element. The dashboard needs gradient background layers (use `.gradient-hero`
  on the page container, or gradient mesh SVGs) for the glass effect to visually activate.

- **Avoid animating `backdropFilter` directly with motion.** Animating blur radius forces GPU
  re-render every frame. Animate `opacity`, `y`, `scale` instead — the blur stays static.

- **`will-change: transform` on frequently-animated glass elements** helps browsers promote them to
  a compositor layer. Add via Tailwind's `will-change-transform` class on motion-wrapped glass cards.

---

## Sources

- Tailwind CSS `backdrop-filter-blur` docs — https://tailwindcss.com/docs/backdrop-filter-blur (HIGH confidence — official docs)
- Tailwind CSS `backdrop-blur` v3 docs — https://v3.tailwindcss.com/docs/backdrop-blur (HIGH confidence — official docs)
- PR #13997: Always generate `-webkit-backdrop-filter` — https://github.com/tailwindlabs/tailwindcss/pull/13997 (HIGH confidence — merged July 13 2024, confirmed in Tailwind v3.4.5+)
- Issue #13844: `backdrop-blur-` does not work on webkit — https://github.com/tailwindlabs/tailwindcss/issues/13844 (HIGH confidence — confirmed resolved by PR #13997)
- caniuse.com backdrop-filter — https://caniuse.com/css-backdrop-filter (HIGH confidence — 95.76% global support, Firefox 103+, Safari 9+)
- Next.js Font Optimization docs — https://nextjs.org/docs/app/getting-started/fonts (HIGH confidence — official docs, verified `Plus_Jakarta_Sans` import name from `next/font/google`)
- Plus Jakarta Sans Google Fonts — https://fonts.google.com/specimen/Plus+Jakarta+Sans (HIGH confidence — variable font 200–800, available via `next/font/google`)
- glasscn-ui GitHub — https://github.com/itsjavi/glasscn-ui (MEDIUM confidence — confirms it excludes Calendar, Charts, Form, Sonner)
- Epic Web Dev: Glassmorphism with Tailwind — https://www.epicweb.dev/tips/creating-glassmorphism-effects-with-tailwind-css (MEDIUM confidence — confirms class patterns, `isolate` + `bg-white/20` + `backdrop-blur-lg` + `ring-1`)
- FlyonUI Glassmorphism guide — https://flyonui.com/blog/glassmorphism-with-tailwind-css/ (MEDIUM confidence — confirms Tailwind class combinations, dark mode notes)
- Motion library docs — https://motion.dev/docs/react-animation (MEDIUM confidence — confirms spring transitions, `whileHover`)
- MDN backdrop-filter — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter (HIGH confidence — confirms `-webkit-backdrop-filter` still needed for Safari compat)

---

_Stack research for: ScheduleBox v1.4 Glassmorphism Design Overhaul_
_Researched: 2026-02-25_

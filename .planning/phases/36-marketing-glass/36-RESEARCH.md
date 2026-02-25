# Phase 36: Marketing Pages Glass Application — Research

**Researched:** 2026-02-25
**Domain:** Next.js 14 App Router marketing route group, CSS keyframe aurora animation, glassmorphism application to conversion-critical public pages
**Confidence:** HIGH

---

## Summary

Phase 36 applies the Phase 34 glass component library to all marketing-facing pages. The work is structurally parallel to Phase 35 (dashboard glass), but with higher glass intensity (marketing pages need maximum visual impact for prospect conversion), a mobile slide-over navigation concern, and one novel element: a CSS keyframe aurora animation on the hero section.

The marketing route group (`apps/web/app/[locale]/(marketing)/`) contains a layout, seven component files, a home page, and three sub-pages (pricing, privacy, terms). All source files have been read directly. The key finding is that the marketing layout is simpler than the dashboard layout — no `AuthGuard`, no flex scroll container, just `flex min-h-screen flex-col`. This means the `<GradientMesh preset="marketing" />` placement is trivial. The existing `MarketingNavbar` is already a partially-glass navbar (`backdrop-blur supports-[backdrop-filter]:bg-background/60`) — it needs to be upgraded to use `glass-surface` from the Phase 33 token system, replacing the ad-hoc inline glass approach.

The `PricingTable` (`pricing-table.tsx`) is a `'use client'` component with a `useState` billing toggle. Its `<Card>` renders use className-based featured styling (`ring-2 ring-primary`). The glass upgrade is: featured (Pro) tier gets `variant="glass"` with the ring retained; non-featured tiers get `variant="glass"` with `glass-surface-subtle` override. Per the requirements and locked decisions, CTA buttons inside pricing cards remain solid (`variant="default"` for featured, `variant="outline"` for others — unchanged). The `SocialProof` component wraps testimonial `<Card>` elements — these upgrade directly to `<Card variant="glass">`. The `MarketingFooter` gets a glass border-top treatment. Privacy and terms pages are long-form text on plain `article` elements — they get a thin glass card wrapper for the content body.

The aurora animation is a CSS `@keyframes` animation on a `div` with `background: linear-gradient(...)` + `background-size: 200% 200%` + `animation: aurora 18s ease infinite`. This is a background-position animation — a GPU-composited property (no layout repaint). It applies exclusively to the hero section background, never the entire page, and must not use `backdrop-filter` on the animated element (it would force per-frame blur re-computation). The 15-20s cycle at ease makes it near-invisible in motion — a subtle "living background" rather than a visible animation.

**Primary recommendation:** Add `<GradientMesh preset="marketing" />` to the marketing layout, upgrade `MarketingNavbar` to `glass-surface`, apply `<Card variant="glass">` to feature/testimonial cards, add glass treatment to pricing tiers (featured = `glass-surface`, others = `glass-surface-subtle`), implement aurora as a separate positioned `div` with keyframe animation inside the hero section, and wrap privacy/terms article content in a glass card. CTAs remain solid throughout.

---

## Standard Stack

### Core (all already installed and verified from Phase 33/34)

| Library | Version | Purpose | Status |
| --- | --- | --- | --- |
| `Card` with `variant="glass"` | Phase 34 output | Glass card for feature cards, testimonial cards, pricing tiers | COMPLETE — `apps/web/components/ui/card.tsx` |
| `GradientMesh` | Phase 34 output | Fixed `z-index: -10` background for layout | COMPLETE — `apps/web/components/glass/gradient-mesh.tsx` |
| `GlassPanel` | Phase 34 output | Flexible glass wrapper for navbar and footer treatments | COMPLETE — `apps/web/components/glass/glass-panel.tsx` |
| `glass-surface` / `glass-surface-subtle` | Phase 33 output | Tailwind utilities — medium and subtle glass intensities | COMPLETE — registered in `glass-plugin.ts` |
| `cn()` from `@/lib/utils` | Already installed | Class conflict resolution | COMPLETE |
| CSS `@keyframes` in `globals.css` | Tailwind v3 with `tailwind.config.ts` keyframes extension | Aurora animation | NEW — must be added to `tailwind.config.ts` or `globals.css` |

### Key Component APIs Verified from Source

```typescript
// Card — glass and glass-surface-subtle for pricing tiers
<Card variant="glass">...</Card>                     // featured tier
<Card variant="glass" className="glass-surface-subtle">...</Card>  // non-featured tiers

// GradientMesh — preset="marketing" for marketing layout
<GradientMesh preset="marketing" />

// GlassPanel — for marketing navbar glass treatment
<GlassPanel intensity="subtle">...</GlassPanel>

// CSS aurora keyframe — applied via Tailwind animation utility on a div
<div className="aurora-bg" aria-hidden="true" />
```

**Installation:** No new packages. Zero npm installs required.

---

## Architecture Patterns

### Recommended File Change Map

```
apps/web/app/[locale]/(marketing)/
├── layout.tsx                       # MODIFIED: add GradientMesh
├── page.tsx                         # NO CHANGE (composes hero + feature + social + trust)
├── pricing/page.tsx                 # MODIFIED: gradient heading
├── privacy/page.tsx                 # MODIFIED: wrap article content in glass card
├── terms/page.tsx                   # MODIFIED: wrap article content in glass card
└── _components/
    ├── marketing-navbar.tsx         # MODIFIED: upgrade to glass-surface from ad-hoc glass
    ├── hero-section.tsx             # MODIFIED: gradient text h1 + aurora animation element
    ├── feature-grid.tsx             # MODIFIED: Card variant="glass" on each feature card
    ├── social-proof.tsx             # MODIFIED: Card variant="glass" on testimonial cards
    ├── marketing-footer.tsx         # MODIFIED: glass border treatment replacing bg-muted
    ├── pricing-table.tsx            # MODIFIED: glass variants on pricing cards
    ├── trust-badges.tsx             # NO CHANGE (icon + text strips, not cards)
    ├── live-widget-preview.tsx      # NO CHANGE (widget mock — intentionally solid browser frame)
    └── cookie-consent-banner.tsx    # NO CHANGE (fixed z-50 banner — intentionally opaque)

apps/web/app/globals.css             # MODIFIED: add @keyframes aurora
apps/web/tailwind.config.ts          # MODIFIED: add aurora animation utility
```

### Pattern 1: GradientMesh in Marketing Layout

**What:** Add `<GradientMesh preset="marketing" />` as the first child inside the outermost `div` of the marketing layout. The marketing gradient mesh is more vibrant than dashboard (higher opacity orbs: 0.25, 0.20, 0.12 vs dashboard's 0.15, 0.10, 0.05) — already defined in `globals.css` as `.gradient-mesh-marketing`.

**Critical:** The marketing layout's outer div is `className="flex min-h-screen flex-col overflow-x-hidden"`. The `overflow-x-hidden` could potentially clip the fixed-position GradientMesh in certain browser implementations. Add `position: relative` to the outer div to establish a stacking context that cooperates with the fixed positioning (or remove the overflow-x-hidden if not needed). However, based on how `position: fixed` works in relation to `overflow: hidden` — fixed elements are only clipped by ancestors that are `overflow: hidden` AND have `position: relative/absolute/fixed/sticky`. The outer div currently has `overflow-x-hidden` but likely default static positioning — fixed children are NOT clipped by statically-positioned overflow ancestors. Verify this after implementation.

**Example:**
```typescript
// Source: apps/web/app/[locale]/(marketing)/layout.tsx (current state)
// Target pattern after Phase 36 modification

import { GradientMesh } from '@/components/glass/gradient-mesh';

export default async function MarketingLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    // overflow-x-hidden retained — does NOT clip fixed GradientMesh (static parent + overflow:hidden
    // only clips fixed elements in WebKit when containment is active, not in standard CSS)
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/* Fixed at z-index:-10 — outside document flow, no layout impact */}
      <GradientMesh preset="marketing" />
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <CookieConsentBanner />
    </div>
  );
}
```

### Pattern 2: Marketing Navbar Glass Upgrade

**What:** The existing `MarketingNavbar` already has a partial glass effect: `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`. This is an ad-hoc implementation that predates the Phase 33 glass token system. Replace it with `glass-surface` from the plugin, which provides the correct tokens, dark mode handling, webkit prefix, and `@supports` guard. The `sticky top-0 z-50` positioning stays unchanged — z-50 ensures the navbar is above the gradient mesh and all page content.

**Mobile nav:** The current `MarketingNavbar` has NO mobile slide-over menu — the `<nav>` block is `hidden md:flex`. At mobile breakpoints the nav links simply disappear and only the button group remains visible. This means there is no MobileNav component to worry about for stacking context. The required Success Criterion 5 ("mobile slide-over opens correctly") implies a mobile menu must be ADDED as part of Phase 36. Specifically: a hamburger button + Sheet component for the mobile menu slide-over. The Sheet from shadcn uses Radix Portal — it renders outside the layout DOM tree, immune to the glass stacking context on the header.

**Approach for mobile nav:**
```typescript
// Add mobile menu to MarketingNavbar
// Sheet renders via Portal — no z-index conflict with glass header
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

// In the button group, add:
<Sheet>
  <SheetTrigger asChild className="md:hidden">
    <Button variant="ghost" size="icon">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-64">
    {/* mobile nav links */}
  </SheetContent>
</Sheet>
```

**Navbar glass class replacement:**
```typescript
// Current: className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
// Target:
<header
  className="sticky top-0 z-50 border-b border-glass glass-surface"
>
```

**Note:** This changes from `bg-background/95 backdrop-blur` (ad-hoc) to `glass-surface` (token system). The `glass-surface` plugin applies `backdrop-filter: blur(16px)` (medium blur) — more intense than the existing `backdrop-blur` (8px default). If 16px is too heavy for the navbar, use `glass-surface-subtle` (8px blur) instead. `glass-surface-subtle` is the better match for a nav bar — it should not compete visually with hero content.

**Recommendation: Use `glass-surface-subtle` on the navbar**, consistent with the dashboard header treatment in Phase 35 which also uses `glass-surface-subtle`. This maintains visual hierarchy: navigation is less intense than content cards.

### Pattern 3: Hero Section with Gradient Text and Aurora Animation

**What:**
1. The hero `<h1>` gets gradient text (blue-to-indigo).
2. A CSS keyframe aurora animation is added as a `aria-hidden` background element behind the hero content.

**Gradient text:**
```typescript
// Current: className="mt-6 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl xl:text-6xl"
// Target (add gradient text classes):
<h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl xl:text-6xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
```

**Aurora animation approach:**
The aurora is a slow-moving gradient background on a positioned element inside the hero section. It must NOT use `backdrop-filter` (GPU re-render per frame). It must NOT be on a fixed element (it should scroll away with the hero). It animates `background-position` — a GPU-composited property.

```typescript
// In hero-section.tsx — add aurora div inside the section before text content
<section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
  {/* Aurora background — position absolute, scrolls with hero */}
  <div
    className="absolute inset-0 aurora-bg opacity-60 dark:opacity-30"
    aria-hidden="true"
  />
  {/* Hero content above aurora */}
  <div className="relative mx-auto max-w-6xl px-4 z-10">
    ...
  </div>
</section>
```

**Aurora CSS keyframe definition** (add to `globals.css` or via `tailwind.config.ts` keyframes):
```css
/* globals.css — add to @layer utilities or @layer base */
@keyframes aurora {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.aurora-bg {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15) 0%,    /* blue-500 */
    rgba(99, 102, 241, 0.12) 25%,   /* indigo-500 */
    rgba(168, 85, 247, 0.08) 50%,   /* purple-500 */
    rgba(59, 130, 246, 0.10) 75%,
    rgba(99, 102, 241, 0.15) 100%
  );
  background-size: 300% 300%;
  animation: aurora 18s ease infinite;
}

.dark .aurora-bg {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.08) 0%,
    rgba(99, 102, 241, 0.06) 25%,
    rgba(168, 85, 247, 0.04) 50%,
    rgba(59, 130, 246, 0.05) 75%,
    rgba(99, 102, 241, 0.08) 100%
  );
  background-size: 300% 300%;
  animation: aurora 18s ease infinite;
}
```

**Tailwind config approach (alternative):** Add `aurora` to `keyframes` and `animation` in `tailwind.config.ts`:
```typescript
// tailwind.config.ts — add to keyframes and animation extensions
keyframes: {
  aurora: {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
  },
},
animation: {
  aurora: 'aurora 18s ease infinite',
},
```
Then use `className="aurora-bg animate-aurora"` — but `.aurora-bg` still needs to define the `background` and `background-size` separately since Tailwind doesn't generate gradient definitions from keyframes. Both approaches (globals.css or tailwind.config.ts) work; globals.css is simpler here since the animation and its background must be defined together.

**Recommended: Use globals.css** for `.aurora-bg` and `@keyframes aurora`. This keeps all animation-specific CSS in one place and avoids splitting the definition between globals.css and tailwind.config.ts.

**Mobile performance:** The aurora uses `background-position` animation which is GPU-composited in all modern browsers (Chrome, Safari, Firefox). It does NOT trigger layout or paint — only composite. The 18s cycle and subtle opacity (0.60 light / 0.30 dark) keep GPU cost negligible. No `backdrop-filter` on the aurora element means no per-frame blur cost.

**`prefers-reduced-motion` consideration:**
```css
@media (prefers-reduced-motion: reduce) {
  .aurora-bg {
    animation: none;
  }
}
```
Add this alongside the aurora definition in globals.css.

### Pattern 4: Feature Grid Glass Cards

**What:** `feature-grid.tsx` renders `<Card className="h-full">` for each feature. Switch to `<Card variant="glass" className="h-full">`. The `motion.div` wrappers around each card remain unchanged — they animate `opacity` and `y`, not `backdropFilter`.

**Critical:** `FeatureGrid` is a `'use client'` component that uses `motion/react`. The `<Card variant="glass">` has no special client/server constraint — it's a styled div. No change to component's client/server boundary.

```typescript
// Current: <Card className="h-full">
// Target:
<Card variant="glass" className="h-full">
```

### Pattern 5: Pricing Glass Cards with Tier Differentiation

**What:** `PricingTable` is `'use client'`. The featured plan (Pro) needs `glass-surface` (medium intensity). Non-featured plans (Free, Business) need `glass-surface-subtle`. The current featured styling uses `ring-2 ring-primary` on the card `className`. These rings must be retained for the featured card — they are the visual differentiator alongside the glass intensity.

**The challenge:** `variant="glass"` applies `glass-surface` (medium intensity, 16px blur). Non-featured cards need `glass-surface-subtle` (8px blur, lower opacity). The `variant="glass"` prop on `Card` always applies `glass-surface`. To get `glass-surface-subtle` for non-featured, pass `glass-surface-subtle` via `className` — tailwind-merge will NOT resolve this conflict correctly because both are plugin-registered utilities that tailwind-merge cannot introspect. The safer approach: always use `variant="glass"` (which applies `glass-surface`) and then add `glass-surface-subtle` to className for non-featured — but accept that `glass-surface-subtle` will coexist with `glass-surface` (the latter wins since it's in the variant string, className is appended after).

**Recommended approach:** Override with explicit Tailwind classes that match the subtle tier values, OR use `GlassPanel` directly for non-featured cards. Simplest working approach:

```typescript
// featured (Pro):
<Card
  key={plan.id}
  variant="glass"
  className={`relative flex flex-col ${plan.featured ? 'ring-2 ring-primary/70' : ''}`}
>

// non-featured (Free, Business):
// Use GlassPanel + CardHeader/CardContent/CardFooter structure, or:
// Add glass-surface-subtle as override — but note this ADDS a second background value
// Cleanest: conditional variant that maps to a different className pattern
```

**Cleanest implementation pattern:**
```typescript
// In pricing-table.tsx
<Card
  key={plan.id}
  className={cn(
    'relative flex flex-col',
    plan.featured
      ? 'glass-surface ring-2 ring-primary/70'    // medium glass + ring
      : 'glass-surface-subtle',                     // subtle glass, no ring
  )}
>
```

This approach skips `variant="glass"` entirely and applies the glass utility classes directly via `className`, because `variant` can only apply one intensity level. Direct className application is appropriate here since `PricingTable` is a specific custom component (not a generic shadcn usage site). The `cardVariants` CVA `default` variant's `border-border bg-card shadow-sm` classes would remain in the base string — these would conflict with the glass utilities. The safe pattern: explicitly neutralize via `cn()` overrides or switch to the same split pattern from the Card CVA.

**Recommended: Use `variant="glass"` for featured and `variant="default"` with added `glass-surface-subtle` in className for others, accepting that the default's `bg-card` will be overridden by `glass-surface-subtle`'s own background.** Actually, the cleanest and most maintainable solution is:

```typescript
// Map each plan to its variant and extra classes
const planGlassClass = plan.featured
  ? 'glass-surface ring-2 ring-primary/70'
  : 'glass-surface-subtle';

<Card
  key={plan.id}
  className={cn('relative flex flex-col', planGlassClass)}
>
```

Since `Card`'s `default` variant includes `border-border bg-card shadow-sm`, and these are set in the variant string (not base), when variant is omitted (undefined), the `defaultVariants` kicks in and applies `default`. The `className` then appends `glass-surface[-subtle]` which provides its own `background`, `border`, and `box-shadow` via `@supports`. tailwind-merge cannot introspect plugin utilities but the CSS cascade handles the conflict: the `@supports` block's rules (in `glass-plugin.ts`) have equal specificity to `bg-card` and `border-border` but apply ONLY when backdrop-filter is supported. In the `@supports` branch, the plugin's rules override since they come after in the stylesheet order. In browsers without backdrop-filter, the fallback (`background: rgba(255,255,255,0.85)`) and the `bg-card` classes coexist but the fallback comes from the plugin (which is last in the CSS), so it wins.

**Bottom line:** `className="glass-surface"` applied via Card's `className` prop effectively overrides the default variant's styling due to CSS cascade order (plugin utilities come after Tailwind utility classes in the stylesheet). This has been the working pattern throughout Phase 35 (verified from 35-RESEARCH.md).

### Pattern 6: Testimonials Glass Cards

**What:** `social-proof.tsx` renders `<Card key={testimonial.name}>`. Switch to `<Card variant="glass">`. The avatar `bg-primary/10` circle and star icons remain unchanged. The component is a server component (`async function`) — `Card` is a server-renderable component. No constraint change.

```typescript
// Current: <Card key={testimonial.name}>
// Target:
<Card variant="glass" key={testimonial.name}>
```

### Pattern 7: Marketing Footer Glass Treatment

**What:** The footer currently uses `className="border-t bg-muted"`. In the glass system, `bg-muted` is a solid muted background. With the gradient mesh behind the page, the footer should use a glass treatment to maintain visual consistency. Options:
1. `glass-surface-subtle` on the `<footer>` element
2. A `border-t border-glass` without glass-surface (just a transparent border for visual separation from content)

**Recommendation:** Use a subtle glass treatment on the footer: replace `bg-muted` with `glass-surface-subtle`. This keeps the footer visually consistent with the rest of the glass page. The footer has NO interactive overlays — no Radix dropdowns or popovers — so a glass stacking context on the footer is completely safe.

```typescript
// Current: <footer className="border-t bg-muted">
// Target:
<footer className="border-t border-glass glass-surface-subtle">
```

### Pattern 8: Privacy and Terms Glass Article Wrapper

**What:** The privacy and terms pages render a plain `<article className="mx-auto max-w-3xl px-4 py-16">`. They are text-heavy pages. Adding a glass card wrapper provides visual consistency with the marketing glass system.

**Approach:** Wrap the `<article>` content inside a `<Card variant="glass" className="p-8">` or use `<GlassPanel intensity="subtle" className="mx-auto max-w-3xl px-8 py-16">`. The article content (headings, paragraphs) renders inside the glass panel without any glass applied to the text itself.

```typescript
// Privacy and Terms pages — wrap article content in glass panel
import { GlassPanel } from '@/components/glass/glass-panel';

// In privacy/page.tsx and terms/page.tsx:
<div className="mx-auto max-w-3xl px-4 py-16">
  <GlassPanel intensity="subtle" className="p-8">
    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
    {/* ... rest of content */}
  </GlassPanel>
</div>
```

### Stacking Context Audit: Marketing Layout

| Element | Position | Z-Index | Creates SC? | Notes |
| --- | --- | --- | --- | --- |
| `GradientMesh` (new) | fixed | -10 | NO | `background-image` + `position: fixed; z-index: -10`; no transform/filter |
| `MarketingNavbar` (modified) | sticky | 50 | YES (sticky + z-index) | glass-surface adds `position: relative` (from @supports); combined with sticky + z-50 this creates a stacking context — but no children use Portal-immune overlays |
| `HeroSection` aurora div (new) | absolute | auto | NO | No z-index, no transform, background-position animation only |
| `hero-section.tsx` outer section | static | auto | NO | `overflow-hidden` + `relative` added — this creates containing block but NOT stacking context |
| `CookieConsentBanner` | fixed | 50 | YES | Already at z-50, opaque bg-white — intentionally above gradient mesh |
| All `<Sheet>` (mobile nav) | fixed | 50 | YES | Radix Portal — renders outside DOM tree, immune to navbar stacking context |

**Key finding:** The marketing layout has NO complex overlay interactions. There are no booking drawers, calendar popovers, or reservation modals on marketing pages. The only overlays are:
1. The mobile Sheet (Radix Portal — safe)
2. The CookieConsentBanner (fixed z-50 opaque — already correct)
3. The LocaleSwitcher/ThemeToggle (likely use Radix Portal for dropdowns — safe)

This makes Phase 36 lower-risk than Phase 35 from a stacking context perspective.

### Anti-Patterns to Avoid

- **Animating `backdrop-filter` values:** The aurora must NOT use `backdrop-filter`. It is a background element, not a frosted surface. `backdrop-filter` on an animated element forces GPU re-renders per frame.
- **Wrapping `LiveWidgetPreview` in glass:** The widget preview is designed to look like a real browser window (solid white, border). Do NOT apply glass treatment to this component — it would destroy the "real product preview" illusion.
- **Glassing the CookieConsentBanner:** The banner uses `fixed z-50 bg-white` and must remain fully opaque. It is a legal/consent element and must be readable in all conditions.
- **Using `position: fixed` for the aurora div:** The aurora should be `position: absolute` inside the hero section. Fixed positioning would cause it to stay visible when users scroll past the hero.
- **Glass on primary CTA buttons:** Locked decision — `<Button asChild size="lg">` (the main "Start Free" button in the hero) stays solid. Only secondary/ghost buttons may receive glass treatment.
- **`glass-surface-heavy` on the navbar:** Heavy glass (24px blur) on a sticky navbar would make the blur too prominent and compete with the hero content. Use `glass-surface-subtle` (8px blur) for the navbar.
- **Adding `overflow: hidden` to the hero section:** The `overflow-hidden` on the outer `<section>` clips the aurora `position: absolute` div correctly, but do NOT add a `backdrop-filter` parent between the aurora and its containing section — it would cause blur layers to multiply.
- **Placing aurora `div` outside the hero section:** The aurora must scroll away with the hero section. A fixed-position aurora that persists across the full page would conflict with the gradient mesh and create a muddy layered effect.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Glass marketing card | Custom `bg-white/10 backdrop-blur-16` div | `<Card variant="glass">` | CVA variant handles @supports fallback, dark mode tokens, scrim z-index, webkit prefix |
| Glass navbar background | Inline `backdrop-blur supports-[backdrop-filter]:bg-background/60` (current approach) | `glass-surface-subtle` from glass-plugin.ts | Phase 33 plugin handles all cross-browser concerns; current navbar already duplicates this logic ad-hoc |
| Mobile nav slide-over | Custom fixed-position overlay div | `<Sheet>` from shadcn (Radix Portal) | Portal renders outside DOM tree — no stacking context interaction with glass navbar |
| Gradient mesh background | Per-section `background: linear-gradient(...)` CSS | `<GradientMesh preset="marketing" />` | Fixed positioning, correct z-index, aria-hidden, dark mode variants all built in |
| Aurora animation | JS `requestAnimationFrame` gradient shifting | CSS `@keyframes` on `background-position` | `background-position` is GPU-composited (no layout/paint); pure CSS has zero JS bundle cost |
| Pricing tier glass differentiation | Separate components for each pricing tier | `cn()` with conditional glass utility class | Single `<Card>` component with className-based glass intensity selection |
| Privacy/Terms glass wrapper | Inline `style={{ backdropFilter: ... }}` | `<GlassPanel intensity="subtle">` | GlassPanel enforces `position: relative` (needed for ::before scrim), handles all cross-browser concerns |

**Key insight:** All glass CSS complexity lives in the Phase 33 plugin and globals.css. Phase 36 never writes raw `backdrop-filter` values — it only applies class names.

---

## Common Pitfalls

### Pitfall 1: `overflow-x-hidden` on Marketing Layout Clipping Fixed GradientMesh (Safari-specific)

**What goes wrong:** In Safari, `overflow: hidden` on a static-positioned ancestor CAN clip `position: fixed` children when `transform` or `will-change` is also present on any ancestor. The marketing layout has `overflow-x-hidden`. If GradientMesh becomes invisible (especially in Safari), the overflow is the likely cause.

**Why it happens:** Safari has historically had bugs where `overflow: hidden` on certain ancestor configurations clips fixed elements. Standard CSS spec says fixed elements are only clipped by the viewport. Safari deviates from spec in edge cases.

**How to avoid:** Test in Safari immediately after adding GradientMesh. If the gradient mesh is clipped, add `position: relative` to the outer layout div (transforms it from static to relative — fixed children then escape correctly), OR remove `overflow-x-hidden` if it's not critical (it prevents horizontal scroll, but the gradient mesh doesn't cause horizontal overflow).

**Warning signs:** Gradient mesh visible in Chrome but invisible in Safari.

### Pitfall 2: Current Ad-Hoc Navbar Glass Conflicting with glass-surface

**What goes wrong:** The existing navbar has `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`. When `glass-surface` is added to the header's className, `tailwind-merge` may not remove the `bg-background/95` or `bg-background/60` classes because they are Tailwind opacity modifier utilities that don't obviously conflict with the plugin-registered `glass-surface`. The result: a double background (bg-background/95 AND the glass-surface background) produces a more opaque result than intended.

**Why it happens:** tailwind-merge resolves class conflicts based on CSS property namespacing. `bg-background/95` maps to `background-color`. `glass-surface` (a plugin utility) also sets `background`. tailwind-merge cannot introspect plugin utilities and may not remove `bg-background/95`.

**How to avoid:** Remove ALL existing ad-hoc glass classes from the navbar header element explicitly when adding `glass-surface`. The final className should contain ONLY: `sticky top-0 z-50 border-b border-glass glass-surface` — no `bg-background/*`, no `backdrop-blur`, no `supports-[backdrop-filter]:*`.

**Warning signs:** Navbar appears more opaque than intended; gradient mesh not visible through navbar.

### Pitfall 3: Hero Section `overflow-hidden` Clipping Aurora

**What goes wrong:** The hero section needs `overflow-hidden` to clip the `position: absolute` aurora div to the hero boundaries (otherwise the aurora extends beyond the hero section's height). If `overflow: hidden` is placed on the SAME element that also has `position: relative`, this creates a containing block. But if a backdrop-filter is applied anywhere in the ancestor chain of the aurora div, the overflow-hidden clips the backdrop-filter sampling area.

**Why it happens:** This is only a risk if `glass-surface` is applied to the hero section itself. The hero section is NOT being glassed (only its h1 gets gradient text and it gets an aurora background element). So this pitfall is avoided as long as `glass-surface` is never applied to `<section>` in hero-section.tsx.

**How to avoid:** Never apply `glass-surface` to the hero `<section>`. The aurora is a pure background element (`background-position` animation only). The `overflow-hidden` on the section safely clips the aurora.

**Warning signs:** Aurora extends visually beyond the hero section bottom edge; visible gradient orb bleeding into the feature grid section.

### Pitfall 4: Pricing Card CTA Buttons Accidentally Receiving Glass Treatment

**What goes wrong:** The pricing card has a `<Button asChild variant={plan.featured ? 'default' : 'outline'} className="w-full">`. If the glass card's `::before` scrim has `z-index: 0` and the Button's positioning is not explicitly set, the scrim may overlay the Button in rare browser rendering scenarios, making the CTA unclickable or visually obscured.

**Why it happens:** Same z-index layering issue documented in Phase 34 (CardHeader, CardContent, CardFooter all have `relative` class in card.tsx — this was added in Phase 34 to prevent scrim trapping). The `CardFooter` already has `className={cn('relative flex items-center p-6 pt-0', className)}` from card.tsx line 63 — `relative` is there. The Button rendered inside CardFooter inherits from a `position: relative` parent — should be safe.

**How to avoid:** Verify CTA buttons in glass pricing cards are clickable after implementation. The existing `relative` class on CardFooter should handle this.

**Warning signs:** Pricing CTA buttons not responding to clicks; buttons visually present but events not firing.

### Pitfall 5: Aurora Animation Reducing Hero Text Legibility

**What goes wrong:** The aurora adds a colored gradient behind the hero content. If opacity is too high or the gradient colors are too saturated, the hero `<h1>` (now gradient text — `text-transparent`) and the `<p>` (`text-muted-foreground`) may fail WCAG contrast requirements. Gradient text + colorful background = high contrast failure risk.

**Why it happens:** `bg-clip-text text-transparent` gradient text makes the text color depend on the gradient colors (blue-to-indigo). When the aurora background is also blue/indigo, the text becomes difficult to read.

**How to avoid:** The aurora opacity must be low enough that the white/near-white page background remains the dominant background color behind the text. The recommended opacity: `opacity-60` in light mode, `opacity-30` in dark mode. The gradient text gets its legibility from the contrast between the blue gradient and the white background — not from the aurora. The aurora's contribution to background color change must be minimal (< 5% luminance shift from the base white background).

**Warning signs:** Hero h1 text is hard to read; text and aurora colors "bleed" into each other.

### Pitfall 6: Marketing Navbar Mobile Menu Without Slide-Over

**What goes wrong:** Success Criterion 5 requires "mobile navigation slide-over opens correctly over the fixed gradient mesh background with no visual clipping." The current `MarketingNavbar` has NO mobile slide-over — the nav is simply `hidden md:flex`. The success criterion implies a mobile menu must be added. If no mobile menu is added, SC-5 cannot pass.

**Why it happens:** The current navbar was built with a "hide on mobile" pattern. Phase 36 requires upgrading this to a proper mobile slide-over for glass-system completeness.

**How to avoid:** Add a Sheet-based mobile menu to `MarketingNavbar`. The Sheet uses Radix Portal, rendering outside the layout DOM tree at the document body level. This means the Sheet's `z-50 fixed` content is completely immune to any stacking context created by the glass navbar header. No stacking context conflict. No clipping from `overflow-x-hidden` on the layout div (Portal escapes to document.body).

**Warning signs:** Mobile menu button exists but menu does not open; menu opens but appears behind the gradient mesh.

### Pitfall 7: HeroSection Server vs. Client Boundary

**What goes wrong:** `hero-section.tsx` is currently a server component (`async function`). The aurora animation is pure CSS — no JS, no hooks. Adding the aurora div does NOT require converting to `'use client'`. If a developer wraps the aurora in a motion component unnecessarily, they force the entire hero to become a client component.

**How to avoid:** The aurora animation is CSS-only (`animation: aurora 18s ease infinite`). No `motion` components, no `useEffect`, no `useState`. Keep `hero-section.tsx` as a server component. The `'use client'` boundary stays at `FeatureGrid` (which already uses `motion/react`).

**Warning signs:** Unnecessary `'use client'` directive added to hero-section.tsx.

---

## Code Examples

Verified patterns from codebase reads and Phase 33/34 established patterns:

### Marketing Layout with GradientMesh

```typescript
// Source: apps/web/app/[locale]/(marketing)/layout.tsx (current state)
// + GradientMesh from apps/web/components/glass/gradient-mesh.tsx (Phase 34)

import { GradientMesh } from '@/components/glass/gradient-mesh';

export default async function MarketingLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/* Fixed at z-index:-10, position:fixed — does not affect flex layout */}
      <GradientMesh preset="marketing" />
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <CookieConsentBanner />
    </div>
  );
}
```

### Marketing Navbar Glass Upgrade with Mobile Sheet

```typescript
// Source: apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx (current state)
// Target: replace ad-hoc glass with glass-surface, add Sheet mobile menu

export async function MarketingNavbar() {
  const t = await getTranslations('landing.nav');

  return (
    // Removed: bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
    // Added: border-glass glass-surface-subtle (using subtle not medium — navbar should be less intense)
    <header className="sticky top-0 z-50 border-b border-glass glass-surface-subtle">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-primary">ScheduleBox</Link>

        {/* Desktop nav — unchanged */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('features')}
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('pricing')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block"><LocaleSwitcher /></div>
          <ThemeToggle />
          {/* CTA buttons remain solid — locked decision */}
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/register">{t('cta')}</Link>
          </Button>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/login">{t('login')}</Link>
          </Button>

          {/* Mobile Sheet menu */}
          <MobileNav t={t} />
        </div>
      </div>
    </header>
  );
}
```

### Aurora CSS Keyframe in globals.css

```css
/* Source: pattern from SUMMARY.md + CSS @keyframes background-position animation */
/* Add to apps/web/app/globals.css — in @layer utilities or after existing layers */

@keyframes aurora {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.aurora-bg {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(99, 102, 241, 0.12) 25%,
    rgba(168, 85, 247, 0.08) 50%,
    rgba(59, 130, 246, 0.10) 75%,
    rgba(99, 102, 241, 0.15) 100%
  );
  background-size: 300% 300%;
  animation: aurora 18s ease infinite;
}

.dark .aurora-bg {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.08) 0%,
    rgba(99, 102, 241, 0.06) 25%,
    rgba(168, 85, 247, 0.04) 50%,
    rgba(59, 130, 246, 0.05) 75%,
    rgba(99, 102, 241, 0.08) 100%
  );
  background-size: 300% 300%;
  animation: aurora 18s ease infinite;
}

@media (prefers-reduced-motion: reduce) {
  .aurora-bg { animation: none; }
}
```

### Hero Section with Gradient Text and Aurora

```typescript
// Source: apps/web/app/[locale]/(marketing)/_components/hero-section.tsx (current state)
// Target: add gradient text on h1, add aurora background element

export async function HeroSection() {
  const t = await getTranslations('landing.hero');

  return (
    // relative + overflow-hidden: clips the absolute aurora div to this section
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Aurora background — absolute, scrolls with section, GPU-composited animation */}
      <div className="absolute inset-0 aurora-bg opacity-60 dark:opacity-30" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-4 z-10">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {t('badge')}
            </span>
            {/* Gradient text on h1 */}
            <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl xl:text-6xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('headline')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t('subheadline')}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              {/* Primary CTA stays solid — locked decision */}
              <Button asChild size="lg">
                <Link href="/register">{t('cta')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#demo">{t('ctaSecondary')}</a>
              </Button>
            </div>
          </div>
          <div id="demo" ...>
            <LiveWidgetPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Pricing Card Glass Differentiation

```typescript
// Source: apps/web/app/[locale]/(marketing)/_components/pricing-table.tsx (current state)
// Target: featured = glass-surface + ring, non-featured = glass-surface-subtle

{PLANS.map((plan) => {
  return (
    <Card
      key={plan.id}
      className={cn(
        'relative flex flex-col',
        plan.featured
          ? 'glass-surface ring-2 ring-primary/70'    // medium glass + featured ring
          : 'glass-surface-subtle',                     // subtle glass, no ring
      )}
    >
      {plan.featured && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          {t('mostPopular')}
        </Badge>
      )}
      {/* CardHeader, CardContent unchanged */}
      <CardFooter>
        {/* CTA buttons REMAIN SOLID — locked decision */}
        <Button asChild variant={plan.featured ? 'default' : 'outline'} className="w-full">
          <Link href="/register">{t('cta')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
})}
```

**Note on `ring-primary` opacity:** Change `ring-primary` to `ring-primary/70` for the featured card. The solid ring on a glass card looks slightly heavy; 70% opacity softens it while maintaining the visual distinction.

### Testimonials Glass Cards

```typescript
// Source: apps/web/app/[locale]/(marketing)/_components/social-proof.tsx
// Target: add variant="glass"

{TESTIMONIALS.map((testimonial) => (
  <Card variant="glass" key={testimonial.name}>
    <CardContent className="pt-6">
      {/* Stars, quote, author — all unchanged */}
    </CardContent>
  </Card>
))}
```

### Footer Glass Treatment

```typescript
// Source: apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx
// Current: <footer className="border-t bg-muted">
// Target:
<footer className="border-t border-glass glass-surface-subtle">
```

### Privacy/Terms Glass Article Wrapper

```typescript
// Source: apps/web/app/[locale]/(marketing)/privacy/page.tsx
// Target: wrap article content in GlassPanel

import { GlassPanel } from '@/components/glass/glass-panel';

// In privacy/page.tsx:
<div className="mx-auto max-w-3xl px-4 py-16">
  <GlassPanel intensity="subtle" className="p-8">
    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}: 1. 1. 2026</p>
    <div className="mt-8 space-y-8 text-base leading-7">
      {SECTIONS.map(...)}
    </div>
  </GlassPanel>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| Marketing navbar: ad-hoc `bg-background/60 backdrop-blur` | Replace with `glass-surface-subtle` from Phase 33 plugin | Phase 36 | Standardizes glass token system; removes duplicate inline glass logic |
| Feature cards: opaque `<Card>` | `<Card variant="glass">` | Phase 36 | Cards become translucent, gradient mesh visible through them |
| Pricing cards: opaque `<Card>` + `ring-2 ring-primary` | `glass-surface` (featured) / `glass-surface-subtle` (others) | Phase 36 | Tier differentiation by glass intensity; featured card more prominent |
| Testimonial cards: opaque `<Card>` | `<Card variant="glass">` | Phase 36 | Social proof section becomes part of glass system |
| Footer: `bg-muted` solid | `glass-surface-subtle` | Phase 36 | Footer matches glass system; gradient mesh visible through footer |
| Hero h1: plain text | Gradient text (`bg-clip-text text-transparent bg-gradient-to-r`) | Phase 36 | Premium visual; matches Behance reference |
| Hero background: none (white) | Aurora CSS keyframe animation (background-position) | Phase 36 | Subtle living background; 18s cycle; GPU-composited |
| Mobile nav: hidden on mobile | Sheet slide-over with Radix Portal | Phase 36 | Mobile navigation SC-5 requirement |

**What does NOT change in Phase 36:**
- `LiveWidgetPreview`: remains solid white browser mock
- `CookieConsentBanner`: remains fixed z-50 opaque white
- `TrustBadges`: icon+text strips, no card container to glass
- Primary CTA buttons throughout: remain solid (locked decision)
- `Button variant="outline"` on secondary CTAs: remains solid (outline, not glass)

---

## Open Questions

1. **Does `overflow-x-hidden` on the marketing layout clip the fixed GradientMesh in Safari?**
   - What we know: Standard CSS spec says fixed elements are clipped only by the viewport, not by overflow:hidden ancestors. Tailwind's `overflow-x-hidden` on a static div should not clip fixed children.
   - What's unclear: Safari has historically deviated from spec in transform/overflow combinations. No ancestor has `transform` currently, so the risk is LOW. But worth a Safari test immediately after implementation.
   - Recommendation: Add the GradientMesh and test in Safari first before building all other Phase 36 changes. If Safari clips it, add `relative` to the outer layout div.

2. **Should `MarketingNavbar` be converted to `'use client'` for the mobile Sheet trigger?**
   - What we know: The current `MarketingNavbar` is an async server component. The Sheet component's trigger requires `onClick` event handling — a client-side behavior. The `SheetTrigger` from shadcn wraps a `<button>` — but the open/close state is managed by Sheet's own state. Radix Sheet manages its own `open` state internally.
   - What's unclear: Whether a server component can render `<Sheet>` with its trigger state management. `Sheet` uses React context for open state — context requires `'use client'`.
   - Recommendation: Extract the mobile menu section as a separate `'use client'` component (`MobileNav.tsx`) that the server-component `MarketingNavbar` imports. This is the minimal client boundary approach — only the Sheet trigger + content is client-side, not the entire navbar.

3. **Aurora opacity: `opacity-60` in light mode — is this sufficient for text legibility?**
   - What we know: `opacity-60` on the aurora div (which itself has rgba colors at 0.08-0.15) means the effective background contribution is 0.06-0.09 of the gradient colors. The white page background still dominates. Gradient text (blue-to-indigo) on near-white background passes WCAG 4.5:1.
   - What's unclear: The interaction between the gradient text, aurora, and the gradient-mesh-marketing background (which already exists at z-index: -10). Layering: gradient-mesh (z: -10, fixed, 0.25 opacity orbs) + aurora (z: auto, absolute, 60% opacity of ~0.12 gradient) + white background. The combined background color shift could affect text legibility.
   - Recommendation: Start with `opacity-50` on the aurora (even lower than `opacity-60`). Check WCAG contrast after implementation. Adjust up if visual impact is insufficient, adjust down if legibility is affected.

4. **Pricing page heading: gradient text or plain?**
   - What we know: The pricing page's `<h1>` is "Ceník" / pricing title. The home hero `<h1>` gets gradient text. Consistency suggests the pricing `<h1>` could also get gradient text.
   - What's unclear: Whether the pricing page heading should match the hero heading style or remain plain (the pricing page is a subdued conversion page, not the maximum-impact hero).
   - Recommendation: Apply gradient text to the pricing page `<h1>` for consistency. The pricing page is the second-highest conversion-impact page after the homepage.

---

## Sources

### Primary (HIGH confidence)

- **Codebase direct reads** — All marketing component files and layout read directly:
  - `apps/web/app/[locale]/(marketing)/layout.tsx` — confirmed layout structure (flex min-h-screen flex-col overflow-x-hidden), no stacking context triggers
  - `apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx` — confirmed ad-hoc glass implementation, no mobile slide-over, z-50 sticky header
  - `apps/web/app/[locale]/(marketing)/_components/hero-section.tsx` — confirmed server component, h1 class string, LiveWidgetPreview composition
  - `apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx` — confirmed 'use client', motion/react usage, Card without variant
  - `apps/web/app/[locale]/(marketing)/_components/pricing-table.tsx` — confirmed 'use client', PLANS data, Card with featured ring-2 ring-primary
  - `apps/web/app/[locale]/(marketing)/_components/social-proof.tsx` — confirmed server component, Card usage
  - `apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx` — confirmed bg-muted footer
  - `apps/web/app/[locale]/(marketing)/_components/trust-badges.tsx` — confirmed icon+text, no Card
  - `apps/web/app/[locale]/(marketing)/_components/live-widget-preview.tsx` — confirmed solid white browser mock (must not be glassed)
  - `apps/web/app/[locale]/(marketing)/_components/cookie-consent-banner.tsx` — confirmed fixed z-50 bg-white (must stay opaque)
  - `apps/web/app/[locale]/(marketing)/page.tsx` — confirmed composition (HeroSection, FeatureGrid, SocialProof, TrustBadges)
  - `apps/web/app/[locale]/(marketing)/pricing/page.tsx` — confirmed PricingTable + SocialProof
  - `apps/web/app/[locale]/(marketing)/privacy/page.tsx` — confirmed article structure, SECTIONS array
  - `apps/web/app/[locale]/(marketing)/terms/page.tsx` — confirmed article structure, SECTIONS array
  - `apps/web/app/globals.css` — confirmed .aurora-bg NOT present (must be added); gradient-mesh-marketing CSS confirmed with 0.25/0.20/0.12 opacity orbs; @keyframes not yet defined
  - `apps/web/tailwind.config.ts` — confirmed no aurora keyframe present; all Phase 33 tokens confirmed: shadow-glass-hover, border-glass, backdropBlur extensions
  - `apps/web/lib/plugins/glass-plugin.ts` — confirmed glass-surface-subtle (8px), glass-surface (16px), glass-surface-heavy (24px) all with hardcoded px values
  - `apps/web/components/glass/gradient-mesh.tsx` — confirmed GradientMesh API (preset prop, aria-hidden)
  - `apps/web/components/glass/glass-panel.tsx` — confirmed GlassPanel API (intensity prop: subtle/medium/heavy)
  - `apps/web/components/ui/card.tsx` — confirmed Card CVA with variant="glass", CardHeader/CardContent/CardFooter all have `relative` in base classes (safe from scrim z-index issue)
  - `apps/web/components/ui/sheet.tsx` — confirmed Radix Portal-based Sheet; z-50 fixed; SheetContent bg-background

- `.planning/phases/34-component-glass-variants/34-VERIFICATION.md` — Phase 34 PASSED 9/9; all glass components verified
- `.planning/phases/33-token-foundation/VERIFICATION.md` — Phase 33 PASSED 7/7; all tokens verified
- `.planning/research/SUMMARY.md` — aurora background confirmed as P2 / marketing-only; 15-20s cycle specified; background-position animation confirmed GPU-composited

### Secondary (MEDIUM confidence)

- CSS `background-position` animation compositing — `background-position` is listed as a GPU-composited property in Chromium's compositing documentation and widely confirmed in CSS animation performance guides. This is the basis for the aurora implementation choice (vs `backdrop-filter` animation which is NOT composited).
- MDN Web Docs `position: fixed` and `overflow: hidden` — standard CSS spec: fixed elements are removed from the document flow and positioned relative to the viewport, not clipped by ancestor overflow:hidden (unless `transform`/`will-change` creates a new containing block on the ancestor). The marketing layout has no `transform` on ancestors.
- Radix UI Sheet (shadcn) Portal behavior — `SheetPortal` renders outside the layout DOM tree at document.body level. This is standard Radix UI behavior consistent with Dialog and Popover. Confirmed by reading `apps/web/components/ui/sheet.tsx` which uses `SheetPrimitive.Portal`.

### Tertiary (LOW confidence)

- Aurora animation gradient colors and opacity ratios — derived from the project's existing gradient-mesh-marketing colors (blue/indigo/purple at 0.25/0.20/0.12) and the SUMMARY.md guidance on aurora. The exact opacity values (0.08-0.15 for aurora gradient, 0.60 outer opacity in light mode) are design judgment calls, not verified against a specific authoritative source.
- Safari `overflow-x-hidden` + `position: fixed` interaction — the risk is flagged based on general knowledge of Safari CSS implementation quirks (MDN compat data). Not independently verified on Safari 18.x for this exact layout configuration.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all Phase 33/34 components confirmed from source; no new packages needed
- Architecture patterns: HIGH — all marketing files read directly; stacking context analysis based on concrete CSS inspection; same patterns as Phase 35 (lower complexity)
- Aurora implementation: HIGH — CSS background-position animation is a well-documented GPU-composited approach; keyframe pattern is straightforward; opacity values are LOW confidence (design judgment)
- Pitfalls: HIGH — all pitfalls grounded in direct code observations (existing ad-hoc glass in navbar, no mobile slide-over, overflow-x-hidden on layout, pricing card button z-index, hero server vs. client boundary)
- Mobile nav: MEDIUM — recommendation (MobileNav client component wrapper) is sound but the exact Sheet implementation details depend on how MarketingNavbar's async server component pattern handles client component composition in Next.js 14 App Router

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (all APIs are Phase 33/34 outputs — stable; CSS aurora is browser-native)

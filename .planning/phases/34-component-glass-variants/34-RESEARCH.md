# Phase 34: Primitive Components and shadcn Variants — Research

**Researched:** 2026-02-25
**Domain:** CVA variant extension of shadcn/ui components, React primitive component authoring, glassmorphism CSS integration
**Confidence:** HIGH

---

## Summary

Phase 34 builds the component layer on top of the Phase 33 token foundation. It has two parallel workstreams: (1) adding a `variant="glass"` CVA prop to four existing shadcn components — Card, Button, Dialog, and Badge — without touching any existing usage, and (2) creating two new primitive components — `GlassPanel` and `GradientMesh` — that expose the glass token system as reusable React components for layout-level usage.

The stack requires zero new npm packages. `class-variance-authority` ^0.7.1 is already installed and already used by Button and Badge in the codebase. Card currently uses no CVA — it will need to be refactored to adopt CVA before the glass variant is added. The `cn()` utility from `@/lib/utils` (which composes `clsx` + `tailwind-merge`) handles class conflict resolution. All glass styling references the `glass-surface`, `glass-surface-subtle`, and `glass-surface-heavy` Tailwind utilities registered in Phase 33. There is one gap in the Phase 33 token foundation: `shadow-glass-hover` is referenced by the Phase 34 success criteria but was NOT defined in Phase 33's tailwind.config.ts `boxShadow` extensions. This token must be added to `tailwind.config.ts` as part of Phase 34.

The biggest architectural constraint is backward compatibility: there are 476 `<Card>` usages, 178 `<Dialog>` usages, and 55 `<Badge>` usages in the codebase. CVA's `defaultVariants` mechanism ensures all existing usage remains unaffected — this is the central pattern that makes the additive approach safe. The Dialog component requires special handling because it uses Radix UI's Portal for stacking context isolation; the glass treatment applies to `DialogContent` (the panel) and `DialogOverlay` (the backdrop), not the `Dialog` root itself.

**Primary recommendation:** Extend Card with CVA glass variant first (it's the most-used component and has no existing CVA), then add Badge glass variant with color-tinted sub-variants, then Dialog glass treatment via overlay/content class extensions, then Button ghost/secondary glass tint. Create GlassPanel and GradientMesh primitives last, as they are net-new files with no backward compatibility risk.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| `class-variance-authority` | ^0.7.1 (installed) | CVA variant system for typed component variants | Already used in Button and Badge; `defaultVariants` guarantees backward compat |
| `tailwind-merge` / `clsx` via `cn()` | tailwind-merge ^3.4.0 (installed) | Class conflict resolution when glass utilities compose with existing classes | Already in `@/lib/utils`; handles `shadow-sm hover:shadow` vs `shadow-glass` conflicts |
| Glass utilities from Phase 33 | Already registered | `glass-surface`, `glass-surface-subtle`, `glass-surface-heavy` Tailwind classes | CSS foundation is complete; components consume these utilities directly |
| `@radix-ui/react-dialog` | ^1.1.15 (installed) | Dialog/modal primitive with built-in Portal | Portal renders outside DOM tree — eliminates stacking context conflicts with glass layouts |

### Supporting

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `motion` | ^12.34.3 (installed) | Hover transition animation on Card glass variant | `whileHover` for shadow intensification; DO NOT animate `backdropFilter` property |
| `React.forwardRef` | React 19 (installed) | Required for all shadcn component patterns | Every shadcn component uses forwardRef; glass variants must preserve this |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| CVA `variant="glass"` prop | Direct className override on each usage site | CVA is typed, validated at build time, and ensures `defaultVariants` backward compat; className override pollutes all call sites and has no type safety |
| Tailwind `hover:shadow-glass-hover` in CVA | Framer Motion `whileHover` on card | CSS-only hover is simpler and zero-JS; motion `whileHover` is needed only if the transition requires JS (e.g., height/opacity changes). Use CSS `transition-shadow` for simple shadow hover |
| New `GlassPanel` React component | Direct `glass-surface` className on any div | GlassPanel provides typed `intensity` prop, enforces `position: relative` (required for `::before` scrim), and documents the glass API in one place |

**Installation:** No new packages needed. Everything already installed.

---

## Architecture Patterns

### Recommended File Structure

```
apps/web/
├── components/
│   ├── ui/
│   │   ├── card.tsx             # MODIFIED: add CVA + glass variant
│   │   ├── button.tsx           # MODIFIED: add glass variant to existing CVA
│   │   ├── dialog.tsx           # MODIFIED: glass classes on DialogOverlay + DialogContent
│   │   └── badge.tsx            # MODIFIED: add glass variant + color tints to existing CVA
│   └── glass/
│       ├── glass-panel.tsx      # NEW: GlassPanel primitive wrapper component
│       └── gradient-mesh.tsx    # NEW: GradientMesh layout background component
└── tailwind.config.ts           # MODIFIED: add shadow-glass-hover token (gap from Phase 33)
```

> Note: Glass primitives go in `apps/web/components/glass/` — a new subdirectory. Do NOT place them in `components/ui/` because shadcn regenerates `ui/` on `shadcn add`, which would overwrite custom primitives.

### Pattern 1: Adding CVA to a Component That Has None (Card)

**What:** Card currently has no CVA — it uses a plain `cn()` call. The glass variant requires refactoring Card to use CVA, then adding the glass variant. `defaultVariants: { variant: 'default' }` ensures existing `<Card />` usage renders identically.

**When to use:** Any shadcn component that currently has no CVA but needs a new variant.

**Example:**
```typescript
// Source: Existing button.tsx pattern in this codebase (already uses CVA this way)
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  // Base classes — identical to existing card className
  'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: '',  // No extra classes — base handles the default look
        glass: [
          'glass-surface',
          'border-glass',
          'transition-shadow duration-200',
          'hover:shadow-glass-hover',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',  // CRITICAL: ensures all existing <Card /> usage unchanged
    },
  },
);

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
Card.displayName = 'Card';
```

> Note: When `variant="glass"` is applied, `glass-surface` provides `background`, `backdrop-filter`, `border`, and `box-shadow` via the Tailwind plugin. The base classes `border-border bg-card shadow-sm` need to be neutralized for glass cards — use tailwind-merge (via `cn()`) which will let the glass classes win when combined. Or move `border-border bg-card shadow-sm` OUT of the base and INTO the `default` variant string so they only apply when not using glass.

**Revised approach to avoid tailwind-merge conflicts:**
```typescript
const cardVariants = cva(
  // Move only truly-universal styles to base
  'rounded-lg text-card-foreground',
  {
    variants: {
      variant: {
        // Default applies the original shadcn styling
        default: 'border border-border bg-card shadow-sm',
        // Glass applies glass-surface (which sets its own border, bg, shadow)
        glass: 'glass-surface border-glass transition-shadow duration-200 hover:shadow-glass-hover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
```
This pattern avoids any tailwind-merge conflict between `border-border` and `border-glass`, and between `shadow-sm` and `glass-surface`'s `box-shadow`.

### Pattern 2: Adding Glass Variant to Existing CVA (Badge)

**What:** Badge already has CVA with `badgeVariants`. Add a `glass` variant alongside the existing default, secondary, destructive, outline variants. The glass Badge needs color-tinted sub-variants for booking status pills (confirmed/blue, cancelled/gray, no-show/red).

**When to use:** Any shadcn component that already uses CVA.

**Example:**
```typescript
// Source: Existing badge.tsx + badgeVariants pattern in this codebase
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Existing variants — unchanged:
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // New glass variants:
        glass: 'glass-surface-subtle border-glass text-foreground',
        'glass-blue': [
          'border border-blue-300/30 dark:border-blue-400/20',
          'bg-blue-100/60 dark:bg-blue-900/40',
          'text-blue-800 dark:text-blue-200',
          'supports-[backdrop-filter]:backdrop-blur-sm',
        ].join(' '),
        'glass-gray': [
          'border border-gray-300/30 dark:border-gray-400/20',
          'bg-gray-100/60 dark:bg-gray-800/40',
          'text-gray-700 dark:text-gray-300',
          'supports-[backdrop-filter]:backdrop-blur-sm',
        ].join(' '),
        'glass-red': [
          'border border-red-300/30 dark:border-red-400/20',
          'bg-red-100/60 dark:bg-red-900/40',
          'text-red-800 dark:text-red-200',
          'supports-[backdrop-filter]:backdrop-blur-sm',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',  // All existing <Badge /> usage unchanged
    },
  },
);
```

> The `BookingStatusBadge.tsx` component currently applies custom `bg-*` and `text-*` color classes directly via `className` with `variant="outline"`. The glass badge variants provide typed alternatives. `BookingStatusBadge` can be updated to use `variant="glass-blue"` for confirmed, `variant="glass-gray"` for cancelled, `variant="glass-red"` for no_show. The `STATUS_COLORS` object can remain as the source of truth with variant keys replacing the `bg-*` color strings.

### Pattern 3: Dialog Glass Treatment — Overlay and Content

**What:** Dialog glass treatment modifies `DialogOverlay` and `DialogContent` default classes. The overlay gets a blurred backdrop (`bg-black/40 backdrop-blur-sm`). The content panel gets `glass-surface-heavy`. The `Dialog` root component itself is unchanged — it passes through to Radix UI's root.

**When to use:** Dialog glass is applied by swapping DialogContent's default background classes. Because Radix UI uses Portal, there is no stacking context conflict with `glass-surface-heavy` on the content panel.

**Key insight on Dialog vs. Card:** Dialog does NOT need a `variant` prop for the glass treatment in this phase. The requirement is that "existing Dialog usage remains functional with no prop changes" — meaning the glass treatment IS the new default for Dialog in v1.4 (not opt-in). This is different from Card where `variant="glass"` is opt-in. Check the success criteria: "Dialog opened over a gradient background shows a heavy glass panel... existing Dialog usage (booking detail, upgrade modal) remains functional with no prop changes." This means the glass treatment replaces the current `bg-background` default on `DialogContent`.

**Example:**
```typescript
// Source: Existing dialog.tsx in this codebase + glass token system
// DialogOverlay: replace bg-black/80 with blurred backdrop
const DialogOverlay = React.forwardRef<...>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Changed: bg-black/80 → bg-black/40 backdrop-blur-sm
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));

// DialogContent: replace bg-background with glass-surface-heavy
const DialogContent = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Changed: bg-background → glass-surface-heavy
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg',
        'translate-x-[-50%] translate-y-[-50%] gap-4',
        'glass-surface-heavy',  // replaces 'border border-border bg-background'
        'p-6 shadow-lg duration-200',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        'sm:rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close ...>
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
```

> Warning: The `glass-surface-heavy` class sets `position: relative` (via the `@supports` block in globals.css). This is required for the `::before` scrim pseudo-element. The `z-50` from Radix on DialogContent still works because `position: relative` and z-index are independent when they're on the same element.

### Pattern 4: GlassPanel Primitive Component

**What:** A simple wrapper `div` that applies glass styling with a configurable intensity prop. Enforces `position: relative` (always needed for `::before` scrim). Accepts all standard `div` HTML attributes plus `intensity`.

**When to use:** When layout-level glass is needed outside of a Card, Dialog, or other shadcn component. Useful for sidebar overlays, floating panels, and arbitrary glass surfaces.

**File location:** `apps/web/components/glass/glass-panel.tsx`

**Example:**
```typescript
// Source: Design from COMP-05 requirement + glass token system from Phase 33
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassPanelVariants = cva(
  // position: relative is required for ::before scrim (from @supports block in globals.css)
  'relative rounded-lg',
  {
    variants: {
      intensity: {
        subtle: 'glass-surface-subtle',
        medium: 'glass-surface',
        heavy: 'glass-surface-heavy',
      },
    },
    defaultVariants: {
      intensity: 'medium',
    },
  },
);

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanelVariants> {}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, intensity, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassPanelVariants({ intensity }), className)}
      {...props}
    />
  ),
);
GlassPanel.displayName = 'GlassPanel';

export { GlassPanel };
```

### Pattern 5: GradientMesh Primitive Component

**What:** A React component that renders the gradient mesh background. Uses CSS classes from Phase 33 (`gradient-mesh gradient-mesh-dashboard` etc.) applied to a fixed-position `div`. The component accepts a `preset` prop and renders as `fixed inset-0 -z-10` — which does NOT create a CSS stacking context (no transform, no filter, no opacity < 1 on the element itself).

**Critical constraint:** `z-index: -10` with `position: fixed` on the mesh element places it below the root stacking context. This is correct and intentional. DO NOT add any CSS property that creates a stacking context on this element: no `transform`, no `filter`, no `will-change`, no `opacity < 1`. Doing so would break z-index layering for dropdowns and modals.

**File location:** `apps/web/components/glass/gradient-mesh.tsx`

**Example:**
```typescript
// Source: Design from COMP-06 requirement + gradient-mesh CSS classes from Phase 33
import * as React from 'react';
import { cn } from '@/lib/utils';

type GradientMeshPreset = 'dashboard' | 'marketing' | 'auth';

interface GradientMeshProps {
  preset?: GradientMeshPreset;
  className?: string;
}

function GradientMesh({ preset = 'dashboard', className }: GradientMeshProps) {
  return (
    <div
      // CRITICAL: Only these CSS properties. No transform, filter, opacity, will-change.
      // position: fixed + z-index: -10 is applied via 'gradient-mesh' class.
      // Adding stacking context triggers (transform etc.) breaks dropdown/modal z-index layering.
      className={cn(
        'gradient-mesh',
        `gradient-mesh-${preset}`,
        className,
      )}
      aria-hidden="true"
    />
  );
}

export { GradientMesh };
export type { GradientMeshPreset };
```

> Note: `GradientMesh` is a function component (not `forwardRef`) because it renders a background `div` that is never referenced by parent code. `aria-hidden="true"` prevents screen readers from announcing a decorative background.

### Pattern 6: shadow-glass-hover Token (Gap from Phase 33)

**What:** The success criteria for Phase 34 requires `<Card variant="glass" />` to transition to `shadow-glass-hover` on hover. This token was not defined in Phase 33's tailwind.config.ts. It must be added in Phase 34.

**Where:** `apps/web/tailwind.config.ts` — add to the `boxShadow` extension.

**Example:**
```typescript
// Source: Existing tailwind.config.ts boxShadow extension pattern (verified in codebase)
boxShadow: {
  sm: 'var(--shadow-sm)',
  DEFAULT: 'var(--shadow)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  glass: 'var(--glass-shadow-light)',
  // ADD THIS:
  'glass-hover': '0 16px 48px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.12)',
},
```

The hover shadow uses hardcoded values (not a CSS variable) because tailwind.config.ts boxShadow extension values are embedded at build time. The values are an intensified version of the glass shadow from globals.css. This approach is consistent — `shadow-glass` already uses a CSS variable, but `shadow-glass-hover` can be inline since it's only used in hover state on Card glass variant.

Alternative: Define a `--glass-shadow-hover-light` CSS variable in globals.css and reference it here. This is cleaner for dark mode: the dark value would automatically switch. Recommended approach given the existing pattern:

```css
/* globals.css — add to :root and .dark */
:root {
  --glass-shadow-hover-light: 0 16px 48px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.12);
}
.dark {
  --glass-shadow-hover-light: 0 16px 48px rgba(0, 0, 0, 0.50), 0 4px 16px rgba(0, 0, 0, 0.35);
}
```

```typescript
// tailwind.config.ts
boxShadow: {
  'glass-hover': 'var(--glass-shadow-hover-light)',
},
```

### Anti-Patterns to Avoid

- **Mutating `--card`, `--border`, `--background` for glass:** Never change global shadcn tokens. Glass is additive via `variant="glass"` prop and `--glass-*` tokens only.
- **Adding variant prop to Card sub-components (CardHeader, CardContent, CardFooter):** Only `Card` root needs the variant. Sub-components remain unchanged — they inherit context from the parent `Card` div.
- **Using `overflow: hidden` on Card glass variant:** Creates stacking context that traps `backdrop-filter`. The `::before` scrim from `glass-surface` uses `position: absolute; inset: 0; border-radius: inherit` — `overflow: hidden` clips this and may also trap backdrop-filter sampling. Use `overflow: clip` if clipping is absolutely required.
- **Applying `glass-surface-heavy` to `DialogOverlay`:** The overlay should be `bg-black/40 backdrop-blur-sm` — a simple dark scrim with mild blur. `glass-surface-heavy` belongs on `DialogContent`, not the backdrop.
- **Adding `variant` prop to the Dialog root component:** Dialog's glass treatment is a default-on change to `DialogContent` and `DialogOverlay`. Do not add a `variant` prop to the `Dialog` root — that would require prop changes at every existing Dialog usage site.
- **Animating `backdropFilter` with `motion`:** Motion's `whileHover={{ backdropFilter: 'blur(24px)' }}` causes GPU re-renders on every animation frame. Use CSS `transition-shadow` only for Card hover. If motion is used, animate `scale`, `y`, or `opacity` — never `backdropFilter`.
- **`::before` scrim z-index conflict:** The `::before` scrim from `glass-surface` has `z-index: 0`. Content inside the card must have `position: relative; z-index: 1` or higher to render above the scrim. This is a known downstream issue that should be documented.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Typed component variants | Custom string enum props + switch statements | CVA `cva()` | Type inference, `defaultVariants`, `VariantProps` type extraction, all free |
| Class conflict resolution | Manual deduplication of Tailwind classes | `cn()` (tailwind-merge + clsx, already in @/lib/utils) | tailwind-merge understands Tailwind specificity rules and resolves conflicts correctly |
| Dark mode glass tokens | `useTheme()` JS branching in component code | CSS custom properties already defined in globals.css `.dark` | CSS variables re-resolve on `.dark` class change with zero JS; no SSR hydration risk |
| Stacking context isolation for Dialog | Custom portal implementation | Existing Radix UI Portal via `DialogPortal` | Already in dialog.tsx; Radix Portal renders outside the DOM tree, immune to stacking context of parent |
| Progressive enhancement for backdrop-filter | JS feature detection | CSS `@supports` already in `glass-surface` via glass-plugin.ts | The fallback is already baked into the utility class; components get it for free |
| Border-radius with backdrop-filter on Safari | `overflow: hidden` + `border-radius` | `mask-image: radial-gradient(white, white); -webkit-mask-image: ...` approach or leave border-radius on the element directly | Safari clips backdrop-filter when using `overflow: hidden` + `border-radius` on the parent; use CSS masking instead |

**Key insight:** The glass token system from Phase 33 is intentionally designed so that components do zero glass CSS work — they just apply Tailwind utility class names. The complexity lives in glass-plugin.ts and globals.css, not in component files.

---

## Common Pitfalls

### Pitfall 1: Card Base Classes Conflicting with Glass Variant

**What goes wrong:** If `border-border bg-card shadow-sm` remain in the CVA base string, `tailwind-merge` will attempt to resolve conflicts with `glass-surface`'s border, background, and shadow — but the `glass-surface` utility's values come from a Tailwind plugin using `@supports` CSS blocks, which tailwind-merge cannot introspect. The result may be that `border-border` wins over the glass border, making the glass card look wrong.

**Why it happens:** tailwind-merge resolves conflicts based on CSS property names in standard Tailwind class names. Plugin-registered utilities (`glass-surface`) are opaque to tailwind-merge — it cannot know that `glass-surface` sets `border`, `background`, and `box-shadow`. When `border-border` appears alongside `glass-surface`, tailwind-merge may not remove `border-border`.

**How to avoid:** Move `border border-border bg-card shadow-sm` OUT of the base CVA string and INTO the `default` variant string. The `glass` variant then has a clean slate — it only applies `glass-surface border-glass transition-shadow hover:shadow-glass-hover`. No conflict.

**Warning signs:** Glass card with wrong border color (showing hsl(var(--border)) instead of rgba(255,255,255,0.12)); background not transparent.

### Pitfall 2: `::before` Scrim z-index Trapping Card Content

**What goes wrong:** The `::before` scrim from `glass-surface` has `z-index: 0`. If content inside the Card (text, icons, badges) does not have `position: relative` set, those elements render at the default stacking level and may appear BELOW the scrim in certain browser compositing orders.

**Why it happens:** The `@supports` block in globals.css sets `position: relative` on the glass-surface element (the Card itself) and `z-index: 0` on `::before`. Children without explicit `position: relative` or `z-index` are painted relative to the parent stacking context but BELOW explicitly z-indexed pseudo-elements in some browsers.

**How to avoid:** The simplest fix is to ensure `CardHeader`, `CardContent`, `CardFooter` sub-components all have `position: relative` in their class strings, or to add `relative z-10` to their base classes. Alternatively, set `z-index: 1` on the `::before` scrim instead of 0 — but this affects all glass surfaces, not just Card.

**Warning signs:** Text or icons "disappearing" on glass cards in Chrome; content invisible but present in DOM.

### Pitfall 3: Dialog Glass Breaking the Close Button

**What goes wrong:** The `DialogPrimitive.Close` button inside `DialogContent` is rendered with `position: absolute; right: 4; top: 4`. If the glass surface's `::before` scrim (also `position: absolute; inset: 0`) has `z-index: 0` and the close button has no explicit z-index, the scrim may overlay the close button in some browsers, making it unclickable.

**Why it happens:** Same z-index layering issue as Pitfall 2, but specifically on the close button which relies on being interactable at its position.

**How to avoid:** Add `relative z-10` to the close button's className, or ensure `pointer-events: none` on the scrim (already set in globals.css — `pointer-events: none` is on `::before`). Verify the close button is still clickable after applying glass treatment.

**Warning signs:** Dialog close button appears rendered but clicking it does nothing.

### Pitfall 4: GradientMesh Creating Stacking Context

**What goes wrong:** Adding any property that creates a stacking context to the `GradientMesh` component's outer div breaks z-index layering for ALL elements on the page. Dropdowns and modals stop appearing above content.

**Why it happens:** `position: fixed; z-index: -10` places the gradient-mesh below the root stacking context. Any stacking-context-triggering property (`transform`, `filter`, `opacity < 1`, `will-change`) on the same element changes the stacking context evaluation and can cause elements with `position: relative` to disappear behind the mesh.

**How to avoid:** GradientMesh component applies ONLY `gradient-mesh gradient-mesh-{preset}` classes. The CSS for these classes is exactly `position: fixed; inset: 0; z-index: -10; pointer-events: none` plus `background: radial-gradient(...)`. Never pass `style={{ transform: ... }}` or className overrides that add these properties to GradientMesh.

**Warning signs:** Navigation dropdowns disappear; modals render behind content; content visible through fixed header.

### Pitfall 5: Button Ghost/Secondary Glass Tint Reducing Contrast

**What goes wrong:** The `glass` variant on Button applies a subtle glass tint to ghost/secondary buttons. If the tint background is too light (e.g., `rgba(255,255,255,0.05)`) on a light gradient-mesh background, the button text fails WCAG 4.5:1 contrast ratio because the button blends into the background.

**Why it happens:** Glass tints work visually when there is sufficient contrast between the frosted panel color and the background gradient. On light backgrounds, white-alpha glass approaches invisible. Primary CTA buttons must stay solid — this is a locked decision.

**How to avoid:** The Button glass variant is ONLY for secondary/ghost variants, never `default` (primary CTA). The glass tint should be `glass-surface-subtle` (lowest opacity). Verify contrast with the WebAIM contrast checker after implementation, testing on the lightest gradient mesh color.

**Warning signs:** Ghost buttons with text that is hard to read against gradient-mesh-marketing backgrounds.

### Pitfall 6: BookingStatusBadge Breaking When Glass Variant Added

**What goes wrong:** `BookingStatusBadge.tsx` currently applies `variant="outline"` with custom `className` containing `bg-*` and `text-*` color classes. If Badge's glass variants are added but `BookingStatusBadge` is not updated to use them, the COMP-04 requirement ("booking status pills as translucent glass badges") is unfulfilled even though the variant is defined.

**Why it happens:** The variant is defined in `badgeVariants` but `BookingStatusBadge` is an application-layer component, not a UI primitive. Adding a variant to `badge.tsx` does not automatically apply it in `BookingStatusBadge.tsx`.

**How to avoid:** Phase 34 must include updating `BookingStatusBadge.tsx` to use `variant="glass-blue"`, `variant="glass-gray"`, `variant="glass-red"` etc. This is in scope for COMP-04.

**Warning signs:** `BookingStatusBadge` still renders with solid `bg-blue-100` backgrounds after the glass variant is defined.

---

## Code Examples

Verified patterns from official sources and codebase reads:

### CVA with defaultVariants (backward compatibility pattern)

```typescript
// Source: Existing apps/web/components/ui/button.tsx in this codebase (verified)
// The defaultVariants pattern is already in use — replicating for Card
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-lg text-card-foreground',  // universal base
  {
    variants: {
      variant: {
        default: 'border border-border bg-card shadow-sm',  // exact current shadcn classes
        glass: 'glass-surface border-glass transition-shadow duration-200 hover:shadow-glass-hover',
      },
    },
    defaultVariants: {
      variant: 'default',  // All 476 existing <Card /> usages continue to render identically
    },
  },
);

// VariantProps extraction gives typed variant prop to consumers:
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}
```

### GlassPanel with CVA intensity variants

```typescript
// Source: Pattern derived from GlassPanelProps requirement (COMP-05) + codebase patterns
import { cva, type VariantProps } from 'class-variance-authority';

const glassPanelVariants = cva('relative rounded-lg', {
  variants: {
    intensity: {
      subtle: 'glass-surface-subtle',
      medium: 'glass-surface',
      heavy: 'glass-surface-heavy',
    },
  },
  defaultVariants: {
    intensity: 'medium',
  },
});
```

### GradientMesh with aria-hidden

```typescript
// Source: Pattern derived from COMP-06 requirement + gradient-mesh CSS from Phase 33
function GradientMesh({ preset = 'dashboard', className }: GradientMeshProps) {
  return (
    <div
      className={cn('gradient-mesh', `gradient-mesh-${preset}`, className)}
      aria-hidden="true"  // Decorative background — hide from screen readers
    />
  );
}
```

### Dialog glass overlay — replacing bg-black/80

```typescript
// Source: Existing apps/web/components/ui/dialog.tsx (verified) + glass token system
// Current: className="fixed inset-0 z-50 bg-black/80 ..."
// Changed to:
className={cn(
  'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',  // lighter scrim + blur
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  className,
)}
```

### Badge with color-tinted glass for booking status

```typescript
// Source: Existing BookingStatusBadge.tsx color mapping + glass token system
// Existing pattern: variant="outline" + className="bg-blue-100 text-blue-800 border-transparent"
// New pattern: variant="glass-blue" (no className override needed)

// In BookingStatusBadge.tsx — update STATUS_COLORS to use glass variants:
const STATUS_VARIANTS: Record<BookingStatus, BadgeProps['variant']> = {
  pending:   'glass-amber',   // define amber if needed, or use existing 'default'
  confirmed: 'glass-blue',
  completed: 'glass-green',   // define if needed
  cancelled: 'glass-gray',
  no_show:   'glass-red',
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| shadcn components with fixed className only | CVA variant system already used in Button, Badge | shadcn introduced CVA-based components ~2023 | Card still needs CVA refactor — it's the exception, not the rule |
| Manual glass CSS in every component | Centralized glass utilities in Tailwind plugin | Phase 33 of this project | Components just apply class names; no CSS in component files |
| Dialog with opaque `bg-background` content | Glass treatment via `glass-surface-heavy` on DialogContent | This phase | Frosted dialog on gradient backgrounds; zero prop changes at usage sites |
| `overflow: hidden` for border-radius clipping | Avoid `overflow: hidden` on glass parents; use `border-radius` on element directly | Documented pitfall | Prevents backdrop-filter from being trapped in parent stacking context |

**Deprecated/outdated for this phase:**

- `className` overrides for ad-hoc glass effects: The Phase 33 plugin handles all glass CSS. Components should not contain inline glass CSS.
- The `bg-black/80` overlay on Dialog: Replaced with `bg-black/40 backdrop-blur-sm` for the glass aesthetic. The old opacity is too heavy for a glass design system.

---

## Open Questions

1. **Button ghost glass variant — is `glass-surface-subtle` sufficient for WCAG contrast?**
   - What we know: `glass-surface-subtle` uses `rgba(255,255,255,0.05)` background. On `gradient-mesh-marketing` (which can have `rgba(59,130,246,0.25)` blue orbs), the contrast may be marginal.
   - What's unclear: Whether the translucent tint provides enough visual separation for the button to be distinguishable from the background.
   - Recommendation: Add `border-glass` to Button ghost/secondary glass variant explicitly. The border provides visual definition even when the background alpha is low. Validate with WebAIM contrast checker after implementation. If contrast fails, increase background opacity.

2. **`::before` scrim z-index — should children need `relative z-10`?**
   - What we know: The scrim's `z-index: 0` can trap content without explicit positioning. Phase 33 verified the scrim has `pointer-events: none` so it doesn't block clicks, but visual rendering order is not verified.
   - What's unclear: Whether CardHeader/CardContent/CardFooter need `position: relative` added to their base classes.
   - Recommendation: Add `relative` to CardHeader, CardContent, CardFooter base class strings as a precaution. This is a low-risk addition that prevents the z-index layering issue at the source.

3. **Badge glass variants — how many color tints to define?**
   - What we know: COMP-04 requires confirmed (blue), cancelled (gray), no-show (red). The existing `BookingStatusBadge` also handles `pending` (amber) and `completed` (green).
   - What's unclear: Whether `pending` and `completed` also get glass variants, or only the three named in COMP-04.
   - Recommendation: Define all five status glass variants (glass-blue, glass-gray, glass-red, glass-amber, glass-green) in `badgeVariants` to cover all booking statuses in one pass. COMP-04 can be satisfied with three; the other two are low-cost additions.

4. **GradientMesh — should it accept `style` prop for custom background overrides?**
   - What we know: The component maps `preset` to predefined CSS classes. Custom gradient overrides would require either a new CSS class or inline `style`.
   - What's unclear: Whether any usage in Phase 35+ will need non-preset gradients.
   - Recommendation: Accept standard `React.HTMLAttributes<HTMLDivElement>` to allow `style` overrides. Document that `style={{ transform: ... }}` is forbidden on GradientMesh (creates stacking context). The `style` escape hatch is safe for `background` overrides only.

---

## Sources

### Primary (HIGH confidence)

- **Codebase direct reads** — All findings about existing component APIs, current CVA usage, and glass token state are from direct file reads. Verified files:
  - `apps/web/components/ui/card.tsx` — confirmed no CVA, forwardRef pattern
  - `apps/web/components/ui/button.tsx` — confirmed CVA pattern with `defaultVariants`
  - `apps/web/components/ui/badge.tsx` — confirmed CVA with `badgeVariants`, existing variants
  - `apps/web/components/ui/dialog.tsx` — confirmed Radix UI Portal, current overlay/content classes
  - `apps/web/components/booking/BookingStatusBadge.tsx` — confirmed current badge usage with custom className colors
  - `apps/web/components/shared/upgrade-modal.tsx` — confirmed existing Dialog usage pattern
  - `apps/web/components/dashboard/stat-card.tsx` — confirmed Card usage without variant prop
  - `apps/web/lib/plugins/glass-plugin.ts` — confirmed Phase 33 glass utilities exist and are complete
  - `apps/web/app/globals.css` — confirmed glass tokens, gradient mesh, scrim, responsive blocks
  - `apps/web/tailwind.config.ts` — confirmed `shadow-glass` exists, `shadow-glass-hover` is ABSENT (gap)
  - `apps/web/package.json` — confirmed CVA ^0.7.1, tailwind-merge ^3.4.0, motion ^12.34.3 are installed

- `https://v3.tailwindcss.com/docs/plugins` — Tailwind v3 plugin API with `addUtilities`; verified Phase 33 plugin is valid
- `.planning/phases/33-token-foundation/VERIFICATION.md` — Phase 33 completion verified 7/7 requirements passed
- `.planning/research/SUMMARY.md` — comprehensive glassmorphism research, pitfall catalogue, architecture decisions

### Secondary (MEDIUM confidence)

- CVA documentation: `defaultVariants` behavior — the Button component in the codebase uses this pattern identically to how the documentation describes it. Behavior is verified by code inspection, not by running the code.
- Radix UI dialog behavior: Portal isolation — `@radix-ui/react-dialog` ^1.1.15 is installed. The Portal mechanism (renders outside DOM tree) is a well-documented Radix UI design principle. Not independently verified against Radix docs for this version, but has not changed across major Radix versions.

### Tertiary (LOW confidence)

- tailwind-merge behavior with custom plugin utilities: tailwind-merge resolves conflicts based on Tailwind's class name taxonomy. Plugin-registered utilities (`glass-surface`) may not be correctly identified by tailwind-merge as replacing `border-border`, `shadow-sm`, etc. This is flagged as a risk in Pitfall 1 — the recommended CVA structure (separating default and glass variant strings) avoids the issue without needing to verify tailwind-merge's plugin utility handling.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified from package.json; all existing component APIs verified from source files
- Architecture patterns: HIGH — CVA pattern verified from existing Button/Badge in codebase; glass utilities verified from Phase 33 completion report
- Pitfalls: HIGH — most pitfalls are grounded in actual code observations (no CVA in Card, scrim z-index, Dialog close button, BookingStatusBadge coupling)
- `shadow-glass-hover` token gap: HIGH — verified absent from tailwind.config.ts; required by success criteria

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable APIs; CVA, Tailwind v3, Radix UI are mature and frozen APIs)

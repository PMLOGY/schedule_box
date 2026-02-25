# Phase 33: Token Foundation and Background System — Research

**Researched:** 2026-02-25
**Domain:** CSS design tokens, Tailwind CSS plugin API, glassmorphism, web fonts
**Confidence:** HIGH

## Summary

Phase 33 establishes the CSS and Tailwind infrastructure layer for a glass design system. It produces no visible UI — only the token system, background primitives, and Tailwind plugin that every subsequent glass component depends on. The work spans three files: `globals.css` (CSS tokens + gradient-mesh + accessibility fallbacks), `glass-plugin.ts` (Tailwind plugin registering utility classes), and `tailwind.config.ts` (theme extensions + font swap).

The single most critical constraint is the **Safari `-webkit-backdrop-filter` CSS variables bug** (MDN #25914): Safari 18.3 still requires the `-webkit-backdrop-filter` prefix AND cannot accept CSS variables in that property. This means the glass utility classes MUST use hardcoded pixel values in `backdrop-filter` and `-webkit-backdrop-filter` declarations — CSS tokens cannot drive blur intensity in the property itself. CSS variables ARE safe for `background`, `border-color`, `box-shadow`, and other non-filter properties.

The stack is zero new npm packages. Tailwind 3.4.x (project's current version) has full native `backdrop-blur-*` utilities with hardcoded values, and the Tailwind plugin API (v3 style: `import plugin from 'tailwindcss/plugin'`) handles the glass utility registration. Plus Jakarta Sans is available via `next/font/google` with a straightforward rename from the current Inter setup.

**Primary recommendation:** Write the Tailwind plugin first (glass-plugin.ts), then extend globals.css with glass tokens, then wire up tailwind.config.ts and font swap — this order ensures the config is valid before globals.css tokens reference any Tailwind utilities.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| Tailwind CSS | 3.4.x (installed) | Utility classes, plugin host | Already in project; `backdrop-blur-*` utilities are native |
| `tailwindcss/plugin` | bundled with Tailwind | Plugin API for custom utility registration | Official way to add `addUtilities`/`addBase` classes |
| CSS custom properties | native | Glass token storage | Enables light/dark theming; @layer base scoping |
| `next/font/google` | bundled with Next.js 14 (installed) | Plus Jakarta Sans font loading | Zero layout shift, self-hosted, `display: 'swap'` default |

### Supporting

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `autoprefixer` | installed (postcss.config.mjs) | Adds `-webkit-` prefix to standard `backdrop-filter` | Will auto-prefix backdrop-filter in non-plugin CSS; NOT in JS-in-CSS plugin |
| `tailwindcss-animate` | installed | Pre-existing plugin | Keep in plugins array alongside new glass-plugin |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Tailwind plugin (glass-plugin.ts) | Pure CSS @layer utilities in globals.css | Plugin gives tree-shaking + IDE completions; CSS utilities always included regardless of usage |
| Hardcoded blur values in plugin | CSS variable driven blur | CSS variables break Safari `-webkit-backdrop-filter` (MDN #25914) — hardcoded is the only safe approach |
| `next/font/google` for Plus Jakarta Sans | `@fontsource/plus-jakarta-sans` npm package | `next/font/google` self-hosts at build time with zero external requests; fontsource requires manual woff2 management |
| Radial gradient orbs in CSS | SVG blobs or canvas | Pure CSS radial-gradient is zero-weight, animatable, and SSR-safe |

**Installation:** No new packages needed. Everything already installed.

---

## Architecture Patterns

### Recommended File Structure

```
apps/web/
├── app/
│   ├── globals.css                    # MODIFIED: add glass tokens + gradient-mesh + fallbacks
│   └── layout.tsx                     # MODIFIED: Inter → Plus Jakarta Sans
├── tailwind.config.ts                 # MODIFIED: add plugin + theme extensions
└── lib/
    └── plugins/
        └── glass-plugin.ts            # NEW: Tailwind plugin registering glass utilities
```

> Note: Place `glass-plugin.ts` under `apps/web/lib/plugins/` to keep it collocated with the app's config. The tailwind.config.ts must import it with a relative path.

### Pattern 1: CSS Token Layering (globals.css)

**What:** Glass primitive tokens are defined as CSS custom properties in `:root` and `.dark` inside `@layer base`. They are ADDITIVE — they do not replace any existing shadcn/ui tokens (`--card`, `--border`, etc.).

**When to use:** Any property that is NOT a backdrop-filter blur value (background alpha, shadow, border color, scrim opacity).

**Example:**
```css
/* Source: Official CSS custom properties spec + shadcn/ui convention */
@layer base {
  :root {
    /* === GLASS TOKENS (additive, never override shadcn tokens) === */

    /* Blur levels — used in plugin as REFERENCE ONLY (not in filter property) */
    --glass-blur-sm: 8px;
    --glass-blur-md: 16px;
    --glass-blur-lg: 24px;

    /* Background alpha (safe to use in rgba()) */
    --glass-bg-light: rgba(255, 255, 255, 0.08);
    --glass-bg-subtle-light: rgba(255, 255, 255, 0.05);
    --glass-bg-heavy-light: rgba(255, 255, 255, 0.15);

    /* Border */
    --glass-border-light: rgba(255, 255, 255, 0.12);

    /* Shadow */
    --glass-shadow-light: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .dark {
    --glass-bg-light: rgba(15, 23, 42, 0.45);
    --glass-bg-subtle-light: rgba(15, 23, 42, 0.30);
    --glass-bg-heavy-light: rgba(15, 23, 42, 0.65);
    --glass-border-light: rgba(255, 255, 255, 0.08);
    --glass-shadow-light: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25);
  }
}
```

**Critical:** `--glass-blur-*` variables exist for documentation purposes only. They CANNOT be used inside `-webkit-backdrop-filter: blur(var(...))` — Safari will silently fail.

### Pattern 2: Gradient Mesh Background (globals.css)

**What:** A utility class `.gradient-mesh` renders layered radial-gradient orbs as a decorative background layer. Positioned with `position: fixed; inset: 0; z-index: -10` so it does NOT create a stacking context for descendants.

**When to use:** Applied to page wrapper elements on dashboard, marketing, and auth pages. Sidebar gets no gradient-mesh — stays solid.

**Example:**
```css
/* Source: CSS radial-gradient layering technique (standard CSS) */
@layer utilities {
  .gradient-mesh {
    position: fixed;
    inset: 0;
    z-index: -10;
    pointer-events: none;
  }

  /* Dashboard preset — subtle blue orbs */
  .gradient-mesh-dashboard {
    background:
      radial-gradient(ellipse 80% 50% at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 70%, rgba(99, 102, 241, 0.10) 0%, transparent 60%),
      radial-gradient(ellipse 50% 60% at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
  }

  /* Marketing preset — vibrant blue-indigo */
  .gradient-mesh-marketing {
    background:
      radial-gradient(ellipse 90% 60% at 10% 10%, rgba(59, 130, 246, 0.25) 0%, transparent 55%),
      radial-gradient(ellipse 70% 50% at 85% 80%, rgba(99, 102, 241, 0.20) 0%, transparent 55%),
      radial-gradient(ellipse 60% 70% at 60% 30%, rgba(168, 85, 247, 0.12) 0%, transparent 60%);
  }

  /* Auth preset — muted neutral */
  .gradient-mesh-auth {
    background:
      radial-gradient(ellipse 70% 50% at 30% 30%, rgba(148, 163, 184, 0.12) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 70% 70%, rgba(100, 116, 139, 0.08) 0%, transparent 60%);
  }
}

/* Dark mode: shift orb colors to dark-appropriate values */
.dark .gradient-mesh-dashboard {
  background:
    radial-gradient(ellipse 80% 50% at 20% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(99, 102, 241, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 50% 50%, rgba(139, 92, 246, 0.04) 0%, transparent 70%);
}
```

> Note: `z-index: -10` does NOT create a stacking context on the element itself. The gradient-mesh sits below all content without affecting DOM children stacking order.

### Pattern 3: Glass Utility Plugin (glass-plugin.ts)

**What:** A Tailwind CSS v3 plugin that registers `glass-surface`, `glass-surface-subtle`, and `glass-surface-heavy` using `addUtilities`. The plugin uses hardcoded pixel values for `backdrop-filter` and `-webkit-backdrop-filter`. It wraps glass styles in `@supports` for progressive enhancement.

**When to use:** This is the ONLY place where `backdrop-filter` and `-webkit-backdrop-filter` declarations live. Do not put these in globals.css.

**Example:**
```typescript
// Source: https://v3.tailwindcss.com/docs/plugins — official Tailwind v3 plugin API
import plugin from 'tailwindcss/plugin';

const glassPlugin = plugin(function ({ addUtilities }) {
  addUtilities({
    '.glass-surface': {
      // Fallback for browsers without backdrop-filter support
      'background': 'rgba(255, 255, 255, 0.85)',

      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        'background': 'var(--glass-bg-light)',
        // HARDCODED: CSS variables CANNOT be used here (Safari MDN#25914)
        'backdrop-filter': 'blur(16px)',
        '-webkit-backdrop-filter': 'blur(16px)',
        'border': '1px solid var(--glass-border-light)',
        'box-shadow': 'var(--glass-shadow-light)',
      },
    },

    '.glass-surface-subtle': {
      'background': 'rgba(255, 255, 255, 0.90)',

      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        'background': 'var(--glass-bg-subtle-light)',
        'backdrop-filter': 'blur(8px)',
        '-webkit-backdrop-filter': 'blur(8px)',
        'border': '1px solid var(--glass-border-light)',
        'box-shadow': 'var(--glass-shadow-light)',
      },
    },

    '.glass-surface-heavy': {
      'background': 'rgba(255, 255, 255, 0.75)',

      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        'background': 'var(--glass-bg-heavy-light)',
        'backdrop-filter': 'blur(24px)',
        '-webkit-backdrop-filter': 'blur(24px)',
        'border': '1px solid var(--glass-border-light)',
        'box-shadow': 'var(--glass-shadow-light)',
      },
    },
  });
});

export default glassPlugin;
```

**Note on dark mode in the plugin:** CSS variables for `background`, `border`, and `shadow` automatically resolve to dark values when `.dark` class is present (because the CSS tokens are defined in `.dark` in globals.css). The `backdrop-filter` pixel values are the same in light and dark mode — only the background alpha differs, handled by CSS variables.

### Pattern 4: Tailwind Config Extensions (tailwind.config.ts)

**What:** Extend the existing config with glass theme tokens and register the plugin. The plugin is imported as an ES module since tailwind.config.ts is already TypeScript.

**When to use:** Once after glass-plugin.ts is written.

**Example:**
```typescript
// Source: https://v3.tailwindcss.com/docs/configuration + official plugin docs
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import glassPlugin from './lib/plugins/glass-plugin';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // ... existing colors, borderRadius, keyframes, animation unchanged ...

      fontFamily: {
        // CHANGED: Inter → Plus Jakarta Sans
        sans: ['var(--font-plus-jakarta-sans)', 'sans-serif'],
      },

      backdropBlur: {
        // Glass levels for reference (used in non-glass contexts if needed)
        'glass-sm': '8px',
        'glass-md': '16px',
        'glass-lg': '24px',
      },

      backgroundColor: {
        // Named glass tokens for direct use if needed
        'glass': 'var(--glass-bg-light)',
        'glass-subtle': 'var(--glass-bg-subtle-light)',
        'glass-heavy': 'var(--glass-bg-heavy-light)',
      },

      boxShadow: {
        // Existing shadows preserved; add glass shadow
        'glass': 'var(--glass-shadow-light)',
      },

      borderColor: {
        'glass': 'var(--glass-border-light)',
      },

      backgroundImage: {
        // Named gradient presets for programmatic use
        'gradient-mesh-dashboard': 'radial-gradient(...)',
        'gradient-mesh-marketing': 'radial-gradient(...)',
        'gradient-mesh-auth': 'radial-gradient(...)',
      },
    },
  },
  plugins: [tailwindcssAnimate, glassPlugin],
};

export default config;
```

### Pattern 5: Font Swap (layout.tsx)

**What:** Replace the `Inter` import with `Plus_Jakarta_Sans` from `next/font/google`. Use the CSS variable approach for Tailwind compatibility. The variable name changes from `--font-inter` to `--font-plus-jakarta-sans`.

**When to use:** The single root layout.tsx (`apps/web/app/layout.tsx`).

**Example:**
```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],  // Keep latin-ext for Czech/Slovak characters
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
});

// In the layout component:
<body className={`${plusJakartaSans.variable} font-sans`}>
```

> Note: `latin-ext` is critical — it covers Czech diacritics (á, č, ě, í, ó, š, ú, ů, ý, ž). Without it, Czech characters fall back to the system font.

### Pattern 6: Responsive Blur Degradation (globals.css)

**What:** A CSS `@media` query reduces blur intensity on viewports below 768px to improve GPU performance on mobile devices.

**When to use:** Applied globally in globals.css. This overrides the plugin-registered blur values on small screens.

**Example:**
```css
/* Source: CSS @media + backdrop-filter (MDN) */
@media (max-width: 767px) {
  .glass-surface {
    /* Hardcoded — CSS variables cannot be used in -webkit-backdrop-filter */
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .glass-surface-subtle {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .glass-surface-heavy {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}
```

### Pattern 7: Accessibility Fallbacks (globals.css)

**What:** Two accessibility layers — `@supports` guard (browser capability), and `prefers-reduced-transparency` (user preference). A `::before` pseudo-element provides the WCAG scrim.

**When to use:** Applied globally in globals.css.

**Example:**
```css
/* Source: MDN prefers-reduced-transparency + WCAG 1.4.3 technique */

/* prefers-reduced-transparency: swap glass → opaque card */
@media (prefers-reduced-transparency: reduce) {
  .glass-surface,
  .glass-surface-subtle,
  .glass-surface-heavy {
    /* Remove blur */
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    /* Use opaque card background from existing shadcn tokens */
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
  }
}

/* WCAG scrim: ::before overlay ensures text contrast on glass */
/* Applied when @supports passes — the scrim adds solid tint under text */
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .glass-surface::before,
  .glass-surface-subtle::before,
  .glass-surface-heavy::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    /* Semi-opaque tint to boost text contrast */
    background: rgba(255, 255, 255, 0.04);
    pointer-events: none;
    z-index: 0;
  }

  .dark .glass-surface::before,
  .dark .glass-surface-subtle::before,
  .dark .glass-surface-heavy::before {
    background: rgba(0, 0, 0, 0.08);
  }
}
```

> Note: The ::before scrim provides contrast floor, not full contrast guarantee. The primary WCAG compliance mechanism is text color + sufficient `--glass-bg-*` opacity. Validate with WebAIM Contrast Checker after implementation.

### Anti-Patterns to Avoid

- **CSS variables in `-webkit-backdrop-filter`:** `backdrop-filter: blur(var(--glass-blur-md))` fails silently in Safari. Use hardcoded `blur(16px)` values.
- **Modifying existing shadcn tokens:** Never change `--card`, `--border`, `--background`. Glass tokens are additive under `--glass-*` prefix.
- **Stacking contexts from gradient-mesh:** The `.gradient-mesh` element uses `position: fixed; z-index: -10`. Do NOT add `transform`, `filter`, `opacity < 1`, or `will-change` to gradient-mesh — this creates a stacking context and breaks z-index layering.
- **More than 3-4 active glass elements per viewport:** GPU stacks all backdrop-filter elements. Limit co-visible glass panels to prevent compositing layer explosion.
- **`overflow: hidden` on glass parents:** `overflow: hidden` + `border-radius` on a parent creates a stacking context that confines the child's backdrop-filter. The glass element only blurs content within its parent — the effect visually collapses. Avoid this combination.
- **Applying glass-surface to the sidebar:** Sidebar stays solid. Confirmed architecture decision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Progressive enhancement | Manual class toggling | CSS `@supports` guard inside plugin | `@supports` is declarative, zero JS, handles all states automatically |
| Font loading | Direct `<link>` to Google Fonts | `next/font/google` | Self-hosted, zero layout shift, no external CDN request, Czech subset support |
| Blur utilities | Custom `blur-*` classes | Native Tailwind `backdrop-blur-*` (sm=4px, md=12px, lg=16px, xl=24px) | Tailwind's built-in utilities are autoprefixed and tree-shaken |
| Dark mode token switching | JS-based class toggling | CSS custom properties in `:root` / `.dark` | CSS variables re-resolve on `.dark` class change with zero JS |
| Vendor prefixing | Manual `-webkit-` prefix in every rule | Built-in in globals.css (not plugin); rely on autoprefixer for standard CSS | Plugin CSS-in-JS bypasses autoprefixer — must add `-webkit-` manually in plugin only |

**Key insight:** The plugin architecture separates concerns: `glass-plugin.ts` owns `backdrop-filter` declarations (where CSS variables are forbidden); `globals.css` owns all other token values (where CSS variables work fine).

---

## Common Pitfalls

### Pitfall 1: Safari Silently Ignoring CSS Variable Blur

**What goes wrong:** `backdrop-filter: blur(var(--glass-blur-md))` and `-webkit-backdrop-filter: blur(var(--glass-blur-md))` both render as no-op in Safari. The element loses all blur effect with no error.

**Why it happens:** MDN issue #25914 confirmed: Safari 18.3 does not accept CSS custom properties inside `-webkit-backdrop-filter` values. Unprefixed `backdrop-filter` is not enabled by default in stable Safari 18 (it's behind a developer flag).

**How to avoid:** Use hardcoded pixel values in `backdrop-filter` and `-webkit-backdrop-filter` exclusively. Do not reference CSS variables in these properties, even as fallbacks.

**Warning signs:** Glass effect visible in Chrome/Firefox but absent in Safari.

### Pitfall 2: Stacking Context Breaking Gradient Visibility

**What goes wrong:** Adding `transform`, `opacity < 1`, `filter`, `will-change: transform`, or `position: fixed/sticky` to the `.gradient-mesh` element creates a stacking context. When gradient-mesh has its own stacking context, elements above it with `position: relative` and no explicit `z-index` can render BELOW the gradient-mesh.

**Why it happens:** `position: fixed; z-index: -10` places gradient-mesh below the root stacking context. But adding any stacking-context-triggering property changes how z-index is evaluated.

**How to avoid:** The `.gradient-mesh` element must have ONLY: `position: fixed; inset: 0; z-index: -10; pointer-events: none`. No other properties on the element itself.

**Warning signs:** Content disappearing behind background, or background not showing.

### Pitfall 3: overflow: hidden Parent Trapping Backdrop-Filter

**What goes wrong:** A glass panel inside a parent with `overflow: hidden` and `border-radius` loses its blur effect. The blur only affects the parent's internal content, not the actual page background.

**Why it happens:** `overflow: hidden` + `border-radius` on a parent creates an independent stacking context. `backdrop-filter` can only sample pixels from the parent's compositing layer.

**How to avoid:** Never wrap `.glass-surface` elements in parents with `overflow: hidden`. Use `overflow: clip` instead if clipping is needed (does not create stacking context). Alternatively, apply `border-radius` directly on the glass element.

**Warning signs:** Glass card shows background of its parent container, not the page gradient.

### Pitfall 4: prefers-reduced-transparency Browser Support Gap

**What goes wrong:** `prefers-reduced-transparency` has ~71% browser support (2024). Firefox does not support it. Developers assume it covers all users with reduced transparency preferences.

**Why it happens:** The media query is limited availability — not Baseline.

**How to avoid:** The `@supports` guard provides a separate layer of progressive enhancement for browsers without `backdrop-filter` at all. For users on unsupported browsers, the opaque fallback background is already active via `@supports`. The `prefers-reduced-transparency` guard is a bonus for users who can trigger it (macOS, Windows, iOS).

**Warning signs:** Testing reduced transparency only in Safari/Chrome, missing that Firefox users always get the opaque fallback.

### Pitfall 5: Plus Jakarta Sans Missing Czech Characters

**What goes wrong:** Czech characters (š, č, ž, ř, á, etc.) render in the system fallback font instead of Plus Jakarta Sans.

**Why it happens:** Omitting the `latin-ext` subset from `next/font/google` configuration. The `latin` subset does not include extended Latin characters used in Czech and Slovak.

**How to avoid:** Always include `subsets: ['latin', 'latin-ext']` in the Plus Jakarta Sans configuration.

**Warning signs:** Mixed font rendering visible in Czech UI text; system font renders slightly differently from Plus Jakarta Sans.

### Pitfall 6: Autoprefixer Does NOT Process Plugin CSS

**What goes wrong:** Developer writes `backdrop-filter: blur(16px)` in the Tailwind plugin (glass-plugin.ts) expecting autoprefixer to add `-webkit-backdrop-filter`. The `-webkit-` prefix is missing in production, breaking Safari.

**Why it happens:** PostCSS autoprefixer processes CSS files (globals.css), not JavaScript CSS-in-JS objects inside Tailwind plugins. The plugin emits CSS at Tailwind build time, bypassing the PostCSS chain.

**How to avoid:** Always write BOTH `'backdrop-filter': 'blur(Npx)'` AND `'-webkit-backdrop-filter': 'blur(Npx)'` in every glass utility object in the plugin.

**Warning signs:** Glass works in Chrome/Firefox but not Safari in production; works during dev if autoprefixer runs differently.

---

## Code Examples

Verified patterns from official sources:

### Tailwind v3 Plugin with addUtilities and @supports

```typescript
// Source: https://v3.tailwindcss.com/docs/plugins — official plugin API
import plugin from 'tailwindcss/plugin';

export default plugin(function ({ addUtilities }) {
  addUtilities({
    '.glass-surface': {
      // Opaque fallback (no @supports guard = always active)
      background: 'rgba(255, 255, 255, 0.85)',

      // Progressive enhancement: only when backdrop-filter is supported
      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        background: 'var(--glass-bg-light)',
        // MUST be hardcoded — CSS variables forbidden in -webkit-backdrop-filter (Safari MDN#25914)
        'backdrop-filter': 'blur(16px)',
        '-webkit-backdrop-filter': 'blur(16px)',
        border: '1px solid var(--glass-border-light)',
        'box-shadow': 'var(--glass-shadow-light)',
      },
    },
  });
});
```

### Plus Jakarta Sans with next/font/google (Czech support)

```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],  // latin-ext required for Czech diacritics
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
});

// In RootLayout:
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

### tailwind.config.ts font family extension

```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts#with-tailwind-css
fontFamily: {
  sans: ['var(--font-plus-jakarta-sans)', 'sans-serif'],
},
```

### Gradient Mesh Orb (CSS only, multiple radial-gradient layers)

```css
/* Source: Standard CSS radial-gradient specification (MDN) */
/* True 2D mesh gradients are not supported in CSS — layered radial-gradient() is the standard approximation */
.gradient-mesh-dashboard {
  position: fixed;
  inset: 0;
  z-index: -10;
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 50% at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(99, 102, 241, 0.10) 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
}
```

### prefers-reduced-transparency fallback

```css
/* Source: MDN — prefers-reduced-transparency (limited availability ~71% browsers, 2024) */
@media (prefers-reduced-transparency: reduce) {
  .glass-surface,
  .glass-surface-subtle,
  .glass-surface-heavy {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: hsl(var(--card));     /* Reuse existing shadcn token */
    border: 1px solid hsl(var(--border));
  }
}
```

### Existing marketing navbar (already uses backdrop-blur correctly)

```tsx
// Existing: apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx
// Uses Tailwind utility + supports-[] variant — correct pattern, do not change
<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| `-webkit-backdrop-filter` required everywhere | Unprefixed `backdrop-filter` works in Chrome, Firefox, Edge; Safari still needs `-webkit-` prefix | Chrome 76+, Firefox 103+, Safari 18+ (flag only) | Must include both in plugin; autoprefixer handles standard CSS but not plugin CSS-in-JS |
| `backdrop-filter` needing polyfills | Native browser support ~97% globally | 2022-2024 | No polyfill needed; `@supports` guard is sufficient progressive enhancement |
| Mesh gradients requiring SVG/canvas | Layered `radial-gradient()` CSS approximation | Current state | Pure CSS is preferred; true freeform-gradient() CSS proposal is future (not available) |
| Google Fonts via `<link>` in `<head>` | `next/font/google` self-hosted at build time | Next.js 13+ | No external CDN requests, zero layout shift via `size-adjust`, `display: swap` default |
| CSS variables in backdrop-filter (thought to work) | **Breaks Safari** — hardcoded values only | Documented 2024 (MDN #25914) | Every glass utility must use literal pixel values, not `var()` |

**Deprecated/outdated:**

- `@tailwindcss/filters` plugin: No longer needed — Tailwind 2.1+ has native `backdrop-blur-*` utilities. Do not add this plugin.
- Direct `<link rel="preconnect" href="https://fonts.googleapis.com">`: Replaced entirely by `next/font/google`. Do not add Google Fonts CDN links.

---

## Open Questions

1. **::before scrim and position: relative**
   - What we know: The `::before` pseudo-element with `position: absolute` requires the parent glass element to have `position: relative` set.
   - What's unclear: If components using `glass-surface` forget to add `position: relative`, the `::before` scrim will position relative to the nearest positioned ancestor.
   - Recommendation: Add `position: relative` to the glass utility classes themselves in the plugin, or document it as a required companion class. Adding it in the plugin is cleaner.

2. **tailwind.config.ts import path for glass-plugin.ts**
   - What we know: The plugin file is at `apps/web/lib/plugins/glass-plugin.ts` and tailwind.config.ts is at `apps/web/tailwind.config.ts`.
   - What's unclear: Whether TypeScript compilation of the config file (via ts-node or tsx, which Next.js uses internally) correctly resolves the relative import at `./lib/plugins/glass-plugin`.
   - Recommendation: Use the relative path `import glassPlugin from './lib/plugins/glass-plugin'`. If compilation fails, fallback is `require('./lib/plugins/glass-plugin').default`. Test during implementation.

3. **backgroundImage Tailwind extension for gradient-mesh presets**
   - What we know: Tailwind's `backgroundImage` extension registers values accessible via `bg-{key}` utilities. But gradient-mesh needs `position: fixed; z-index: -10` which can't be in backgroundImage alone.
   - What's unclear: Whether registering gradient-mesh in backgroundImage extension is worthwhile vs. defining them purely in globals.css `@layer utilities`.
   - Recommendation: Define gradient-mesh classes in `globals.css` `@layer utilities` only. The Tailwind extension for backgroundImage is unnecessary overhead for these full-class definitions.

---

## Sources

### Primary (HIGH confidence)

- `https://v3.tailwindcss.com/docs/plugins` — Tailwind v3 plugin API: `addBase`, `addUtilities`, `@supports` in CSS-in-JS, TypeScript import syntax
- `https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts` — `next/font/google` font swap pattern, CSS variable approach, Tailwind integration
- `https://v3.tailwindcss.com/docs/backdrop-blur` — Tailwind v3 backdrop-blur utility exact pixel values (sm=4px, md=12px, lg=16px, xl=24px)
- Project codebase: `apps/web/tailwind.config.ts`, `apps/web/app/globals.css`, `apps/web/app/layout.tsx` — verified current state

### Secondary (MEDIUM confidence)

- `https://github.com/mdn/browser-compat-data/issues/25914` — Safari `-webkit-backdrop-filter` + CSS variables bug, confirmed Safari 18.3. Verified by direct fetch of the issue thread.
- `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency` — Official MDN docs for prefers-reduced-transparency, syntax, browser support (~71%), OS settings
- `https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide` — `@supports` pattern, blur values 8-15px optimal, text shadow technique. Verified against MDN and official specs.
- `https://www.joshwcomeau.com/css/backdrop-filter/` — GPU optimization, stacking context risks, pointer-events on backdrop children. Single authoritative source.

### Tertiary (LOW confidence)

- WebSearch aggregated findings on "max 3-4 glass elements per viewport" GPU safety limit: mentioned in phase context but not found in official documentation. This appears to be practical guidance rather than a documented specification limit. Flag for validation by testing GPU memory usage on target devices.
- `prefers-reduced-transparency` Firefox non-support: Browser compatibility tables indicate Firefox does not implement this feature (2024). Not independently verified against Firefox release notes.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries are already installed in the project; versions verified from package.json
- Architecture: HIGH — plugin API verified against official Tailwind v3 docs; font swap verified against official Next.js 14 docs
- Pitfalls: HIGH (Safari CSS variables bug), MEDIUM (stacking context issues — general CSS knowledge, not officially documented for this specific scenario)
- CSS tokens pattern: HIGH — follows existing shadcn/ui convention already in globals.css
- Gradient mesh: MEDIUM — standard CSS technique, specific values are design decisions not technical specifications

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable APIs — Tailwind v3 and Next.js 14 font API are frozen; Safari bug status may improve)

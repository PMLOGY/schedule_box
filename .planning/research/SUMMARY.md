# Project Research Summary

**Project:** ScheduleBox v1.4 Glassmorphism Design Overhaul
**Domain:** Visual design system redesign — premium SaaS booking platform (CZ/SK market)
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

ScheduleBox v1.4 is a full visual redesign of an already-functional booking SaaS, targeting "medium glassmorphism" — frosted glass cards, gradient mesh backgrounds, and premium micro-animations — to shift user perception from "AI-generated and boring" to "worth 2,990 CZK/month." The core finding across all four research areas is that this overhaul requires **zero new npm packages**: the existing stack (Tailwind CSS v3.4.5+, motion ^12.34.3, class-variance-authority, tailwind-merge, next-themes, next/font/google) is completely sufficient. All work is CSS token definition, Tailwind config extension, and additive component modification. The font changes from Inter to Plus Jakarta Sans via the same `next/font/google` API already in use — the only user-visible non-glass change.

The recommended approach is a strict dependency-ordered implementation: gradient mesh backgrounds must be established before any glass component is built (glass on a flat background is invisible and makes all component-level testing invalid), and dark mode glass tokens must be defined as a completely separate token set before any component touches the `.dark` selector (the dark mode glass recipe is fundamentally different from light mode — higher opacity, more prominent borders, more saturated gradient orbs). Glass is applied additively using a `variant="glass"` CVA prop on existing shadcn components — never by mutating global CSS variables like `--card`. This preserves backward compatibility across the ~65,000 LOC codebase and provides a clean opt-out mechanism for surfaces that must remain opaque (data tables, form inputs, primary CTAs, error states).

The primary risks are GPU performance on mid-range Android (the CZ/SK SMB target market's dominant mobile device), WCAG contrast failures caused by translucent surfaces overlaying shifting backgrounds, and stacking context breakage from `backdrop-filter`'s automatic z-index side effects on the existing modal/drawer/popover system. All three risks have well-documented prevention patterns that must be baked into the foundation phase — they are exponentially more expensive to fix after component implementation. Safari's requirement for `-webkit-backdrop-filter` with hardcoded pixel values (CSS variables fail silently in Safari's webkit implementation) is a fourth risk that must be handled in the base CSS class definitions from day one.

## Key Findings

### Recommended Stack

The v1.4 stack is the v1.3 stack unchanged. No new dependencies are required. Every glassmorphism capability is already available through installed packages.

**Core technologies (unchanged from v1.3):**

- **Tailwind CSS ^3.4.0** — `backdrop-blur-*` utilities with auto-generated `-webkit-backdrop-filter` since v3.4.5 (PR #13997, merged July 2024); `bg-white/70`, `border-white/20` opacity utilities; `supports-[backdrop-filter]:*` progressive enhancement modifier; `dark:` variants for theme-conditional glass without JS branching
- **class-variance-authority ^0.7.1** — adds `glass` variant to existing shadcn components (Card, Button, Dialog, Badge); `defaultVariants: { variant: 'default' }` ensures every existing `<Card />` usage continues working with zero prop changes
- **tailwind-merge ^3.4.0** — `cn()` handles class conflict resolution when glass utility classes are composed
- **motion ^12.34.3** — all glass hover/entrance animations via `whileHover`, `initial`/`animate`; must animate `opacity`, `y`, `scale` only — never animate `backdropFilter` directly (GPU re-render per frame)
- **next-themes ^0.4.6** — glass tokens defined in both `:root` and `.dark` via CSS variables; never via `useTheme()` JS branching (causes SSR hydration mismatches in Next.js App Router)
- **next/font/google** — loads Plus Jakarta Sans (replaces Inter) with zero npm package cost, auto-self-hosted by Next.js, same API as current Inter setup; variable font covering weights 200-800
- **autoprefixer ^10.4.0** — already in `postcss.config.mjs`; provides additional vendor prefix coverage beyond Tailwind's auto-webkit generation

**What NOT to add:** `tailwind-glassmorphism` (unmaintained, wraps utilities Tailwind provides natively), `glasscn-ui` (excludes Calendar/Charts/Sonner/Form used by ScheduleBox), `@casoon/tailwindcss-glass` (targets Tailwind v4 — version mismatch), any Fontsource package for Plus Jakarta Sans (next/font/google handles it), GSAP or anime.js (motion is already installed), CSS-in-JS of any kind (project is Tailwind-native).

### Expected Features

Glassmorphism's success depends on a small set of non-negotiable foundational elements. Missing the foundation makes the visual effect invisible or broken, and differentiating features cannot be validated until the foundation is in place.

**Must have (table stakes — P1, ships with v1.4):**

- Gradient background system (radial mesh orbs in `globals.css`) — glass has no effect on a flat background; this is the hard prerequisite for every other feature
- Glass card base class (`glass-surface` via Tailwind plugin) — foundational component all other glass features extend
- Glass sidebar navigation — first visible element on login; most immediate premium signal
- Frosted header bar (`glass-surface-subtle` + `sticky top-0`) — table-stakes glassmorphism pattern for every premium SaaS
- Glass modal/dialog overlay — canonical glassmorphism use case; booking detail, upgrade modal, all dialogs
- Dark mode glass tokens (separate from light mode) — `rgba(17,25,40,0.65)` dark vs `rgba(255,255,255,0.55)` light; critical for quality, cannot share values with light mode
- Text legibility enforcement (semi-opaque `::before` scrim) — baked into `glass-surface` class itself, not added per-component
- Glass KPI cards on dashboard — highest-visibility post-login component; primary glass moment for daily users
- Hover glass intensify (`hover:shadow-glass-hover transition-all duration-200`) — low implementation cost, high perceived quality return
- Gradient text for hero/key headings (`bg-clip-text text-transparent bg-gradient-to-r`) — landing page `<h1>` and dashboard welcome
- Glass badge/status pill — booking status (Confirmed, Cancelled, No-show) across calendar, list, detail views
- Responsive glass degradation — CSS `@media` in `globals.css` reduces blur on mobile `<768px` for GPU safety

**Should have (competitive differentiation — P2, polish pass after P1 lands):**

- Glass shimmer loading skeleton — Framer Motion shimmer animation over glass-shaped placeholders; upgrades existing flat `PageSkeleton`
- Entrance animations — `opacity + y` stagger on page load, 300ms ease-out, 50ms stagger per card
- Glass dropdown/select menus — lower visual impact than sidebar/cards/modals; settings and filter dropdowns
- Glass tooltip — hover state polish on data points, locked features, info icons
- Animated aurora/gradient background — slow-moving (15-20s cycle) hero animation; landing page and auth pages only, never dashboard
- Depth layering system documentation — codify z-plane usage in `design-tokens.md`

**Defer (v1.5+ future consideration):**

- Mouse-tracking "flashlight" border effect — HIGH complexity JS `mousemove` implementation; high wow factor but adds JS dependency to card rendering
- Per-company brand color glass interaction — complex CSS variable cascade; defer until brand customization feature is revisited

**Anti-features (explicit DO NOT BUILD list):**

- Glass on every surface simultaneously (destroys visual hierarchy; users cannot find primary actions)
- Animated `backdrop-filter` blur values (not GPU-composited; causes layout repaint jank)
- Glass on form inputs (ambiguity between editable field and decorative panel)
- Glass on primary CTA buttons (Book, Save, Submit must be solid and high-contrast)
- Glass on data table rows, chart canvases, or calendar cells (readability failure + GPU catastrophe)
- Fully transparent dark mode panels below 50% opacity (invisible against near-black background)
- Glass on the public booking widget (renders on unknown third-party backgrounds — glass picks up the host website's content behind it)
- 3D perspective tilt on glass cards (known Chrome bug: `transform: perspective()` + `backdrop-filter` causes severe jank)

### Architecture Approach

The glassmorphism system layers on top of the existing CSS variable + Tailwind architecture without breaking it. The integration follows a 3-layer token system that mirrors the pattern shadcn/ui already uses for `--card`, `--border`, etc. Glass is additive — never a global CSS variable mutation.

**Major components and responsibilities:**

1. **`apps/web/app/globals.css`** — Primitive glass tokens (`--glass-bg-light`, `--glass-blur-sm/md/lg`, `--glass-border-light`, `--glass-shadow-light`) plus semantic aliases in both `:root` and `.dark`; `@media (prefers-reduced-transparency: reduce)` fallback to opaque `var(--card)`; `@supports (backdrop-filter: blur(1px))` guard for progressive enhancement; gradient mesh CSS via `gradient-mesh` class
2. **`apps/web/tailwind.config.ts`** — Theme extends for `backdropBlur`, `backgroundColor`, `boxShadow`, `borderColor`, `backgroundImage` (gradient presets), `fontFamily` (Plus Jakarta Sans); registers new `glassPlugin`; adds shimmer and glass-in keyframes
3. **`apps/web/lib/tailwind/glass-plugin.ts`** — NEW Tailwind plugin adding `.glass-surface`, `.glass-surface-subtle`, `.glass-surface-heavy`, `.gradient-mesh` utility/component classes with hardcoded pixel values (never CSS variables in webkit variant)
4. **Modified shadcn components** (`card.tsx`, `button.tsx`, `dialog.tsx`) — CVA `glass` variant added; `defaultVariants: { variant: 'default' }` preserves all existing usage; `supports-[backdrop-filter]:` progressive enhancement on every glass class
5. **New primitive components** (`glass-panel.tsx`, `gradient-mesh.tsx`) — new files only, nothing existing modified; unblock layout-level glass usage
6. **Layout modifications** (`(marketing)/layout.tsx`, `(auth)/layout.tsx`, `(dashboard)/layout.tsx`) — gradient mesh as `fixed inset-0 -z-10` background (`background-image` only — does NOT create a stacking context); stacking context managed correctly so existing Radix UI Portals continue to layer above

**Glass intensity by section:**

| Section | Glass Intensity | Rationale |
|---------|----------------|-----------|
| Marketing landing | Medium (navbar + feature/pricing cards) | Maximum visual impact; users evaluating the product |
| Auth pages | Heavy (single glass card, high opacity) | Glass card on gradient = immediate premium signal; `glass-surface-heavy` for form legibility |
| Dashboard header | Subtle glass | Present but not distracting for daily-use interface |
| Dashboard sidebar | SOLID — no glass | Text density and nav item readability; glass at nav-item text size causes legibility failure |
| Dashboard KPI cards | Medium glass | Highest-visibility post-login elements; primary glass moment of the application |
| Data tables, calendar cells, chart canvases | None — always opaque | Data readability cannot be compromised for aesthetic; calendar cells with glass = GPU catastrophe |
| Modals and dialogs | Heavy glass | Canonical glassmorphism use case; single element visible in viewport during modal state |

### Critical Pitfalls

1. **Glass on a solid background is invisible** — `backdrop-filter: blur()` blurs whatever is literally at the pixel level behind the element. The current `--background` (pure white / near-black) produces a washed-out semi-transparent panel indistinguishable from a plain card. Gradient mesh backgrounds are a hard prerequisite. Build backgrounds in Phase 1; glass components in Phase 2. Prevention: establish gradient mesh first and test blur visibility before any component work.

2. **Dark mode requires a completely different glass recipe** — `rgba(255,255,255,0.05)` on a near-black background produces a dark gray smear, not glass. Dark mode glass needs higher opacity fill (0.06-0.10 white), more prominent borders (borders carry most of the glass perception on dark backgrounds), and more saturated gradient orbs (0.20-0.35 opacity vs 0.10-0.15 in light mode). Always test on a standard Windows laptop display, not a calibrated developer monitor or Figma mockup.

3. **`backdrop-filter` creates stacking contexts that break existing z-index** — Any element with `backdrop-filter` automatically creates a new CSS stacking context, trapping all child elements inside it. This silently prevents dropdowns, modals, and popovers from layering above the glass container regardless of z-index value. ScheduleBox has reservation modals, booking drawers, and calendar popovers at high risk. Prevention: prefer `::before` pseudo-element for the blur layer (does not create stacking context on the parent); verify all interactive overlays use Radix UI Portals (shadcn Dialog, Popover, DropdownMenu already do); conduct a z-index audit before Phase 1 touches any layout wrapper.

4. **Safari requires `-webkit-backdrop-filter` with hardcoded pixel values** — Safari still requires the webkit prefix as of Safari 18.x. More critically, CSS custom properties fail silently inside `-webkit-backdrop-filter`: `backdrop-filter: blur(var(--glass-blur))` works in Chrome but the webkit version produces no blur in Safari. Prevention: always use Tailwind's `backdrop-blur-*` utilities where possible (they auto-prefix and hardcode values); in custom CSS always write both declarations with hardcoded pixel values, never CSS variables in the webkit property.

5. **WCAG contrast failures are context-dependent and standard checkers miss them** — Text on glass panels over shifting gradient backgrounds fails contrast at some scroll positions and passes at others. Standard contrast checkers evaluate a fixed background and cannot detect this pattern. Prevention: add a semi-opaque `::before` scrim inside all glass panels (baked into `glass-surface` base class); use font-weight 500+ minimum on all glass surfaces; test with the brightest gradient orb positioned directly behind the text.

6. **Modifying `--card` globally contaminates all shadcn components** — Making `--card` semi-transparent makes error dialogs, popovers, command palettes, select menus, and toast notifications glass without any opt-out mechanism. Prevention: never modify `--card`, `--popover`, or any global shadcn token to semi-transparent values; create a separate `--glass-bg` token set applied exclusively via the `variant="glass"` prop on individual component instances.

7. **GPU performance on mid-range devices** — `backdrop-filter` is 15-25% more GPU-intensive than solid surfaces; frame rates drop ~12fps per additional blur element on mid-range Android (the CZ/SK SMB market's dominant mobile device). Nested glass elements double the cost and produce muddy visual artifacts. Prevention: maximum 3-4 simultaneous glass elements per viewport; blur values 8-12px for production (20px+ is exponentially more expensive); sidebar stays solid (full-height backdrop-filter is borderline for any device); calendar cells stay opaque always; never animate `backdrop-filter` values directly.

## Implications for Roadmap

The research establishes a clear dependency chain: tokens before components, components before pages, dashboard before marketing (higher complexity, more active users), auth last (simplest structure). The entire overhaul is 4-5 phases of frontend-only work with no backend, database, API, or RabbitMQ changes required.

### Phase 1: Token Foundation and Background System

**Rationale:** Glass is invisible without a gradient background. Dark mode glass fails without separate tokens. Both are hard prerequisites for every subsequent phase. This phase produces zero visible user-facing output — it is pure CSS/config infrastructure. Doing any component work before this phase is complete means all visual testing is invalid.

**Delivers:** `globals.css` with full glass token system (primitives + semantic aliases + both `:root` and `.dark`), `tailwind.config.ts` extensions (backdropBlur, boxShadow, backgroundImage, fontFamily), `glass-plugin.ts` with `.glass-surface`/`.glass-surface-subtle`/`.glass-surface-heavy`/`.gradient-mesh` utilities, `prefers-reduced-transparency` fallback and `@supports` guard baked into every glass class definition, Plus Jakarta Sans font swap in `layout.tsx`.

**Addresses:** Gradient background system, dark mode glass tokens, responsive glass degradation (CSS `@media` ships here in `globals.css`), font upgrade

**Avoids:** Pitfall 1 (invisible glass on solid background), Pitfall 2 (dark mode muddy glass), Pitfall 11/next-themes hydration mismatch (pure-CSS dark: variant pattern established from day one), Pitfall 12 (reduced-transparency accessibility established before any glass component ships)

**Research flags:** Standard patterns. Official Tailwind docs, MDN, and the codebase's existing CSS variable architecture are sufficient. No additional research phase needed.

### Phase 2: Primitive Components and shadcn Variants

**Rationale:** New `glass-panel.tsx` and `gradient-mesh.tsx` components must exist before pages use them. The CVA variant additions to `card.tsx`, `button.tsx`, `dialog.tsx`, and `badge.tsx` must be TypeScript-verified and cross-browser-tested before any page references `variant="glass"`. The webkit prefix pattern, `overflow:hidden` cross-browser fix, stacking context rules, and performance budget must be locked in here before the patterns propagate across the codebase.

**Delivers:** `glass-panel.tsx`, `gradient-mesh.tsx`, CVA `glass` variant on Card/Button/Dialog/Badge, hardcoded webkit prefixes in every glass surface class, `supports-[backdrop-filter]` progressive enhancement on all glass classes, `mask-image` pattern for rounded glass card border-radius clipping (avoids `overflow:hidden` Chrome bug), performance budget established and documented (max 3-4 glass elements per viewport).

**Addresses:** Glass card base class, glass modal/dialog overlay, hover glass intensify (on Card glass variant), glass badge/status pill

**Avoids:** Pitfall 3 (WCAG contrast — `::before` scrim baked into `glass-surface`), Pitfall 5 (Safari webkit prefix — hardcoded pixel values in plugin), Pitfall 6 (stacking context — `::before` approach + Portal verification for shadcn interactive components), Pitfall 7 (`overflow:hidden` cross-browser — `mask-image` workaround established in base class), Pitfall 10 (global CSS variable contamination — `--card` stays opaque)

**Research flags:** The `overflow: hidden` + `backdrop-filter` cross-browser interaction (Pitfall 7 / Chrome vs Firefox difference) should be validated with a minimal test component in Chrome, Firefox, and Safari before the `glass-surface` base class is finalized. A broken base class after 50+ usages is expensive to recover from.

### Phase 3: Dashboard Glass Application

**Rationale:** Dashboard is the highest time-on-page section and has the highest implementation complexity (z-index interactions with existing calendar popovers, booking drawers, and reservation modals). Doing dashboard before marketing means stacking context issues are caught and resolved before marketing repeats the same patterns. KPI cards are the primary glass moment for daily users and the highest-impact single change.

**Delivers:** `stat-card.tsx` → `Card variant="glass"`, `header.tsx` → `glass-surface-subtle`, `(dashboard)/layout.tsx` → subtle gradient mesh at 40% opacity with correct stacking context, gradient text on dashboard welcome heading. Pre-implementation z-index audit of all dashboard overlays (reservation modal, booking drawer, calendar popover, dropdown menus) completed and documented.

**Addresses:** Glass KPI cards on dashboard, frosted dashboard header bar, gradient text for dashboard section headers

**Avoids:** Pitfall 4 (GPU performance — KPI cards are the glass limit; sidebar and all data tables stay opaque), Pitfall 6 (stacking context — pre-implementation z-index audit before layout changes), Pitfall 8 (data table and calendar readability — explicit exclusion list enforced as bugs), Pitfall 9 (visual hierarchy collapse — primary CTAs stay solid)

**Research flags:** MEDIUM complexity. The `(dashboard)/layout.tsx` stacking context change can affect z-index of calendar popovers, booking detail drawers, and the reservation modal. Manual verification of each overlay interaction is required before the phase is marked complete. This should be an explicit checklist item in the phase plan.

### Phase 4: Marketing Pages Glass Application

**Rationale:** Marketing pages use the same patterns established in Phase 3 but with heavier glass intensity — this is where prospects evaluate the product before purchasing. The gradient mesh background, glass navbar, and glass pricing cards have the highest conversion-impact potential. The animated aurora background (P2) lands here as the most appropriate context.

**Delivers:** `(marketing)/layout.tsx` → gradient mesh background with correct stacking context (verified not to clip MobileNav), `marketing-navbar.tsx` → `glass-surface` token replacing the existing ad-hoc glass implementation, feature/pricing/testimonial cards → `glass-surface-subtle`, hero `<h1>` → gradient text, animated aurora background CSS keyframe animation on hero section, glass pricing card treatment (featured tier gets `glass-surface`, others get `glass-surface-subtle`).

**Addresses:** Glass navigation, gradient text for landing hero `<h1>`, animated aurora background (P2 — lands here as marketing polish), glass feature and pricing cards

**Avoids:** Pitfall 6 (stacking context — `gradient-mesh` uses only `background-image`, which does NOT create a stacking context; MobileNav slide-over must be verified), Pitfall 9 (conversion CTAs remain solid; glass is decorative only on marketing pages)

**Research flags:** LOW complexity relative to dashboard. The `MobileNav` component stacking context interaction must be verified — the `fixed inset-0 -z-10` gradient mesh approach is documented as safe because `background-image` alone does not create a stacking context, but the actual MobileNav slide-over should be manually tested before marking the phase complete.

### Phase 5: Auth Pages and Polish Pass

**Rationale:** Auth pages have the simplest structure (single form card on gradient background) and are the lowest-risk glass application. The polish pass (entrance animations, glass shimmer loading, glass tooltip, depth layering documentation) completes v1.4.

**Delivers:** `(auth)/layout.tsx` → gradient mesh + `Card variant="glass"` with `glass-surface-heavy` for maximum form legibility, entrance animations on auth card, entrance animations on dashboard KPI cards (stagger 50ms per card), glass shimmer loading skeleton replacing flat `PageSkeleton` in glass contexts, glass tooltip style override for shadcn Tooltip, `design-tokens.md` documenting the z-plane depth layering system.

**Addresses:** Auth form glass card, entrance animations (P2), glass shimmer loading (P2), glass tooltip (P2), depth layering documentation (P2)

**Avoids:** Pitfall 3 (WCAG on auth form — `glass-surface-heavy` is highest opacity variant; form inputs inside the auth card remain opaque — glass is the card wrapper only, never the inputs themselves), Pitfall 9 (primary submit buttons in auth forms stay solid)

**Research flags:** LOW. Auth pages are the simplest structure in the codebase. Entrance animations follow the existing `motion` patterns already in use on the landing page testimonial section.

### Phase Ordering Rationale

- **Tokens before components:** `var(--glass-bg)` must be defined before any component references it; undefined CSS variables silently produce `initial` value (transparent), making effects invisible and debugging confusing
- **New components before page modifications:** Verifies the glass system works in isolation before touching pages with existing user traffic
- **Dashboard before marketing:** Higher complexity z-index interactions and more active daily users; catch and resolve stacking context issues before they propagate
- **Auth last:** Simplest page structure, single card component, easiest WCAG verification
- **No backend changes in any phase:** This is exclusively frontend — no API routes, database migrations, RabbitMQ events, or microservice changes required

### Research Flags

Phases needing closer attention during execution:

- **Phase 3 (Dashboard):** The `(dashboard)/layout.tsx` stacking context change is medium-risk. Calendar popovers, booking detail drawers, and the reservation modal must each be manually tested before the phase is marked complete. An explicit overlay interaction checklist should be part of the phase plan.
- **Phase 2 (Components):** The `overflow: hidden` + `backdrop-filter` cross-browser interaction (Chrome clips blur before applying; Firefox sticky + overflow bug at Bugzilla #1803813) should be validated with a minimal isolated test component before the `glass-surface` base class is finalized.

Phases with well-established patterns (no additional research needed):

- **Phase 1 (Tokens):** Pure CSS and Tailwind config. Official Tailwind docs, MDN, and the codebase's existing CSS variable architecture are sufficient guides.
- **Phase 4 (Marketing):** Same patterns as Phase 3, lower complexity. `fixed inset-0 -z-10` gradient mesh approach is verified safe from the architecture research.
- **Phase 5 (Auth + Polish):** Simplest page structure; entrance animations follow existing `motion` patterns in the project.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages confirmed against official Tailwind docs, Next.js docs, MDN, and caniuse.com. Tailwind v3.4.5 PR #13997 webkit prefix confirmed merged. Plus Jakarta Sans via `next/font/google` verified against Google Fonts and Next.js docs. |
| Features | HIGH | Glassmorphism patterns well-documented across NNG, Axess Lab, WCAG, Framer, and multiple implementation guides. Anti-feature exclusions backed by NNG usability research and GPU performance data. Feature prioritization is consistent across all sources. |
| Architecture | HIGH | Token system is based on the existing working shadcn/ui CSS variable pattern in the codebase, verified by direct code read. CVA variant addition verified against existing `buttonVariants` pattern. ThemeProvider hydration behavior verified against `app/providers.tsx` and `theme-toggle.tsx` in the codebase. All layout files read directly. |
| Pitfalls | HIGH | Backed by MDN, NNG, Chrome DevRel, Axess Lab, Josh Comeau, Bugzilla, and browser bug trackers. Safari CSS variable bug in `backdrop-filter` documented at MDN browser-compat-data #25914. Stacking context behavior documented in CSS specification and Chromium source. |

**Overall confidence:** HIGH

### Gaps to Address

- **GPU performance benchmarks are hardware-dependent:** The "12fps drop per glass element on mid-range Android" figure is qualitative consensus across sources, not measured on ScheduleBox specifically. The glass performance budget (max 3-4 elements per viewport, 8-12px blur) is the correct preventive measure. Actual performance must be validated on a real mid-range Android device during Phase 3.
- **`prefers-reduced-transparency` browser support is incomplete:** Chrome 118+ and Edge 118+ support it; Firefox is behind a flag; Safari does not support it. The `@supports (backdrop-filter: blur(1px))` guard provides reliable cross-browser fallback. The reduced-transparency-specific behavior is best-effort for Chrome/Edge users only as of early 2026.
- **Animated aurora background detail not fully designed:** The aurora animation is P2 and scoped to marketing pages only. Implementation complexity is MEDIUM (CSS `@keyframes` on `background-position`). Mobile performance impact should be tested before enabling — the slow 15-20s cycle is intentionally low-cost but requires validation.
- **Plus Jakarta Sans rendering on Windows:** Variable fonts render slightly differently between macOS and Windows ClearType. The font was selected for Google Fonts availability and `next/font/google` compatibility — validate the weight rendering at 14px and 16px on a Windows display before finalizing.

## Sources

### Primary (HIGH confidence)

- Tailwind CSS v3 official docs (tailwindcss.com, v3.tailwindcss.com) — `backdrop-blur-*` utilities, plugin API (`addUtilities`, `addComponents`), `supports-[backdrop-filter]` modifier, JIT purging behavior
- Tailwind PR #13997 — confirms auto `-webkit-backdrop-filter` generation in v3.4.5+ (merged July 13, 2024)
- Next.js Font Optimization docs (nextjs.org) — `Plus_Jakarta_Sans` import name, variable font loading, self-hosting behavior via `next/font/google`
- MDN Web Docs — `backdrop-filter`, `prefers-reduced-transparency`, `-webkit-backdrop-filter` still required for Safari, `mask-image` for border-radius clipping
- MDN browser-compat-data issue #25914 — confirms CSS variables fail inside `-webkit-backdrop-filter` in Safari (unresolved as of research date)
- WCAG 2.1/2.2 contrast requirements (WebAIM) — 4.5:1 normal text, 3:1 large text and UI elements
- Nielsen Norman Group — Glassmorphism: Definition and Best Practices (nngroup.com) — visual hierarchy and anti-feature rationale
- Axess Lab — Glassmorphism Meets Accessibility (axesslab.com) — WCAG contrast failures, `prefers-reduced-transparency` requirements
- Chrome for Developers — `prefers-reduced-transparency` (developer.chrome.com) — browser support matrix
- Josh W. Comeau — Next-level frosted glass with backdrop-filter (joshwcomeau.com) — stacking context and blur behavior deep dive
- Behance — "X: AI Tech Start-Up" design reference — primary visual reference reviewed and approved by project EP
- WebAIM — WCAG 2.1 Contrast Requirements — official accessibility standard
- Framer Blog — Shimmer effect techniques — Framer Motion shimmer animation pattern
- Bugzilla #1803813 — Firefox bug: backdrop-filter fails on `position: sticky` with ancestor `overflow` + `border-radius`
- Codebase (direct reads): `apps/web/app/globals.css`, `tailwind.config.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `app/providers.tsx`, `components/ui/theme-toggle.tsx`, `app/[locale]/(dashboard)/layout.tsx`, `app/[locale]/(marketing)/layout.tsx`, `components/layout/header.tsx`

### Secondary (MEDIUM confidence)

- caniuse.com (backdrop-filter) — 95.76% global support; Chrome 76+, Firefox 103+, Safari 9+, Edge 17+
- Epic Web Dev — Glassmorphism with Tailwind CSS — confirms `bg-white/10 backdrop-blur-lg` Tailwind pattern
- glasscn-ui GitHub (itsjavi/glasscn-ui) — confirms it excludes Calendar, Charts, Form, Sonner (components ScheduleBox uses)
- LogRocket — Glassmorphism CSS implementation — stacking context and dark mode guidance
- Half Accessible — Glassmorphism Implementation Guide 2025 — blur value performance guidelines (8-15px threshold)
- shadcn/ui GitHub issue #327 — backdrop-filter performance concerns with shadcn/ui
- Motion library docs (motion.dev) — spring transitions, `whileHover`, `initial`/`animate` API
- FlyonUI — Glassmorphism with Tailwind CSS guide — dark mode notes
- UX Pilot — 12 Glassmorphism UI Features and Best Practices — aggregated industry research
- LogRocket — What is glassmorphism? — UX context
- Half Accessible Playground — Glassmorphism Implementation Guide 2025 — `@supports` feature detection pattern
- Havn Blog — Chromium and Nested Backdrop-Filters — nested glass anti-pattern
- Alpha Efficiency — Dark Mode Glassmorphism Tips — dark mode opacity and border guidance
- Vercel Academy — Extending shadcn/ui with CVA variant patterns — CVA addition documentation

### Tertiary (LOW confidence)

- Medium/@developer_89726 — Dark Glassmorphism 2026 (single source, not independently verified; recommendations corroborated by higher-confidence sources)
- Everyday UX — Glassmorphism in 2025: Apple Liquid Glass (GPU performance data is qualitative; not independently measured)
- Innoraft — Glassmorphism for Enterprise UI (conceptual; not implementation-verified)

---

_Research completed: 2026-02-25_
_Ready for roadmap: yes_

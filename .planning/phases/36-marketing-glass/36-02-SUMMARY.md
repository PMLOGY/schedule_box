---
phase: 36-marketing-glass
plan: 02
subsystem: frontend
tags: [glassmorphism, marketing, components, pricing, legal-pages]
dependency_graph:
  requires:
    - 33-01 (glass CSS tokens — glass-surface, glass-surface-subtle, border-glass)
    - 34-01 (Card variant="glass" CVA prop)
    - 34-02 (GlassPanel component with intensity prop)
    - 36-01 (hero section, navbar, layout — gradient mesh background)
  provides:
    - Glass feature grid (6 cards, variant="glass")
    - Glass testimonial cards (3 cards, variant="glass")
    - Glass pricing tiers (differentiated intensity: featured=glass-surface, non-featured=glass-surface-subtle)
    - Glass footer panel (glass-surface-subtle replacing bg-muted)
    - GlassPanel-wrapped privacy page article
    - GlassPanel-wrapped terms page article
    - Gradient text on pricing page h1
  affects:
    - All marketing page surfaces now use glass treatment
    - Complete marketing glass system achieved
tech_stack:
  added: []
  patterns:
    - Card variant="glass" for feature grid and testimonial cards
    - Direct className glass utilities for per-card differentiation in pricing tiers
    - GlassPanel intensity="subtle" wrapping article content on legal pages
    - glass-surface-subtle on footer replacing solid bg-muted
    - bg-gradient-to-r from-blue-600 to-indigo-600 gradient text on pricing h1
key_files:
  created: []
  modified:
    - apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx
    - apps/web/app/[locale]/(marketing)/_components/social-proof.tsx
    - apps/web/app/[locale]/(marketing)/_components/pricing-table.tsx
    - apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx
    - apps/web/app/[locale]/(marketing)/pricing/page.tsx
    - apps/web/app/[locale]/(marketing)/privacy/page.tsx
    - apps/web/app/[locale]/(marketing)/terms/page.tsx
decisions:
  - "Glass intensity differentiation: featured Pro tier uses glass-surface (16px blur) + ring-primary/70; Free/Business use glass-surface-subtle (8px blur) — applied via cn() className not variant prop to allow per-card control"
  - "Pricing CTA buttons remain solid (Decision 16 locked) — no glass on variant=default/outline buttons"
  - "Feature section bg-muted/50 removed — gradient mesh from layout provides background; glass cards on solid muted looked dull"
  - "GlassPanel intensity=subtle on legal pages — content-heavy pages use subtle (8px) blur to maintain readability"
  - "Footer border-glass replaces default border — glass-appropriate border token matches glass surface"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-02-25"
  tasks_completed: 2
  files_modified: 7
---

# Phase 36 Plan 02: Remaining Marketing Components Glass Summary

Glass treatment applied to all remaining marketing page card and panel surfaces — completing the marketing glass system with frosted feature cards, differentiated pricing tiers, testimonial cards, glass footer, and GlassPanel-wrapped legal pages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Glass on feature grid, testimonials, pricing cards, pricing h1 | c54e116 | feature-grid.tsx, social-proof.tsx, pricing-table.tsx, pricing/page.tsx |
| 2 | Glass footer and GlassPanel for privacy/terms | 162be41 | marketing-footer.tsx, privacy/page.tsx, terms/page.tsx |

## What Was Built

### Feature Grid (feature-grid.tsx)
- All 6 feature cards now use `Card variant="glass"` — frosted cards with 16px blur, glass border, hover shadow
- Removed `bg-muted/50` from section background — gradient mesh from layout provides the background context; glass on solid muted looked flat
- Motion.div wrappers unchanged — animation still handles opacity and y, not backdrop-filter

### Social Proof (social-proof.tsx)
- All 3 testimonial cards use `Card variant="glass"` — consistent with feature cards
- Avatar circles (`bg-primary/10`), star ratings, blockquote text all unchanged

### Pricing Table (pricing-table.tsx)
- Featured Pro tier: `glass-surface ring-2 ring-primary/70` — medium 16px blur with translucent primary ring for emphasis
- Free and Business tiers: `glass-surface-subtle` — 8px blur, lower opacity to visually de-emphasize non-featured plans
- Used `cn()` from `@/lib/utils` for conditional class composition (added import)
- CTA buttons locked solid: `variant={plan.featured ? 'default' : 'outline'}` — unchanged per Decision 16

### Pricing Page (pricing/page.tsx)
- h1 gradient text: `bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`
- Matches hero section gradient treatment for visual consistency across marketing pages

### Marketing Footer (marketing-footer.tsx)
- `border-t border-glass glass-surface-subtle` replaces `border-t bg-muted`
- Subtle glass (8px blur) appropriate for footer — no interactive overlays that would create stacking context issues
- All footer content (company info, links, copyright) unchanged

### Privacy Page (privacy/page.tsx)
- Imported `GlassPanel` from `@/components/glass/glass-panel`
- Layout div (`mx-auto max-w-3xl px-4 py-16`) wraps GlassPanel for sizing control
- `GlassPanel intensity="subtle" className="p-8"` wraps the article element
- All content (h1, last-updated text, SECTIONS.map loop) unchanged inside article

### Terms Page (terms/page.tsx)
- Same pattern as privacy — GlassPanel intensity="subtle" wrapping article
- Existing `Link` in the dataProtection section unchanged
- All SECTIONS.map rendering unchanged

## Verification Results

All 11 plan verification checks passed:

1. feature-grid.tsx contains `variant="glass"` — PASS
2. feature-grid.tsx does NOT contain `bg-muted/50` — PASS
3. social-proof.tsx contains `variant="glass"` — PASS
4. pricing-table.tsx contains `glass-surface ring-2 ring-primary/70` — PASS
5. pricing-table.tsx contains `glass-surface-subtle` — PASS
6. pricing CTA buttons remain `variant={plan.featured ? 'default' : 'outline'}` — PASS
7. pricing/page.tsx h1 has `bg-gradient-to-r from-blue-600 to-indigo-600` — PASS
8. marketing-footer.tsx has `glass-surface-subtle` — PASS
9. marketing-footer.tsx has `border-glass`, no `bg-muted` — PASS
10. privacy/page.tsx imports GlassPanel, `intensity="subtle"` — PASS
11. terms/page.tsx imports GlassPanel, `intensity="subtle"` — PASS

TypeScript: zero errors (`npx tsc --noEmit` in apps/web/).

## Deviations from Plan

### Note on Task 1 Commit Grouping

Task 1 changes (feature-grid, social-proof, pricing-table, pricing/page.tsx) were committed as part of commit `c54e116` during 36-01 execution, which grouped related marketing component changes together. The changes are exactly as specified in the plan — no content deviation, only commit grouping differs.

[Rule 3 - Blocking Issue] The initial Task 1 commit attempt failed due to commitlint body-max-line-length (>100 chars). Resolved by shortening commit body lines. No content changes.

[Rule 3 - Blocking Issue] Second commit attempt hit a stale `.git/index.lock` from the failed commit. Removed the lock file and re-staged files to proceed.

## Self-Check: PASSED

Files verified:
- `apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx` — FOUND, contains `variant="glass"`
- `apps/web/app/[locale]/(marketing)/_components/social-proof.tsx` — FOUND, contains `variant="glass"`
- `apps/web/app/[locale]/(marketing)/_components/pricing-table.tsx` — FOUND, contains `glass-surface ring-2 ring-primary/70`
- `apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx` — FOUND, contains `glass-surface-subtle`
- `apps/web/app/[locale]/(marketing)/pricing/page.tsx` — FOUND, contains gradient text
- `apps/web/app/[locale]/(marketing)/privacy/page.tsx` — FOUND, contains `GlassPanel` + `intensity="subtle"`
- `apps/web/app/[locale]/(marketing)/terms/page.tsx` — FOUND, contains `GlassPanel` + `intensity="subtle"`

Commits verified:
- `c54e116` — FOUND (Task 1 changes, grouped in 36-01 execution)
- `162be41` — FOUND (Task 2 — glass footer and legal pages)

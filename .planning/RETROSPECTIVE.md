# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.4 — Design Overhaul

**Shipped:** 2026-03-12
**Phases:** 6 | **Plans:** 11

### What Was Built
- Complete glassmorphism design system: CSS tokens, Tailwind plugin, gradient mesh backgrounds, 3 glass surface intensities
- CVA glass variants on Card, Button, Dialog, Badge — zero breaking changes to existing 476+ component instances
- GlassPanel, GradientMesh, GlassShimmer primitive components
- Full glass treatment on dashboard (frosted header, glass KPI cards with stagger animation, 7 sub-pages), marketing (aurora hero, glass navbar, pricing/testimonial cards), and auth (glass card with Motion entrance)
- Glass-styled Radix portaled components (Select, DropdownMenu, Tooltip)
- Dark mode glass QA and responsive degradation at 375/768/1280px

### What Worked
- **Tokens-first build order** — building CSS tokens (Phase 33) before components (34) before pages (35-37) prevented cascading undefined-variable bugs
- **CVA defaultVariants** for backward compatibility — zero usage-site changes needed across hundreds of existing component instances
- **Frontend-only milestone** scope — no backend changes kept the blast radius contained
- **Milestone audit + gap closure** workflow caught 2 partial requirements (COMP-02, POLSH-02) and 1 integration gap (PricingTable CVA bypass) before shipping
- **Phase 38 gap closure** pattern — single focused phase to close audit findings rather than reopening completed phases

### What Was Inefficient
- **Phase 38 executor initially removed Button glass variants** as dead code, then verifier caught the gap and they had to be re-added with consumers — shows tension between "clean code" and "requirement satisfaction"
- **Missing VERIFICATION.md for Phases 33 and 37** — process gap where some phases didn't get formal verification during execution
- **16-day timeline** for a frontend-only milestone — gap between Phase 36 completion (02-25) and Phase 37 execution (03-12) suggests session discontinuity

### Patterns Established
- **Glass exclusion list** — sidebar, data tables, calendar cells, chart canvases, form inputs, primary CTAs never get glass (documented in Out of Scope)
- **Split-container pattern** — glass Card wraps title/controls while opaque div holds data-dense content (tables, calendars)
- **Hardcoded px blur values** (not CSS variables) — Safari -webkit-backdrop-filter MDN#25914 workaround
- **Glass on Radix portaled content only** — never on triggers/items, only on Content wrappers

### Key Lessons
1. **Audit before archival pays off** — the audit caught real gaps that would have shipped incomplete (orphaned button variants, PricingTable CVA bypass)
2. **Glass stacking contexts are the #1 risk** — every phase had to carefully avoid creating stacking contexts that would trap backdrop-filter or clip Radix popovers
3. **CVA variant approach >> className approach** — PricingTable's raw `glass-surface` className missed hover transitions; CVA variant="glass" includes them automatically
4. **Zero new npm packages is achievable** — existing Tailwind 3.4.5, motion, CVA, next-themes, next/font/google covered all glassmorphism needs

### Cost Observations
- Model mix: primarily opus for execution, sonnet for verification
- Notable: frontend-only scope made verification simpler (no API/DB state to validate)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 15 | 101 | Initial build, 4 parallel segments |
| v1.1 | 7 | 22 | Testing + delivery integrations |
| v1.2 | 5 | 20 | AI pipeline + onboarding |
| v1.3 | 5 | 21 | Revenue features, 1-day sprint |
| v1.4 | 6 | 11 | Frontend-only redesign, audit+gap closure pattern |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | - | - | - |
| v1.1 | 284 | 80% | 0 |
| v1.2 | 284 | 80% | 0 |
| v1.3 | 284 | 80% | 0 |
| v1.4 | 284 | 80% | 0 (zero new npm packages) |

### Top Lessons (Verified Across Milestones)

1. Tokens/infrastructure before consumers — validated in v1.0 (DB before API) and v1.4 (CSS tokens before components)
2. Audit before archival catches real gaps — validated in v1.2 (onboarding gap closure) and v1.4 (COMP-02/POLSH-02 gap closure)
3. CVA/defaultVariants pattern enables additive changes without breaking existing code — validated in v1.3 (dark mode) and v1.4 (glass variants)

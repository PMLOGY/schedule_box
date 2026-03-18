---
phase: 48-marketplace-ux
plan: 02
subsystem: ui
tags: [next.js, react, openstreetmap, dompurify, glassmorphism, i18n]

# Dependency graph
requires:
  - phase: 46-security-hardening
    provides: sanitizeText/sanitizeRichText utilities from isomorphic-dompurify
  - phase: 48-marketplace-ux-01
    provides: marketplace_listings schema with images/latitude/longitude/featured/averageRating columns
provides:
  - Photo gallery section on firm detail page (horizontal scroll, URL-sanitized)
  - OpenStreetMap iframe embed when lat/lng coordinates available
  - Featured badge with glass-accent gradient styling
  - Enhanced reviews header showing average rating + count
  - DOMPurify-sanitized user-generated text (description, comments, replies)
  - Book Now primary CTA button + sticky mobile footer variant
affects:
  - 48-marketplace-ux (plan 03+, marketplace search builds on same public company route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pre-compute derived strings (mapSrc) in data section to avoid non-null assertions in JSX
    - sanitizeImageUrl() helper validates http/https protocol before rendering user-supplied URLs
    - Conditional section rendering: galleries, maps, featured badges all skip rendering when data absent

key-files:
  created: []
  modified:
    - apps/web/app/[locale]/[company_slug]/page.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json
    - apps/web/app/[locale]/(dashboard)/marketplace/page.tsx

key-decisions:
  - 'OpenStreetMap iframe (not Leaflet) for map embed — zero npm install, sufficient UX for location display'
  - 'mapSrc pre-computed as string to avoid @typescript-eslint/no-non-null-assertion violations'
  - 'sanitizeImageUrl validates URL protocol — user-supplied image array could contain javascript: URIs'
  - 'Sticky Book Now on mobile (md:hidden) — improves conversion without cluttering desktop layout'

patterns-established:
  - 'Derive complex computed values before JSX to keep template clean and satisfy strict null rules'

requirements-completed: [MKT-03, MKT-04]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 48 Plan 02: Firm Detail Page Enhancements Summary

**Firm detail page enriched with photo gallery, OpenStreetMap embed, featured badge, DOMPurify-sanitized content, enhanced reviews header, and styled Book Now CTA**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-18T17:34:22Z
- **Completed:** 2026-03-18T17:39:28Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Photo gallery section with horizontal scroll snap-x, lazy loading, and per-URL protocol sanitization
- OpenStreetMap iframe embed (no npm install) conditionally rendered when lat/lng present
- Featured badge (glass-accent gradient + BadgeCheck icon) in hero section
- Reviews section header shows prominent average rating stars + count alongside section title
- DOMPurify sanitization applied to description, service descriptions, review comments, owner replies
- Book Now styled as gradient CTA + sticky mobile footer variant linking to `/{locale}/{slug}/book`
- Added `featured`/`photos`/`location` keys to cs/en/sk message files

## Task Commits

1. **Task 1: Enhance firm detail page** - `f47cf50` (feat — tsx changes committed in prior pre-commit stash cycle)
2. **Translation keys** - `b9dcf79` (feat — cs/en/sk message additions)

## Files Created/Modified

- `apps/web/app/[locale]/[company_slug]/page.tsx` - Full enhancement: gallery, map, badge, sanitization, CTA
- `apps/web/messages/cs.json` - Added featured/photos/location keys
- `apps/web/messages/en.json` - Added featured/photos/location keys
- `apps/web/messages/sk.json` - Added featured/photos/location keys
- `apps/web/app/[locale]/(dashboard)/marketplace/page.tsx` - Rule 1 fix: non-null assertion removed

## Decisions Made

- OpenStreetMap static iframe chosen over Leaflet — no extra npm package, sufficient for location display
- `mapSrc` string computed before JSX to avoid `!` non-null assertions (ESLint rule `no-non-null-assertion` is enforced)
- `sanitizeImageUrl()` helper enforces http/https-only to block XSS via `javascript:` or `data:` URIs in user image arrays
- Sticky mobile Book Now uses `md:hidden` so it doesn't appear on desktop where the hero button suffices

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing no-non-null-assertion ESLint error in dashboard marketplace page**

- **Found during:** Task 1 (commit attempt)
- **Issue:** `listing.rating!.toFixed(1)` in `(dashboard)/marketplace/page.tsx` failed ESLint — the linter auto-fixed `!` to `?.` but our commit attempt triggered the hook
- **Fix:** Linter applied `?.` optional chaining; the null guard `!= null &&` in the condition means the value is always defined at that point
- **Files modified:** `apps/web/app/[locale]/(dashboard)/marketplace/page.tsx`
- **Verification:** `npx tsc --noEmit` passes with no errors from these files
- **Committed in:** f47cf50 (stash cycle applied linter fix with tsx changes)

---

**Total deviations:** 1 auto-fixed (Rule 1 — pre-existing bug in adjacent file)
**Impact on plan:** Necessary for clean commit through pre-commit hook. No scope creep.

## Issues Encountered

- Pre-commit hook (lint-staged) uses stash/restore pattern — tsx changes and JSON changes were committed across two commit operations due to the stash mechanism. Both commits are on main and contain correct content.

## User Setup Required

None - no external service configuration required. OpenStreetMap embed uses no API key.

## Next Phase Readiness

- Firm detail page fully enhanced per MKT-03/MKT-04 requirements
- Book Now link confirmed pointing to `/{locale}/{slug}/book`
- All user-generated content DOMPurify-sanitized per Phase 46 mandate
- Ready for Plan 03 (marketplace search/filter/listing UI enhancements)

---

_Phase: 48-marketplace-ux_
_Completed: 2026-03-18_

---
phase: 12-advanced-features
plan: 07
subsystem: frontend
tags: [widget, embed, iframe, integration, public-api]
dependency-graph:
  requires: [12-02, 12-03]
  provides: [embeddable-widget]
  affects: [public-booking-flow]
tech-stack:
  added:
    - Web Components API
    - PostMessage API
    - Shadow DOM
  patterns:
    - Custom HTML elements
    - Iframe sandboxing
    - Cross-origin communication
key-files:
  created:
    - apps/web/public/widget/embed.js
    - apps/web/app/api/v1/public/widget/config/[slug]/route.ts
    - apps/web/app/embed/[company_slug]/layout.tsx
    - apps/web/app/embed/[company_slug]/page.tsx
    - apps/web/app/embed/[company_slug]/widget-content.tsx
  modified:
    - apps/web/middleware.ts
decisions:
  - decision: Web Component wrapper with sandboxed iframe
    rationale: Maximum security isolation and style encapsulation for third-party websites
  - decision: Book buttons redirect to full public booking page (not in-widget booking)
    rationale: Widget is service catalog only, full booking wizard requires more screen space
  - decision: PostMessage for resize and service selection only
    rationale: Minimal parent-iframe communication reduces complexity and security surface
  - decision: CORS wildcard (*) on config API
    rationale: Widget must be embeddable from any domain, config data is non-sensitive
  - decision: Middleware exclusion for /embed routes
    rationale: Widget page bypasses locale routing, locale passed as query param instead
metrics:
  duration: 313s
  tasks: 2
  commits: 2
  files: 6
  completed: 2026-02-12
---

# Phase 12 Plan 07: Embeddable JavaScript Booking Widget Summary

**One-liner:** External websites can embed ScheduleBox service catalog with single script tag using Web Component + sandboxed iframe

## Overview

Built embeddable JavaScript widget that external websites can add with a single `<script>` tag and custom element. Widget loads company services in a sandboxed iframe with company branding, and redirects to the full public booking page when customers click "Book" on a service.

**Key Achievement:** Zero-dependency widget loader creates isolated iframe environment for secure embedding on any website. PostMessage API coordinates resize and service selection events between widget and parent page.

## Implementation Details

### Task 1: Widget Loader Script and Configuration API

**Files:**
- `apps/web/public/widget/embed.js` (224 lines, plain JavaScript)
- `apps/web/app/api/v1/public/widget/config/[slug]/route.ts` (168 lines)

**What was built:**

1. **Widget Loader Script** (`embed.js`):
   - Custom element `<schedulebox-widget>` using Web Components API
   - Shadow DOM for style isolation
   - Sandboxed iframe with `allow-scripts allow-same-origin allow-forms allow-popups`
   - PostMessage listener with origin validation
   - Loading spinner while iframe loads
   - Error handling for missing company slug
   - Auto-detection of base URL (production vs development)
   - Attributes: `data-company`, `data-theme`, `data-locale`, `data-width`, `data-height`

2. **PostMessage Events:**
   - `RESIZE`: Update iframe height to match content
   - `SERVICE_SELECTED`: Notify parent when user clicks Book button
   - `ERROR`: Propagate widget errors to parent page

3. **Widget Configuration API:**
   - Public endpoint: `GET /api/v1/public/widget/config/[slug]`
   - Returns company name, slug, logo, primary/secondary colors, active services
   - CORS headers: `Access-Control-Allow-Origin: *`
   - Cache headers: `Cache-Control: public, max-age=300` (5 minute cache)
   - No authentication required (public data)

**Commit:** `bb0459a` - feat(frontend): add widget loader script and config API

### Task 2: Embedded Widget Page and Middleware Exclusion

**Files:**
- `apps/web/middleware.ts` (updated matcher)
- `apps/web/app/embed/[company_slug]/layout.tsx` (40 lines)
- `apps/web/app/embed/[company_slug]/page.tsx` (111 lines)
- `apps/web/app/embed/[company_slug]/widget-content.tsx` (188 lines)

**What was built:**

1. **Middleware Exclusion:**
   - Updated matcher regex to exclude `/embed` routes: `'/((?!api|_next|embed|.*\\..*).*)' `
   - Widget page bypasses next-intl locale processing
   - Locale passed as query parameter instead of route segment

2. **Minimal Embed Layout:**
   - No navigation, header, or footer
   - Base styles and font loading only
   - CSP meta tag: `frame-ancestors *` (allows embedding from any origin)
   - Theme support (light/dark mode) via query param

3. **Widget Page (Server Component):**
   - Fetches company data via direct Drizzle queries
   - Fetches marketplace listing for logo and rating
   - Fetches active services (name, description, duration, price)
   - Handles company not found error

4. **Widget Content (Client Component):**
   - Company header with logo, name, and average rating
   - Service list with name, description, duration, price, and "Book" button
   - PostMessage to parent on initial render (RESIZE event)
   - PostMessage when Book button clicked (SERVICE_SELECTED event)
   - Book button opens full public booking page at `/{locale}/{company_slug}?service={uuid}` in new tab
   - Compact styling for embedded widget (not full page layout)
   - Theme support (light/dark mode)

**Commit:** `a87685b` - feat(frontend): add embedded widget page and middleware exclusion

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- ✅ `node -c apps/web/public/widget/embed.js` - valid JavaScript
- ✅ `npx tsc --noEmit -p apps/web/tsconfig.json` - no type errors
- ✅ `grep -n "embed" apps/web/middleware.ts` - middleware matcher includes 'embed' exclusion
- ✅ Widget creates sandboxed iframe with correct src
- ✅ PostMessage listener validates origin
- ✅ Widget page renders without admin navigation
- ✅ CORS headers set on config API
- ✅ Book button redirects to full public booking page

## Integration Points

### Upstream Dependencies
- **12-02 (Marketplace):** Widget uses marketplace listings for company logo and rating
- **12-03 (Reviews):** Average rating displayed in widget header

### Downstream Effects
- **Public Booking Flow:** Widget redirects to `/{locale}/{company_slug}?service={uuid}` with pre-selected service

### Cross-Cutting Concerns
- **Middleware:** `/embed` routes excluded from locale processing
- **Public API:** Widget config endpoint returns company branding and services

## Usage Example

External website HTML:
```html
<script src="https://app.schedulebox.cz/widget/embed.js"></script>
<schedulebox-widget
  data-company="my-salon"
  data-theme="light"
  data-locale="cs">
</schedulebox-widget>
```

Listen to widget events:
```javascript
document.querySelector('schedulebox-widget').addEventListener('service-selected', (e) => {
  console.log('Service selected:', e.detail);
});
```

## Known Limitations

1. **Widget is service catalog only** - full booking completion happens on the public booking page in a new tab
2. **No real-time availability** - widget only shows service list, availability check happens on booking page
3. **No OAuth/customer login in widget** - customer must be logged in or register on the full booking page

## Security Considerations

1. **Iframe sandboxing** - `allow-scripts allow-same-origin allow-forms allow-popups` restricts iframe capabilities
2. **PostMessage origin validation** - widget validates event origin before processing messages
3. **CSP frame-ancestors** - allows embedding from any origin (widget page, not main app)
4. **CORS wildcard** - config API returns non-sensitive public data, safe to allow from any origin
5. **Shadow DOM** - prevents style conflicts with parent page

## Performance Notes

- **Static script file** - `embed.js` served from `/public`, no build step required
- **5-minute cache** - config API cached to reduce database load
- **Lazy iframe loading** - iframe only loads when custom element is added to DOM
- **No dependencies** - widget loader is plain JavaScript, no React/framework overhead

## Testing Recommendations

1. **Cross-browser testing** - verify Web Components support (Chrome, Firefox, Safari, Edge)
2. **Embedding on different domains** - test CORS and PostMessage origin validation
3. **Theme switching** - verify light/dark mode styling
4. **Responsive design** - test widget at different widths (mobile, tablet, desktop)
5. **Service selection flow** - verify redirect to public booking page with pre-selected service

## Next Steps

- Phase 12 Plan 08: Search and Discovery (marketplace search, filters, geolocation)
- Widget customization options (custom CSS, hide footer, custom CTA text)
- Analytics tracking (widget impressions, service clicks, booking conversions)

## Self-Check: PASSED

**Created files:**
- FOUND: apps/web/public/widget/embed.js
- FOUND: apps/web/app/api/v1/public/widget/config/[slug]/route.ts
- FOUND: apps/web/app/embed/[company_slug]/layout.tsx
- FOUND: apps/web/app/embed/[company_slug]/page.tsx
- FOUND: apps/web/app/embed/[company_slug]/widget-content.tsx

**Modified files:**
- FOUND: apps/web/middleware.ts

**Commits:**
- FOUND: bb0459a - feat(frontend): add widget loader script and config API
- FOUND: a87685b - feat(frontend): add embedded widget page and middleware exclusion

All files created, all commits exist. Self-check passed.

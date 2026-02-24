# Plan 25-02 Summary: Home Page with Hero, Features, Trust Badges

**Status:** Complete
**Duration:** ~4 min

## What was done

1. **Created hero section** (`hero-section.tsx`):
   - Async server component with CSS-only animations (tailwindcss-animate)
   - Two-column layout: text (badge, headline, subheadline, CTAs) + live widget
   - Primary CTA links to /register, secondary anchors to #demo
   - No client JS or Motion import — protects Lighthouse >90

2. **Created live widget preview** (`live-widget-preview.tsx`):
   - Server component rendering iframe to `/embed/salon-krasa?locale=cs&theme=light`
   - Browser chrome mock (3 colored dots + URL bar) for visual polish
   - Lazy loading, accessible title attribute
   - `id="demo"` for anchor link from hero CTA

3. **Created feature grid** (`feature-grid.tsx`):
   - 'use client' component with Motion stagger animations
   - 6 feature cards with lucide-react icons (Brain, Calendar, Bell, CreditCard, Users, BarChart3)
   - `whileInView="show"` with `viewport={{ once: true }}` for scroll-triggered animation
   - `id="features"` for navbar anchor link

4. **Created trust badges** (`trust-badges.tsx`):
   - Async server component with 4 badges (GDPR, Czech hosting, Comgate, bank security)
   - Horizontal layout with muted styling

5. **Created marketing home page** (`page.tsx`):
   - Async server component composing HeroSection, FeatureGrid, TrustBadges
   - SEO metadata with OpenGraph (cs_CZ locale)
   - `generateStaticParams` and `setRequestLocale` for static rendering

## Key decisions
- Hero uses CSS animations (not Motion) to keep client JS off critical path
- Only FeatureGrid is a client component (below fold)
- Widget iframe uses seed company slug `salon-krasa`

## Files created
- `apps/web/app/[locale]/(marketing)/page.tsx`
- `apps/web/app/[locale]/(marketing)/_components/hero-section.tsx`
- `apps/web/app/[locale]/(marketing)/_components/live-widget-preview.tsx`
- `apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx`
- `apps/web/app/[locale]/(marketing)/_components/trust-badges.tsx`

## Verification
- TypeScript compiles without errors
- Hero section has no 'use client' or motion/react imports
- FeatureGrid has 'use client' and imports motion/react
- Page exports generateStaticParams

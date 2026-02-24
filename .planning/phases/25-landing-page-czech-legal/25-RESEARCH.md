# Phase 25: Landing Page and Czech Legal Compliance - Research

**Researched:** 2026-02-21
**Domain:** Next.js 15 App Router marketing pages, Czech legal compliance (GDPR, Electronic Communications Act 2022), Motion animation library
**Confidence:** HIGH (architecture/patterns verified against live codebase), MEDIUM (legal requirements verified via multiple sources)

---

## Summary

Phase 25 adds a Czech-language marketing landing page as a `(marketing)` route group inside the existing `app/[locale]/` segment. The codebase already uses Next.js 15 (15.5.10), React 19, next-intl 4.8.2 with `localePrefix: 'as-needed'`, and has two existing route groups — `(auth)` and `(dashboard)` — as the reference pattern. The `(marketing)` group slots in identically: its `layout.tsx` replaces the dashboard's `AuthGuard`+`Sidebar`+`Header` shell with a marketing-specific navbar and footer; it needs no auth guard and no sidebar.

The live widget embed (`/embed/[company_slug]`) already exists and is excluded from the intl middleware. For the hero section's "live embedded booking widget demo," the simplest approach is rendering the widget in an `<iframe>` pointing at `/embed/schedulebox-demo` (a seed company slug) — same pattern already used in production. The iframe needs no special CORS work because `X-Frame-Options: SAMEORIGIN` is the current default and `embedSecurityHeaders` already sets `ALLOWALL` for `/embed/*`.

Czech legal compliance has two hard parts: (1) cookie consent must use strict opt-in with no pre-checked boxes under the Czech Electronic Communications Act (effective 2022-01-01), and (2) the footer must display ICO (company ID) and registered address; DIČ is recommended but not strictly mandatory. Privacy policy and terms of service must exist as Czech-language pages at `/cs/privacy` and `/cs/terms` respectively.

**Primary recommendation:** Create `app/[locale]/(marketing)/` with its own `layout.tsx` (marketing navbar + legal footer), add 4 page files (home, pricing, privacy, terms), install `motion` (MIT, `npm install motion`), implement cookie consent as a custom client component with localStorage, and add message keys under a `landing` namespace in `cs.json`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| Next.js | 15.5.10 (already installed) | App Router, SSG/SSR, metadata API, next/image | Project framework; marketing pages are statically generated |
| next-intl | 4.8.2 (already installed) | Czech/Slovak/English translations, locale routing | Already wired; `setRequestLocale` + `generateStaticParams` enables static rendering |
| Tailwind CSS | 3.4.x (already installed) | Utility-first styling | Project standard; design tokens already in `tailwind.config.ts` |
| shadcn/ui components | already installed | Button, Card, Badge reuse | Project standard; existing components in `apps/web/components/ui/` |
| motion | 12.x (MIT, NOT installed) | Scroll-triggered animations for feature grid and hero | Locked decision: Motion 12, not GSAP (commercial license) |

### Supporting

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| lucide-react | 0.563.x (already installed) | Icons for feature grid trust badges | Already in project, tree-shaken via modularizeImports in next.config.mjs |
| next/image | (Next.js built-in) | Optimized hero image, AVIF/WebP, priority preload | Hero section LCP element — always use `priority` prop above the fold |
| next/font | (Next.js built-in) | Inter font already loaded in root layout | No additional font work needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| motion (MIT) | GSAP | GSAP requires commercial license for revenue-generating products — locked decision, do not use |
| Custom cookie consent | react-cookie-consent npm package | Third-party package adds ~5KB and is harder to style precisely; custom localStorage implementation is 40 lines and fully controlled |
| iframe for live widget demo | Screenshot or static mockup | iframe is the true "live" demo as required by LAND-02; screenshot would fail the success criteria |

**Installation (only motion is new):**
```bash
pnpm --filter @schedulebox/web add motion
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/app/[locale]/
├── (auth)/                    # existing — login, register
├── (dashboard)/               # existing — app with sidebar
├── (marketing)/               # NEW — this phase
│   ├── layout.tsx             # marketing navbar + legal footer (no AuthGuard, no sidebar)
│   ├── page.tsx               # home: hero + feature grid + trust badges
│   ├── pricing/
│   │   └── page.tsx           # 3-tier pricing table
│   ├── cs/
│   │   ├── privacy/
│   │   │   └── page.tsx       # Czech privacy policy
│   │   └── terms/
│   │       └── page.tsx       # Czech terms of service
│   └── _components/           # marketing-specific components (not shared)
│       ├── marketing-navbar.tsx
│       ├── marketing-footer.tsx
│       ├── hero-section.tsx
│       ├── feature-grid.tsx
│       ├── trust-badges.tsx
│       ├── pricing-table.tsx
│       ├── social-proof.tsx
│       └── cookie-consent-banner.tsx

apps/web/messages/
└── cs.json                    # Add "landing" namespace (existing file, currently 941 lines)
```

**Note on `/cs/privacy` and `/cs/terms` path:** The requirement says these live at `/cs/privacy` and `/cs/terms`. With `localePrefix: 'as-needed'` and default locale `cs`, the Czech locale has no `/cs` prefix at all — URLs are just `/privacy` and `/terms`. The `/cs/privacy` URL is the Slovak/English equivalent path when switching locale. The pages should live at `(marketing)/privacy/` and `(marketing)/terms/` in the file system, and next-intl routing will serve them at the right locale-prefixed URLs automatically. Verify this against actual middleware behavior.

### Pattern 1: Marketing Route Group Layout

**What:** A layout that wraps all marketing pages with a marketing-specific navbar (no sidebar, no AuthGuard) and a legal footer. Route group layouts do NOT share state with `(dashboard)` or `(auth)` layouts.
**When to use:** Any page accessible to unauthenticated visitors (home, pricing, legal pages).

```typescript
// Source: Verified against existing (dashboard)/layout.tsx and (auth)/layout.tsx patterns
// apps/web/app/[locale]/(marketing)/layout.tsx

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { MarketingNavbar } from './_components/marketing-navbar';
import { MarketingFooter } from './_components/marketing-footer';
import { CookieConsentBanner } from './_components/cookie-consent-banner';

// REQUIRED for static rendering with next-intl
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <CookieConsentBanner />
    </div>
  );
}
```

### Pattern 2: Static Rendering with next-intl (`setRequestLocale`)

**What:** Every page and layout in the `(marketing)` group must call `setRequestLocale(locale)` BEFORE any `useTranslations` / `getTranslations` call to enable static generation at build time. Also requires `generateStaticParams`.
**When to use:** All marketing pages — they are fully static (no user-specific data).

```typescript
// Source: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing
// apps/web/app/[locale]/(marketing)/page.tsx

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing.meta' });
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
    openGraph: {
      title: t('homeTitle'),
      description: t('homeDescription'),
      url: 'https://schedulebox.cz',
      siteName: 'ScheduleBox',
      locale: 'cs_CZ',
      type: 'website',
    },
  };
}

export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ...
}
```

### Pattern 3: Motion (motion/react) for Scroll Animations

**What:** Import `motion` components from `motion/react` (NOT `framer-motion`). All motion components are client-only; wrap sections that need animation in a `'use client'` component.
**When to use:** Feature grid cards (staggered fade-in), hero section entrance.

```typescript
// Source: https://github.com/motiondivision/motion (MIT licensed, import: "motion/react")
// apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx
'use client';

import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {features.map((feature) => (
        <motion.div key={feature.id} variants={item} className="...">
          {/* card content */}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

**Key rule:** Server Components render feature grid data; pass it as props to the `'use client'` animation wrapper. Do NOT fetch data inside motion components.

### Pattern 4: Live Widget Embed via iframe

**What:** The hero section embeds the booking widget via `<iframe>` pointing at an existing `/embed/[company_slug]` route. This satisfies LAND-02 ("live embedded booking widget demo, not a screenshot").
**When to use:** Hero section of marketing home page.

```tsx
// The embed route already exists at /embed/[company_slug]
// Embed security headers (/embed/*) already allow frame-ancestors *
// No CORS changes needed

// apps/web/app/[locale]/(marketing)/_components/hero-section.tsx (server component)
export function LiveWidgetPreview({ demoSlug }: { demoSlug: string }) {
  return (
    <div className="rounded-xl border shadow-2xl overflow-hidden bg-white" style={{ height: 420 }}>
      <iframe
        src={`/embed/${demoSlug}?locale=cs&theme=light`}
        className="w-full h-full border-0"
        title="Ukázka rezervačního widgetu"
        loading="lazy"
      />
    </div>
  );
}
```

**Dependency:** Requires a seed company with a known slug (e.g., `schedulebox-demo`) to exist in the database. This is a data dependency, not a code dependency.

### Pattern 5: Cookie Consent Banner (Strict Opt-In, Czech Law)

**What:** A fixed-bottom client component that reads/writes consent to localStorage. No pre-checked boxes (Czech Electronic Communications Act 2022 requires explicit opt-in). Must have equal-weight Accept/Reject buttons.
**When to use:** Rendered in `(marketing)/layout.tsx`, shown once per browser session until user makes a choice.

```typescript
// Source: Czech Electronic Communications Act 2022 (effective 2022-01-01)
// Verified: CookieYes Czech Republic guide, Global Compliance News
// apps/web/app/[locale]/(marketing)/_components/cookie-consent-banner.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'sb_cookie_consent';

type ConsentState = 'accepted' | 'rejected' | null;

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [mounted, setMounted] = useState(false);

  // Avoid SSR mismatch — read localStorage only on client
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentState | null;
    setConsent(stored);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsent('accepted');
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setConsent('rejected');
  };

  // Don't render until mounted (prevents hydration mismatch)
  // Don't render if consent already given
  if (!mounted || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Souhlas s cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg"
    >
      <div className="mx-auto max-w-4xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          Používáme cookies pro zlepšení vašeho zážitku. Přijmete jejich použití?{' '}
          <a href="/cs/privacy" className="underline">Zásady ochrany osobních údajů</a>
        </p>
        <div className="flex gap-3 flex-shrink-0">
          {/* Equal-weight buttons — Czech law requires no visual bias toward accept */}
          <Button variant="outline" size="sm" onClick={handleReject}>
            Odmítnout
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Přijmout
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Critical compliance rules:**
- No pre-checked boxes (no pre-enabled analytics or tracking before consent)
- "Odmítnout" and "Přijmout" buttons must be comparable in size and prominence
- Closing the banner without choosing is NOT valid consent
- Cannot block page access (cookie walls prohibited)

### Pattern 6: Marketing Navbar

**What:** A simplified navigation header with ScheduleBox logo, navigation links (Funkce, Ceny), locale switcher, and "Začít zdarma" CTA button linking to `/register`.
**When to use:** Rendered in `(marketing)/layout.tsx`.

```typescript
// apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx
// Server component — no auth state, no sidebar toggle
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { getTranslations } from 'next-intl/server';

export async function MarketingNavbar() {
  const t = await getTranslations('landing.nav');
  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          ScheduleBox
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="#features" className="text-gray-600 hover:text-gray-900">{t('features')}</Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">{t('pricing')}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Button asChild size="sm">
            <Link href="/register">{t('cta')}</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
```

### Pattern 7: Legal Footer (LAND-07 Compliance)

**What:** Footer present on every marketing page. Must include company ICO, DIC, registered address, and links to privacy policy and terms of service. These are mandatory under Czech Business Act for commercial websites.

```typescript
// apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx
// Server component
export async function MarketingFooter() {
  return (
    <footer className="border-t bg-gray-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Company column */}
          <div className="col-span-2 md:col-span-1">
            <p className="font-bold text-lg mb-2">ScheduleBox</p>
            {/* LAND-07 mandatory legal info */}
            <address className="not-italic text-sm text-gray-500 space-y-1">
              <p>ScheduleBox s.r.o.</p>
              <p>Příkladná 1, 110 00 Praha 1</p>
              <p>IČO: 12345678</p>
              <p>DIČ: CZ12345678</p>
            </address>
          </div>
          {/* Nav columns */}
          <div>
            <p className="font-semibold mb-2">Produkt</p>
            <ul className="space-y-1 text-sm text-gray-500">
              <li><Link href="/pricing">Ceny</Link></li>
            </ul>
          </div>
          {/* Legal column */}
          <div>
            <p className="font-semibold mb-2">Právní</p>
            <ul className="space-y-1 text-sm text-gray-500">
              <li><Link href="/privacy">Ochrana osobních údajů</Link></li>
              <li><Link href="/terms">Obchodní podmínky</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} ScheduleBox s.r.o. Všechna práva vyhrazena.
          Společnost zapsaná v obchodním rejstříku vedeném Městským soudem v Praze.
        </div>
      </div>
    </footer>
  );
}
```

**Legal note:** ICO/registered address are mandatory. DIČ is optional per Czech law but included per the phase requirements (LAND-07). The commercial register reference is also required if the company is registered.

### Pattern 8: Pricing Table (3 Tiers)

**What:** Three pricing cards (Free / 299 CZK / 699 CZK) rendered as a server component. Annual discount toggle requires a client component wrapper.
**When to use:** `/pricing` page.

```typescript
// Server component passing plan data down to a client toggle component
// Note: Pricing amounts are hardcoded (static marketing content, no DB query)

const PLANS = [
  { id: 'free', name: 'Free', price: 0, annualPrice: 0, currency: 'CZK', cta: 'Začít zdarma', href: '/register', featured: false },
  { id: 'pro', name: 'Pro', price: 299, annualPrice: 249, currency: 'CZK', cta: 'Začít zdarma', href: '/register', featured: true },
  { id: 'business', name: 'Business', price: 699, annualPrice: 579, currency: 'CZK', cta: 'Začít zdarma', href: '/register', featured: false },
] as const;
```

### Pattern 9: next/image for Hero

**What:** Hero section uses `next/image` with `priority` prop so the image is preloaded as an LCP candidate. The `sizes` attribute must be set correctly to avoid over-fetching.
**When to use:** Above-the-fold hero image.

```tsx
// Source: https://nextjs.org/docs/app/api-reference/components/image
import Image from 'next/image';

<Image
  src="/images/hero-scheduling.webp"
  alt="ScheduleBox AI rezervační systém"
  width={600}
  height={400}
  priority           // Prevents loading="lazy", triggers preload
  sizes="(max-width: 768px) 100vw, 50vw"
  className="rounded-xl"
/>
```

### Anti-Patterns to Avoid

- **Importing `framer-motion`:** The package is `motion`, imported from `motion/react` — NOT from `framer-motion`. (`framer-motion` is the old package name; `motion` is the new standalone package that contains it.)
- **Using `motion` in Server Components:** Motion requires client-side React. Always add `'use client'` to any file importing from `motion/react`.
- **Reading `localStorage` during SSR:** Cookie consent banner must use `useEffect` + `mounted` guard to avoid hydration mismatch.
- **Pre-checked consent checkboxes:** Under Czech Electronic Communications Act 2022, any pre-checked box is non-compliant. There are no category checkboxes in a simple accept/reject banner.
- **Cookie wall:** Do not block marketing page content behind cookie consent. Show the banner as a non-blocking overlay.
- **Missing `setRequestLocale`:** Without this call, next-intl marketing pages will fall into dynamic rendering and lose static generation benefits for Lighthouse performance.
- **Placing `(marketing)` routes outside `[locale]`:** The middleware handles locale routing for all non-embed, non-API paths. Marketing pages must live inside `app/[locale]/(marketing)/` to get locale routing.
- **Hero `<img>` instead of `next/image`:** Raw `<img>` tags will trigger Lighthouse failures and miss AVIF/WebP optimization.
- **`loading="lazy"` on hero image:** The hero image is above the fold; `loading="lazy"` delays LCP. Always use `priority` prop on next/image for above-fold images.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Image optimization | Custom resizing pipeline | next/image with `priority` and `sizes` | Automatic AVIF/WebP, srcset, blur placeholder, LCP preload |
| Locale-aware links | Custom href manipulation | `Link` from `@/lib/i18n/navigation` (createNavigation) | Already configured in the project; handles `localePrefix: 'as-needed'` automatically |
| Animation orchestration | Custom CSS keyframe sequences | `motion` variants with `staggerChildren` | Motion handles stagger, viewport detection, and will-change automatically |
| Czech locale formatting | Custom number/date formatters | `useFormatter` from next-intl | Already available; handles `cs-CZ` locale number formatting (e.g., `1 299 Kč`) |
| Font loading | Manual `<link>` tags | Inter font already in root `layout.tsx` | Loaded globally with `display: swap` and `latin-ext` subset; no re-declaration needed |

**Key insight:** The project's existing infrastructure (next-intl routing, shadcn/ui components, next/image config, security headers) is already production-ready. Marketing pages are additive — they reuse 90% of existing setup without modifications.

---

## Common Pitfalls

### Pitfall 1: Route Group Full Page Reload Between Layouts

**What goes wrong:** Navigating from a marketing page to `/login` (auth layout) or `/dashboard` (dashboard layout) triggers a full browser reload because each route group has its own root layout segment.
**Why it happens:** Next.js App Router requires a full page reload when navigating between different root layouts.
**How to avoid:** This is expected Next.js behavior. The `(marketing)` layout wraps only marketing pages. Use standard `<a>` tags or next-intl `Link` for cross-group navigation (login/register CTAs). The user experience is fine — it's a full page load going from marketing to app, which is normal for SaaS.
**Warning signs:** Animations persisting across route group boundaries would indicate a misconfiguration.

### Pitfall 2: Hydration Mismatch in Cookie Consent Banner

**What goes wrong:** React throws "Hydration failed because the server rendered HTML didn't match the client" when the cookie banner renders differently on server vs client.
**Why it happens:** `localStorage` is not available during SSR; if you conditionally render based on localStorage state at the module level, server renders the banner but client immediately hides it.
**How to avoid:** Use the `mounted` guard pattern — render `null` until `useEffect` fires and sets `mounted = true`. This ensures the banner is always absent on server render and conditionally rendered only on client.
**Warning signs:** React hydration errors in the browser console.

### Pitfall 3: Static Rendering Broken by Missing `setRequestLocale`

**What goes wrong:** Marketing pages fall into dynamic rendering (SSR on every request) instead of being statically generated, killing Lighthouse performance scores.
**Why it happens:** next-intl 4.x requires `setRequestLocale(locale)` in every layout AND page that should be statically generated. If any segment is missing this call, Next.js cannot determine the locale at build time.
**How to avoid:** Every marketing page and the marketing layout must call `setRequestLocale(locale)` as the first operation before any next-intl API call. Also add `generateStaticParams` to the layout.
**Warning signs:** Running `next build` and seeing marketing pages listed as `λ` (dynamic) instead of `○` (static) in the build output.

### Pitfall 4: Wrong Import Path for Motion

**What goes wrong:** Build error or missing animations because of incorrect import.
**Why it happens:** The npm package is `motion` (installed as `motion`) but the React import path is `motion/react`. Importing from `framer-motion` pulls the old package which may conflict or be missing.
**How to avoid:** Always `import { motion } from 'motion/react'`. Install with `pnpm --filter @schedulebox/web add motion`.
**Warning signs:** "Cannot find module 'motion/react'" or animations not working in production.

### Pitfall 5: Widget Demo iframe CSP Violation

**What goes wrong:** The live widget demo iframe is blocked by Content Security Policy.
**Why it happens:** The default `securityHeaders` in `security-headers.mjs` set `frame-src: 'self'` and `frame-ancestors: 'self'`. The widget is at `/embed/[slug]` which already has `ALLOWALL` headers, but the marketing page loading the iframe also needs to allow self-origin frames.
**How to avoid:** The marketing page is on the same domain as the embed (`schedulebox.cz`), so `frame-src: 'self'` covers `/embed/*` from the same origin. No CSP change is needed for the demo embed. Verify by checking that `frame-src` in `security-headers.mjs` includes `'self'`.
**Warning signs:** Browser console shows "Refused to display ... in a frame because an ancestor violates the following Content Security Policy directive."

### Pitfall 6: Czech Legal Content as a Code Blocker

**What goes wrong:** Development stalls waiting for real ICO, DIČ, registered address, and legal text (privacy policy, terms).
**Why it happens:** This information comes from the business team, not engineering.
**How to avoid:** Use placeholder values during development (`IČO: TBD`, placeholder legal text). The phase requirement (LAND-07) explicitly notes this as a business dependency. Structure the components to accept these as configuration/props or environment variables that can be filled in at launch.
**Warning signs:** Merge blockers on legal page PRs because content hasn't been provided.

### Pitfall 7: Lighthouse Score Failure from Client JS

**What goes wrong:** Lighthouse performance drops below 90 because Motion animations add above-the-fold client JavaScript.
**Why it happens:** If the hero section itself is a client component importing motion, Next.js bundles it into the critical JS path, blocking rendering.
**How to avoid:** Keep the hero section's static structure (headline, CTA button, image) as a server component. Only wrap the animated feature grid (below the fold) as a client component. Use `viewport={{ once: true }}` on whileInView animations so Motion doesn't re-run. For hero entrance animations, prefer CSS animations via `tailwindcss-animate` (already installed) instead of Motion — saving ~15KB from the above-fold bundle.
**Warning signs:** Lighthouse TBT (Total Blocking Time) is high; Network waterfall shows large JS chunks loading before first paint.

---

## Code Examples

Verified patterns from official sources:

### next-intl getTranslations in Async Server Component

```typescript
// Source: https://next-intl.dev/docs/environments/server-client-components
import { getTranslations } from 'next-intl/server';

// Async server component (e.g., layout, page)
export async function MarketingNavbar() {
  const t = await getTranslations('landing.nav');
  return <nav>{t('features')}</nav>;
}

// Non-async server component uses hook (same as client component API)
import { useTranslations } from 'next-intl';
export function PricingCard() {
  const t = useTranslations('landing.pricing');
  return <div>{t('monthly')}</div>;
}
```

### next/image with Priority for LCP

```typescript
// Source: https://nextjs.org/docs/app/api-reference/components/image
import Image from 'next/image';

// Hero image — ALWAYS use priority for above-fold
<Image
  src="/images/hero.webp"
  alt="ScheduleBox rezervační systém"
  width={800}
  height={500}
  priority
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
  className="rounded-2xl shadow-2xl"
/>
```

### Marketing Page Metadata (Czech SEO)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing.meta' });

  return {
    title: t('homeTitle'),           // "ScheduleBox — AI rezervační systém pro SMB"
    description: t('homeDescription'),
    alternates: {
      canonical: 'https://schedulebox.cz',
      languages: {
        'cs': 'https://schedulebox.cz',
        'sk': 'https://schedulebox.cz/sk',
        'en': 'https://schedulebox.cz/en',
      },
    },
    openGraph: {
      type: 'website',
      locale: 'cs_CZ',
      url: 'https://schedulebox.cz',
      siteName: 'ScheduleBox',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}
```

### Czech i18n Messages Namespace Structure

```json
// Additions to apps/web/messages/cs.json
{
  "landing": {
    "meta": {
      "homeTitle": "ScheduleBox — AI rezervační systém pro malé firmy",
      "homeDescription": "Automatizujte rezervace, snižte absence a získejte víc zákazníků s ScheduleBox. Vyzkoušejte zdarma.",
      "pricingTitle": "Ceny | ScheduleBox"
    },
    "nav": {
      "features": "Funkce",
      "pricing": "Ceny",
      "login": "Přihlásit se",
      "cta": "Začít zdarma"
    },
    "hero": {
      "badge": "Novinky: AI optimalizace kapacity",
      "headline": "Rezervační systém, který pracuje za vás",
      "subheadline": "Automatizujte rezervace, snižte absence o 40 % a získejte víc zákazníků s AI-powered ScheduleBox.",
      "cta": "Začít zdarma",
      "ctaSecondary": "Zobrazit demo",
      "widgetTitle": "Ukázka rezervačního widgetu"
    },
    "features": {
      "title": "Vše, co potřebujete pro správu rezervací",
      "aiPrediction": "AI předpovědi",
      "aiPredictionDesc": "Inteligentní optimalizace kapacity a předpovídání poptávky.",
      "onlineBooking": "Online rezervace 24/7",
      "onlineBookingDesc": "Zákazníci si rezervují sami, kdykoliv a odkudkoliv.",
      "notifications": "Automatická připomenutí",
      "notificationsDesc": "SMS a email notifikace snižují absence o 40 %.",
      "payments": "Online platby",
      "paymentsDesc": "Platby přes Comgate — rychle, bezpečně, česky.",
      "crm": "CRM a věrnostní program",
      "crmDesc": "Budujte vztahy se zákazníky a zvyšte opakované návštěvy.",
      "analytics": "Analytika a přehledy",
      "analyticsDesc": "Sledujte výkonnost a optimalizujte své podnikání."
    },
    "trust": {
      "gdpr": "GDPR compliant",
      "hosting": "Hosting v ČR",
      "payment": "Comgate platby",
      "security": "Bankovní zabezpečení"
    },
    "pricing": {
      "title": "Transparentní ceny bez překvapení",
      "monthly": "Měsíčně",
      "annual": "Ročně",
      "annualSaving": "Ušetříte 2 měsíce",
      "free": { "name": "Free", "description": "Pro začínající podnikatele" },
      "pro": { "name": "Pro", "price": "299", "annualPrice": "249", "description": "Pro rostoucí firmy", "badge": "Nejoblíbenější" },
      "business": { "name": "Business", "price": "699", "annualPrice": "579", "description": "Pro větší týmy" },
      "cta": "Začít zdarma",
      "currency": "Kč/měs"
    },
    "social": {
      "title": "Firmy, které nám důvěřují",
      "placeholder": "Recenze zákazníků budou doplněny před spuštěním."
    },
    "cookie": {
      "message": "Používáme cookies pro zlepšení vašeho zážitku na webu.",
      "accept": "Přijmout",
      "reject": "Odmítnout",
      "privacyLink": "Zásady ochrany osobních údajů"
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| `framer-motion` package | `motion` package, import from `motion/react` | Motion v11 (2024) | No API breaking changes; just new package name. Use `motion` on npm. |
| `unstable_setRequestLocale` | `setRequestLocale` (stable) | next-intl v3.22 | Stable API, safe to use in production without `unstable_` prefix |
| Cookie opt-out (implied consent) | Strict opt-in, no pre-checked boxes | Czech ECA amendment 2022-01-01 | Pre-checked analytics cookies are illegal in CZ; UOOU has imposed fines |
| Pages Router `getStaticProps` for SSG | App Router `generateStaticParams` + `setRequestLocale` | Next.js 13+ App Router | Different pattern; marketing pages are static by default if no dynamic APIs used |
| `loading="lazy"` on all images | `priority` prop for above-fold hero images | Next.js 13+ image component | Critical for LCP; lazy loading hero image is a Lighthouse anti-pattern |

**Deprecated/outdated:**

- `framer-motion` (npm package): Replaced by `motion`. The old package still exists but `motion` is the maintained successor.
- `unstable_setRequestLocale`: Now just `setRequestLocale` (stable since next-intl 3.22).
- Cookie implied consent (closing banner = consent): Illegal in Czech Republic since 2022-01-01.

---

## Open Questions

1. **Demo company slug for live widget embed**
   - What we know: The embed widget at `/embed/[company_slug]` requires a company to exist in the database with a specific slug.
   - What's unclear: What slug is used for the marketing demo? Is there a seed company named `schedulebox-demo` or similar?
   - Recommendation: Check database seeds in `packages/database`. If no demo company exists, create a seed migration or use an existing seeded company slug. The planner should add a task to verify/create the demo seed data.

2. **Real ICO, DIČ, registered address**
   - What we know: LAND-07 requires these in the footer. Czech law mandates ICO and registered address.
   - What's unclear: The actual legal entity details for ScheduleBox s.r.o. are not in the codebase.
   - Recommendation: Use environment variables (`NEXT_PUBLIC_COMPANY_ICO`, `NEXT_PUBLIC_COMPANY_ADDRESS`) so real data can be injected at deploy time without code changes. Phase 25 can ship with placeholder values.

3. **Privacy policy and terms of service content**
   - What we know: Pages must exist in Czech at `/privacy` and `/terms` (with locale routing to `/cs/privacy` for non-default locales).
   - What's unclear: The actual legal text must be authored by the business/legal team, not engineering.
   - Recommendation: Create page structure and layout now with placeholder content sections. Flag as a business dependency with a `// TODO: Replace with legal-approved content` comment. The phase ships the page shell; content is filled by the business team before launch.

4. **`/cs/privacy` path interpretation**
   - What we know: With `localePrefix: 'as-needed'`, Czech (default locale) has no `/cs` prefix — so `/privacy` is the Czech URL, and `/cs/privacy` does NOT exist as a Czech URL.
   - What's unclear: Does the requirement literally mean the URL must be `/cs/privacy`, or does it mean "Czech-language privacy policy accessible at the privacy path"?
   - Recommendation: Implement as `(marketing)/privacy/page.tsx` which serves at `/privacy` (Czech) and `/sk/privacy` (Slovak). If the requirement is a literal `/cs/` prefix, the locale routing config needs `localePrefix: 'always'` which is a breaking change for the whole app. Flag this for the planner to clarify.

5. **Social proof content**
   - What we know: Phase requirement includes social proof section; the phase brief notes real testimonials are a business dependency.
   - What's unclear: What placeholder content is acceptable during development?
   - Recommendation: Implement the social proof UI with 3 placeholder review cards using realistic Czech-language placeholder text. Document that real testimonials must be provided before launch.

---

## Sources

### Primary (HIGH confidence)

- Live codebase `apps/web/` — confirmed Next.js 15.5.10, React 19, next-intl 4.8.2, no `motion` package installed, existing route groups `(auth)` and `(dashboard)` as patterns
- `apps/web/app/embed/[company_slug]/` — confirmed embed widget exists, `embedSecurityHeaders` allows `frame-ancestors *`
- `apps/web/middleware.ts` — confirmed embed routes excluded from intl middleware (`matcher` excludes `embed`)
- `apps/web/lib/i18n/routing.ts` — confirmed `localePrefix: 'as-needed'`, default locale `cs`, locales `['cs', 'sk', 'en']`
- `security/headers/security-headers.mjs` — confirmed CSP, `frame-src: 'self'`, embed headers
- https://github.com/motiondivision/motion — Motion is MIT licensed, `npm install motion`, `import { motion } from 'motion/react'`
- https://nextjs.org/docs/app/api-reference/file-conventions/route-groups (checked 2026-02-20) — Route groups, full-page-reload caveat between different root layouts

### Secondary (MEDIUM confidence)

- https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing — `setRequestLocale` + `generateStaticParams` pattern for static rendering
- https://next-intl.dev/docs/environments/server-client-components — `getTranslations` (async) vs `useTranslations` (non-async) distinction
- https://www.cookieyes.com/blog/cookie-consent-czech-republic/ — Czech cookie consent requirements: no pre-checked boxes, equal-weight buttons, no cookie walls
- https://barboraruzickova.com/your-business-website-and-czech-law/ — Mandatory footer elements: company name, registered office, ICO; DIČ optional
- https://www.globalcompliancenews.com/2022/01/21/czech-republic-changes-to-the-electronic-communications-act — Czech ECA 2022 opt-in requirement effective 2022-01-01
- https://nextjs.org/docs/app/api-reference/components/image — `priority` prop for LCP, `sizes` attribute importance
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata — Metadata API, openGraph, alternates

### Tertiary (LOW confidence — flag for validation)

- WebSearch result citing Motion 12.23.12 version number — actual version should be verified at install time with `pnpm info motion version`
- WebSearch finding that `setRequestLocale` was stabilized in next-intl 3.22 — project uses 4.8.2 so this is definitely stable, but the exact API surface should be verified against 4.x changelog

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified in live codebase; motion version LOW (verify at install)
- Architecture patterns: HIGH — route group pattern verified against `(auth)` and `(dashboard)` in live codebase
- next-intl static rendering: MEDIUM — `setRequestLocale` documented in official docs; project doesn't currently use it (no existing static pages outside dashboard)
- Czech legal compliance: MEDIUM — multiple authoritative sources agree on opt-in requirement; actual legal text is a business dependency
- Motion animation patterns: MEDIUM — import path and MIT license confirmed from GitHub; specific Motion 12 API verified from official docs fetch
- Pitfalls: HIGH — hydration mismatch, Lighthouse anti-patterns, and CSP issues verified from live code analysis

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days — next-intl and Next.js are relatively stable; Czech legal requirements are stable until legislation changes)

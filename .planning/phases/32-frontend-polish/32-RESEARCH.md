# Phase 32 — Frontend Polish and Design System — Research

## Codebase State Summary

### Current Dashboard Layout
- **Dashboard page** (`apps/web/app/[locale]/(dashboard)/dashboard/page.tsx`): Uses `space-y-8` layout with PageHeader, OnboardingChecklist, DemoDataCard, DashboardGrid (4 stat cards), AiInsightsPanel, QuickActions. Linear vertical stack, no grid layout.
- **Dashboard layout** (`apps/web/app/[locale]/(dashboard)/layout.tsx`): Sidebar (hidden on mobile) + Header + main content area with `max-w-7xl`. Has AuthGuard, SkipLink, NavigationProgress, DashboardTour.
- **Stat cards** (`components/dashboard/stat-card.tsx`): Simple Card with title, value, trend arrow. Grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- **Dashboard grid** (`components/dashboard/dashboard-grid.tsx`): Fetches 30-day analytics, shows 4 skeleton placeholders while loading. Shows: todayBookings, monthlyRevenue, newCustomers, averageRating.
- **Quick actions** (`components/dashboard/quick-actions.tsx`): Card with 3 outline buttons (new booking, add customer, view calendar).

### 26 Dashboard Pages Found
All under `apps/web/app/[locale]/(dashboard)/`:
- dashboard, bookings, bookings/new, calendar, customers, employees, services
- analytics, ai, ai/capacity, ai/pricing
- automation, automation/builder, automation/logs
- loyalty, loyalty/cards, loyalty/cards/[id], loyalty/rewards
- marketing, notifications, onboarding, profile
- settings, settings/billing, templates, templates/[id]

### Tailwind Configuration
- **File:** `apps/web/tailwind.config.ts`
- **Dark mode:** `darkMode: ['class']` already configured
- **Colors:** Standard shadcn/ui CSS variable approach (hsl(var(--xxx)))
- **Font:** Inter
- **Radius:** `--radius: 0.5rem`
- **Plugins:** `tailwindcss-animate`
- **Container:** centered, 2rem padding, 2xl: 1400px

### CSS Variables / Design Tokens (globals.css)
- Light theme: white background, blue primary (217 91% 60%), green secondary (142 71% 45%), red destructive
- Dark theme: fully defined (dark blue-gray background 222.2 84% 4.9%, muted 217.2 32.6% 17.5%)
- Both themes complete with all semantic tokens (card, popover, muted, accent, border, input, ring)
- No additional spacing scale, shadow tokens, or typography tokens beyond defaults

### shadcn/ui Components (21 components)
alert, avatar, badge, button, calendar, card, dialog, dropdown-menu, form, input, label, progress, scroll-area, select, separator, sheet, skeleton, switch, table, textarea, tooltip

### Dark Mode Status
- **NOT functional** — `next-themes` not installed, no ThemeProvider exists
- `darkMode: ['class']` is configured in Tailwind (ready for next-themes)
- `suppressHydrationWarning` already on `<html>` tag (ready for next-themes)
- `.dark` CSS variables fully defined in globals.css
- Only ~56 `dark:` class usages across 10 files (analytics charts, billing status colors, AI pricing/capacity pages)
- **Critical dark mode issues:**
  - Header uses hardcoded `bg-white` (not `bg-background`)
  - Marketing navbar uses `bg-white/95` and `bg-white/60`
  - Marketing footer uses `bg-gray-50`
  - Feature grid uses `bg-gray-50/50`
  - Demo data card uses `bg-gray-50/50` and `border-gray-200`
  - Various components use `text-green-600`, `text-red-600` without dark variants
  - Stat card trend colors hardcoded (green-600/red-600)

### Loading States Audit
- **Single `loading.tsx`** exists for entire dashboard route group: shows header skeleton + centered Loader2 spinner. Not page-specific.
- **No `error.tsx` files** exist anywhere in the app.
- **Inline loading:** Some pages handle loading inline (bookings page shows text in table cell, analytics shows skeletons, billing shows Loader2 spinner inline).
- **Inconsistent patterns:**
  - DashboardGrid: Uses `<Skeleton className="h-[120px] rounded-xl" />` (4x) -- good
  - Analytics page: Uses Skeleton for KPI cards and chart areas -- good
  - Billing page: Uses `<Loader2 className="h-4 w-4 animate-spin" />` with text -- inconsistent
  - Bookings table: Shows text "Loading..." in table cell -- poor

### Empty States
- **6 dedicated empty state components** from Phase 27 in `components/onboarding/empty-states/`:
  - analytics-empty, bookings-empty, calendar-empty, customers-empty, employees-empty, services-empty
- **Shared EmptyState component** (`components/shared/empty-state.tsx`): Accepts icon, title, description, action, secondaryAction. Uses gradient background, centered layout.
- **Usage:** Bookings and customers pages use their empty state components. Analytics page uses AnalyticsEmptyState.
- **Missing empty states for:** loyalty, automation, templates, marketing, notifications, billing invoices

### Error Handling
- **ErrorBoundary** (`components/shared/error-boundary.tsx`): Class component with ErrorFallback (AlertTriangle + try again button).
- **No `error.tsx` route files** — Next.js error boundaries not used at route level.
- No global error page for dashboard.

### Landing Page Structure
- **Main page** (`(marketing)/page.tsx`): HeroSection + FeatureGrid + TrustBadges. Missing: SocialProof section (component exists but not rendered), testimonials section, additional CTAs.
- **HeroSection:** Two-column grid (text + LiveWidgetPreview), CSS `animate-in` animations, responsive badge + headline + CTA buttons.
- **FeatureGrid:** 6 feature cards with motion/react stagger animation. Uses `bg-gray-50/50` (dark mode incompatible).
- **TrustBadges:** GDPR, hosting, payment, security badges.
- **SocialProof:** Component exists with 3 placeholder testimonials (Jana, Martin, Petra) but NOT rendered on page.
- **MarketingNavbar:** Uses `bg-white/95` + backdrop-blur. Responsive (nav hidden on mobile).
- **MarketingFooter:** Uses `bg-gray-50`. 4-column grid on lg.

### Providers Structure
- `app/providers.tsx`: Only QueryClientProvider + ReactQueryDevtools. No ThemeProvider.
- `app/[locale]/layout.tsx`: Only NextIntlClientProvider.
- `app/layout.tsx`: Wraps with `<Providers>` + `<Toaster />`.

### Responsive Patterns
- Sidebar: `hidden md:flex`, mobile uses Sheet component via MobileNav
- Grids: Generally responsive (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` pattern)
- Content: `max-w-7xl mx-auto` in dashboard layout
- Marketing: `max-w-6xl mx-auto px-4`
- Some pages use `flex-col sm:flex-row` for filter bars

### Key Libraries Available
- `motion` (framer-motion v12) — for animations
- `recharts` v3 — for data visualization
- `lucide-react` — for icons
- `sonner` — for toasts
- `tailwindcss-animate` — for CSS animations

### Missing: next-themes
- Not installed. Needs `pnpm --filter @schedulebox/web add next-themes`
- ThemeProvider needs to wrap the app in `providers.tsx`
- Theme toggle component needs to be created

## Key Findings

1. **Dark mode is 90% ready structurally** — CSS variables exist for both themes, Tailwind darkMode:class configured, suppressHydrationWarning set. Just needs: next-themes install, ThemeProvider, theme toggle, and fixing ~15 files with hardcoded light colors.

2. **Loading states are inconsistent** — Some pages have good skeleton loaders (analytics, dashboard grid), others use spinner-only (billing) or text-only (bookings table). No route-level `loading.tsx` beyond the single dashboard-wide one.

3. **Dashboard layout is basic** — Linear vertical stack, no professional grid dashboard. KPI cards exist but labeled generically. No data visualization on main dashboard (charts are only on analytics page).

4. **Landing page is incomplete** — SocialProof component exists but not rendered. No testimonials section on page. Feature grid works well. Hero is solid.

5. **Design system is mostly consistent** thanks to shadcn/ui CSS variable approach, but has hardcoded color leaks (`bg-white`, `bg-gray-50`, `text-green-600`) that break dark mode.

6. **26 dashboard pages** need loading/empty/error state audit. Only ~3-4 currently have good patterns.

## Risk Assessment

- **Low risk:** Dark mode implementation (infrastructure already 90% there)
- **Medium risk:** Dashboard redesign (needs new components for KPI row + chart cards + quick actions in grid)
- **Medium risk:** Loading/empty state audit across 26 pages (repetitive but many files)
- **Low risk:** Landing page upgrade (components exist, just need assembly + dark mode fix)
- **Low risk:** Responsive audit (mostly responsive already, just edge cases)

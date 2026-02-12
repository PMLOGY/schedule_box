# Phase 13: Polish - Research

**Researched:** 2026-02-12
**Domain:** Analytics dashboards, internationalization, accessibility (WCAG 2.1 AA), performance optimization
**Confidence:** HIGH

## Summary

Phase 13 focuses on production-readiness polish across four critical domains: analytics dashboards with interactive charts, internationalization already implemented with next-intl (requires expansion), WCAG 2.1 AA accessibility compliance, and Lighthouse score >90 optimization.

The existing codebase already has foundational infrastructure in place: next-intl middleware with cs/sk/en locales, 380+ translation keys, PostgreSQL views (v_daily_booking_summary, v_customer_metrics) for analytics data, shadcn/ui components built on Radix UI primitives (accessibility-first), and PDFKit for PDF generation. The polish phase extends these foundations with interactive charting, expanded translations, accessibility testing/fixes, and performance optimizations.

**Primary recommendation:** Use Recharts for analytics charts (best React integration, declarative API, 20k+ GitHub stars), add accessibilityLayer prop for keyboard navigation, implement CSV export via react-papaparse (existing papaparse dependency), enhance PDF reports with @react-pdf/renderer for complex layouts, conduct WCAG 2.1 AA audit with axe DevTools and manual screen reader testing, and optimize Core Web Vitals (LCP, CLS, INP) through next/image priority props, font optimization, and code splitting.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.14.0 | Analytics charts & graphs | Most popular React charting library (20k+ stars), declarative API, built on React + D3, native TypeScript support, excellent Next.js integration |
| next-intl | ^4.8.2 | Internationalization (i18n) | Already implemented; official Next.js 14 App Router i18n library, middleware-based routing, type-safe translations |
| papaparse | ^5.5.3 | CSV parsing/export | Already installed; fastest in-browser CSV parser, streaming support, handles large datasets |
| react-papaparse | ^4.5.0 | React wrapper for papaparse | React-friendly API, CSVDownloader component, TypeScript support |
| @react-pdf/renderer | ^4.2.0 | Complex PDF generation | #1 PDF library for React, component-based layouts, server-side rendering, better than PDFKit for multi-page reports |
| axe-core/react | ^4.11.0 | Accessibility testing | Industry standard WCAG auditing, integrates with Lighthouse, auto-detects violations |

### Supporting Tools

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @axe-core/react | ^4.11.0 | Dev-time a11y testing | Development environment only, logs violations to console |
| eslint-plugin-jsx-a11y | ^6.11.0 | Linting for accessibility | Already in Next.js, catches common mistakes at build time |
| @radix-ui/react-* | ^1.1+ | Accessible primitives | Already used via shadcn/ui, WCAG-compliant by default |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js (react-chartjs-2) | Chart.js is faster for simple charts but less React-idiomatic; Recharts better for declarative composition |
| Recharts | Nivo | Nivo has SSR support and more chart types but steeper learning curve and larger bundle size |
| @react-pdf/renderer | PDFKit (current) | PDFKit better for server-side Node.js streams but harder for complex layouts; keep both for different use cases |
| react-papaparse | react-csv | react-csv simpler for export-only but papaparse more robust for bidirectional CSV handling |

**Installation:**
```bash
pnpm add recharts react-papaparse @react-pdf/renderer
pnpm add -D @axe-core/react
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── app/[locale]/(dashboard)/
│   ├── analytics/
│   │   ├── page.tsx                    # Main analytics dashboard
│   │   ├── revenue/page.tsx            # Revenue report with export
│   │   └── bookings/page.tsx           # Booking report with export
├── components/
│   ├── analytics/
│   │   ├── revenue-chart.tsx           # Recharts LineChart component
│   │   ├── booking-stats-chart.tsx     # Recharts BarChart component
│   │   ├── chart-container.tsx         # Accessible chart wrapper
│   │   └── export-button.tsx           # CSV/PDF export actions
│   ├── accessibility/
│   │   ├── skip-link.tsx               # Skip-to-content link
│   │   └── focus-trap.tsx              # Modal focus management
│   └── i18n/
│       └── locale-switcher.tsx         # Language selector dropdown
├── hooks/
│   ├── use-analytics-data.ts           # Fetch analytics from DB views
│   ├── use-csv-export.ts               # CSV generation hook
│   └── use-pdf-export.ts               # PDF generation hook
├── lib/
│   ├── export/
│   │   ├── csv-exporter.ts             # react-papaparse wrapper
│   │   └── pdf-templates/              # @react-pdf/renderer templates
│   └── accessibility/
│       └── focus-management.ts         # Focus trap utilities
└── messages/
    ├── cs.json                         # Czech (expand analytics keys)
    ├── sk.json                         # Slovak (expand analytics keys)
    └── en.json                         # English (expand analytics keys)
```

### Pattern 1: Accessible Chart Container

**What:** Wrapper component for Recharts that adds WCAG 2.1 AA compliance features
**When to use:** Every analytics chart in the dashboard
**Example:**
```typescript
// Source: Research synthesis from Recharts accessibility documentation
// https://github.com/recharts/recharts/wiki/Recharts-and-accessibility

import { ResponsiveContainer } from 'recharts';

interface AccessibleChartProps {
  children: React.ReactNode;
  title: string;
  description: string;
  id: string;
}

export function AccessibleChart({ children, title, description, id }: AccessibleChartProps) {
  return (
    <figure role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`}>
      <div id={`${id}-title`} className="sr-only">{title}</div>
      <div id={`${id}-desc`} className="sr-only">{description}</div>
      <ResponsiveContainer width="100%" height={350}>
        {children}
      </ResponsiveContainer>
      {/* Visible caption for sighted users */}
      <figcaption className="text-sm text-muted-foreground mt-2">
        {title}
      </figcaption>
    </figure>
  );
}

// Usage with accessibilityLayer prop
<AccessibleChart
  id="revenue-chart"
  title={t('charts.revenue.title')}
  description={t('charts.revenue.description')}
>
  <LineChart data={revenueData} accessibilityLayer>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" />
  </LineChart>
</AccessibleChart>
```

### Pattern 2: CSV Export with react-papaparse

**What:** Client-side CSV generation and download from React state/query data
**When to use:** Analytics reports, booking lists, customer exports
**Example:**
```typescript
// Source: react-papaparse official docs
// https://react-papaparse.js.org/docs

import { CSVDownloader } from 'react-papaparse';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: Record<string, any>[];
  filename: string;
  label: string;
}

export function CSVExportButton({ data, filename, label }: ExportButtonProps) {
  return (
    <CSVDownloader
      data={data}
      filename={filename}
      config={{
        delimiter: ',',
        header: true,
        skipEmptyLines: true,
      }}
    >
      <Button variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </CSVDownloader>
  );
}

// Usage in analytics page
const bookingData = bookings.map(b => ({
  id: b.id,
  customer: b.customerName,
  service: b.serviceName,
  date: format(b.startTime, 'yyyy-MM-dd HH:mm'),
  price: b.price,
  status: b.status,
}));

<CSVExportButton
  data={bookingData}
  filename={`bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`}
  label={t('export.csv')}
/>
```

### Pattern 3: PDF Report Generation

**What:** Server-side PDF generation for multi-page reports with complex layouts
**When to use:** Revenue reports, booking summaries, monthly analytics
**Example:**
```typescript
// Source: @react-pdf/renderer documentation
// https://react-pdf.org/components

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToStream } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  header: { fontSize: 24, marginBottom: 20, fontWeight: 'bold' },
  table: { display: 'table', width: '100%', marginTop: 10 },
  tableRow: { flexDirection: 'row' },
  tableCell: { padding: 5, fontSize: 10, borderWidth: 1 },
});

function RevenueReport({ data, period }: { data: any[]; period: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Revenue Report - {period}</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Date</Text>
            <Text style={styles.tableCell}>Bookings</Text>
            <Text style={styles.tableCell}>Revenue</Text>
          </View>
          {data.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{row.date}</Text>
              <Text style={styles.tableCell}>{row.bookings}</Text>
              <Text style={styles.tableCell}>{row.revenue} CZK</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

// API route for PDF download
export async function GET(request: Request) {
  const data = await getRevenueData(); // Fetch from DB view
  const stream = await renderToStream(<RevenueReport data={data} period="January 2026" />);

  return new Response(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="revenue-report-${Date.now()}.pdf"`,
    },
  });
}
```

### Pattern 4: Skip-to-Content Link

**What:** Hidden keyboard-accessible link to skip navigation for screen readers
**When to use:** Root layout component, visible only on keyboard focus
**Example:**
```typescript
// Source: Reach UI Skip Nav documentation
// https://reach.tech/skip-nav/

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
    >
      Skip to main content
    </a>
  );
}

// In layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div>
      <SkipLink />
      <Sidebar />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
```

### Pattern 5: Accessible Form Errors with react-hook-form

**What:** Screen reader announcements for validation errors using aria-live
**When to use:** All forms with validation (already using react-hook-form)
**Example:**
```typescript
// Source: React Hook Form accessibility best practices
// https://carlrippon.com/accessible-react-forms/

import { useFormContext } from 'react-hook-form';

export function AccessibleInput({ name, label, ...props }) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];
  const errorId = `${name}-error`;

  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...register(name)}
        {...props}
      />
      {error && (
        <div id={errorId} role="alert" aria-live="assertive" className="text-destructive text-sm mt-1">
          {error.message}
        </div>
      )}
    </div>
  );
}
```

### Pattern 6: Locale Switcher Component

**What:** Server-rendered language selector with client-side interactivity
**When to use:** Header/navigation area for all authenticated pages
**Example:**
```typescript
// Source: next-intl locale switcher best practices
// https://next-intl.dev/docs/routing/navigation

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('common');

  const locales = [
    { code: 'cs', label: 'Čeština' },
    { code: 'sk', label: 'Slovenčina' },
    { code: 'en', label: 'English' },
  ];

  const handleChange = (newLocale: string) => {
    // Replace locale prefix in pathname
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]" aria-label={t('selectLanguage')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc.code} value={loc.code}>
            {loc.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Anti-Patterns to Avoid

- **Don't load Recharts in SSR without dynamic import:** Charts use browser APIs; always use `dynamic(() => import('./chart'), { ssr: false })`
- **Don't skip accessibilityLayer on charts:** Keyboard users can't navigate data points without it
- **Don't use generic "Click here" link text:** Screen readers announce link text out of context; use descriptive labels
- **Don't forget aria-labels on icon-only buttons:** Icon buttons without labels are meaningless to screen readers
- **Don't use color alone to convey information:** Charts must have patterns/labels in addition to color for color-blind users
- **Don't lazy-load above-the-fold images:** Use `priority` prop on next/image for LCP optimization
- **Don't bundle PDF libraries in client code:** Always lazy-load or generate server-side to avoid huge bundles

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG/Canvas charts | Recharts with accessibilityLayer | Accessible keyboard navigation, ARIA labels, responsive layouts, tested across browsers |
| CSV parsing | String manipulation `.split(',')` | react-papaparse | Handles quoted fields, escaped delimiters, multi-line values, encoding issues |
| PDF generation | Manual Canvas API or html2canvas | @react-pdf/renderer | Multi-page layouts, fonts, pagination, tables, proper PDF structure |
| i18n routing | Custom locale detection in middleware | next-intl createMiddleware | Cookie persistence, locale negotiation, type-safe translations, SEO-friendly URLs |
| Focus trapping in modals | Manual tabIndex management | Radix Dialog (already via shadcn) | Escape key handling, focus restoration, focus lock, ARIA attributes |
| Color contrast validation | Manual color picking | axe DevTools + Lighthouse | Automated WCAG 2.1 AA contrast ratio checking (4.5:1 text, 3:1 UI) |
| Screen reader testing | Guessing ARIA attributes | Manual testing with NVDA/VoiceOver | Real user experience testing catches issues automated tools miss |

**Key insight:** Accessibility and data visualization have complex edge cases (timezones in charts, right-to-left languages, screen reader quirks) that mature libraries handle through years of community testing and bug fixes.

## Common Pitfalls

### Pitfall 1: Recharts SSR Hydration Mismatch

**What goes wrong:** Recharts uses browser APIs (window, ResizeObserver) that don't exist in server-side rendering, causing hydration errors in Next.js 14.
**Why it happens:** Next.js 14 App Router pre-renders components on the server by default; Recharts assumes a browser environment.
**How to avoid:** Always wrap chart components with Next.js dynamic import and `ssr: false`:
```typescript
const RevenueChart = dynamic(() => import('@/components/analytics/revenue-chart'), {
  ssr: false,
  loading: () => <div className="h-[350px] animate-pulse bg-muted rounded" />
});
```
**Warning signs:** Console errors like "window is not defined" or "ResizeObserver is not defined" during build.

### Pitfall 2: Missing aria-live on Form Errors

**What goes wrong:** react-hook-form shows validation errors visually, but screen readers don't announce them because they're not in a live region.
**Why it happens:** Dynamic content changes aren't announced unless explicitly marked with aria-live or role="alert".
**How to avoid:** Always add `role="alert"` or `aria-live="assertive"` to error message elements:
```typescript
{errors.email && (
  <span role="alert" className="text-destructive text-sm">
    {errors.email.message}
  </span>
)}
```
**Warning signs:** Automated axe tests pass but manual screen reader testing reveals silent validation failures.

### Pitfall 3: next-intl Middleware Matcher Too Restrictive

**What goes wrong:** Middleware doesn't run on certain routes, causing locale detection to fail and translations to break.
**Why it happens:** Default matcher patterns often exclude routes with dots or specific prefixes.
**How to avoid:** Use comprehensive matcher that includes all localized routes:
```typescript
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
  // Excludes: /api/*, /_next/*, /_vercel/*, static files with dots
  // Includes: /, /dashboard, /bookings, /[locale]/* etc.
};
```
**Warning signs:** Locale detection works on some pages but not others; hard-to-reproduce translation bugs.

### Pitfall 4: Low Lighthouse Score Due to Unoptimized Images

**What goes wrong:** Dashboard shows analytics charts/images but Lighthouse scores <90 due to large image sizes and missing optimization.
**Why it happens:** Developers use `<img>` tags or forget `priority` prop on above-the-fold images.
**How to avoid:** Always use next/image with proper configuration:
```typescript
import Image from 'next/image';

// Above-the-fold image (hero, logo)
<Image src="/logo.png" alt="ScheduleBox" width={200} height={50} priority />

// Below-the-fold images (lazy-loaded automatically)
<Image src="/chart.png" alt="Revenue chart" width={800} height={400} />
```
Configure WebP/AVIF in `next.config.mjs`:
```javascript
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
};
```
**Warning signs:** Lighthouse flags "Serve images in next-gen formats" or "Properly size images".

### Pitfall 5: Color-Only Data Differentiation in Charts

**What goes wrong:** Chart uses different colors for categories but color-blind users can't distinguish them (WCAG 1.4.1 violation).
**Why it happens:** Recharts default styling relies on color alone without additional visual cues.
**How to avoid:** Add patterns, labels, and textures in addition to color:
```typescript
<LineChart data={data}>
  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
  <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" />
  {/* Different stroke pattern for color-blind users */}
  <Legend />
  <Tooltip />
</LineChart>
```
**Warning signs:** axe DevTools flags "Ensures the contrast between foreground and background colors meets WCAG 2 AA".

### Pitfall 6: PDF Generation Blocking Main Thread

**What goes wrong:** Generating large PDF reports in the browser freezes the UI and causes poor INP (Interaction to Next Paint) scores.
**Why it happens:** PDF rendering is CPU-intensive; doing it synchronously blocks the main thread.
**How to avoid:** Generate PDFs server-side via API routes:
```typescript
// app/api/v1/reports/revenue/pdf/route.ts
export async function GET(request: Request) {
  const data = await getRevenueData(); // Server-side DB query
  const stream = await renderToStream(<RevenueReport data={data} />);
  return new Response(stream as any, {
    headers: { 'Content-Type': 'application/pdf' }
  });
}

// Client component
async function handlePDFExport() {
  setLoading(true);
  const res = await fetch('/api/v1/reports/revenue/pdf');
  const blob = await res.blob();
  downloadBlob(blob, 'revenue-report.pdf');
  setLoading(false);
}
```
**Warning signs:** Lighthouse flags "Avoid long main-thread tasks"; UI freezes during PDF generation.

### Pitfall 7: Keyboard Trap in Modals

**What goes wrong:** User opens a modal with keyboard (Tab key), but pressing Escape doesn't close it, or focus moves outside the modal.
**Why it happens:** Custom modal implementations forget to handle Escape key and focus trapping.
**How to avoid:** Use Radix Dialog (already via shadcn/ui) which handles this automatically:
```typescript
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger>Open Report</DialogTrigger>
  <DialogContent>
    {/* Focus automatically trapped, Escape closes, focus restored on close */}
    <ReportSettings />
  </DialogContent>
</Dialog>
```
**Warning signs:** Manual keyboard testing reveals inability to close modals with Escape or tab-out of modal boundaries.

## Code Examples

Verified patterns from official sources and existing codebase:

### Revenue Trend Chart (Recharts)

```typescript
// Source: Recharts official documentation + accessibility layer
// https://recharts.org/en-US/api/LineChart

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
    bookings: number;
  }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={data}
          accessibilityLayer // Enables keyboard navigation + ARIA
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'MMM d')}
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            label={{ value: 'Revenue (CZK)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toLocaleString('cs')} CZK`, 'Revenue']}
            labelFormatter={(label) => format(new Date(label), 'PPP')}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            strokeWidth={2}
            activeDot={{ r: 8 }}
            name="Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Analytics Data Hook Using DB Views

```typescript
// Source: Existing codebase pattern + PostgreSQL views
// D:\Project\ScheduleBox\packages\database\src\schema\views.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { format, subDays } from 'date-fns';

interface DailyBookingSummary {
  bookingDate: string;
  totalBookings: number;
  completed: number;
  cancelled: number;
  noShows: number;
  totalRevenue: number;
}

export function useRevenueAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'revenue', days],
    queryFn: async () => {
      // Backend queries v_daily_booking_summary view
      const response = await apiClient.get<DailyBookingSummary[]>(
        `/analytics/revenue`,
        { days }
      );

      return response.map((row) => ({
        date: row.bookingDate,
        revenue: row.totalRevenue,
        bookings: row.completed,
        cancelled: row.cancelled,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Backend API implementation (apps/web/app/api/v1/analytics/revenue/route.ts)
import { db } from '@schedulebox/database';
import { dailyBookingSummary } from '@schedulebox/database/schema';
import { sql, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const startDate = subDays(new Date(), days);

  const data = await db
    .select()
    .from(dailyBookingSummary)
    .where(
      sql`${dailyBookingSummary.companyId} = ${session.companyId}
          AND ${dailyBookingSummary.bookingDate} >= ${format(startDate, 'yyyy-MM-dd')}`
    )
    .orderBy(dailyBookingSummary.bookingDate);

  return Response.json(data);
}
```

### CSV Export Implementation

```typescript
// Source: react-papaparse documentation
// https://react-papaparse.js.org/docs

import { jsonToCSV } from 'react-papaparse';
import { format } from 'date-fns';

interface ExportData {
  data: Record<string, any>[];
  filename: string;
}

export function downloadCSV({ data, filename }: ExportData) {
  const csv = jsonToCSV(data, {
    delimiter: ',',
    header: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Usage in component
export function RevenueReportPage() {
  const { data } = useRevenueAnalytics(30);

  const handleExportCSV = () => {
    if (!data) return;

    downloadCSV({
      data: data.map((row) => ({
        Date: format(new Date(row.date), 'yyyy-MM-dd'),
        Revenue: row.revenue,
        Bookings: row.bookings,
        Cancelled: row.cancelled,
      })),
      filename: `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    });
  };

  return (
    <Button onClick={handleExportCSV}>
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
}
```

### Translation Keys for Analytics

```json
// apps/web/messages/cs.json (expand existing)
{
  "analytics": {
    "title": "Analytika",
    "description": "Přehled klíčových metrik",
    "revenue": {
      "title": "Tržby",
      "chart": {
        "title": "Vývoj tržeb za posledních 30 dní",
        "description": "Graf zobrazující denní tržby z dokončených rezervací"
      },
      "total": "Celkové tržby",
      "average": "Průměrné tržby",
      "period": "Období"
    },
    "bookings": {
      "title": "Rezervace",
      "chart": {
        "title": "Statistika rezervací",
        "description": "Graf zobrazující počet dokončených, zrušených a nedostavených se rezervací"
      },
      "completed": "Dokončeno",
      "cancelled": "Zrušeno",
      "noShow": "Nedostavil se"
    },
    "export": {
      "csv": "Exportovat CSV",
      "pdf": "Exportovat PDF",
      "downloading": "Stahování...",
      "success": "Export byl úspěšně stažen",
      "error": "Chyba při exportu dat"
    },
    "period": {
      "last7days": "Posledních 7 dní",
      "last30days": "Posledních 30 dní",
      "last90days": "Posledních 90 dní",
      "thisMonth": "Tento měsíc",
      "lastMonth": "Minulý měsíc",
      "custom": "Vlastní období"
    }
  },
  "accessibility": {
    "skipToContent": "Přeskočit na obsah",
    "selectLanguage": "Vybrat jazyk",
    "closeDialog": "Zavřít dialog",
    "openMenu": "Otevřít menu"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FID (First Input Delay) | INP (Interaction to Next Paint) | March 2024 | INP measures responsiveness across entire page lifecycle, not just first interaction; stricter threshold (200ms vs 100ms) |
| Chart.js with wrappers | Recharts with React components | 2022-2023 | Declarative API fits React paradigm better; easier composition; TypeScript support out-of-box |
| next-i18next (Pages Router) | next-intl (App Router) | Next.js 13+ | Middleware-based routing; better type safety; smaller bundle size; official Next.js 14 recommendation |
| PDFKit for all PDFs | @react-pdf/renderer + PDFKit | 2023+ | React components for complex layouts; PDFKit still best for streams and simple docs |
| WCAG 2.1 (2018) | WCAG 2.2 (2023) | June 2023 | New success criteria: 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication |
| WebP only | AVIF + WebP fallback | 2024+ | AVIF 50-80% smaller than JPEG; WebP fallback for older browsers; next/image supports both |

**Deprecated/outdated:**

- **next-i18next:** Pages Router only; use next-intl for App Router (current project setup)
- **Chart.js react-chartjs-2:** Still viable but less React-idiomatic than Recharts
- **FID metric:** Replaced by INP in Core Web Vitals (March 2024)
- **WCAG 2.0:** Superseded by WCAG 2.1 (2018) and 2.2 (2023); aim for 2.1 Level AA minimum
- **html2pdf.js / html2canvas:** Poor PDF quality and layout issues; use @react-pdf/renderer

## Open Questions

1. **Should we target WCAG 2.2 (2023) instead of 2.1 (2018)?**
   - What we know: WCAG 2.2 adds 9 new success criteria, mostly around mobile interactions and cognitive accessibility
   - What's unclear: Whether European Accessibility Act (EAA, June 2025 deadline) requires 2.1 or 2.2
   - Recommendation: Target WCAG 2.1 Level AA for now (legal requirement), document 2.2 gaps for future enhancement

2. **Should we implement real-time analytics updates via WebSockets?**
   - What we know: Current approach uses TanStack Query with 5-minute staleTime for polling
   - What's unclear: Whether stakeholders need real-time dashboard updates or if 5-minute refresh is acceptable
   - Recommendation: Start with polling (simpler, already implemented); add WebSocket streaming in later phase if requested

3. **How should we handle large dataset exports (10k+ bookings)?**
   - What we know: react-papaparse can stream large datasets; @react-pdf/renderer may struggle with 100+ page PDFs
   - What's unclear: What are realistic dataset sizes? Current customer size projections?
   - Recommendation: Implement pagination for exports (max 10k rows per CSV, 100 pages per PDF), add date range filters

4. **Should we add data table virtualization for large analytics tables?**
   - What we know: @tanstack/react-table supports virtualization; Recharts has performance limits around 1000+ data points
   - What's unclear: Whether analytics queries will return 1000+ rows or if DB aggregation keeps it <100 rows
   - Recommendation: Use DB views for aggregation (current approach); add virtualization only if performance issues arise

## Sources

### Primary (HIGH confidence)

**Charting Libraries:**
- [Top 5 React Chart Libraries 2026 | Syncfusion](https://www.syncfusion.com/blogs/post/top-5-react-chart-libraries)
- [Recharts vs Chart.js vs Victory vs Nivo Comparison | LogRocket](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Recharts Accessibility Wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)
- [Recharts Accessibility Discussion #4484](https://github.com/recharts/recharts/discussions/4484)

**Internationalization:**
- [next-intl Middleware Documentation](https://next-intl.dev/docs/routing/middleware)
- [next-intl Best Practices 2026 | Phrase](https://phrase.com/blog/posts/next-js-app-router-localization-next-intl/)

**Accessibility:**
- [WCAG 2.1 AA Compliance Guide | Innowise](https://innowise.com/blog/wcag-21-aa/)
- [React Accessibility Best Practices | AllAccessible](https://www.allaccessible.org/blog/react-accessibility-best-practices-guide)
- [Radix UI Accessibility Documentation](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Next.js and Accessibility | Bejamas](https://bejamas.com/hub/guides/next-js-and-accessibility)
- [Skip Navigation Implementation | Reach UI](https://reach.tech/skip-nav/)
- [Accessible React Forms | Carl Rippon](https://carlrippon.com/accessible-react-forms/)

**Performance:**
- [Next.js Image Optimization Documentation](https://nextjs.org/docs/14/app/building-your-application/optimizing/images)
- [Next.js Lighthouse Score Optimization | Wisp CMS](https://www.wisp.blog/blog/mastering-mobile-performance-a-complete-guide-to-improving-nextjs-lighthouse-scores)
- [Core Web Vitals Optimization 2026 | aTeam Soft Solutions](https://www.ateamsoftsolutions.com/core-web-vitals-optimization-guide-2025-showing-lcp-inp-cls-metrics-and-performance-improvement-strategies-for-web-applications/)

**CSV/PDF Export:**
- [react-papaparse Documentation](https://react-papaparse.js.org/)
- [Best JavaScript PDF Libraries 2025 | Nutrient](https://www.nutrient.io/blog/javascript-pdf-libraries/)
- [@react-pdf/renderer vs PDFKit Comparison | npm-compare](https://npm-compare.com/@react-pdf/renderer,jspdf,pdfmake,react-pdf)

**Database Analytics:**
- [PostgreSQL for Analytics | Domo](https://www.domo.com/learn/article/postgresql-for-data-analysis-a-complete-guide)
- [Postgres Materialized Views for Dashboards | Epsio](https://www.epsio.io/blog/postgres-for-analytics-workloads-capabilities-and-performance-tips)

### Secondary (MEDIUM confidence)

- [shadcn/ui Best Practices 2026 | Medium](https://medium.com/write-a-catalyst/shadcn-ui-best-practices-for-2026-444efd204f44)
- [shadcn/ui Charts Accessibility Review | Ashlee M Boyer](https://ashleemboyer.com/blog/a-quick-ish-accessibility-review-shadcn-ui-charts/)
- [React Chart Libraries Comparison | Medium](https://medium.com/@ponshriharini/comparing-8-popular-react-charting-libraries-performance-features-and-use-cases-cc178d80b3ba)
- [React CSV Best Practices | DhiWise](https://www.dhiwise.com/post/react-csv-best-practices-optimizing-performance)

### Tertiary (LOW confidence, marked for validation)

- None - all findings verified with official documentation or multiple sources

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Recharts, next-intl, react-papaparse verified via official docs and existing codebase
- Architecture: HIGH - Patterns based on official documentation and community best practices
- Accessibility: MEDIUM - WCAG 2.1 AA requirements clear, but manual testing needed for full compliance verification
- Performance: HIGH - Next.js 14 optimization strategies documented in official guides
- Pitfalls: MEDIUM-HIGH - Based on community reports and official issue trackers

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days - stable ecosystem, mature libraries)

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { GradientMesh } from '@/components/glass/gradient-mesh';
import { SkipLink } from '@/components/accessibility/skip-link';
import { MarketingNavbar } from './_components/marketing-navbar';
import { MarketingFooter } from './_components/marketing-footer';
import { CookieConsentBanner } from './_components/cookie-consent-banner';

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
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <SkipLink />
      <GradientMesh preset="marketing" />
      <MarketingNavbar />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <MarketingFooter />
      <CookieConsentBanner />
    </div>
  );
}

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { GradientMesh } from '@/components/glass/gradient-mesh';
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
      <GradientMesh preset="marketing" />
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <CookieConsentBanner />
    </div>
  );
}

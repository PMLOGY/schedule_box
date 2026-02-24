import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { HeroSection } from './_components/hero-section';
import { FeatureGrid } from './_components/feature-grid';
import { SocialProof } from './_components/social-proof';
import { TrustBadges } from './_components/trust-badges';

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

  return (
    <>
      <HeroSection />
      <FeatureGrid />
      <SocialProof />
      <TrustBadges />
    </>
  );
}

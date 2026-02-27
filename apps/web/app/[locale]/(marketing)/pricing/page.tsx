import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { PricingTable } from '../_components/pricing-table';
import { SocialProof } from '../_components/social-proof';

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
    title: t('pricingTitle'),
    description: t('pricingDescription'),
  };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing.pricing');

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <h1 className="text-center text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        {t('title')}
      </h1>
      <div className="mt-12">
        <PricingTable />
      </div>
      <SocialProof />
    </div>
  );
}

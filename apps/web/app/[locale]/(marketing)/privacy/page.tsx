import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'ScheduleBox s.r.o.';
const COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Příkladná 1, 110 00 Praha 1';
const COMPANY_ICO = process.env.NEXT_PUBLIC_COMPANY_ICO || '12345678';

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
    title: t('privacyTitle'),
  };
}

const SECTIONS = [
  'controller',
  'dataCollected',
  'purpose',
  'legalBasis',
  'retention',
  'rights',
  'cookies',
  'contact',
] as const;

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing.privacy');

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}: 1. 1. 2026</p>

      <div className="mt-8 space-y-8 text-base leading-7">
        {SECTIONS.map((key, i) => (
          <section key={key}>
            <h2 className="text-xl font-semibold">
              {i + 1}. {t(`${key}.title`)}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t(`${key}.text`, {
                company: COMPANY_NAME,
                ico: COMPANY_ICO,
                address: COMPANY_ADDRESS,
              })}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}

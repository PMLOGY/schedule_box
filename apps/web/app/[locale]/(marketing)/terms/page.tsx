import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { Link } from '@/lib/i18n/navigation';
import type { Metadata } from 'next';
import { GlassPanel } from '@/components/glass/glass-panel';

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
    title: t('termsTitle'),
  };
}

const SECTIONS = [
  'intro',
  'description',
  'registration',
  'pricing',
  'usage',
  'liability',
  'dataProtection',
  'final',
] as const;

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing.terms');

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <GlassPanel intensity="subtle" className="p-8">
        <article>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}: 1. 1. 2026</p>

          <div className="mt-8 space-y-8 text-base leading-7">
            {SECTIONS.map((key, i) => (
              <section key={key}>
                <h2 className="text-xl font-semibold">
                  {i + 1}. {t(`${key}.title`)}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {key === 'dataProtection' ? (
                    <>
                      {t('dataProtection.textBefore')}{' '}
                      <Link href="/privacy" className="text-primary underline hover:no-underline">
                        {t('dataProtection.link')}
                      </Link>
                      {t('dataProtection.textAfter')}
                    </>
                  ) : (
                    t(`${key}.text`)
                  )}
                </p>
              </section>
            ))}
          </div>
        </article>
      </GlassPanel>
    </div>
  );
}

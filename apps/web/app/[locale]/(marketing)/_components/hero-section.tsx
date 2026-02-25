import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LiveWidgetPreview } from './live-widget-preview';

export async function HeroSection() {
  const t = await getTranslations('landing.hero');

  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      <div className="absolute inset-0 aurora-bg opacity-60 dark:opacity-30" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left column — text */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {t('badge')}
            </span>
            <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl xl:text-6xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('headline')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t('subheadline')}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/register">{t('cta')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#demo">{t('ctaSecondary')}</a>
              </Button>
            </div>
          </div>

          {/* Right column — live widget */}
          <div
            id="demo"
            className="max-w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
            style={{ animationDelay: '200ms' }}
          >
            <LiveWidgetPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

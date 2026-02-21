import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LiveWidgetPreview } from './live-widget-preview';

export async function HeroSection() {
  const t = await getTranslations('landing.hero');

  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left column — text */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {t('badge')}
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
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
            className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
            style={{ animationDelay: '200ms' }}
          >
            <LiveWidgetPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

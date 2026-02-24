import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';

export async function MarketingNavbar() {
  const t = await getTranslations('landing.nav');

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-primary">
          ScheduleBox
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('features')}
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('pricing')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <Button asChild size="sm">
            <Link href="/register">{t('cta')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

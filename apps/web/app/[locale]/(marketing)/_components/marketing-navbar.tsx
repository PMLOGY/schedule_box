'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

function MobileNav({
  featuresLabel,
  pricingLabel,
  ctaLabel,
  loginLabel,
}: {
  featuresLabel: string;
  pricingLabel: string;
  ctaLabel: string;
  loginLabel: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-primary">ScheduleBox</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-4">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {featuresLabel}
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {pricingLabel}
          </Link>
        </nav>
        <div className="mt-6">
          <LocaleSwitcher />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/register">{ctaLabel}</Link>
          </Button>
          <Button asChild className="w-full">
            <Link href="/login">{loginLabel}</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MarketingNavbar() {
  const t = useTranslations('landing.nav');

  return (
    <header className="sticky top-0 z-50 border-b border-glass glass-surface-subtle">
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
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/register">{t('cta')}</Link>
          </Button>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/login">{t('login')}</Link>
          </Button>
          <MobileNav
            featuresLabel={t('features')}
            pricingLabel={t('pricing')}
            ctaLabel={t('cta')}
            loginLabel={t('login')}
          />
        </div>
      </div>
    </header>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useUIStore } from '@/stores/ui.store';
import { Breadcrumbs } from './breadcrumbs';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export function Header() {
  const t = useTranslations('accessibility');
  const { toggleMobileSidebar } = useUIStore();

  return (
    <>
      <header
        role="banner"
        className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileSidebar}
            aria-label={t('openMenu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </header>
      <MobileNav />
    </>
  );
}

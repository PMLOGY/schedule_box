'use client';

import { useUIStore } from '@/stores/ui.store';
import { Breadcrumbs } from './breadcrumbs';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export function Header() {
  const { toggleMobileSidebar } = useUIStore();

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <Breadcrumbs />
        </div>
        <UserMenu />
      </header>
      <MobileNav />
    </>
  );
}

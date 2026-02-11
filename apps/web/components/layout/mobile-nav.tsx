'use client';

import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { filterNavByRole } from '@/lib/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const { sidebarMobileOpen, toggleMobileSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  const navItems = user ? filterNavByRole(user.role) : [];

  const handleLogout = () => {
    logout();
    toggleMobileSidebar();
    router.push('/login');
  };

  return (
    <Sheet open={sidebarMobileOpen} onOpenChange={toggleMobileSidebar}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-xl font-bold text-primary">ScheduleBox</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => toggleMobileSidebar()}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <>
            <Separator />
            <div className="p-4">
              <div className="mb-3 text-sm">
                <div className="font-medium">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Odhlásit se
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

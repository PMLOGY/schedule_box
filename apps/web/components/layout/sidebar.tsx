'use client';

import { useState, useEffect } from 'react';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { filterNavByRole } from '@/lib/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Clear pending state once navigation completes
  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const navItems = user ? filterNavByRole(user.role) : [];

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {sidebarCollapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white font-bold">
            S
          </div>
        ) : (
          <div className="text-xl font-bold text-primary">ScheduleBox</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
        <TooltipProvider>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isPending = pendingPath === item.href && !isActive;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (!isActive) setPendingPath(item.href);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isPending
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5 flex-shrink-0" />
                )}
                {!sidebarCollapsed && <span>{t(item.key)}</span>}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{t(item.key)}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </TooltipProvider>
      </nav>

      {/* Toggle button */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Skrýt</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

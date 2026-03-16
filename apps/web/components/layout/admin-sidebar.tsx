'use client';

import { useState, useEffect } from 'react';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUIStore } from '@/stores/ui.store';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-navigation';
import { ChevronLeft, ChevronRight, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations('admin.nav');
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Clear pending state once navigation completes
  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-full border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4 gap-2">
        {sidebarCollapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white font-bold">
            A
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <div className="text-xl font-bold text-red-600">Admin</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-1 p-2" aria-label="Admin navigation">
        <TooltipProvider>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
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
                    ? 'bg-red-600 text-white'
                    : isPending
                      ? 'bg-red-600/20 text-red-600'
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

      {/* Spacer to push bottom section down */}
      <div className="flex-1" />

      {/* Collapse toggle */}
      <div className="border-t p-2 space-y-1">
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
              <span className="ml-2">{t('collapse')}</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

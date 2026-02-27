'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/lib/i18n/navigation';
import { useUsageQuery, type UsageItem } from '@/hooks/use-usage-query';
import { cn } from '@/lib/utils';

/**
 * Resource label mapping for i18n keys.
 * Maps API resource names to translation keys.
 */
const RESOURCE_KEYS: Record<string, string> = {
  bookings: 'bookings',
  employees: 'employees',
  services: 'services',
};

/**
 * Get the color class for a progress bar based on usage percentage.
 * - Default (< 80%): primary blue
 * - Warning (>= 80%, < 100%): amber
 * - Critical (>= 100%): red
 */
function getProgressColor(percentUsed: number): string {
  if (percentUsed >= 100) return '[&>div]:bg-red-500';
  if (percentUsed >= 80) return '[&>div]:bg-amber-500';
  return '';
}

function UsageItemRow({ item, t }: { item: UsageItem; t: ReturnType<typeof useTranslations> }) {
  const resourceKey = RESOURCE_KEYS[item.resource] || item.resource;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t(`widget.${resourceKey}`)}</span>
        <span className="text-muted-foreground">
          {item.unlimited
            ? `${item.current} / ${t('widget.unlimited')}`
            : `${item.current} / ${item.limit}`}
        </span>
      </div>
      {!item.unlimited && (
        <Progress
          value={item.percentUsed}
          className={cn('h-2', getProgressColor(item.percentUsed))}
        />
      )}
    </div>
  );
}

export function UsageWidget() {
  const t = useTranslations('usage');
  const { data: usage, isLoading } = useUsageQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const hasWarning = usage.items.some((item) => item.warning);
  const planKey = usage.plan as 'free' | 'essential' | 'growth' | 'ai_powered';
  const isTopTier = usage.plan === 'ai_powered';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          {t('widget.title')}
        </CardTitle>
        <Badge variant="secondary">{t(`widget.plan.${planKey}`)}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {usage.items.map((item) => (
          <UsageItemRow key={item.resource} item={item} t={t} />
        ))}

        {hasWarning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t('widget.warning')}</span>
          </div>
        )}
      </CardContent>

      {!isTopTier && (
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={'/settings/billing' as Parameters<typeof Link>[0]['href']}>
              {t('widget.upgrade')}
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

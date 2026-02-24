'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnboardingChecklist } from '@/hooks/use-onboarding-checklist';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';

const DISMISSED_KEY_PREFIX = 'sb_checklist_dismissed_';

export function OnboardingChecklist() {
  const t = useTranslations('onboarding.checklist');
  const { data: companySettings } = useCompanySettingsQuery();
  const { items, completedCount, totalCount, isAllComplete, isLoading } = useOnboardingChecklist();
  const router = useRouter();

  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydration guard — read localStorage only after mount
  useEffect(() => {
    setMounted(true);
    if (companySettings?.uuid) {
      const key = `${DISMISSED_KEY_PREFIX}${companySettings.uuid}`;
      if (localStorage.getItem(key) === 'true') {
        setDismissed(true);
      }
    }
  }, [companySettings?.uuid]);

  const handleDismiss = () => {
    if (companySettings?.uuid) {
      const key = `${DISMISSED_KEY_PREFIX}${companySettings.uuid}`;
      localStorage.setItem(key, 'true');
    }
    setDismissed(true);
  };

  const handleItemClick = (href: string) => {
    router.push(href as Parameters<typeof router.push>[0]);
  };

  // Don't render until mounted (prevents hydration mismatch) or if dismissed
  if (!mounted || dismissed) return null;

  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <Card className="relative">
      {/* Dismiss button — only when all items are complete */}
      {isAllComplete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('title')}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('progress', { completed: completedCount, total: totalCount })}
            </span>
            <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Checklist items */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                {item.completed ? (
                  <div className="flex items-start gap-3 py-2 px-3 rounded-md">
                    <div className="mt-0.5 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight line-through text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full text-left flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                    onClick={() => handleItemClick(item.href)}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * AiOnboardingState Component
 *
 * Progress indicator for companies with fewer than 10 bookings.
 * Encourages users to reach the AI activation threshold by showing
 * how close they are to enabling AI-powered predictions.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface AiOnboardingStateProps {
  totalBookings: number;
  threshold?: number;
}

export function AiOnboardingState({ totalBookings, threshold = 10 }: AiOnboardingStateProps) {
  const t = useTranslations('ai.onboarding');

  const progressValue = Math.min((totalBookings / threshold) * 100, 100);
  const remaining = Math.max(threshold - totalBookings, 0);
  const isAlmostThere = totalBookings >= 7;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
          <Brain className="h-5 w-5 text-primary/60" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('description')}</p>

        <Progress value={progressValue} className="h-2" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('progress', { count: totalBookings })}</span>
          {isAlmostThere && remaining > 0 && (
            <span className="font-medium text-primary">{t('almostThere', { remaining })}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

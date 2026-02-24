/**
 * AiInsightsPanel Component
 *
 * Dashboard card showing a daily AI digest with high-risk bookings.
 * Conditionally renders the active insights view (10+ bookings) or
 * the onboarding progress state (fewer than 10 bookings).
 * Degrades gracefully: skeleton on loading, hidden on error.
 */

'use client';

import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Brain, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/lib/i18n/navigation';
import { useAiInsightsQuery } from '@/hooks/use-ai-insights-query';
import { AiOnboardingState } from './AiOnboardingState';
import { NoShowRiskBadge } from './NoShowRiskBadge';

export function AiInsightsPanel() {
  const t = useTranslations('ai.insights');
  const { data, isLoading, isError } = useAiInsightsQuery();

  // While loading: render skeleton
  if (isLoading) {
    return <Skeleton className="h-[200px] rounded-xl" />;
  }

  // On error: graceful degradation — AI panel is non-critical
  if (isError || !data) {
    return null;
  }

  // Company hasn't reached AI activation threshold
  if (!data.aiActive) {
    return <AiOnboardingState totalBookings={data.totalCompanyBookings} />;
  }

  // Active AI insights view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('title')}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {t('totalToday', { count: data.totalTodayBookings })}
          </Badge>
        </div>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High-risk bookings summary */}
        {data.highRiskCount > 0 ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {t('highRiskToday', { count: data.highRiskCount })}
            </div>

            {/* List of high-risk bookings (max 5 shown) */}
            <div className="space-y-2">
              {data.highRiskBookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.bookingId}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">{booking.customerName}</div>
                    <div className="text-muted-foreground">
                      {booking.serviceName} - {format(new Date(booking.startTime), 'HH:mm')}
                    </div>
                  </div>
                  <NoShowRiskBadge probability={booking.noShowProbability} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">{t('noHighRisk')}</div>
        )}

        {/* Suggestions */}
        {data.suggestions.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            {data.suggestions.map((suggestion, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {suggestion}
              </p>
            ))}
          </div>
        )}

        {/* Link to bookings */}
        <Link
          href="/bookings"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {t('viewAll')} <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

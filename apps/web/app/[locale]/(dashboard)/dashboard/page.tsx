'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RevenueMiniChart } from '@/components/dashboard/revenue-mini-chart';
import { RecentBookings } from '@/components/dashboard/recent-bookings';
import { AiInsightsPanel } from '@/components/ai/AiInsightsPanel';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist';
import { DemoDataCard } from '@/components/onboarding/demo-data-card';
import { useOnboardingRedirect } from '@/hooks/use-onboarding';
import { UsageWidget } from '@/components/dashboard/usage-widget';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tOnboarding = useTranslations('onboarding');
  const router = useRouter();
  const { shouldRedirect, isLoading } = useOnboardingRedirect();

  // Redirect to /onboarding when wizard has not been completed
  useEffect(() => {
    if (!isLoading && shouldRedirect) {
      router.replace('/onboarding' as Parameters<typeof router.replace>[0]);
    }
  }, [shouldRedirect, isLoading, router]);

  // Prevent flash of dashboard content before redirect status is known
  if (isLoading) return null;

  // Welcome banner: redirect is in progress; show friendly card instead of full dashboard
  if (shouldRedirect) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <h1 className="text-2xl font-bold">{tOnboarding('welcomeBanner.title')}</h1>
            <p className="text-muted-foreground">{tOnboarding('welcomeBanner.description')}</p>
            <Button asChild>
              <Link href="/onboarding">{tOnboarding('welcomeBanner.action')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row with quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {t('title')}
        </h1>
        <QuickActions />
      </div>

      {/* Onboarding (conditional, above KPIs for new users) */}
      <OnboardingChecklist />
      <DemoDataCard />

      {/* KPI Summary Row */}
      <DashboardGrid />

      {/* Data visualization row: 2-column grid on lg */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueMiniChart />
        </div>
        <div className="lg:col-span-1">
          <RecentBookings />
        </div>
      </div>

      {/* AI Insights */}
      <AiInsightsPanel />

      {/* Usage widget */}
      <UsageWidget />
    </div>
  );
}

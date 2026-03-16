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
import { BookingLinkCard } from '@/components/dashboard/booking-link-card';
import { useOnboardingRedirect } from '@/hooks/use-onboarding';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { UsageWidget } from '@/components/dashboard/usage-widget';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain } from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tOnboarding = useTranslations('onboarding');
  const router = useRouter();
  const { shouldRedirect, isLoading } = useOnboardingRedirect();
  const { canAccess } = usePlanFeatures();
  const user = useAuthStore((s) => s.user);
  const isEmployee = user?.role === 'employee';

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

  // Employee sees a simplified dashboard — only their own data
  if (isEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('title')}
          </h1>
        </div>

        {/* Employee KPIs (own bookings only) */}
        <DashboardGrid />

        {/* Recent bookings (own only) */}
        <RecentBookings />
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

      {/* Public Booking Link */}
      <BookingLinkCard />

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

      {/* AI Insights — Growth+ only */}
      {canAccess('growth') ? (
        <AiInsightsPanel />
      ) : (
        <Card className="glass-surface-subtle">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{t('aiUpgradeTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('aiUpgradeDescription')}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/billing">{t('aiUpgradeCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Usage widget */}
      <UsageWidget />
    </div>
  );
}

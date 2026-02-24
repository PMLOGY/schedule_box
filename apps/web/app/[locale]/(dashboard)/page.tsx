'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { AiInsightsPanel } from '@/components/ai/AiInsightsPanel';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist';
import { DemoDataCard } from '@/components/onboarding/demo-data-card';

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} />
      {/* Onboarding checklist widget — shows setup progress for new users.
          Renders conditionally (auto-hides when dismissed via localStorage). */}
      <OnboardingChecklist />
      {/* Demo data card — lets new owners explore ScheduleBox with sample data.
          Shows after onboarding is completed; hidden until then. */}
      <DemoDataCard />
      <DashboardGrid />
      <AiInsightsPanel />
      <QuickActions />
    </div>
  );
}

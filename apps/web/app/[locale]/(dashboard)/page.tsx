'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { AiInsightsPanel } from '@/components/ai/AiInsightsPanel';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist';

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} />
      {/* Onboarding checklist widget — shows setup progress for new users.
          Renders conditionally (auto-hides when dismissed via localStorage). */}
      <OnboardingChecklist />
      <DashboardGrid />
      <AiInsightsPanel />
      <QuickActions />
    </div>
  );
}

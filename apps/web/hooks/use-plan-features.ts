import { useMemo } from 'react';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';
import { PLAN_CONFIG, type SubscriptionPlan, type PlanFeatures } from '@schedulebox/shared/types';

const PLAN_HIERARCHY: SubscriptionPlan[] = ['free', 'essential', 'growth', 'ai_powered'];

function planIndex(plan: SubscriptionPlan): number {
  return PLAN_HIERARCHY.indexOf(plan);
}

export function usePlanFeatures() {
  const { data: company, isLoading } = useCompanySettingsQuery();

  const rawPlan = company?.subscription_plan ?? 'free';
  const plan: SubscriptionPlan = rawPlan in PLAN_CONFIG ? (rawPlan as SubscriptionPlan) : 'free';

  const result = useMemo(() => {
    const config = PLAN_CONFIG[plan];
    const features: PlanFeatures = config.features;

    function canAccess(minPlan: SubscriptionPlan): boolean {
      return planIndex(plan) >= planIndex(minPlan);
    }

    return { plan, features, canAccess };
  }, [plan]);

  return { ...result, isLoading };
}

'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, TrendingUp, Award } from 'lucide-react';

interface PremiumUpgradeCtaProps {
  /** Current billing plan slug (e.g. "free", "starter", "premium") */
  currentPlan: string;
  /** Whether the current viewer is the company owner */
  isOwner: boolean;
}

/**
 * Premium Upgrade CTA for the marketplace detail page.
 *
 * Shows a "Boost your profile" card to the company owner with premium benefits.
 * If the user is already on a premium plan, shows an active badge instead.
 * Visitors (non-owners) do not see this component.
 */
export function PremiumUpgradeCTA({ currentPlan, isOwner }: PremiumUpgradeCtaProps) {
  const router = useRouter();
  const t = useTranslations('marketplace.premium');

  // Only visible to the company owner
  if (!isOwner) return null;

  const isPremium = currentPlan === 'premium';

  if (isPremium) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        >
          {t('active')}
        </Badge>
      </div>
    );
  }

  const benefits = [
    { icon: TrendingUp, text: t('benefitPosition') },
    { icon: Award, text: t('benefitBadge') },
    { icon: Star, text: t('benefitPriority') },
  ];

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{t('title')}</h3>
      </div>

      <ul className="mb-5 space-y-3">
        {benefits.map((benefit, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <benefit.icon className="h-4 w-4 shrink-0 text-primary/70" />
            <span>{benefit.text}</span>
          </li>
        ))}
      </ul>

      <Button className="w-full" onClick={() => router.push('/settings/billing?upgrade=premium')}>
        <Crown className="mr-2 h-4 w-4" />
        {t('upgradeButton')}
      </Button>
    </div>
  );
}

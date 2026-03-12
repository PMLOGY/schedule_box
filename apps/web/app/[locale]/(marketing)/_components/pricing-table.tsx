'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { PLAN_CONFIG, type SubscriptionPlan } from '@schedulebox/shared/types';

const PLAN_KEYS: SubscriptionPlan[] = ['free', 'essential', 'growth', 'ai_powered'];

const FEATURED_PLAN: SubscriptionPlan = 'growth';

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: [
    'onlineBooking',
    'basicCalendar',
    'emailNotifications',
    'oneStaff',
    'fiveServices',
    'fiftyBookings',
  ],
  essential: [
    'everythingFree',
    'smsReminders',
    'payments',
    'crm',
    'threeStaff',
    'twentyServices',
    'fiveHundredBookings',
    'marketing',
    'analytics',
  ],
  growth: [
    'everythingEssential',
    'aiPredictions',
    'dynamicPricing',
    'automation',
    'loyalty',
    'tenStaff',
    'hundredServices',
    'twoThousandBookings',
  ],
  ai_powered: [
    'everythingGrowth',
    'unlimitedBookings',
    'unlimitedStaff',
    'unlimitedServices',
    'apiAccess',
    'prioritySupport',
  ],
};

function formatPrice(price: number): string {
  if (price === 0) return '0';
  return price.toLocaleString('cs-CZ');
}

export function PricingTable() {
  const [isAnnual, setIsAnnual] = useState(false);
  const t = useTranslations('landing.pricing');

  return (
    <div>
      {/* Toggle */}
      <div className="mb-10 flex items-center justify-center gap-3">
        <button
          onClick={() => setIsAnnual(false)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !isAnnual
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('monthly')}
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            isAnnual
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('annual')}
        </button>
        {isAnnual && (
          <Badge variant="secondary" className="ml-1">
            {t('annualSaving')}
          </Badge>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
        {PLAN_KEYS.map((planKey) => {
          const config = PLAN_CONFIG[planKey];
          const price = isAnnual ? config.priceAnnual : config.price;
          const isFeatured = planKey === FEATURED_PLAN;
          const features = PLAN_FEATURES[planKey];

          return (
            <Card
              key={planKey}
              variant="glass"
              className={cn('relative flex flex-col', isFeatured && 'ring-2 ring-primary/70')}
            >
              {isFeatured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t('mostPopular')}
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{t(`${planKey}.name`)}</CardTitle>
                <CardDescription>{t(`${planKey}.description`)}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-6">
                  {price === 0 ? (
                    <span className="text-4xl font-bold">{t('freeLabel')}</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{formatPrice(price)}</span>
                      <span className="ml-1 text-muted-foreground">
                        {isAnnual ? t('currencyYear') : t('currency')}
                      </span>
                    </>
                  )}
                </div>
                <ul className="space-y-3">
                  {features.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{t(`features.${featureKey}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant={isFeatured ? 'default' : 'outline'} className="w-full">
                  <Link href="/register">{planKey === 'free' ? t('ctaFree') : t('cta')}</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

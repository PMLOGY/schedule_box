'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
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

const PLANS = [
  {
    id: 'free',
    nameKey: 'free',
    price: 0,
    annualPrice: 0,
    featured: false,
    features: ['onlineBooking', 'basicCalendar', 'emailNotifications', 'oneStaff', 'fiftyBookings'],
  },
  {
    id: 'pro',
    nameKey: 'pro',
    price: 299,
    annualPrice: 249,
    featured: true,
    features: [
      'everythingFree',
      'smsReminders',
      'payments',
      'crm',
      'fiveStaff',
      'unlimitedBookings',
    ],
  },
  {
    id: 'business',
    nameKey: 'business',
    price: 699,
    annualPrice: 579,
    featured: false,
    features: [
      'everythingPro',
      'aiPredictions',
      'dynamicPricing',
      'apiAccess',
      'unlimitedStaff',
      'prioritySupport',
    ],
  },
] as const;

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
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.price;
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${plan.featured ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t('mostPopular')}
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{t(`${plan.nameKey}.name`)}</CardTitle>
                <CardDescription>{t(`${plan.nameKey}.description`)}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-6">
                  {price === 0 ? (
                    <span className="text-4xl font-bold">Zdarma</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{price}</span>
                      <span className="ml-1 text-muted-foreground">{t('currency')}</span>
                    </>
                  )}
                </div>
                <ul className="space-y-3">
                  {plan.features.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{t(`features.${featureKey}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant={plan.featured ? 'default' : 'outline'} className="w-full">
                  <Link href="/register">{t('cta')}</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

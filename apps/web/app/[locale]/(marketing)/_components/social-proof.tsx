import { getTranslations } from 'next-intl/server';
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const STATS = [
  { icon: Calendar, valueKey: 'statBookings', labelKey: 'statBookingsLabel' },
  { icon: Users, valueKey: 'statBusinesses', labelKey: 'statBusinessesLabel' },
  { icon: Clock, valueKey: 'statHoursSaved', labelKey: 'statHoursSavedLabel' },
  { icon: TrendingUp, valueKey: 'statNoShowReduction', labelKey: 'statNoShowReductionLabel' },
];

export async function SocialProof() {
  const t = await getTranslations('landing.social');

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">{t('subtitle')}</p>
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card variant="glass" key={stat.valueKey}>
                <CardContent className="flex flex-col items-center pt-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                    {t(stat.valueKey)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

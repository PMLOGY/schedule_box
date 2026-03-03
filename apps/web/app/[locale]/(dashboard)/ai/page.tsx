'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, BarChart3, ChevronRight, ShieldAlert, Gift, HeartPulse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AIPage() {
  const t = useTranslations('ai');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/ai/pricing" className="block">
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <TrendingUp className="h-8 w-8 text-primary" />
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="mt-2">{t('pricing.title')}</CardTitle>
              <CardDescription>{t('pricing.description')}</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/ai/capacity" className="block">
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BarChart3 className="h-8 w-8 text-primary" />
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="mt-2">{t('capacity.title')}</CardTitle>
              <CardDescription>{t('capacity.description')}</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="h-full border-dashed opacity-80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
              <Badge variant="secondary">{t('comingSoon')}</Badge>
            </div>
            <CardTitle className="mt-2">{t('noShow.title')}</CardTitle>
            <CardDescription>{t('noShow.description')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="h-full border-dashed opacity-80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Gift className="h-8 w-8 text-muted-foreground" />
              <Badge variant="secondary">{t('comingSoon')}</Badge>
            </div>
            <CardTitle className="mt-2">{t('upselling.title')}</CardTitle>
            <CardDescription>{t('upselling.description')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="h-full border-dashed opacity-80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <HeartPulse className="h-8 w-8 text-muted-foreground" />
              <Badge variant="secondary">{t('comingSoon')}</Badge>
            </div>
            <CardTitle className="mt-2">{t('customerHealth.title')}</CardTitle>
            <CardDescription>{t('customerHealth.description')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

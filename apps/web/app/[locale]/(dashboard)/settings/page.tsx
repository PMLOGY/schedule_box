'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompanySettingsQuery, useWorkingHoursQuery } from '@/hooks/use-settings-query';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const { data: company, isLoading: companyLoading } = useCompanySettingsQuery();
  const { data: workingHours, isLoading: hoursLoading } = useWorkingHoursQuery();

  const buildAddress = () => {
    if (!company) return '-';
    const parts = [company.address_street, company.address_city, company.address_zip].filter(
      Boolean,
    );
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const dayNames = [0, 1, 2, 3, 4, 5, 6] as const;

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} />

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t('companyProfile')}</CardTitle>
        </CardHeader>
        <CardContent>
          {companyLoading ? (
            <div className="text-muted-foreground">{tCommon('loading')}</div>
          ) : !company ? (
            <div className="text-muted-foreground">{tCommon('noResults')}</div>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fields.name')}</dt>
                <dd className="mt-1">{company.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fields.email')}</dt>
                <dd className="mt-1">{company.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fields.phone')}</dt>
                <dd className="mt-1">{company.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fields.website')}</dt>
                <dd className="mt-1">{company.website || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fields.address')}</dt>
                <dd className="mt-1">{buildAddress()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {t('fields.currency')}
                </dt>
                <dd className="mt-1">{company.currency}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {t('fields.timezone')}
                </dt>
                <dd className="mt-1">{company.timezone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fields.plan')}</dt>
                <dd className="mt-1">
                  <Badge>{company.subscription_plan}</Badge>
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle>{t('workingHours')}</CardTitle>
        </CardHeader>
        <CardContent>
          {hoursLoading ? (
            <div className="text-muted-foreground">{tCommon('loading')}</div>
          ) : !workingHours || workingHours.length === 0 ? (
            <div className="text-muted-foreground">{t('noWorkingHours')}</div>
          ) : (
            <div className="space-y-2">
              {dayNames.map((day) => {
                const dayHours = workingHours
                  .filter((h) => h.day_of_week === day)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <div
                    key={day}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="font-medium w-28">{t(`days.${day}`)}</span>
                    <span className="text-muted-foreground">
                      {dayHours.length === 0 || dayHours.every((h) => !h.is_active) ? (
                        <Badge variant="secondary">{t('closed')}</Badge>
                      ) : (
                        dayHours
                          .filter((h) => h.is_active)
                          .map((h) => `${h.start_time.slice(0, 5)} - ${h.end_time.slice(0, 5)}`)
                          .join(', ')
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

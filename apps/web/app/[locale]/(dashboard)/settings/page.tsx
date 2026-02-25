'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useCompanySettingsQuery,
  useWorkingHoursQuery,
  useUpdateCompanySettings,
  useUpdateWorkingHours,
  type CompanyUpdateData,
  type WorkingHourInput,
} from '@/hooks/use-settings-query';

// Currency options relevant for CZ/SK market
const CURRENCY_OPTIONS = [
  { value: 'CZK', label: 'CZK — Koruna česká' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'PLN', label: 'PLN — Złoty' },
  { value: 'HUF', label: 'HUF — Forint' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
];

// Timezone options relevant for European market
const TIMEZONE_OPTIONS = [
  { value: 'Europe/Prague', label: 'Europe/Prague (CET/CEST)' },
  { value: 'Europe/Bratislava', label: 'Europe/Bratislava (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Europe/Vienna', label: 'Europe/Vienna (CET/CEST)' },
  { value: 'Europe/Warsaw', label: 'Europe/Warsaw (CET/CEST)' },
  { value: 'Europe/Budapest', label: 'Europe/Budapest (CET/CEST)' },
  { value: 'Europe/Zurich', label: 'Europe/Zurich (CET/CEST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Europe/Rome (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (CET/CEST)' },
  { value: 'Europe/Athens', label: 'Europe/Athens (EET/EEST)' },
  { value: 'Europe/Helsinki', label: 'Europe/Helsinki (EET/EEST)' },
  { value: 'Europe/Bucharest', label: 'Europe/Bucharest (EET/EEST)' },
  { value: 'US/Eastern', label: 'US/Eastern (EST/EDT)' },
  { value: 'US/Central', label: 'US/Central (CST/CDT)' },
  { value: 'US/Pacific', label: 'US/Pacific (PST/PDT)' },
];

// ============================================================================
// COMPANY PROFILE FORM
// ============================================================================

function CompanyProfileCard() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { data: company, isLoading } = useCompanySettingsQuery();
  const updateMutation = useUpdateCompanySettings();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CompanyUpdateData>({});

  // Populate form when company data loads or edit mode is toggled
  useEffect(() => {
    if (company && editing) {
      setForm({
        name: company.name,
        email: company.email || '',
        phone: company.phone || '',
        website: company.website || '',
        description: company.description || '',
        address_street: company.address_street || '',
        address_city: company.address_city || '',
        address_zip: company.address_zip || '',
        currency: company.currency,
        timezone: company.timezone,
      });
    }
  }, [company, editing]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      toast.success(t('saveSuccess'));
      setEditing(false);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('saveError'));
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({});
  };

  const updateField = (field: keyof CompanyUpdateData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('companyProfile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">{tCommon('loading')}</div>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('companyProfile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">{tCommon('noResults')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t('companyProfile')}</CardTitle>
          <CardDescription>{t('companyProfileDescription')}</CardDescription>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {tCommon('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">{t('fields.name')}</Label>
                <Input
                  id="company-name"
                  value={form.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">{t('fields.email')}</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">{t('fields.phone')}</Label>
                <Input
                  id="company-phone"
                  value={form.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-website">{t('fields.website')}</Label>
                <Input
                  id="company-website"
                  type="url"
                  value={form.website || ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-description">{t('fields.description')}</Label>
                <Input
                  id="company-description"
                  value={form.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-street">{t('fields.addressStreet')}</Label>
                <Input
                  id="company-street"
                  value={form.address_street || ''}
                  onChange={(e) => updateField('address_street', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-city">{t('fields.addressCity')}</Label>
                  <Input
                    id="company-city"
                    value={form.address_city || ''}
                    onChange={(e) => updateField('address_city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-zip">{t('fields.addressZip')}</Label>
                  <Input
                    id="company-zip"
                    value={form.address_zip || ''}
                    onChange={(e) => updateField('address_zip', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('fields.currency')}</Label>
                <Select
                  value={form.currency || ''}
                  onValueChange={(value) => updateField('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('fields.currency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.currency && form.currency !== company?.currency && (
                  <p className="text-sm text-amber-600">{t('currencyWarning')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('fields.timezone')}</Label>
                <Select
                  value={form.timezone || ''}
                  onValueChange={(value) => updateField('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('fields.timezone')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCancel}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('saving') : tCommon('save')}
              </Button>
            </div>
          </form>
        ) : (
          <>
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
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">
                  {t('fields.description')}
                </dt>
                <dd className="mt-1">{company.description || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fields.address')}</dt>
                <dd className="mt-1">
                  {[company.address_street, company.address_city, company.address_zip]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </dd>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// WORKING HOURS FORM
// ============================================================================

const DEFAULT_HOURS: WorkingHourInput[] = [
  { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_active: true },
  { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_active: true },
  { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_active: true },
  { day_of_week: 4, start_time: '09:00', end_time: '17:00', is_active: true },
  { day_of_week: 5, start_time: '09:00', end_time: '17:00', is_active: true },
  { day_of_week: 6, start_time: '09:00', end_time: '13:00', is_active: false },
  { day_of_week: 0, start_time: '09:00', end_time: '13:00', is_active: false },
];

function WorkingHoursCard() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { data: workingHours, isLoading } = useWorkingHoursQuery();
  const updateMutation = useUpdateWorkingHours();

  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState<WorkingHourInput[]>([]);

  // Build form state from server data or defaults
  useEffect(() => {
    if (editing) {
      if (workingHours && workingHours.length > 0) {
        // One entry per day (take first active slot per day)
        const dayMap = new Map<number, WorkingHourInput>();
        for (const h of workingHours) {
          if (!dayMap.has(h.day_of_week)) {
            dayMap.set(h.day_of_week, {
              day_of_week: h.day_of_week,
              start_time: h.start_time.slice(0, 5),
              end_time: h.end_time.slice(0, 5),
              is_active: h.is_active,
            });
          }
        }
        // Ensure all 7 days exist
        const result: WorkingHourInput[] = [];
        for (const day of [1, 2, 3, 4, 5, 6, 0]) {
          result.push(
            dayMap.get(day) || {
              day_of_week: day,
              start_time: '09:00',
              end_time: '17:00',
              is_active: false,
            },
          );
        }
        setHours(result);
      } else {
        setHours(DEFAULT_HOURS);
      }
    }
  }, [workingHours, editing]);

  const handleSave = async () => {
    try {
      // Only send active days
      await updateMutation.mutateAsync(hours);
      toast.success(t('saveSuccess'));
      setEditing(false);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('saveError'));
    }
  };

  const updateHour = (dayOfWeek: number, field: string, value: string | boolean) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h)),
    );
  };

  const dayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('workingHours')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">{tCommon('loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t('workingHours')}</CardTitle>
          <CardDescription>{t('workingHoursDescription')}</CardDescription>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {tCommon('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div>
            <div className="space-y-3">
              {hours.map((h) => (
                <div
                  key={h.day_of_week}
                  className="flex items-center gap-4 py-2 border-b last:border-0"
                >
                  <span className="font-medium w-28 shrink-0">{t(`days.${h.day_of_week}`)}</span>
                  <Switch
                    checked={h.is_active}
                    onCheckedChange={(checked) => updateHour(h.day_of_week, 'is_active', checked)}
                  />
                  {h.is_active ? (
                    <div className="flex items-center gap-2">
                      <Label className="sr-only">{t('startTime')}</Label>
                      <Input
                        type="time"
                        value={h.start_time}
                        onChange={(e) => updateHour(h.day_of_week, 'start_time', e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Label className="sr-only">{t('endTime')}</Label>
                      <Input
                        type="time"
                        value={h.end_time}
                        onChange={(e) => updateHour(h.day_of_week, 'end_time', e.target.value)}
                        className="w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">{t('closed')}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('saving') : tCommon('save')}
              </Button>
            </div>
          </div>
        ) : !workingHours || workingHours.length === 0 ? (
          <div className="text-muted-foreground">{t('noWorkingHours')}</div>
        ) : (
          <div className="space-y-2">
            {dayOrder.map((day) => {
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
  );
}

// ============================================================================
// SETTINGS PAGE
// ============================================================================

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <CompanyProfileCard />
      <WorkingHoursCard />
    </div>
  );
}

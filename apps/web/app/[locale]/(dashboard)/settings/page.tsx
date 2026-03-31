'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/lib/i18n/navigation';
import { apiClient } from '@/lib/api-client';
import {
  CreditCard,
  Calendar,
  Bell,
  Key,
  Code,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
} from 'lucide-react';
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

  // Populate form when company data changes while editing
  useEffect(() => {
    if (company && editing) {
      setForm((prev) => {
        // Only populate if form is still empty (initial edit) or company data refreshed
        if (!prev.name) {
          return {
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
          };
        }
        return prev;
      });
    }
  }, [company, editing]);

  const startEditing = () => {
    if (company) {
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
    setEditing(true);
  };

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
          <Button variant="outline" size="sm" onClick={startEditing}>
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
// BOOKING SETTINGS (localStorage-backed, no API yet)
// ============================================================================

interface BookingSettingsData {
  minAdvanceHours: number;
  maxAdvanceDays: number;
  defaultStatus: 'pending' | 'confirmed';
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  autoConfirm: boolean;
  lookBusyPercent: number;
}

const BOOKING_SETTINGS_KEY = 'schedulebox_booking_settings';

const DEFAULT_BOOKING_SETTINGS: BookingSettingsData = {
  minAdvanceHours: 2,
  maxAdvanceDays: 30,
  defaultStatus: 'pending',
  allowCancellation: true,
  cancellationDeadlineHours: 24,
  autoConfirm: false,
  lookBusyPercent: 0,
};

function loadBookingSettings(): BookingSettingsData {
  if (typeof window === 'undefined') return DEFAULT_BOOKING_SETTINGS;
  try {
    const stored = localStorage.getItem(BOOKING_SETTINGS_KEY);
    if (stored) return { ...DEFAULT_BOOKING_SETTINGS, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return DEFAULT_BOOKING_SETTINGS;
}

function BookingSettingsCard() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BookingSettingsData>(DEFAULT_BOOKING_SETTINGS);

  useEffect(() => {
    setForm(loadBookingSettings());
  }, []);

  const startEditing = () => setEditing(true);

  const handleSave = () => {
    try {
      localStorage.setItem(BOOKING_SETTINGS_KEY, JSON.stringify(form));
      toast.success(t('saveSuccess'));
      setEditing(false);
    } catch {
      toast.error(t('saveError'));
    }
  };

  const handleCancel = () => {
    setForm(loadBookingSettings());
    setEditing(false);
  };

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <CardTitle>{t('bookingSettings.title')}</CardTitle>
            <CardDescription>{t('bookingSettings.description')}</CardDescription>
          </div>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            {tCommon('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min-advance">{t('bookingSettings.minAdvanceHours')}</Label>
                <Input
                  id="min-advance"
                  type="number"
                  min={0}
                  max={168}
                  value={form.minAdvanceHours}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, minAdvanceHours: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-advance">{t('bookingSettings.maxAdvanceDays')}</Label>
                <Input
                  id="max-advance"
                  type="number"
                  min={1}
                  max={365}
                  value={form.maxAdvanceDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maxAdvanceDays: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('bookingSettings.defaultStatus')}</Label>
                <Select
                  value={form.defaultStatus}
                  onValueChange={(value: 'pending' | 'confirmed') =>
                    setForm((prev) => ({ ...prev, defaultStatus: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('bookingSettings.statusPending')}</SelectItem>
                    <SelectItem value="confirmed">
                      {t('bookingSettings.statusConfirmed')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel-deadline">
                  {t('bookingSettings.cancellationDeadlineHours')}
                </Label>
                <Input
                  id="cancel-deadline"
                  type="number"
                  min={0}
                  max={168}
                  value={form.cancellationDeadlineHours}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cancellationDeadlineHours: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="allow-cancel">{t('bookingSettings.allowCancellation')}</Label>
                <Switch
                  id="allow-cancel"
                  checked={form.allowCancellation}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, allowCancellation: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="auto-confirm">{t('bookingSettings.autoConfirm')}</Label>
                <Switch
                  id="auto-confirm"
                  checked={form.autoConfirm}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, autoConfirm: checked }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="look-busy">{t('bookingSettings.lookBusyPercent')}</Label>
                <Input
                  id="look-busy"
                  type="number"
                  min={0}
                  max={50}
                  value={form.lookBusyPercent}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, lookBusyPercent: Number(e.target.value) }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('bookingSettings.lookBusyDescription')}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCancel}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleSave}>{tCommon('save')}</Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t('bookingSettings.minAdvanceHours')}
              </dt>
              <dd className="mt-1">
                {form.minAdvanceHours} {t('bookingSettings.hours')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t('bookingSettings.maxAdvanceDays')}
              </dt>
              <dd className="mt-1">
                {form.maxAdvanceDays} {t('bookingSettings.days')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t('bookingSettings.defaultStatus')}
              </dt>
              <dd className="mt-1">
                <Badge variant="secondary">
                  {form.defaultStatus === 'pending'
                    ? t('bookingSettings.statusPending')
                    : t('bookingSettings.statusConfirmed')}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t('bookingSettings.cancellationDeadlineHours')}
              </dt>
              <dd className="mt-1">
                {form.cancellationDeadlineHours} {t('bookingSettings.hours')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t('bookingSettings.allowCancellation')}
              </dt>
              <dd className="mt-1">
                <Badge variant={form.allowCancellation ? 'default' : 'secondary'}>
                  {form.allowCancellation ? tCommon('yes') : tCommon('no')}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t('bookingSettings.autoConfirm')}
              </dt>
              <dd className="mt-1">
                <Badge variant={form.autoConfirm ? 'default' : 'secondary'}>
                  {form.autoConfirm ? tCommon('yes') : tCommon('no')}
                </Badge>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">
                {t('bookingSettings.lookBusyPercent')}
              </dt>
              <dd className="mt-1">{form.lookBusyPercent}%</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// NOTIFICATION PREFERENCES (localStorage-backed, no API yet)
// ============================================================================

interface NotificationPreferencesData {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  bookingConfirmation: boolean;
  bookingReminder: boolean;
  cancellationAlert: boolean;
  noShowAlert: boolean;
}

const NOTIFICATION_PREFS_KEY = 'schedulebox_notification_prefs';

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferencesData = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: false,
  bookingConfirmation: true,
  bookingReminder: true,
  cancellationAlert: true,
  noShowAlert: true,
};

function loadNotificationPrefs(): NotificationPreferencesData {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return DEFAULT_NOTIFICATION_PREFS;
}

function NotificationPreferencesCard() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const [editing, setEditing] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferencesData>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    setPrefs(loadNotificationPrefs());
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
      toast.success(t('saveSuccess'));
      setEditing(false);
    } catch {
      toast.error(t('saveError'));
    }
  };

  const handleCancel = () => {
    setPrefs(loadNotificationPrefs());
    setEditing(false);
  };

  const toggleFields: Array<{
    key: keyof NotificationPreferencesData;
    labelKey: string;
    isChannel?: boolean;
  }> = [
    {
      key: 'emailNotifications',
      labelKey: 'notificationPrefs.emailNotifications',
      isChannel: true,
    },
    { key: 'smsNotifications', labelKey: 'notificationPrefs.smsNotifications', isChannel: true },
    { key: 'pushNotifications', labelKey: 'notificationPrefs.pushNotifications', isChannel: true },
    { key: 'bookingConfirmation', labelKey: 'notificationPrefs.bookingConfirmation' },
    { key: 'bookingReminder', labelKey: 'notificationPrefs.bookingReminder' },
    { key: 'cancellationAlert', labelKey: 'notificationPrefs.cancellationAlert' },
    { key: 'noShowAlert', labelKey: 'notificationPrefs.noShowAlert' },
  ];

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <CardTitle>{t('notificationPrefs.title')}</CardTitle>
            <CardDescription>{t('notificationPrefs.description')}</CardDescription>
          </div>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {tCommon('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {toggleFields.map((field, idx) => (
            <div key={field.key}>
              {field.isChannel && idx === 0 && (
                <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                  {t('notificationPrefs.channels')}
                </p>
              )}
              {!field.isChannel && idx === 3 && (
                <p className="text-xs font-medium uppercase text-muted-foreground mt-4 mb-2">
                  {t('notificationPrefs.events')}
                </p>
              )}
              <div className="flex items-center justify-between py-2 border-b last:border-0">
                <Label htmlFor={`notif-${field.key}`}>{t(field.labelKey)}</Label>
                {editing ? (
                  <Switch
                    id={`notif-${field.key}`}
                    checked={prefs[field.key]}
                    onCheckedChange={(checked) =>
                      setPrefs((prev) => ({ ...prev, [field.key]: checked }))
                    }
                  />
                ) : (
                  <Badge variant={prefs[field.key] ? 'default' : 'secondary'}>
                    {prefs[field.key] ? tCommon('yes') : tCommon('no')}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        {editing && (
          <div className="mt-6 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave}>{tCommon('save')}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// API KEYS (backed by real API endpoints)
// ============================================================================

interface ApiKeyData {
  id: number;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface ApiKeyCreateResponse {
  id: number;
  name: string;
  key: string;
  key_prefix: string;
  created_at: string;
}

function ApiKeysCard() {
  const t = useTranslations('settings');

  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiClient.get<{ data: ApiKeyData[] }>('/settings/api-keys');
      setKeys(result.data ?? (result as unknown as ApiKeyData[]));
    } catch {
      // Silently handle - user may not have permission
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      setCreating(true);
      const result = await apiClient.post<ApiKeyCreateResponse>('/settings/api-keys', {
        name: newKeyName.trim(),
      });
      setNewlyCreatedKey(result.key);
      setNewKeyName('');
      setShowCreateForm(false);
      toast.success(t('apiKeys.createSuccess'));
      fetchKeys();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('apiKeys.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('apiKeys.confirmDelete'))) return;
    try {
      await apiClient.delete(`/settings/api-keys/${id}`);
      toast.success(t('apiKeys.deleteSuccess'));
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('apiKeys.deleteError'));
    }
  };

  const copyToClipboard = async (text: string, id: number | string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <CardTitle>{t('apiKeys.title')}</CardTitle>
            <CardDescription>{t('apiKeys.description')}</CardDescription>
          </div>
        </div>
        {!showCreateForm && (
          <Button variant="outline" size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('apiKeys.generate')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Create new key form */}
        {showCreateForm && (
          <div className="mb-4 p-4 rounded-lg border bg-muted/30">
            <Label htmlFor="new-key-name">{t('apiKeys.keyName')}</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="new-key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t('apiKeys.keyNamePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('apiKeys.generate')}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                {t('apiKeys.cancelCreate')}
              </Button>
            </div>
          </div>
        )}

        {/* Newly created key (shown only once) */}
        {newlyCreatedKey && (
          <div className="mb-4 p-4 rounded-lg border border-green-500/50 bg-green-500/10">
            <p className="text-sm font-medium mb-2">{t('apiKeys.newKeyWarning')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-background/50 rounded text-sm font-mono break-all">
                {newlyCreatedKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(newlyCreatedKey, 'new')}
              >
                {copiedId === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setNewlyCreatedKey(null)}
            >
              {t('apiKeys.dismiss')}
            </Button>
          </div>
        )}

        {/* Key list */}
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('apiKeys.loading')}
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('apiKeys.noKeys')}</p>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg border bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{key.name}</p>
                    <code className="text-xs text-muted-foreground font-mono">
                      {key.key_prefix}...
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('apiKeys.created')}: {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && (
                      <>
                        {' | '}
                        {t('apiKeys.lastUsed')}: {new Date(key.last_used_at).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(key.key_prefix + '...', key.id)}
                    title={t('apiKeys.copy')}
                  >
                    {copiedId === key.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    title={t('apiKeys.delete')}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// WIDGET EMBED
// ============================================================================

function WidgetEmbedCard() {
  const t = useTranslations('settings');
  const { data: company } = useCompanySettingsQuery();
  const [copied, setCopied] = useState(false);

  const embedCode = company
    ? `<iframe src="https://schedulebox.cz/embed/${company.slug}" width="100%" height="600" frameborder="0"></iframe>`
    : '';

  const handleCopy = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success(t('widgetEmbed.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Code className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <CardTitle>{t('widgetEmbed.title')}</CardTitle>
            <CardDescription>{t('widgetEmbed.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {company ? (
          <div className="space-y-4">
            {/* Embed code */}
            <div className="space-y-2">
              <Label>{t('widgetEmbed.embedCode')}</Label>
              <div className="relative">
                <Textarea
                  readOnly
                  value={embedCode}
                  className="font-mono text-sm resize-none h-20"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? t('widgetEmbed.copied') : t('widgetEmbed.copyCode')}
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>{t('widgetEmbed.preview')}</Label>
              <div className="border rounded-lg overflow-hidden bg-background">
                <iframe
                  src={`/embed/${company.slug}`}
                  width="100%"
                  height="400"
                  frameBorder="0"
                  title={t('widgetEmbed.preview')}
                  className="block"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('widgetEmbed.noCompany')}</p>
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
  const tBilling = useTranslations('billing');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <CompanyProfileCard />
      <WorkingHoursCard />
      <BookingSettingsCard />
      <NotificationPreferencesCard />

      {/* Push notifications link */}
      <Card variant="glass">
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Push notifikace</p>
              <p className="text-sm text-muted-foreground">
                Nastaveni push notifikaci v prohlizeci
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/notifications">Nastavit</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Billing link */}
      <Card variant="glass">
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{tBilling('title')}</p>
              <p className="text-sm text-muted-foreground">{tBilling('description')}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/billing">{tBilling('upgradeNow')}</Link>
          </Button>
        </CardContent>
      </Card>

      <ApiKeysCard />
      <WidgetEmbedCard />
    </div>
  );
}

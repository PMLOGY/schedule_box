'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, DollarSign, MapPin, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';

// ============================================================================
// Types
// ============================================================================

interface LocationMetric {
  company_uuid: string;
  company_name: string;
  address_city: string | null;
  bookings_count: number;
  revenue_total: string;
  occupancy_percent: number | null;
}

interface OrgDashboardResponse {
  organization: { uuid: string; name: string };
  totals: {
    bookings_count: number;
    revenue_total: string;
    locations_active: number;
  };
  locations: LocationMetric[];
}

interface OrgBasicResponse {
  uuid: string;
  name: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0 CZK';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// ============================================================================
// Organization Dashboard Page
// ============================================================================

export default function OrganizationDashboardPage() {
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');
  const { user, switchLocation } = useAuthStore();

  // First get the org UUID from the basic org query
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      return apiClient.get<OrgBasicResponse | null>('/organizations');
    },
    staleTime: 5 * 60 * 1000,
  });

  const orgUuid = org?.uuid;

  // Then get dashboard data using the org UUID
  const {
    data: dashboard,
    isLoading: dashLoading,
    error: dashError,
  } = useQuery({
    queryKey: ['org-dashboard', orgUuid],
    queryFn: async () => {
      return apiClient.get<OrgDashboardResponse>(`/organizations/${orgUuid}/dashboard`);
    },
    enabled: !!orgUuid,
    staleTime: 2 * 60 * 1000, // 2 min stale time for fresh metrics
  });

  const handleSwitchLocation = async (companyUuid: string) => {
    if (companyUuid === user?.companyId) return;
    try {
      await switchLocation(companyUuid);
      window.location.reload();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('switchError'));
    }
  };

  const isLoading = orgLoading || dashLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('dashboard.title')} />
        <div className="text-muted-foreground">{tCommon('loading')}</div>
      </div>
    );
  }

  // No org or access denied
  if (!org || !orgUuid) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('dashboard.title')} />
        <Card className="max-w-lg mx-auto text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground">{t('noOrgDescription')}</p>
            <Button asChild className="mt-4">
              <Link href={'/organization' as Parameters<typeof Link>[0]['href']}>
                {t('overview')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for 403 error (non-franchise_owner)
  if (dashError) {
    const apiErr = dashError as { statusCode?: number };
    if (apiErr.statusCode === 403) {
      return (
        <div className="space-y-8">
          <PageHeader title={t('dashboard.title')} />
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="py-8">
              <p className="text-muted-foreground">{t('dashboard.accessRestricted')}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (!dashboard) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('dashboard.title')} />
        <div className="text-muted-foreground">{tCommon('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with navigation */}
      <PageHeader
        title={`${dashboard.organization.name} - ${t('dashboard.title')}`}
        description={t('dashboard.thisMonth')}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={'/organization/customers' as Parameters<typeof Link>[0]['href']}>
                {t('nav.customers')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={'/organization/settings' as Parameters<typeof Link>[0]['href']}>
                {t('nav.settings')}
              </Link>
            </Button>
          </div>
        }
      />

      {/* Totals row: 3 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard.totals.bookings_count}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.totalBookings')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(dashboard.totals.revenue_total)}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.totalRevenue')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard.totals.locations_active}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.activeLocations')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location cards grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t('locations')}</h2>
        {dashboard.locations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">{t('dashboard.noLocations')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.locations.map((location) => {
              const isCurrent = location.company_uuid === user?.companyId;
              return (
                <Card
                  key={location.company_uuid}
                  className={`transition-shadow hover:shadow-md ${
                    isCurrent ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{location.company_name}</CardTitle>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    {location.address_city && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {location.address_city}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('dashboard.totalBookings')}</p>
                        <p className="text-lg font-semibold">{location.bookings_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('dashboard.totalRevenue')}</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(location.revenue_total)}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">{t('dashboard.occupancy')}</p>
                      <p className="font-medium">
                        {location.occupancy_percent !== null
                          ? `${location.occupancy_percent}%`
                          : t('dashboard.na')}
                      </p>
                    </div>

                    {/* Switch button */}
                    {!isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleSwitchLocation(location.company_uuid)}
                      >
                        {t('dashboard.switchToLocation')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

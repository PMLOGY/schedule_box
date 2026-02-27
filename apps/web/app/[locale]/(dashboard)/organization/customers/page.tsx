'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';

// ============================================================================
// Types
// ============================================================================

interface OrgCustomer {
  uuid: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_bookings: number;
  total_spent: string;
  last_visit_at: string | null;
  locations_visited: number;
}

interface PaginatedResponse {
  data: OrgCustomer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return '-';
  }
}

// ============================================================================
// Debounce hook
// ============================================================================

function useDebouncedValue(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Organization Customers Page
// ============================================================================

export default function OrganizationCustomersPage() {
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');

  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Reset page when search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPage(1);
  }, []);

  // Get org UUID
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      return apiClient.get<OrgBasicResponse | null>('/organizations');
    },
    staleTime: 5 * 60 * 1000,
  });

  const orgUuid = org?.uuid;

  // Fetch customers
  const {
    data: customersResponse,
    isLoading: customersLoading,
    error: customersError,
  } = useQuery({
    queryKey: ['org-customers', orgUuid, debouncedSearch, page],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      return apiClient.get<PaginatedResponse>(`/organizations/${orgUuid}/customers`, params);
    },
    enabled: !!orgUuid,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = orgLoading || customersLoading;

  // No org
  if (!orgLoading && !org) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('customers.title')} />
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

  // Access denied (403)
  if (customersError) {
    const apiErr = customersError as { statusCode?: number };
    if (apiErr.statusCode === 403) {
      return (
        <div className="space-y-8">
          <PageHeader title={t('customers.title')} />
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="py-8">
              <p className="text-muted-foreground">{t('customers.accessRestricted')}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Extract data from paginated response
  // apiClient unwraps { data } but preserves { data, meta }
  const customers = customersResponse?.data ?? [];
  const meta = customersResponse?.meta ?? { total: 0, page: 1, limit, total_pages: 0 };

  return (
    <div className="space-y-8">
      {/* Header with navigation */}
      <PageHeader
        title={t('customers.title')}
        description={t('customers.description')}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={'/organization/dashboard' as Parameters<typeof Link>[0]['href']}>
                {t('nav.dashboard')}
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

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('customers.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">{tCommon('loading')}</div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('customers.noCustomers')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fields.name')}</TableHead>
                  <TableHead>{t('fields.email')}</TableHead>
                  <TableHead>{t('fields.phone')}</TableHead>
                  <TableHead className="text-right">{t('customers.totalBookings')}</TableHead>
                  <TableHead className="text-right">{t('customers.totalSpent')}</TableHead>
                  <TableHead>{t('customers.lastVisit')}</TableHead>
                  <TableHead>{t('customers.locationsVisited')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.uuid}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone || '-'}</TableCell>
                    <TableCell className="text-right">{customer.total_bookings}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(customer.total_spent)}
                    </TableCell>
                    <TableCell>{formatDate(customer.last_visit_at)}</TableCell>
                    <TableCell>
                      <Badge variant={customer.locations_visited > 1 ? 'default' : 'secondary'}>
                        {customer.locations_visited > 1
                          ? t('customers.locationsCount', { count: customer.locations_visited })
                          : t('customers.locationsSingle')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon('page')} {meta.page} / {meta.total_pages} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {tCommon('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tCommon('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

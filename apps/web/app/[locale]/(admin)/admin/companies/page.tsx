'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminCompanies, useToggleCompanyActive } from '@/hooks/use-admin-queries';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const planColors: Record<string, string> = {
  free: 'secondary',
  essential: 'default',
  growth: 'outline',
  ai_powered: 'destructive',
};

export default function AdminCompaniesPage() {
  const t = useTranslations('admin.companies');
  const tCommon = useTranslations('common');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminCompanies({ page, limit: 20 });
  const toggleMutation = useToggleCompanyActive();

  const handleToggleActive = async (uuid: string, currentlyActive: boolean) => {
    try {
      await toggleMutation.mutateAsync({ uuid, is_active: !currentlyActive });
      toast.success(currentlyActive ? t('deactivated') : t('activated'));
    } catch {
      toast.error(t('toggleError'));
    }
  };

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4">
        <PageHeader title={t('title')} />
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.plan')}</TableHead>
              <TableHead className="text-right">{t('columns.users')}</TableHead>
              <TableHead className="text-right">{t('columns.bookings')}</TableHead>
              <TableHead className="text-right">{t('columns.revenue')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.created')}</TableHead>
              <TableHead>{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {tCommon('loading')}
                </TableCell>
              </TableRow>
            ) : !data || data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {tCommon('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((company) => (
                <TableRow key={company.uuid}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="text-muted-foreground">{company.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        (planColors[company.subscription_plan] as
                          | 'secondary'
                          | 'default'
                          | 'outline'
                          | 'destructive') || 'secondary'
                      }
                    >
                      {company.subscription_plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{company.user_count}</TableCell>
                  <TableCell className="text-right">{company.booking_count}</TableCell>
                  <TableCell className="text-right">
                    {Number(company.revenue).toLocaleString()} CZK
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.is_active ? 'default' : 'secondary'}>
                      {company.is_active ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(company.created_at), 'PP', { locale: cs })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(company.uuid, company.is_active)}
                      disabled={toggleMutation.isPending}
                    >
                      {company.is_active ? t('deactivate') : t('activate')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {tCommon('showing')} {(page - 1) * 20 + 1} {tCommon('to')}{' '}
            {Math.min(page * 20, data.meta.total)} {tCommon('of')} {data.meta.total}{' '}
            {tCommon('entries')}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {tCommon('previous')}
            </Button>
            <div className="text-sm">
              {tCommon('page')} {page} {tCommon('of')} {data.meta.total_pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.meta.total_pages, p + 1))}
              disabled={page === data.meta.total_pages}
            >
              {tCommon('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

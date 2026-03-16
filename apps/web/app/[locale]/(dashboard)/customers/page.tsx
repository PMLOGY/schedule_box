'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCustomersQuery, useCreateCustomer, type Customer } from '@/hooks/use-customers-query';
import { useCurrencyFormat } from '@/hooks/use-currency-format';
import { CustomersEmptyState } from '@/components/onboarding/empty-states/customers-empty';
import { useAuthStore } from '@/stores/auth.store';

export default function CustomersPage() {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const userRole = useAuthStore((s) => s.user?.role);
  const canAddCustomer = userRole !== 'employee';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });

  const { data, isLoading } = useCustomersQuery({
    page,
    limit,
    search: search || undefined,
    sort_by: 'name',
  });

  const createMutation = useCreateCustomer();
  const { formatCurrency } = useCurrencyFormat();

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        notes: formData.notes || undefined,
      });
      toast.success(t('createSuccess'));
      setDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', notes: '' });
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('createError'));
    }
  };

  const handleRowClick = (customer: Customer) => {
    router.push(`/customers/${customer.uuid}`);
  };

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader title={t('title')} />
          {canAddCustomer && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('add')}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.phone')}</TableHead>
              <TableHead className="text-right">{t('columns.totalBookings')}</TableHead>
              <TableHead className="text-right">{t('columns.totalSpent')}</TableHead>
              <TableHead className="text-right">{t('columns.healthScore')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {tCommon('loading')}
                </TableCell>
              </TableRow>
            ) : !data || data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <CustomersEmptyState onAddCustomer={() => setDialogOpen(true)} />
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((customer) => (
                <TableRow
                  key={customer.uuid}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(customer)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.email || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.phone || '-'}</TableCell>
                  <TableCell className="text-right">{customer.total_bookings}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(customer.total_spent)}
                  </TableCell>
                  <TableCell className="text-right">{customer.health_score ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                      {customer.is_active ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {tCommon('showing')} {(page - 1) * limit + 1} {tCommon('to')}{' '}
            {Math.min(page * limit, data.meta.total)} {tCommon('of')} {data.meta.total}{' '}
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

      {/* Add Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addTitle')}</DialogTitle>
            <DialogDescription>{t('addDescription')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('form.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t('form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t('form.phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">{t('form.notes')}</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={!formData.name.trim() || createMutation.isPending}>
                {createMutation.isPending ? tCommon('loading') : tCommon('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

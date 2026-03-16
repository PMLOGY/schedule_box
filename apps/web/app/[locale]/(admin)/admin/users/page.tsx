'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminUsers, useToggleUserActive } from '@/hooks/use-admin-queries';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function AdminUsersPage() {
  const t = useTranslations('admin.users');
  const tCommon = useTranslations('common');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAdminUsers({
    page,
    limit: 20,
    role: roleFilter,
    search: search || undefined,
  });
  const toggleMutation = useToggleUserActive();

  const handleToggleActive = async (uuid: string, currentlyActive: boolean) => {
    try {
      await toggleMutation.mutateAsync({ uuid, is_active: !currentlyActive });
      toast.success(currentlyActive ? t('deactivated') : t('activated'));
    } catch {
      toast.error(t('toggleError'));
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'destructive',
    owner: 'default',
    employee: 'secondary',
    customer: 'outline',
  };

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4 space-y-4">
        <PageHeader title={t('title')} />
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
          <Select
            value={roleFilter ?? 'all'}
            onValueChange={(v) => {
              setRoleFilter(v === 'all' ? undefined : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('allRoles')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allRoles')}</SelectItem>
              <SelectItem value="admin">{t('roles.admin')}</SelectItem>
              <SelectItem value="owner">{t('roles.owner')}</SelectItem>
              <SelectItem value="employee">{t('roles.employee')}</SelectItem>
              <SelectItem value="customer">{t('roles.customer')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.role')}</TableHead>
              <TableHead>{t('columns.company')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.lastLogin')}</TableHead>
              <TableHead>{tCommon('actions')}</TableHead>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {tCommon('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((user) => (
                <TableRow key={user.uuid}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        (roleColors[user.role] as
                          | 'destructive'
                          | 'default'
                          | 'secondary'
                          | 'outline') || 'secondary'
                      }
                    >
                      {t(`roles.${user.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.company_name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_login_at
                      ? format(new Date(user.last_login_at), 'PP', {
                          locale: cs,
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(user.uuid, user.is_active)}
                      disabled={toggleMutation.isPending}
                    >
                      {user.is_active ? t('deactivate') : t('activate')}
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

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
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
import { useAuthStore } from '@/stores/auth.store';

interface AuditLogEntry {
  id: number;
  timestamp: string;
  admin: {
    id: number;
    uuid: string;
    name: string;
    email: string;
  };
  action_type: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  ip_address: string;
  request_id: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const ACTION_TYPES = [
  'impersonation_start',
  'impersonation_end',
  'company_suspended',
  'company_unsuspended',
  'user_activated',
  'user_deactivated',
  'feature_flag_updated',
  'broadcast_sent',
];

function JsonExpander({ value, label }: { value: Record<string, unknown> | null; label: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!value || Object.keys(value).length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        aria-expanded={expanded}
        aria-label={label}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        )}
        {label}
      </button>
      {expanded && (
        <pre className="mt-1 p-2 text-xs bg-muted rounded-md overflow-auto max-w-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const t = useTranslations('admin.auditLog');
  const tCommon = useTranslations('common');
  const accessToken = useAuthStore((s) => s.accessToken);
  const [page, setPage] = useState(1);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ['admin', 'audit-log', page, actionTypeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      });
      if (actionTypeFilter && actionTypeFilter !== 'all') {
        params.set('actionType', actionTypeFilter);
      }
      const res = await fetch(`/api/v1/admin/audit-log?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch audit log');
      return res.json();
    },
    enabled: !!accessToken,
  });

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4 space-y-4">
        <PageHeader title={t('title')} />
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={actionTypeFilter}
            onValueChange={(v) => {
              setActionTypeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t('allActions')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allActions')}</SelectItem>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.timestamp')}</TableHead>
              <TableHead>{t('columns.admin')}</TableHead>
              <TableHead>{t('columns.action')}</TableHead>
              <TableHead>{t('columns.target')}</TableHead>
              <TableHead>{t('columns.ip')}</TableHead>
              <TableHead>{t('columns.before')}</TableHead>
              <TableHead>{t('columns.after')}</TableHead>
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
              data.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {format(new Date(entry.timestamp), 'PP HH:mm:ss', { locale: cs })}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{entry.admin.name}</div>
                    <div className="text-xs text-muted-foreground">{entry.admin.email}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {entry.action_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.target_entity_type ? (
                      <span>
                        {entry.target_entity_type}
                        {entry.target_entity_id && (
                          <span className="ml-1 font-mono">
                            {entry.target_entity_id.slice(0, 8)}…
                          </span>
                        )}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {entry.ip_address}
                  </TableCell>
                  <TableCell>
                    <JsonExpander value={entry.before_value} label={t('columns.before')} />
                  </TableCell>
                  <TableCell>
                    <JsonExpander value={entry.after_value} label={t('columns.after')} />
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
            {tCommon('showing')} {(page - 1) * 50 + 1} {tCommon('to')}{' '}
            {Math.min(page * 50, data.meta.total)} {tCommon('of')} {data.meta.total}{' '}
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

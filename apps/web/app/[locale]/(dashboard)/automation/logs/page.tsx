'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type AutomationLogStatus = 'pending' | 'executed' | 'failed' | 'skipped';

interface AutomationLog {
  id: number;
  ruleId: number;
  ruleName: string;
  ruleUuid: string;
  status: AutomationLogStatus;
  executedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

const statusColors: Record<AutomationLogStatus, string> = {
  pending: 'bg-yellow-500',
  executed: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-gray-500',
};

const statusLabels: Record<AutomationLogStatus, string> = {
  pending: 'Čeká',
  executed: 'Provedeno',
  failed: 'Chyba',
  skipped: 'Přeskočeno',
};

export default function AutomationLogsPage() {
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['automation-logs', { status, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status !== 'all') params.append('status', status);

      const response = await apiClient.get<{
        data: AutomationLog[];
        pagination: { page: number; limit: number; total: number; total_pages: number };
      }>(`/api/v1/automation/logs?${params.toString()}`);
      return response;
    },
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logy automatizace</h1>
        <p className="text-muted-foreground">Historie provedení automatizačních pravidel</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="w-[200px]">
              <label className="mb-2 block text-sm font-medium">Stav</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="pending">Čeká</SelectItem>
                  <SelectItem value="executed">Provedeno</SelectItem>
                  <SelectItem value="failed">Chyba</SelectItem>
                  <SelectItem value="skipped">Přeskočeno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Načítání...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Zatím žádné logy</p>
              <p className="text-sm text-muted-foreground">
                Logy se zobrazí po provedení automatizačních pravidel
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pravidlo</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Provedeno</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                    <TableHead>Chyba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.ruleName}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[log.status]}>
                          {statusLabels[log.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.executedAt ? new Date(log.executedAt).toLocaleString('cs-CZ') : '—'}
                      </TableCell>
                      <TableCell>{new Date(log.createdAt).toLocaleString('cs-CZ')}</TableCell>
                      <TableCell>
                        {log.errorMessage ? (
                          <span
                            className="cursor-help text-sm text-red-600"
                            title={log.errorMessage}
                          >
                            Zobrazit
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Stránka {pagination.page} z {pagination.total_pages} (celkem: {pagination.total}
                    )
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Předchozí
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      Další
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

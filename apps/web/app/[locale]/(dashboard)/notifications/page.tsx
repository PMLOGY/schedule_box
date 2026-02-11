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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Mail, MessageSquare, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type NotificationChannel = 'email' | 'sms' | 'push';
type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';

interface Notification {
  id: number;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  push: Bell,
};

const statusColors: Record<NotificationStatus, string> = {
  pending: 'bg-yellow-500',
  sent: 'bg-green-500',
  delivered: 'bg-blue-500',
  failed: 'bg-red-500',
  opened: 'bg-purple-500',
  clicked: 'bg-indigo-500',
};

const statusLabels: Record<NotificationStatus, string> = {
  pending: 'Čeká',
  sent: 'Odesláno',
  delivered: 'Doručeno',
  failed: 'Chyba',
  opened: 'Otevřeno',
  clicked: 'Kliknuto',
};

export default function NotificationsPage() {
  const [channel, setChannel] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { channel, status, dateFrom, dateTo, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (channel !== 'all') params.append('channel', channel);
      if (status !== 'all') params.append('status', status);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await apiClient.get<{
        data: Notification[];
        pagination: { page: number; limit: number; total: number; total_pages: number };
      }>(`/api/v1/notifications?${params.toString()}`);
      return response;
    },
  });

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historie notifikací</h1>
        <p className="text-muted-foreground">
          Přehled všech odeslaných notifikací a jejich doručení
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
          <CardDescription>Filtrování notifikací podle kanálu, stavu a data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Kanál</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push notifikace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Stav</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="pending">Čeká</SelectItem>
                  <SelectItem value="sent">Odesláno</SelectItem>
                  <SelectItem value="delivered">Doručeno</SelectItem>
                  <SelectItem value="failed">Chyba</SelectItem>
                  <SelectItem value="opened">Otevřeno</SelectItem>
                  <SelectItem value="clicked">Kliknuto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Od data</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Do data</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Načítání...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2">
              <Mail className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Zatím žádné notifikace</p>
              <p className="text-sm text-muted-foreground">
                Notifikace se zobrazí po odeslání prvního emailu, SMS nebo push notifikace
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kanál</TableHead>
                    <TableHead>Příjemce</TableHead>
                    <TableHead>Předmět</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Odesláno</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => {
                    const Icon = channelIcons[notification.channel];
                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Icon className="h-5 w-5" />
                        </TableCell>
                        <TableCell className="font-medium">{notification.recipient}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {notification.subject || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[notification.status]}>
                            {statusLabels[notification.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {notification.sentAt
                            ? new Date(notification.sentAt).toLocaleString('cs-CZ')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(notification.createdAt).toLocaleString('cs-CZ')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
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

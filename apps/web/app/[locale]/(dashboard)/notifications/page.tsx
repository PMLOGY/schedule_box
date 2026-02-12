'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, Bell, ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Link } from '@/lib/i18n/navigation';

type NotificationChannel = 'email' | 'sms' | 'push';
type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';

interface Notification {
  id: number;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
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

const localeMap: Record<string, string> = {
  cs: 'cs-CZ',
  sk: 'sk-SK',
  en: 'en-US',
};

interface NotificationForm {
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
}

const defaultForm: NotificationForm = {
  channel: 'email',
  recipient: '',
  subject: '',
  body: '',
};

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const dateLocale = localeMap[locale] ?? 'en-US';
  const queryClient = useQueryClient();

  const [channel, setChannel] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<NotificationForm>({ ...defaultForm });

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
      }>(`/notifications?${params.toString()}`);
      return response;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (notification: NotificationForm) => {
      await apiClient.post('/notifications', {
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject || undefined,
        body: notification.body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsCreateOpen(false);
      setForm({ ...defaultForm });
    },
  });

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/templates">
              <FileText className="mr-2 h-4 w-4" />
              {t('templates')}
            </Link>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('createTitle')}</DialogTitle>
                <DialogDescription>{t('createDescription')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('channel')}</Label>
                  <div className="mt-2 flex gap-3">
                    {(['email', 'sms', 'push'] as NotificationChannel[]).map((ch) => {
                      const Icon = channelIcons[ch];
                      return (
                        <label
                          key={ch}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 transition-colors ${
                            form.channel === ch ? 'border-primary bg-primary/5' : 'border-muted'
                          }`}
                        >
                          <input
                            type="radio"
                            name="notif-channel"
                            value={ch}
                            checked={form.channel === ch}
                            onChange={() => setForm({ ...form, channel: ch })}
                            className="sr-only"
                          />
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium capitalize">{ch}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="recipient">{t('columns.recipient')}</Label>
                  <Input
                    id="recipient"
                    value={form.recipient}
                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                    placeholder={form.channel === 'email' ? 'email@example.com' : '+420...'}
                  />
                </div>

                {(form.channel === 'email' || form.channel === 'push') && (
                  <div>
                    <Label htmlFor="notif-subject">{t('columns.subject')}</Label>
                    <Input
                      id="notif-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="notif-body">{t('body')}</Label>
                  <Textarea
                    id="notif-body"
                    value={form.body}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setForm({ ...form, body: e.target.value })
                    }
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending || !form.recipient || !form.body}
                >
                  {createMutation.isPending ? t('creating') : t('send')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
          <CardDescription>{t('filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">{t('channel')}</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="email">{t('email')}</SelectItem>
                  <SelectItem value="sms">{t('sms')}</SelectItem>
                  <SelectItem value="push">{t('push')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{t('status')}</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="pending">{t('statusLabels.pending')}</SelectItem>
                  <SelectItem value="sent">{t('statusLabels.sent')}</SelectItem>
                  <SelectItem value="delivered">{t('statusLabels.delivered')}</SelectItem>
                  <SelectItem value="failed">{t('statusLabels.failed')}</SelectItem>
                  <SelectItem value="opened">{t('statusLabels.opened')}</SelectItem>
                  <SelectItem value="clicked">{t('statusLabels.clicked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{t('dateFrom')}</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{t('dateTo')}</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">{t('loading')}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2">
              <Mail className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">{t('empty')}</p>
              <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('columns.channel')}</TableHead>
                    <TableHead>{t('columns.recipient')}</TableHead>
                    <TableHead>{t('columns.subject')}</TableHead>
                    <TableHead>{t('columns.status')}</TableHead>
                    <TableHead>{t('columns.sentAt')}</TableHead>
                    <TableHead>{t('columns.createdAt')}</TableHead>
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
                            {t(`statusLabels.${notification.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {notification.sentAt
                            ? new Date(notification.sentAt).toLocaleString(dateLocale)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(notification.createdAt).toLocaleString(dateLocale)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('page', {
                      page: pagination.page,
                      total: pagination.total_pages,
                      count: pagination.total,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      {t('next')}
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

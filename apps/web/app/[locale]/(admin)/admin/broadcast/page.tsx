'use client';

/**
 * Admin Broadcast Management Page
 * /admin/broadcast
 *
 * Allows platform admins to:
 * - View all broadcasts with their status (Scheduled / Sent / Draft)
 * - Create a new broadcast with audience filter, schedule time, and
 *   confirmation of target company count to prevent accidental mass email.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isFuture } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Megaphone, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Broadcast {
  id: number;
  message: string;
  scheduledAt: string;
  sentAt: string | null;
  audience: string;
  createdAt: string;
}

type AudienceValue = 'all' | 'free' | 'essential' | 'growth' | 'ai_powered';

const AUDIENCE_OPTIONS: { value: AudienceValue; label: string }[] = [
  { value: 'all', label: 'admin.broadcast.audienceAll' },
  { value: 'free', label: 'admin.broadcast.audienceFree' },
  { value: 'essential', label: 'admin.broadcast.audienceEssential' },
  { value: 'growth', label: 'admin.broadcast.audienceGrowth' },
  { value: 'ai_powered', label: 'admin.broadcast.audienceAiPowered' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBroadcastStatus(b: Broadcast): 'sent' | 'scheduled' | 'draft' {
  if (b.sentAt) return 'sent';
  if (isFuture(new Date(b.scheduledAt))) return 'scheduled';
  return 'draft'; // scheduledAt in the past but not yet dispatched
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminBroadcastPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [audience, setAudience] = useState<AudienceValue>('all');
  const [confirmValue, setConfirmValue] = useState('');

  // Fetch all broadcasts
  const { data: broadcastData, isLoading } = useQuery({
    queryKey: ['admin', 'broadcasts'],
    queryFn: () => apiClient.get<Broadcast[]>('/admin/broadcast'),
    staleTime: 30_000,
  });

  // Fetch live target company count for confirmation
  const { data: targetData, isLoading: targetLoading } = useQuery({
    queryKey: ['admin', 'broadcast-target', audience],
    queryFn: async () => {
      // POST with invalid confirmCount to get the real targetCount back
      const res = await fetch('/api/v1/admin/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'probe',
          scheduledAt: new Date(Date.now() + 60_000).toISOString(),
          audience,
          confirmCount: -1, // Will fail validation to extract targetCount
        }),
      });
      const json = await res.json();
      // If 409, json.targetCount is available
      return (json.targetCount as number | undefined) ?? null;
    },
    enabled: dialogOpen,
    staleTime: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      message: string;
      scheduledAt: string;
      audience: AudienceValue;
      confirmCount: number;
    }) => {
      const res = await fetch('/api/v1/admin/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? t('admin.broadcast.createError'));
      return json.data as Broadcast;
    },
    onSuccess: () => {
      toast.success(t('admin.broadcast.created'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      handleCloseDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleCloseDialog() {
    setDialogOpen(false);
    setMessage('');
    setScheduledAt('');
    setAudience('all');
    setConfirmValue('');
  }

  function handleCreate() {
    if (!message.trim() || !scheduledAt || !audience) return;
    createMutation.mutate({
      message: message.trim(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      audience,
      confirmCount: parseInt(confirmValue, 10) || 0,
    });
  }

  const broadcasts = broadcastData ?? [];
  const targetCount = targetData ?? null;
  const confirmReady = targetCount !== null && parseInt(confirmValue, 10) === targetCount;

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <PageHeader title={t('admin.broadcast.title')} />
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.broadcast.createBroadcast')}
          </Button>
        </div>
      </Card>

      {/* Broadcasts list */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.broadcast.columns.message')}</TableHead>
              <TableHead>{t('admin.broadcast.columns.audience')}</TableHead>
              <TableHead>{t('admin.broadcast.columns.scheduledAt')}</TableHead>
              <TableHead>{t('admin.broadcast.columns.sentAt')}</TableHead>
              <TableHead>{t('admin.broadcast.columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : broadcasts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('admin.broadcast.noBroadcasts')}
                </TableCell>
              </TableRow>
            ) : (
              broadcasts.map((b) => {
                const status = getBroadcastStatus(b);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="max-w-xs truncate font-medium" title={b.message}>
                      {b.message.length > 80 ? `${b.message.slice(0, 80)}…` : b.message}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.audience}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(b.scheduledAt), 'PPpp', { locale: cs })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.sentAt ? format(new Date(b.sentAt), 'PPpp', { locale: cs }) : '—'}
                    </TableCell>
                    <TableCell>
                      {status === 'sent' && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('admin.broadcast.statusSent')}
                        </Badge>
                      )}
                      {status === 'scheduled' && (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {t('admin.broadcast.statusScheduled')}
                        </Badge>
                      )}
                      {status === 'draft' && (
                        <Badge variant="outline" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {t('admin.broadcast.statusDraft')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Broadcast Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              {t('admin.broadcast.createBroadcastTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-message">{t('admin.broadcast.fields.message')}</Label>
              <Textarea
                id="broadcast-message"
                placeholder={t('admin.broadcast.fields.messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-scheduled-at">
                {t('admin.broadcast.fields.scheduledAt')}
              </Label>
              <Input
                id="broadcast-scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Audience */}
            <div className="space-y-1.5">
              <Label>{t('admin.broadcast.fields.audience')}</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as AudienceValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.label as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target count preview */}
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              {targetLoading ? (
                <span className="text-muted-foreground">{t('admin.broadcast.targetLoading')}</span>
              ) : targetCount !== null ? (
                <span>{t('admin.broadcast.targetCount', { count: targetCount })}</span>
              ) : null}
            </div>

            {/* Confirmation input */}
            {targetCount !== null && (
              <div className="space-y-1.5">
                <Label htmlFor="broadcast-confirm">
                  {t('admin.broadcast.fields.confirmCount', { count: targetCount })}
                </Label>
                <Input
                  id="broadcast-confirm"
                  type="number"
                  placeholder={String(targetCount)}
                  value={confirmValue}
                  onChange={(e) => setConfirmValue(e.target.value)}
                />
                {confirmValue && !confirmReady && (
                  <p className="text-xs text-destructive">{t('admin.broadcast.confirmMismatch')}</p>
                )}
                {confirmReady && (
                  <p className="text-xs text-green-600">{t('admin.broadcast.confirmMatch')}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !message.trim() || !scheduledAt || !confirmReady || createMutation.isPending
              }
            >
              {createMutation.isPending ? t('admin.broadcast.creating') : t('admin.broadcast.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

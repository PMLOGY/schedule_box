'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Globe,
  Plus,
  Trash2,
  TestTube2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  useWebhookEndpoints,
  useCreateWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useTestWebhookEndpoint,
  useWebhookDeliveries,
  type WebhookEndpoint,
  type WebhookEndpointCreated,
  type WebhookDelivery,
} from '@/hooks/use-webhooks-config-query';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_ENDPOINTS = 5;

const ALL_EVENTS = [
  'booking.created',
  'booking.confirmed',
  'booking.cancelled',
  'booking.completed',
  'booking.no_show',
  'payment.received',
  'payment.refunded',
] as const;

type WebhookEvent = (typeof ALL_EVENTS)[number];

// Human-readable labels for events (avoids complex i18n key resolution)
const EVENT_LABELS: Record<WebhookEvent, string> = {
  'booking.created': 'Booking Created',
  'booking.confirmed': 'Booking Confirmed',
  'booking.cancelled': 'Booking Cancelled',
  'booking.completed': 'Booking Completed',
  'booking.no_show': 'No Show',
  'payment.received': 'Payment Received',
  'payment.refunded': 'Payment Refunded',
};

// ============================================================================
// CREATE DIALOG
// ============================================================================

interface CreateEndpointDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (endpoint: WebhookEndpointCreated) => void;
}

function CreateEndpointDialog({ open, onClose, onCreated }: CreateEndpointDialogProps) {
  const t = useTranslations('settings.webhooks');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [urlError, setUrlError] = useState('');
  const createMutation = useCreateWebhookEndpoint();

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const selectAll = () => setSelectedEvents([...ALL_EVENTS]);
  const deselectAll = () => setSelectedEvents([]);

  const handleSubmit = async () => {
    setUrlError('');

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setUrlError('Please enter a valid URL (e.g. https://your-server.com/webhook)');
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error('Select at least one event');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({ url, events: selectedEvents });
      onCreated(result);
      setUrl('');
      setSelectedEvents([]);
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error.message ?? t('createError'));
    }
  };

  const handleClose = () => {
    setUrl('');
    setSelectedEvents([]);
    setUrlError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Webhook Endpoint</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label>{t('endpointUrl')}</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('endpointUrlPlaceholder')}
              className={urlError ? 'border-red-500' : ''}
            />
            {urlError && <p className="text-sm text-red-500">{urlError}</p>}
          </div>

          {/* Event Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('selectEvents')}</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 text-xs">
                  {t('selectAll')}
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="h-6 text-xs">
                  {t('deselectAll')}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
              {ALL_EVENTS.map((event) => (
                <div key={event} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`event-${event}`}
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="h-4 w-4 cursor-pointer rounded border border-input accent-primary"
                  />
                  <label
                    htmlFor={`event-${event}`}
                    className="cursor-pointer text-sm font-medium leading-none"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{event}</span>
                    <span className="ml-2 text-foreground">— {EVENT_LABELS[event]}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !url || selectedEvents.length === 0}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('createEndpoint')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SECRET REVEAL DIALOG
// ============================================================================

interface SecretRevealDialogProps {
  secret: string | null;
  onClose: () => void;
}

function SecretRevealDialog({ secret, onClose }: SecretRevealDialogProps) {
  const t = useTranslations('settings.webhooks');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!secret} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('secretTitle')}
          </DialogTitle>
          <DialogDescription className="text-amber-600 dark:text-amber-400">
            {t('secretWarning')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label>{t('secretLabel')}</Label>
          <div className="relative">
            <code className="block w-full break-all rounded-md border bg-muted p-3 font-mono text-sm">
              {secret}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="default">
            {t('secretDismiss')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ENDPOINT CARD
// ============================================================================

interface EndpointCardProps {
  endpoint: WebhookEndpoint;
}

function EndpointCard({ endpoint }: EndpointCardProps) {
  const t = useTranslations('settings.webhooks');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string;
    responseStatus: number | null;
    responseTimeMs: number | null;
  } | null>(null);

  const deleteMutation = useDeleteWebhookEndpoint();
  const testMutation = useTestWebhookEndpoint();

  const handleTest = async () => {
    setTestResult(null);
    try {
      const result = await testMutation.mutateAsync(endpoint.id);
      setTestResult({
        status: result.status,
        responseStatus: result.response_status,
        responseTimeMs: result.response_time_ms,
      });
    } catch {
      setTestResult({ status: 'failed', responseStatus: null, responseTimeMs: null });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(endpoint.id);
      toast.success(t('deleteSuccess'));
      setShowConfirmDelete(false);
    } catch {
      toast.error(t('deleteError'));
    }
  };

  const truncateUrl = (url: string, maxLen = 50) =>
    url.length > maxLen ? url.slice(0, maxLen) + '...' : url;

  return (
    <>
      <div className="glass-surface flex items-start justify-between rounded-lg border border-glass p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-sm font-medium" title={endpoint.url}>
              {truncateUrl(endpoint.url)}
            </span>
            <Badge
              variant="outline"
              className={
                endpoint.isActive
                  ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'border-gray-500/30 bg-gray-500/10 text-gray-600'
              }
            >
              {endpoint.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Event badges */}
          <div className="flex flex-wrap gap-1">
            {endpoint.events.map((event) => (
              <Badge key={event} variant="secondary" className="h-5 px-1.5 text-xs font-mono">
                {event}
              </Badge>
            ))}
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`flex items-center gap-2 text-xs ${
                testResult.status === 'delivered' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {testResult.status === 'delivered' ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              <span>
                {testResult.status === 'delivered' ? t('testSuccess') : t('testFailed')}
                {testResult.responseStatus != null && ` (HTTP ${testResult.responseStatus})`}
                {testResult.responseTimeMs != null && ` • ${testResult.responseTimeMs}ms`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ml-4 flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="h-8 text-xs"
          >
            {testMutation.isPending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                {t('testing')}
              </>
            ) : (
              <>
                <TestTube2 className="mr-1 h-3 w-3" />
                {t('testButton')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirmDelete(true)}
            className="h-8 text-xs text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Confirm delete dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deleteButton')}</DialogTitle>
            <DialogDescription>{t('confirmDelete')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('deleteButton')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// DELIVERY STATUS BADGE
// ============================================================================

function DeliveryStatusBadge({ status }: { status: string }) {
  if (status === 'delivered') {
    return (
      <Badge className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        Delivered
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">
        <XCircle className="mr-1 h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
      <Clock className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  );
}

// ============================================================================
// DELIVERY LOG ROW (expandable)
// ============================================================================

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const [expanded, setExpanded] = useState(false);

  const truncateUrl = (url: string) => (url.length > 40 ? url.slice(0, 40) + '...' : url);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {new Date(delivery.createdAt).toLocaleString()}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono text-xs">
            {delivery.eventType}
          </Badge>
        </TableCell>
        <TableCell
          className="max-w-[200px] truncate font-mono text-xs"
          title={delivery.endpointUrl}
        >
          {truncateUrl(delivery.endpointUrl)}
        </TableCell>
        <TableCell>
          <DeliveryStatusBadge status={delivery.status} />
        </TableCell>
        <TableCell className="text-center text-sm">{delivery.responseStatus ?? '—'}</TableCell>
        <TableCell className="text-right text-sm">
          {delivery.responseTimeMs != null ? `${delivery.responseTimeMs}ms` : '—'}
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {expanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Request Payload
                </p>
                <pre className="max-h-48 overflow-auto rounded bg-muted p-3 font-mono text-xs">
                  {delivery.payload
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(delivery.payload), null, 2);
                        } catch {
                          return delivery.payload;
                        }
                      })()
                    : '(empty)'}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Response Body
                </p>
                <pre className="max-h-48 overflow-auto rounded bg-muted p-3 font-mono text-xs">
                  {delivery.responseBody
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(delivery.responseBody), null, 2);
                        } catch {
                          return delivery.responseBody;
                        }
                      })()
                    : '(empty)'}
                </pre>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ============================================================================
// DELIVERY LOG SECTION
// ============================================================================

interface DeliveryLogSectionProps {
  endpoints: WebhookEndpoint[];
}

function DeliveryLogSection({ endpoints }: DeliveryLogSectionProps) {
  const t = useTranslations('settings.webhooks');
  const [page, setPage] = useState(1);
  const [filterEndpointId, setFilterEndpointId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useWebhookDeliveries(page, filterEndpointId);

  const deliveries = data?.data ?? [];
  const meta = data?.meta;

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('deliveryLog')}</CardTitle>
            <CardDescription>{t('deliveryLogDescription')}</CardDescription>
          </div>

          {/* Endpoint filter */}
          {endpoints.length > 0 && (
            <Select
              value={filterEndpointId ?? 'all'}
              onValueChange={(v) => {
                setFilterEndpointId(v === 'all' ? undefined : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-52 text-xs">
                <SelectValue placeholder={t('filterByEndpoint')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allEndpoints')}</SelectItem>
                {endpoints.map((ep) => (
                  <SelectItem key={ep.id} value={ep.id}>
                    {ep.url.length > 35 ? ep.url.slice(0, 35) + '...' : ep.url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : deliveries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('noDeliveries')}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('columns.timestamp')}</TableHead>
                  <TableHead className="text-xs">{t('columns.eventType')}</TableHead>
                  <TableHead className="text-xs">{t('columns.endpointUrl')}</TableHead>
                  <TableHead className="text-xs">{t('columns.status')}</TableHead>
                  <TableHead className="text-center text-xs">{t('columns.httpStatus')}</TableHead>
                  <TableHead className="text-right text-xs">{t('columns.responseTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <DeliveryRow key={delivery.id} delivery={delivery} />
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {meta && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {page}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={deliveries.length < 20}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function WebhooksPage() {
  const t = useTranslations('settings.webhooks');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEndpointSecret, setNewEndpointSecret] = useState<string | null>(null);

  const { data: endpoints, isLoading } = useWebhookEndpoints();
  const endpointList = endpoints ?? [];
  const atLimit = endpointList.length >= MAX_ENDPOINTS;

  const handleEndpointCreated = (endpoint: WebhookEndpointCreated) => {
    setShowCreateDialog(false);
    setNewEndpointSecret(endpoint.secret);
    toast.success(t('created'));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={atLimit ? 0 : undefined}>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    disabled={atLimit || isLoading}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t('addEndpoint')}
                  </Button>
                </span>
              </TooltipTrigger>
              {atLimit && (
                <TooltipContent>
                  <p>{t('maxEndpointsTooltip')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          }
        />

        {/* Endpoint List */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Webhook Endpoints
              <Badge variant="outline" className="ml-auto text-xs">
                {endpointList.length} / {MAX_ENDPOINTS}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : endpointList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('noEndpoints')}</p>
            ) : (
              <div className="space-y-3">
                {endpointList.map((endpoint) => (
                  <EndpointCard key={endpoint.id} endpoint={endpoint} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Log */}
        <DeliveryLogSection endpoints={endpointList} />

        {/* Create Endpoint Dialog */}
        <CreateEndpointDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleEndpointCreated}
        />

        {/* Secret Reveal Dialog (shown once after creation) */}
        <SecretRevealDialog secret={newEndpointSecret} onClose={() => setNewEndpointSecret(null)} />
      </div>
    </TooltipProvider>
  );
}

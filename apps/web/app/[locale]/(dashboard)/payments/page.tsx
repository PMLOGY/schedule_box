'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { RotateCcw, Eye, Calendar, X } from 'lucide-react';
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
import {
  usePaymentsQuery,
  usePaymentDetail,
  useRefundPayment,
  type PaymentListItem,
} from '@/hooks/use-payments-query';
import { useCurrencyFormat } from '@/hooks/use-currency-format';
import { EmptyState } from '@/components/shared/empty-state';
import { Wallet } from 'lucide-react';

// ============================================================================
// STATUS BADGE HELPERS
// ============================================================================

type PaymentStatus = PaymentListItem['status'];

const STATUS_BADGE_VARIANT: Record<
  PaymentStatus,
  'glass-green' | 'glass-amber' | 'glass-red' | 'glass-gray'
> = {
  pending: 'glass-amber',
  paid: 'glass-green',
  failed: 'glass-red',
  refunded: 'glass-red',
  partially_refunded: 'glass-amber',
};

// Gateway → i18n key mapping
const GATEWAY_I18N_KEYS: Record<string, string> = {
  comgate: 'comgate',
  cash: 'cash',
  bank_transfer: 'bankTransfer',
  qrcomat: 'qr',
  gift_card: 'giftCard',
};

function useGatewayLabel() {
  const t = useTranslations('payments.methods');
  return (gateway: string) => {
    const key = GATEWAY_I18N_KEYS[gateway];
    if (key && t.has(key)) return t(key);
    return gateway;
  };
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PaymentsPage() {
  const t = useTranslations('payments');
  const tCommon = useTranslations('common');
  const getGatewayLabel = useGatewayLabel();

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail drawer state
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const { formatCurrency } = useCurrencyFormat();

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = { page, limit };
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    if (gatewayFilter && gatewayFilter !== 'all') params.gateway = gatewayFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [page, limit, statusFilter, gatewayFilter, dateFrom, dateTo]);

  const { data, isLoading } = usePaymentsQuery(queryParams);
  const { data: paymentDetail, isLoading: detailLoading } = usePaymentDetail(selectedPaymentId);
  const refundMutation = useRefundPayment();

  // ============================================================================
  // KPI — from API aggregates (company-wide, not affected by filters)
  // ============================================================================

  const agg = (data?.meta as unknown as Record<string, unknown>)?.aggregates as
    | {
        total_revenue: string;
        paid_count: number;
        pending_count: number;
        refunded_count: number;
      }
    | undefined;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefund = async () => {
    if (!refundPaymentId || !refundReason.trim()) return;
    try {
      await refundMutation.mutateAsync({
        id: refundPaymentId,
        reason: refundReason,
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
      });
      toast.success(t('refundSuccess'));
      setRefundDialogOpen(false);
      setRefundPaymentId(null);
      setRefundReason('');
      setRefundAmount('');
      // Close detail if it was showing the refunded payment
      if (selectedPaymentId === refundPaymentId) {
        setSelectedPaymentId(null);
      }
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('refundError'));
    }
  };

  const openRefundDialog = (paymentId: string) => {
    setRefundPaymentId(paymentId);
    setRefundReason('');
    setRefundAmount('');
    setRefundDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setGatewayFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || gatewayFilter !== 'all' || dateFrom || dateTo;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader title={t('title')} description={t('description')} />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4">
          <div className="text-sm text-muted-foreground">{t('kpi.totalRevenue')}</div>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(parseFloat(agg?.total_revenue ?? '0'))}
          </div>
        </Card>
        <Card variant="glass" className="p-4">
          <div className="text-sm text-muted-foreground">{t('kpi.completedPayments')}</div>
          <div className="text-2xl font-bold mt-1">{agg?.paid_count ?? 0}</div>
        </Card>
        <Card variant="glass" className="p-4">
          <div className="text-sm text-muted-foreground">{t('kpi.pendingPayments')}</div>
          <div className="text-2xl font-bold mt-1">{agg?.pending_count ?? 0}</div>
        </Card>
        <Card variant="glass" className="p-4">
          <div className="text-sm text-muted-foreground">{t('kpi.refundedPayments')}</div>
          <div className="text-2xl font-bold mt-1">{agg?.refunded_count ?? 0}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Status filter */}
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('statuses.pending')}</SelectItem>
                <SelectItem value="paid">{t('statuses.paid')}</SelectItem>
                <SelectItem value="failed">{t('statuses.failed')}</SelectItem>
                <SelectItem value="refunded">{t('statuses.refunded')}</SelectItem>
                <SelectItem value="partially_refunded">
                  {t('statuses.partiallyRefunded')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gateway/method filter */}
          <div className="w-full sm:w-48">
            <Select
              value={gatewayFilter}
              onValueChange={(val) => {
                setGatewayFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.method')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allMethods')}</SelectItem>
                <SelectItem value="comgate">Comgate</SelectItem>
                <SelectItem value="cash">{t('methods.cash')}</SelectItem>
                <SelectItem value="bank_transfer">{t('methods.bankTransfer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                placeholder={t('filters.dateFrom')}
                className="pl-9 w-40"
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              placeholder={t('filters.dateTo')}
              className="w-40"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {t('filters.clear')}
            </Button>
          )}
        </div>
      </Card>

      {/* Payments Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.date')}</TableHead>
              <TableHead>{t('columns.customer')}</TableHead>
              <TableHead>{t('columns.service')}</TableHead>
              <TableHead className="text-right">{t('columns.amount')}</TableHead>
              <TableHead>{t('columns.method')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
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
                  <EmptyState
                    icon={Wallet}
                    title={t('empty.title')}
                    description={t('empty.description')}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedPaymentId(payment.id)}
                >
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(payment.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{payment.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.service_name}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="glass-gray">{getGatewayLabel(payment.gateway)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[payment.status]}>
                      {t(
                        `statuses.${payment.status === 'partially_refunded' ? 'partiallyRefunded' : payment.status}`,
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPaymentId(payment.id);
                        }}
                        title={t('actions.viewDetail')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(payment.status === 'paid' || payment.status === 'partially_refunded') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRefundDialog(payment.id);
                          }}
                          title={t('actions.refund')}
                          className="text-destructive hover:text-destructive"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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

      {/* Payment Detail Dialog */}
      <Dialog
        open={selectedPaymentId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPaymentId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('detail.title')}</DialogTitle>
            <DialogDescription>{t('detail.description')}</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">{tCommon('loading')}</div>
          ) : paymentDetail ? (
            <div className="space-y-4">
              {/* Status + Amount */}
              <div className="flex items-center justify-between">
                <Badge variant={STATUS_BADGE_VARIANT[paymentDetail.status]} className="text-sm">
                  {t(
                    `statuses.${paymentDetail.status === 'partially_refunded' ? 'partiallyRefunded' : paymentDetail.status}`,
                  )}
                </Badge>
                <div className="text-2xl font-bold">{formatCurrency(paymentDetail.amount)}</div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">{t('detail.gateway')}</div>
                  <div className="font-medium">{getGatewayLabel(paymentDetail.gateway)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('detail.createdAt')}</div>
                  <div className="font-medium">{formatDate(paymentDetail.created_at)}</div>
                </div>
                {paymentDetail.paid_at && (
                  <div>
                    <div className="text-muted-foreground">{t('detail.paidAt')}</div>
                    <div className="font-medium">{formatDate(paymentDetail.paid_at)}</div>
                  </div>
                )}
                {paymentDetail.gateway_transaction_id && (
                  <div>
                    <div className="text-muted-foreground">{t('detail.transactionId')}</div>
                    <div className="font-medium text-xs break-all">
                      {paymentDetail.gateway_transaction_id}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="border-t pt-3">
                <div className="text-sm text-muted-foreground mb-1">{t('detail.customer')}</div>
                <div className="font-medium">{paymentDetail.customer.name}</div>
                {paymentDetail.customer.email && (
                  <div className="text-sm text-muted-foreground">
                    {paymentDetail.customer.email}
                  </div>
                )}
              </div>

              {/* Booking/Service */}
              <div className="border-t pt-3">
                <div className="text-sm text-muted-foreground mb-1">{t('detail.service')}</div>
                <div className="font-medium">{paymentDetail.booking.service_name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(paymentDetail.booking.start_time)}
                </div>
              </div>

              {/* Invoice */}
              {paymentDetail.invoice && (
                <div className="border-t pt-3">
                  <div className="text-sm text-muted-foreground mb-1">{t('detail.invoice')}</div>
                  <div className="font-medium">{paymentDetail.invoice.invoice_number}</div>
                  <Badge variant="glass-gray" className="mt-1">
                    {paymentDetail.invoice.status}
                  </Badge>
                </div>
              )}

              {/* Refund Info */}
              {(paymentDetail.status === 'refunded' ||
                paymentDetail.status === 'partially_refunded') && (
                <div className="border-t pt-3">
                  <div className="text-sm text-muted-foreground mb-1">{t('detail.refundInfo')}</div>
                  {paymentDetail.refund_amount && (
                    <div className="font-medium text-destructive">
                      -{formatCurrency(paymentDetail.refund_amount)}
                    </div>
                  )}
                  {paymentDetail.refund_reason && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {paymentDetail.refund_reason}
                    </div>
                  )}
                  {paymentDetail.refunded_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(paymentDetail.refunded_at)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">{t('detail.notFound')}</div>
          )}

          <DialogFooter>
            {paymentDetail &&
              (paymentDetail.status === 'paid' ||
                paymentDetail.status === 'partially_refunded') && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    openRefundDialog(paymentDetail.id);
                    setSelectedPaymentId(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('actions.refund')}
                </Button>
              )}
            <Button variant="outline" onClick={() => setSelectedPaymentId(null)}>
              {tCommon('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('refund.title')}</DialogTitle>
            <DialogDescription>{t('refund.description')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRefund();
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="refund-reason">{t('refund.reason')} *</Label>
                <Input
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder={t('refund.reasonPlaceholder')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="refund-amount">{t('refund.amount')}</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={t('refund.amountPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('refund.amountHint')}</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRefundDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!refundReason.trim() || refundMutation.isPending}
              >
                {refundMutation.isPending ? tCommon('loading') : t('refund.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

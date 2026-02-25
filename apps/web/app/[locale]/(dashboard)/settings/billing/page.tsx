'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Download, AlertTriangle, Check, X, Crown } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  useBillingPlans,
  useCurrentSubscription,
  useBillingInvoices,
  useBillingStatus,
  useSubscribe,
  useUpgrade,
  useDowngrade,
  type BillingPlan,
} from '@/hooks/use-billing-query';
import type { SubscriptionPlan } from '@schedulebox/shared';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLAN_ORDER: SubscriptionPlan[] = ['free', 'essential', 'growth', 'ai_powered'];

const PLAN_TIER_INDEX: Record<string, number> = {
  free: 0,
  essential: 1,
  growth: 2,
  ai_powered: 3,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  past_due: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const PAYMENT_POLL_TIMEOUT_MS = 15_000;

// ============================================================================
// CURRENT SUBSCRIPTION CARD
// ============================================================================

function CurrentSubscriptionCard() {
  const t = useTranslations('billing');
  const tCommon = useTranslations('common');
  const { data: subscription, isLoading } = useCurrentSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const downgradeMutation = useDowngrade();

  const handleCancel = async () => {
    try {
      await downgradeMutation.mutateAsync({ plan: 'free' as SubscriptionPlan });
      toast.success(t('actions.cancelSuccess'));
      setShowCancelDialog(false);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCommon('error'));
    }
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('currentPlan')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tCommon('loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No subscription — Free plan
  if (!subscription) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('currentPlan')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">{t('freePlan')}</span>
                <Badge variant="secondary">{t('plans.free')}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t('noPaidSubscription')}</p>
            </div>
            <Button asChild>
              <a href="#plans">{t('upgradeNow')}</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusKey = subscription.status as string;
  const statusColorClass = STATUS_COLORS[statusKey] || STATUS_COLORS.expired;

  return (
    <>
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('currentPlan')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Past due warning */}
          {subscription.status === 'past_due' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{t('warnings.pastDue')}</AlertDescription>
            </Alert>
          )}

          {/* Pending downgrade notice */}
          {subscription.pendingDowngrade && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('warnings.pendingDowngrade', { plan: subscription.pendingDowngrade })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{subscription.planName}</span>
                <Badge className={statusColorClass}>{t(`status.${statusKey}`)}</Badge>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">{t('monthlyPrice')}</dt>
                  <dd className="font-medium">
                    {Number(subscription.priceAmount).toLocaleString('cs-CZ')}{' '}
                    {subscription.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('nextBilling')}</dt>
                  <dd className="font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('cs-CZ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('billingCycle')}</dt>
                  <dd className="font-medium">
                    {subscription.billingCycle === 'annual' ? t('annual') : t('monthly')}
                  </dd>
                </div>
              </dl>

              <p className="text-sm text-muted-foreground">
                {t('daysUntilRenewal', { days: subscription.daysUntilRenewal })}
              </p>
            </div>

            {subscription.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                {t('actions.cancelSubscription')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('actions.cancelSubscription')}</DialogTitle>
            <DialogDescription>{t('actions.cancelConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={downgradeMutation.isPending}
            >
              {downgradeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// PLAN COMPARISON GRID
// ============================================================================

function PlanComparisonGrid() {
  const t = useTranslations('billing');
  const tCommon = useTranslations('common');
  const { data: plans, isLoading: plansLoading } = useBillingPlans();
  const { data: subscription } = useCurrentSubscription();
  const subscribeMutation = useSubscribe();
  const upgradeMutation = useUpgrade();

  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<SubscriptionPlan | null>(null);
  const downgradeMutation = useDowngrade();

  const currentPlanKey = subscription?.plan || 'free';
  const currentTier = PLAN_TIER_INDEX[currentPlanKey] ?? 0;

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      const result = await subscribeMutation.mutateAsync({ plan });
      // Redirect to Comgate payment page
      window.location.href = result.redirectUrl;
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCommon('error'));
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    try {
      const result = await upgradeMutation.mutateAsync({ plan });

      if (result.charged) {
        // Proration charged server-side — no redirect needed
        toast.success(t('actions.upgradeSuccess'));
        toast.info(t('actions.upgradeProrationCharged'));
      } else if (result.redirectUrl) {
        // Redirect to Comgate for payment (rare: no recurring token)
        window.location.href = result.redirectUrl;
      }
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCommon('error'));
    }
  };

  const handleDowngradeClick = (plan: SubscriptionPlan) => {
    setPendingDowngradePlan(plan);
    setShowDowngradeDialog(true);
  };

  const handleDowngradeConfirm = async () => {
    if (!pendingDowngradePlan) return;

    try {
      await downgradeMutation.mutateAsync({ plan: pendingDowngradePlan });
      toast.success(t('actions.downgradeSuccess'));
      setShowDowngradeDialog(false);
      setPendingDowngradePlan(null);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCommon('error'));
    }
  };

  const formatFeatureValue = (value: number) => {
    if (value === Infinity || value > 99999) {
      return t('features.unlimited');
    }
    return value.toLocaleString('cs-CZ');
  };

  const renderPlanAction = (plan: BillingPlan) => {
    const planTier = PLAN_TIER_INDEX[plan.key] ?? 0;

    if (plan.key === currentPlanKey) {
      return (
        <Badge variant="outline" className="w-full justify-center py-2">
          {t('plans.current')}
        </Badge>
      );
    }

    // Free plan — no action needed (downgrade to free is done via cancel)
    if (plan.key === 'free') {
      return null;
    }

    // User is on free plan and has no subscription — use subscribe
    if (!subscription && planTier > currentTier) {
      return (
        <Button
          className="w-full"
          onClick={() => handleSubscribe(plan.key)}
          disabled={subscribeMutation.isPending}
        >
          {subscribeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('plans.subscribe')}
        </Button>
      );
    }

    // Higher tier — upgrade
    if (planTier > currentTier) {
      return (
        <Button
          className="w-full"
          onClick={() => handleUpgrade(plan.key)}
          disabled={upgradeMutation.isPending}
        >
          {upgradeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('plans.upgrade')}
        </Button>
      );
    }

    // Lower tier — downgrade
    if (planTier < currentTier) {
      return (
        <Button variant="outline" className="w-full" onClick={() => handleDowngradeClick(plan.key)}>
          {t('plans.downgrade')}
        </Button>
      );
    }

    return null;
  };

  // Build plan list — always show all 4, use plans data if loaded
  const planList: BillingPlan[] = plans
    ? PLAN_ORDER.map(
        (key) =>
          plans.find((p) => p.key === key) || {
            key,
            name: key,
            price: 0,
            priceAnnual: 0,
            currency: 'CZK',
            features: {
              maxBookingsPerMonth: 0,
              maxEmployees: 0,
              maxServices: 0,
              aiFeatures: false,
            },
          },
      )
    : [];

  if (plansLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('plans.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tCommon('loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div id="plans">
        <h2 className="mb-4 text-xl font-semibold">{t('plans.title')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {planList.map((plan) => {
            const isCurrentPlan = plan.key === currentPlanKey;
            const isPopular = plan.key === 'growth';

            return (
              <Card
                key={plan.key}
                variant="glass"
                className={`relative flex flex-col ${
                  isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                {/* Most popular badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="mr-1 h-3 w-3" />
                      {t('plans.mostPopular')}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{t(`plans.${plan.key}`)}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price.toLocaleString('cs-CZ')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {' '}
                      {plan.currency} {t('plans.perMonth')}
                    </span>
                    {plan.priceAnnual > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {plan.priceAnnual.toLocaleString('cs-CZ')} {plan.currency}{' '}
                        {t('plans.perYear')}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  {/* Features list */}
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t('features.bookingsPerMonth')}
                      </span>
                      <span className="font-medium">
                        {formatFeatureValue(plan.features.maxBookingsPerMonth)}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('features.employees')}</span>
                      <span className="font-medium">
                        {formatFeatureValue(plan.features.maxEmployees)}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('features.services')}</span>
                      <span className="font-medium">
                        {formatFeatureValue(plan.features.maxServices)}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('features.aiFeatures')}</span>
                      <span>
                        {plan.features.aiFeatures ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                    </li>
                  </ul>

                  {/* Action button */}
                  <div>{renderPlanAction(plan)}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Downgrade confirmation dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('plans.downgrade')}</DialogTitle>
            <DialogDescription>{t('actions.downgradeConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDowngradeDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleDowngradeConfirm} disabled={downgradeMutation.isPending}>
              {downgradeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// INVOICE HISTORY TABLE
// ============================================================================

function InvoiceHistoryTable() {
  const t = useTranslations('billing');
  const tCommon = useTranslations('common');
  const { data: invoices, isLoading } = useBillingInvoices();

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">{t('invoices.paid')}</Badge>;
      case 'issued':
        return <Badge variant="outline">{t('invoices.issued')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('invoices.failed')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('invoices.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tCommon('loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>{t('invoices.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('invoices.noInvoices')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoices.number')}</TableHead>
                <TableHead>{t('invoices.period')}</TableHead>
                <TableHead>{t('invoices.amount')}</TableHead>
                <TableHead>{t('invoices.status')}</TableHead>
                <TableHead className="text-right">{t('invoices.download')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    {new Date(invoice.periodStart).toLocaleDateString('cs-CZ')} -{' '}
                    {new Date(invoice.periodEnd).toLocaleDateString('cs-CZ')}
                  </TableCell>
                  <TableCell>
                    {Number(invoice.amount).toLocaleString('cs-CZ')} {invoice.currency}
                  </TableCell>
                  <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    {invoice.pdfUrl ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={`/api/v1/billing/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="mr-1 h-4 w-4" />
                          PDF
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAYMENT PENDING OVERLAY
// ============================================================================

function PaymentPendingOverlay({
  onActivated,
  onTimeout,
}: {
  onActivated: () => void;
  onTimeout: () => void;
}) {
  const t = useTranslations('billing');
  const { data: status } = useBillingStatus(true);
  const [timedOut, setTimedOut] = useState(false);

  // Timeout after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
      onTimeout();
    }, PAYMENT_POLL_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [onTimeout]);

  // Check for activation
  useEffect(() => {
    if (status?.activated) {
      onActivated();
    }
  }, [status?.activated, onActivated]);

  if (timedOut) {
    return (
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t('actions.paymentTimeout')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
        {t('actions.paymentPending')}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN BILLING PAGE
// ============================================================================

export default function BillingPage() {
  const t = useTranslations('billing');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPaymentPending, setIsPaymentPending] = useState(false);

  // Check for ?payment=pending on mount
  useEffect(() => {
    if (searchParams.get('payment') === 'pending') {
      setIsPaymentPending(true);
    }
  }, [searchParams]);

  const handlePaymentActivated = useCallback(() => {
    setIsPaymentPending(false);
    toast.success(t('actions.paymentActivated'));
    // Remove ?payment=pending from URL
    router.replace(window.location.pathname);
  }, [t, router]);

  const handlePaymentTimeout = useCallback(() => {
    setIsPaymentPending(false);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />

      {/* Payment pending overlay */}
      {isPaymentPending && (
        <PaymentPendingOverlay
          onActivated={handlePaymentActivated}
          onTimeout={handlePaymentTimeout}
        />
      )}

      {/* Section 1: Current Subscription */}
      <CurrentSubscriptionCard />

      {/* Section 2: Plan Comparison */}
      <PlanComparisonGrid />

      {/* Section 3: Invoice History */}
      <InvoiceHistoryTable />
    </div>
  );
}

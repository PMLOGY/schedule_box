'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import {
  useLoyaltyCard,
  useTransactions,
  useAddPoints,
  useLoyaltyProgram,
} from '@/hooks/use-loyalty-queries';
import { useLoyaltyStore } from '@/stores/loyalty.store';
import {
  CreditCard,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';

// ============================================================================
// PROGRESS BAR
// ============================================================================

function TierProgressBar({
  currentPoints,
  currentTierName,
  nextTier,
  t,
}: {
  currentPoints: number;
  currentTierName: string | null;
  nextTier: {
    name: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
  t: ReturnType<typeof useTranslations<'loyaltyCardDetail'>>;
}) {
  if (!nextTier) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('maxTierReached', { tierName: currentTierName ?? t('noTier') })}
          </span>
          <span className="font-medium">{currentPoints.toLocaleString()}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary">
          <div className="h-3 rounded-full bg-primary" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const progress = Math.min(
    100,
    ((nextTier.minPoints - nextTier.pointsNeeded) / nextTier.minPoints) * 100,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {currentTierName ?? t('noTier')} &rarr; {nextTier.name}
        </span>
        <span className="font-medium">
          {t('pointsNeeded', { points: nextTier.pointsNeeded.toLocaleString() })}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-secondary">
        <div
          className="h-3 rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t('pointsToTier', {
          current: (nextTier.minPoints - nextTier.pointsNeeded).toLocaleString(),
          target: nextTier.minPoints.toLocaleString(),
          tierName: nextTier.name,
        })}
      </p>
    </div>
  );
}

// ============================================================================
// ADD POINTS DIALOG
// ============================================================================

function AddPointsDialog({
  open,
  onOpenChange,
  cardId,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  t: ReturnType<typeof useTranslations<'loyaltyCardDetail'>>;
}) {
  const [points, setPoints] = useState(10);
  const [description, setDescription] = useState('');
  const addPoints = useAddPoints();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPoints.mutate(
      {
        cardId,
        data: {
          points,
          description: description || undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPoints(10);
          setDescription('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addPointsDialog.title')}</DialogTitle>
          <DialogDescription>{t('addPointsDialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-points">{t('addPointsDialog.points')}</Label>
            <Input
              id="add-points"
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-description">
              {t('addPointsDialog.descriptionLabel')}{' '}
              <span className="text-muted-foreground">
                {t('addPointsDialog.descriptionOptional')}
              </span>
            </Label>
            <Input
              id="add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('addPointsDialog.descriptionPlaceholder')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('addPointsDialog.cancel')}
            </Button>
            <Button type="submit" disabled={addPoints.isPending || points < 1}>
              {addPoints.isPending ? t('addPointsDialog.adding') : t('addPointsDialog.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LoyaltyCardDetailPage() {
  const t = useTranslations('loyaltyCardDetail');
  const locale = useLocale();
  const params = useParams();
  const cardId = params.id as string;

  const { data: card, isLoading: cardLoading, error: cardError } = useLoyaltyCard(cardId);
  const { data: program } = useLoyaltyProgram();
  const isStamps = program?.type === 'stamps';

  const [txPage, setTxPage] = useState(1);
  const txLimit = 20;
  const { data: txData, isLoading: txLoading } = useTransactions(cardId, {
    page: txPage,
    limit: txLimit,
  });

  const { addPointsDialogOpen, openAddPointsDialog, closeAddPointsDialog } = useLoyaltyStore();

  const transactions = txData?.data ?? [];
  const txPagination = txData?.meta;

  if (cardLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cardError || !card) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/loyalty/cards">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToCards')}
          </Link>
        </Button>
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">{t('cardNotFound')}</p>
            <p className="text-sm text-muted-foreground">{t('cardNotFoundDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" asChild>
        <Link href="/loyalty/cards">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToCards')}
        </Link>
      </Button>

      <PageHeader
        title={t('cardTitle', { cardNumber: card.cardNumber })}
        description={`${card.customer.name}${card.customer.email ? ` - ${card.customer.email}` : ''}`}
        actions={
          <Button onClick={openAddPointsDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addPoints')}
          </Button>
        }
      />

      {/* Card Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isStamps ? t('stampsBalance') : t('pointsBalance')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {isStamps
                ? (card.stampsBalance ?? 0).toLocaleString()
                : card.pointsBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('currentTier')}</CardDescription>
          </CardHeader>
          <CardContent>
            {card.currentTier ? (
              <Badge
                className="text-lg px-3 py-1"
                style={{
                  backgroundColor: card.currentTier.color,
                  color: '#fff',
                }}
              >
                {card.currentTier.name}
              </Badge>
            ) : (
              <p className="text-lg text-muted-foreground">{t('noTier')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('memberSince')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {new Date(card.createdAt).toLocaleDateString(locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('tierProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TierProgressBar
            currentPoints={card.pointsBalance}
            currentTierName={card.currentTier?.name ?? null}
            nextTier={card.nextTier}
            t={t}
          />
        </CardContent>
      </Card>

      {/* Wallet Passes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t('digitalWallet')}
          </CardTitle>
          <CardDescription>{t('digitalWalletDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href={`/api/v1/loyalty/cards/${cardId}/apple-pass`} download>
                {t('addToAppleWallet')}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`/api/v1/loyalty/cards/${cardId}/google-pass`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('addToGoogleWallet')}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionHistory')}</CardTitle>
          <CardDescription>{t('transactionHistoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center space-y-2">
              <p className="text-lg font-medium">{t('noTransactions')}</p>
              <p className="text-sm text-muted-foreground">{t('noTransactionsDescription')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('columns.date')}</TableHead>
                    <TableHead>{t('columns.type')}</TableHead>
                    <TableHead>{t('columns.points')}</TableHead>
                    <TableHead>{t('columns.balanceAfter')}</TableHead>
                    <TableHead>{t('columns.description')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const isPositive =
                      tx.type === 'earn' ||
                      tx.type === 'stamp' ||
                      (tx.type === 'adjust' && tx.points > 0);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.createdAt).toLocaleString(locale)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tx.type === 'redeem'
                                ? 'destructive'
                                : tx.type === 'expire'
                                  ? 'secondary'
                                  : tx.type === 'adjust'
                                    ? 'outline'
                                    : 'default'
                            }
                          >
                            {t(`transactionTypes.${tx.type}` as const)}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            isPositive ? 'font-medium text-green-600' : 'font-medium text-red-600'
                          }
                        >
                          {isPositive ? '+' : ''}
                          {tx.points.toLocaleString()}
                        </TableCell>
                        <TableCell>{tx.balanceAfter.toLocaleString()}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {tx.description ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {txPagination && txPagination.total_pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('page', {
                      page: txPagination.page,
                      totalPages: txPagination.total_pages,
                      total: txPagination.total,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      disabled={txPagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTxPage((p) => p + 1)}
                      disabled={txPagination.page === txPagination.total_pages}
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

      {/* Add Points Dialog */}
      <AddPointsDialog
        open={addPointsDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAddPointsDialog();
        }}
        cardId={cardId}
        t={t}
      />
    </div>
  );
}

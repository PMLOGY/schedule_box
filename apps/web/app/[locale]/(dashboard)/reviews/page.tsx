'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Star, MessageSquare, Filter } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { useReviewsQuery, useReplyToReview, type Review } from '@/hooks/use-reviews-query';

// ============================================================================
// STAR RATING DISPLAY
// ============================================================================

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-none text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// KPI CARDS
// ============================================================================

interface ReviewAggregates {
  avg_rating: number;
  total_reviews: number;
  this_month: number;
  response_rate: number;
}

function ReviewKpiCards({
  aggregates,
  t,
}: {
  aggregates: ReviewAggregates;
  t: ReturnType<typeof useTranslations<'reviews'>>;
}) {
  const kpis = [
    {
      label: t('kpi.avgRating'),
      value: aggregates.avg_rating > 0 ? aggregates.avg_rating.toFixed(1) : '-',
      icon: <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />,
    },
    {
      label: t('kpi.totalReviews'),
      value: aggregates.total_reviews.toString(),
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    },
    {
      label: t('kpi.thisMonth'),
      value: aggregates.this_month.toString(),
      icon: <Star className="h-5 w-5 text-green-500" />,
    },
    {
      label: t('kpi.responseRate'),
      value: `${aggregates.response_rate}%`,
      icon: <MessageSquare className="h-5 w-5 text-purple-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card variant="glass" key={kpi.label} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold mt-1">{kpi.value}</p>
            </div>
            <div className="rounded-full bg-muted p-2">{kpi.icon}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// REVIEW CARD
// ============================================================================

function ReviewCard({
  review,
  onReply,
  t,
}: {
  review: Review;
  onReply: (review: Review) => void;
  t: ReturnType<typeof useTranslations<'reviews'>>;
}) {
  const createdDate = new Date(review.created_at).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hasReply = review.reply !== null;

  return (
    <Card variant="glass" className="p-5 space-y-3">
      {/* Header: customer + rating + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-semibold text-sm">{review.customer_name || t('anonymousCustomer')}</p>
          <StarRating rating={review.rating} />
        </div>
        <Badge variant={hasReply ? 'glass-green' : 'glass-amber'}>
          {hasReply ? t('status.replied') : t('status.unreplied')}
        </Badge>
      </div>

      {/* Service + Date */}
      {review.service_name && (
        <p className="text-xs text-muted-foreground">{review.service_name}</p>
      )}
      <p className="text-xs text-muted-foreground">{createdDate}</p>

      {/* Comment */}
      {review.comment && <p className="text-sm leading-relaxed">{review.comment}</p>}

      {/* Existing reply */}
      {review.reply && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t('yourReply')}</p>
          <p className="text-sm">{review.reply}</p>
        </div>
      )}

      {/* Reply button */}
      {!hasReply && (
        <Button variant="outline" size="sm" onClick={() => onReply(review)} className="mt-2">
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          {t('replyButton')}
        </Button>
      )}
    </Card>
  );
}

// ============================================================================
// REPLY DIALOG
// ============================================================================

function ReplyDialog({
  review,
  open,
  onOpenChange,
  t,
}: {
  review: Review | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: ReturnType<typeof useTranslations<'reviews'>>;
}) {
  const [replyText, setReplyText] = useState('');
  const replyMutation = useReplyToReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review || !replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({ id: review.id, reply: replyText.trim() });
      toast.success(t('replySuccess'));
      setReplyText('');
      onOpenChange(false);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('replyError'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setReplyText('');
        onOpenChange(val);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('replyDialogTitle')}</DialogTitle>
          <DialogDescription>{t('replyDialogDescription')}</DialogDescription>
        </DialogHeader>

        {/* Show original review context */}
        {review && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {review.customer_name || t('anonymousCustomer')}
              </p>
              <StarRating rating={review.rating} size="sm" />
            </div>
            {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('replyPlaceholder')}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReplyText('');
                onOpenChange(false);
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!replyText.trim() || replyMutation.isPending}>
              {replyMutation.isPending ? t('replySending') : t('replySend')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// FILTERS
// ============================================================================

type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5';
type StatusFilter = 'all' | 'replied' | 'unreplied';

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ReviewsPage() {
  const t = useTranslations('reviews');
  const tCommon = useTranslations('common');

  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);

  const limit = 20;

  // Build query params from filters — no useMemo, recalculated every render
  const queryParams: Record<string, unknown> = { page, limit };
  if (ratingFilter !== 'all') {
    queryParams.rating = parseInt(ratingFilter, 10);
  }
  if (statusFilter === 'replied') {
    queryParams.status = 'approved';
  } else if (statusFilter === 'unreplied') {
    queryParams.status = 'pending';
  }

  const { data, isLoading } = useReviewsQuery(queryParams);

  const reviews = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.total_pages ?? 1;

  // Client-side status filter for replied/unreplied (API status maps to published/pending)
  const filteredReviews = useMemo(() => {
    if (statusFilter === 'replied') {
      return reviews.filter((r) => r.reply !== null);
    }
    if (statusFilter === 'unreplied') {
      return reviews.filter((r) => r.reply === null);
    }
    return reviews;
  }, [reviews, statusFilter]);

  const handleOpenReply = (review: Review) => {
    setReplyingReview(review);
    setReplyDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader title={t('title')} description={t('description')} />

      {/* KPI Cards — always visible, server-side aggregates (unaffected by filters) */}
      {(data?.meta as Record<string, unknown>)?.aggregates && (
        <ReviewKpiCards
          aggregates={(data.meta as Record<string, unknown>).aggregates as ReviewAggregates}
          t={t}
        />
      )}

      {/* Filters */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {t('filters')}
          </div>
          <Select
            value={ratingFilter}
            onValueChange={(val) => {
              setRatingFilter(val as RatingFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filterRating')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filterAllRatings')}</SelectItem>
              <SelectItem value="5">★★★★★ (5)</SelectItem>
              <SelectItem value="4">★★★★ (4)</SelectItem>
              <SelectItem value="3">★★★ (3)</SelectItem>
              <SelectItem value="2">★★ (2)</SelectItem>
              <SelectItem value="1">★ (1)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filterAllStatus')}</SelectItem>
              <SelectItem value="replied">{t('status.replied')}</SelectItem>
              <SelectItem value="unreplied">{t('status.unreplied')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{tCommon('loading')}</div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <>
          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((review) => (
              <ReviewCard key={review.id} review={review} onReply={handleOpenReply} t={t} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {tCommon('showing')} {(page - 1) * limit + 1} {tCommon('to')}{' '}
                {Math.min(page * limit, totalCount)} {tCommon('of')} {totalCount}{' '}
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
                  {tCommon('page')} {page} {tCommon('of')} {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {tCommon('next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reply Dialog */}
      <ReplyDialog
        review={replyingReview}
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        t={t}
      />
    </div>
  );
}

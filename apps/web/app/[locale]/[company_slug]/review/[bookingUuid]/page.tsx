'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ReviewPage() {
  const params = useParams<{ bookingUuid: string; company_slug: string }>();
  const t = useTranslations('publicReview');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Fetch booking info for context (service name, company name, status)
  const {
    data: booking,
    isLoading,
    error: bookingError,
  } = useQuery({
    queryKey: ['public', 'booking', params.bookingUuid],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/bookings/${params.bookingUuid}`);
      if (!res.ok) {
        throw new Error('Booking not found');
      }
      const json = await res.json();
      return json.data;
    },
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/public/bookings/${params.bookingUuid}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || t('error.generic'));
      }
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  // Success state
  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('thankYou')}</h2>
            <p className="text-muted-foreground">{t('thankYouDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state (booking not found)
  if (bookingError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('error.notFound')}</h2>
            <p className="text-muted-foreground">{t('error.notFoundDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if booking is not completed
  const isCompleted = booking?.status === 'completed';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          {booking && (
            <p className="text-sm text-muted-foreground mt-1">
              {booking.service_name} &mdash; {booking.company_name}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!isCompleted ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-3" />
              <p className="text-muted-foreground">{t('error.notCompleted')}</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
              className="space-y-6"
            >
              {/* Star Rating */}
              <div className="space-y-2">
                <Label>{t('ratingLabel')}</Label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={t('starLabel', { count: star })}
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          (hoveredRating || rating) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/40',
                        )}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    {t('ratingText', { rating })}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment">{t('commentLabel')}</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('commentPlaceholder')}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
              </div>

              {/* Email verification */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                />
                <p className="text-xs text-muted-foreground">{t('emailHelp')}</p>
              </div>

              {/* Error message */}
              {submitMutation.error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {(submitMutation.error as Error).message}
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                disabled={rating === 0 || !email || submitMutation.isPending}
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

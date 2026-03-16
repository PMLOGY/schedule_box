'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';

export function BookingLinkCard() {
  const t = useTranslations('dashboard.bookingLink');
  const locale = useLocale();
  const { data: settings, isLoading } = useCompanySettingsQuery();
  const [copied, setCopied] = useState(false);

  const localePrefix = locale === 'cs' ? '' : `/${locale}`;
  const bookingUrl = settings?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${localePrefix}/${settings.slug}/book`
    : null;

  const handleCopy = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success(t('copied'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
  };

  return (
    <Card className="glass-surface">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ExternalLink className="h-4 w-4 text-primary" />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
        ) : bookingUrl ? (
          <div className="flex gap-2">
            <Input readOnly value={bookingUrl} className="flex-1 bg-muted/50 text-sm" />
            <Button
              variant="outline"
              size="default"
              onClick={handleCopy}
              className="shrink-0 gap-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {t('copy')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t('noSlug')}</p>
        )}
      </CardContent>
    </Card>
  );
}

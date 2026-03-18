'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Video, Copy, Check, Loader2, ExternalLink } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchMeetingUrl(): Promise<{ custom_meeting_url: string | null }> {
  return apiClient.get<{ custom_meeting_url: string | null }>('/settings/video-meeting-url');
}

async function updateMeetingUrl(url: string): Promise<{ custom_meeting_url: string | null }> {
  return apiClient.patch<{ custom_meeting_url: string | null }>('/settings/video-meeting-url', {
    custom_meeting_url: url,
  });
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function VideoMeetingsPage() {
  const t = useTranslations('videoMeetings');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch current URL
  const { data, isLoading } = useQuery({
    queryKey: ['video-meeting-url'],
    queryFn: fetchMeetingUrl,
    select: (d) => d.custom_meeting_url,
    staleTime: 30_000,
  });

  // Populate input once data arrives (only on first load)
  if (!initialized && !isLoading) {
    setInputValue(data ?? '');
    setInitialized(true);
  }

  // Save mutation
  const mutation = useMutation({
    mutationFn: updateMeetingUrl,
    onSuccess: (result) => {
      queryClient.setQueryData(['video-meeting-url'], result);
      setInputValue(result.custom_meeting_url ?? '');
      toast.success(t('saveSuccess'));
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || tCommon('error'));
    },
  });

  const handleSave = () => {
    mutation.mutate(inputValue.trim());
  };

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tCommon('error'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      {/* URL Input Card */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {t('urlCard.title')}
          </CardTitle>
          <CardDescription>{t('urlCard.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon('loading')}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="meeting-url">{t('urlCard.label')}</Label>
                <Input
                  id="meeting-url"
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t('urlCard.placeholder')}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('urlCard.save')}
                </Button>

                {inputValue && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInputValue('');
                      mutation.mutate('');
                    }}
                    disabled={mutation.isPending}
                  >
                    {t('urlCard.clear')}
                  </Button>
                )}
              </div>

              {/* Saved URL display with copy */}
              {data && (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {t('urlCard.currentUrl')}
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={data}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-1 break-all text-sm text-primary hover:underline"
                    >
                      {data}
                      <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-base">{t('infoCard.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('infoCard.body')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

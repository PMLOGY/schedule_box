'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, CreditCard, Info } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { usePaymentProvider, useSavePaymentProvider } from '@/hooks/use-payment-provider-query';

export default function PaymentSettingsPage() {
  const t = useTranslations('settings.payments');

  const { data: config, isLoading } = usePaymentProvider();
  const saveMutation = useSavePaymentProvider();

  const [merchantId, setMerchantId] = useState('');
  const [secret, setSecret] = useState('');
  const [testMode, setTestMode] = useState(true);

  // Pre-fill form when config loads
  useEffect(() => {
    if (config) {
      setTestMode(config.test_mode);
      // Don't pre-fill merchant_id or secret for security — only show status
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      provider: 'comgate',
      merchant_id: merchantId,
      secret,
      test_mode: testMode,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('title')} description={t('description')} />
        <Card variant="glass">
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = config?.is_active && config?.has_credentials;

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />

      {/* Status indicator */}
      {isActive ? (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CreditCard className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {t('comgate.active')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Merchant ID: ****{config?.merchant_id}
            </span>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t('comgate.info')}</AlertDescription>
        </Alert>
      )}

      {/* Comgate configuration form */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('comgate.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Merchant ID */}
            <div className="space-y-2">
              <Label htmlFor="merchant_id">{t('comgate.merchantId')}</Label>
              <Input
                id="merchant_id"
                type="text"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder={t('comgate.merchantIdPlaceholder')}
                required
              />
            </div>

            {/* Secret */}
            <div className="space-y-2">
              <Label htmlFor="secret">{t('comgate.secret')}</Label>
              <Input
                id="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={t('comgate.secretPlaceholder')}
                required
              />
            </div>

            {/* Test mode toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="test_mode">{t('comgate.testMode')}</Label>
                <p className="text-sm text-muted-foreground">{t('comgate.testModeDescription')}</p>
              </div>
              <Switch id="test_mode" checked={testMode} onCheckedChange={setTestMode} />
            </div>

            {/* Save button */}
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('comgate.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

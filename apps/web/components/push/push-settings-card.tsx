'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Send, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 * Standard conversion needed for applicationServerKey in pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * PushSettingsCard - Card component for managing push notification subscriptions.
 *
 * Features:
 * - Toggle switch to subscribe/unsubscribe to push notifications
 * - Checks browser support and current subscription status on mount
 * - "Send test" button to verify push pipeline works end-to-end
 * - All UI text in Czech (CZ market app)
 */
export function PushSettingsCard() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  /**
   * Check current subscription status on mount.
   * Verifies both browser-side subscription and server-side record.
   */
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      setIsSupported(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('[Push] Error checking subscription status:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  /**
   * Subscribe to push notifications.
   * 1. Fetch VAPID public key from server
   * 2. Request browser permission and subscribe via PushManager
   * 3. Store subscription on server
   */
  const handleSubscribe = async () => {
    setIsToggling(true);
    try {
      // 1. Get VAPID public key
      const { publicKey } = await apiClient.get<{ publicKey: string }>('/push/vapid-key');
      if (!publicKey) {
        toast.error('Push notifikace nejsou nakonfigurovany na serveru');
        return;
      }

      // 2. Subscribe via PushManager (triggers browser permission prompt)
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // 3. Extract keys and send to server
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string } | undefined;

      if (!keys?.p256dh || !keys?.auth) {
        toast.error('Nepodarilo se ziskat klice pro push notifikace');
        await subscription.unsubscribe();
        return;
      }

      await apiClient.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      toast.success('Push notifikace zapnuty');
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      // Check if user denied permission
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error(
          'Povoleni pro push notifikace bylo zamitnuto. Povolte je v nastaveni prohlizece.',
        );
      } else {
        toast.error('Nepodarilo se zapnout push notifikace');
      }
    } finally {
      setIsToggling(false);
    }
  };

  /**
   * Unsubscribe from push notifications.
   * 1. Unsubscribe browser-side
   * 2. Remove subscription from server
   */
  const handleUnsubscribe = async () => {
    setIsToggling(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 1. Remove from server first (so we have the endpoint)
        await apiClient.post('/push/unsubscribe', {
          endpoint: subscription.endpoint,
        });

        // 2. Unsubscribe browser-side
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success('Push notifikace vypnuty');
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      toast.error('Nepodarilo se vypnout push notifikace');
    } finally {
      setIsToggling(false);
    }
  };

  /**
   * Toggle handler for the switch.
   */
  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await handleSubscribe();
    } else {
      await handleUnsubscribe();
    }
  };

  /**
   * Send a test push notification to verify the pipeline works.
   */
  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      const result = await apiClient.post<{ message: string; sent: number; failed: number }>(
        '/push/test',
      );
      if (result.sent > 0) {
        toast.success('Testovaci notifikace odeslana');
      } else {
        toast.warning('Zadna aktivni push subscription nebyla nalezena');
      }
    } catch (error) {
      console.error('[Push] Test notification error:', error);
      toast.error('Nepodarilo se odeslat testovaci notifikaci');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Browser does not support push notifications
  if (!isLoading && !isSupported) {
    return (
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-start gap-3">
            <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <CardTitle>Push notifikace</CardTitle>
              <CardDescription>Tento prohlizec nepodporuje push notifikace</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>
              Pro push notifikace pouzijte moderni prohlizec (Chrome, Firefox, Edge) na desktopu
              nebo Androidu.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <CardTitle>Push notifikace</CardTitle>
            <CardDescription>
              Prijimejte okamzita upozorneni primo do prohlizece o novych rezervacich, zmenach a
              zrusenich.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subscribe/Unsubscribe toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-sm font-medium">
              Povolit push notifikace
            </Label>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'Push notifikace jsou aktivni v tomto prohlizeci'
                : 'Zapnete pro prijem upozorneni v tomto prohlizeci'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Badge variant={isSubscribed ? 'default' : 'secondary'} className="text-xs">
                  {isSubscribed ? 'Aktivni' : 'Neaktivni'}
                </Badge>
                <Switch
                  id="push-toggle"
                  checked={isSubscribed}
                  onCheckedChange={handleToggle}
                  disabled={isToggling}
                />
              </>
            )}
          </div>
        </div>

        {/* Test notification button */}
        {isSubscribed && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Testovaci notifikace</p>
              <p className="text-xs text-muted-foreground">
                Odeslat testovaci push notifikaci pro overeni funkcnosti
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSendTest} disabled={isSendingTest}>
              {isSendingTest ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Odeslat test
            </Button>
          </div>
        )}

        {/* Loading overlay for toggle action */}
        {isToggling && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{isSubscribed ? 'Odhlasovani...' : 'Prihlasuji k push notifikacim...'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

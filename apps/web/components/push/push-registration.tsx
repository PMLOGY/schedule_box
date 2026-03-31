'use client';

import { useEffect } from 'react';

/**
 * PushRegistration - Silent background component that registers the service worker.
 *
 * Place this in the dashboard layout. It registers the SW on mount but does NOT
 * auto-subscribe to push — subscription is explicit from settings UI (Plan 02).
 *
 * Renders nothing to the DOM.
 */
export function PushRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Push notifications not supported in this browser');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Push] Service worker registered, scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[Push] Service worker registration failed:', error);
      });
  }, []);

  return null;
}

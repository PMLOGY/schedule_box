'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Offline Banner
 *
 * Shows a fixed top banner when the browser is offline (navigator.onLine === false).
 * Hides with a 1-second delay when connection is restored to avoid flicker.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Initialize from current state
    if (!navigator.onLine) {
      setIsOffline(true);
      setShowBanner(true);
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOffline = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      setIsOffline(true);
      setShowBanner(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      // Delay hiding to avoid flicker on intermittent connections
      hideTimer = setTimeout(() => {
        setShowBanner(false);
      }, 1000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      role="alert"
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
        isOffline
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
          : 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200'
      }`}
    >
      <WifiOff className="h-4 w-4" />
      <span>
        {isOffline
          ? 'Jste offline. Nektera funkcionalita nemusi byt dostupna.'
          : 'Pripojeni obnoveno.'}
      </span>
    </div>
  );
}

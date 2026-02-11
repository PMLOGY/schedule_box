'use client';

/**
 * Wallet Buttons Component
 *
 * Provides "Add to Apple Wallet" and "Add to Google Wallet" CTA buttons.
 * Apple pass is a direct download link. Google pass fetches a save URL first,
 * then redirects the user.
 *
 * @see LOYAL-06 wallet pass integration in schedulebox_complete_documentation.md
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// PROPS
// ============================================================================

interface WalletButtonsProps {
  /** UUID of the loyalty card */
  cardUuid: string;
  /** Pre-signed Apple Wallet pass URL (may not exist if certs not configured) */
  applePassUrl?: string | null;
  /** Pre-signed Google Wallet pass URL (may not exist if not configured) */
  googlePassUrl?: string | null;
  className?: string;
}

// ============================================================================
// ICONS
// ============================================================================

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 384 512"
      fill="currentColor"
      className={className}
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GoogleWalletIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M21.35 11.1h-9.17v2.73h5.51c-.24 1.26-.98 2.33-2.08 3.05v2.54h3.37c1.97-1.82 3.11-4.49 3.11-7.62 0-.52-.05-1.02-.14-1.5l-.6.8zM12.18 21c2.81 0 5.17-.93 6.89-2.53l-3.37-2.54c-.93.63-2.13 1-3.52 1-2.71 0-5-1.83-5.82-4.28H2.88v2.62C4.59 18.96 8.1 21 12.18 21zM6.36 13.65A5.56 5.56 0 016.06 12c0-.57.1-1.13.3-1.65V7.73H2.88A9.82 9.82 0 002 12c0 1.59.38 3.09 1.06 4.42l3.3-2.77zM12.18 6.07c1.53 0 2.9.53 3.98 1.56l2.99-2.99C17.33 2.99 14.96 2 12.18 2 8.1 2 4.59 4.04 2.88 7.73l3.48 2.62c.82-2.45 3.11-4.28 5.82-4.28z" />
    </svg>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WalletButtons({
  cardUuid,
  applePassUrl: _applePassUrl,
  googlePassUrl: _googlePassUrl,
  className,
}: WalletButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applePassDownloadUrl = `/api/v1/loyalty/cards/${cardUuid}/apple-pass`;

  const handleGoogleWallet = useCallback(async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ saveUrl: string }>(
        `/loyalty/cards/${cardUuid}/google-pass`,
      );
      window.location.href = response.saveUrl;
    } catch {
      setError('Google Wallet pass neni k dispozici');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [cardUuid]);

  return (
    <div className={cn('flex flex-col sm:flex-row gap-3', className)}>
      {/* Apple Wallet Button */}
      <a
        href={applePassDownloadUrl}
        download
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white px-5 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <AppleIcon className="w-5 h-5" />
        <span>Pridat do Apple Wallet</span>
      </a>

      {/* Google Wallet Button */}
      <Button
        onClick={handleGoogleWallet}
        isLoading={isGoogleLoading}
        disabled={isGoogleLoading}
        className="rounded-lg bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 px-5 py-3 h-auto text-sm font-medium"
        variant="outline"
      >
        {!isGoogleLoading && <GoogleWalletIcon className="w-5 h-5" />}
        <span>Pridat do Google Wallet</span>
      </Button>

      {/* Error message */}
      {error && <p className="text-xs text-destructive mt-1 sm:mt-0 sm:self-center">{error}</p>}
    </div>
  );
}

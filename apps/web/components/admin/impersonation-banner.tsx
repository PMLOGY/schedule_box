'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImpersonationSession {
  name: string;
  email: string;
  role: string;
  expiresAt: string;
}

const SESSION_STORAGE_KEY = 'imp_session';

/**
 * Red full-width impersonation banner displayed during admin impersonation sessions.
 *
 * State is stored in sessionStorage (set on impersonation start via the POST response).
 * Shows countdown timer of remaining time. Auto-ends session when timer expires.
 *
 * Note: imp_token is HttpOnly and not readable by JS — we use sessionStorage for display data.
 */
export function ImpersonationBanner() {
  const t = useTranslations('admin.impersonation');
  const router = useRouter();
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  // Load session from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ImpersonationSession;
        const expiresAt = new Date(parsed.expiresAt).getTime();
        const now = Date.now();
        if (expiresAt > now) {
          setSession(parsed);
          setRemainingSeconds(Math.floor((expiresAt - now) / 1000));
        } else {
          // Session already expired — clean up
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch {
      // sessionStorage unavailable (e.g., privacy mode) — no-op
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer expired — auto-end session
          clearInterval(interval);
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setSession(null);
          router.push('/admin/users');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, router]);

  const handleEndSession = useCallback(async () => {
    setIsEnding(true);
    try {
      await fetch('/api/v1/admin/impersonate', {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      // Best effort — still clean up client side
    } finally {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      setIsEnding(false);
      router.push('/admin/users');
    }
  }, [router]);

  if (!session) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {t('active', {
            name: session.name,
            email: session.email,
          })}
        </span>
        <span className="ml-2 tabular-nums font-mono text-red-100">
          {t('expires', { time: timeDisplay })}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:text-red-100 hover:bg-red-700 h-7 px-3"
        onClick={handleEndSession}
        disabled={isEnding}
        aria-label={t('endSession')}
      >
        <X className="h-4 w-4 mr-1" aria-hidden="true" />
        {t('endSession')}
      </Button>
    </div>
  );
}

/**
 * Store impersonation session data in sessionStorage.
 * Call this after a successful POST /api/v1/admin/impersonate response.
 */
export function storeImpersonationSession(session: ImpersonationSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage unavailable — no-op
  }
}

/**
 * Clear impersonation session data from sessionStorage.
 */
export function clearImpersonationSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // no-op
  }
}

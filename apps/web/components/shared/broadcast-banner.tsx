'use client';

/**
 * BroadcastBanner
 *
 * Fetches active (recently sent) platform broadcasts and renders a dismissible
 * yellow/blue gradient banner at the top of authenticated dashboard pages.
 *
 * Dismissal state is persisted in localStorage per broadcast ID so the banner
 * does not reappear after the user closes it. Broadcasts older than 7 days from
 * sentAt are automatically hidden (API already filters these server-side via the
 * ?current=true query param, but we double-check client-side too).
 *
 * Only mounts on authenticated dashboard pages (not public pages).
 */

import { useEffect, useState, useCallback } from 'react';
import { X, Megaphone } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

interface Broadcast {
  id: number;
  message: string;
  sentAt: string;
  audience: string;
}

const DISMISS_KEY_PREFIX = 'dismissed_broadcast_';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function BroadcastBanner() {
  const user = useAuthStore((s) => s.user);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  // Load dismissed IDs from localStorage once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissedIds = new Set<number>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DISMISS_KEY_PREFIX)) {
        const id = parseInt(key.slice(DISMISS_KEY_PREFIX.length), 10);
        if (!isNaN(id)) dismissedIds.add(id);
      }
    }
    setDismissed(dismissedIds);
  }, []);

  // Fetch current broadcasts (sent within 7 days)
  useEffect(() => {
    if (!user) return;

    async function fetchBroadcasts() {
      try {
        const res = await fetch('/api/v1/admin/broadcast?current=true', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        const data: Broadcast[] = json.data ?? [];

        // Client-side safety check: hide broadcasts older than 7 days
        const cutoff = Date.now() - SEVEN_DAYS_MS;
        const fresh = data.filter((b) => b.sentAt && new Date(b.sentAt).getTime() > cutoff);
        setBroadcasts(fresh);
      } catch {
        // Silently ignore — banner is non-critical
      }
    }

    fetchBroadcasts();
  }, [user]);

  const handleDismiss = useCallback((id: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${id}`, '1');
    }
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  // Only show on authenticated pages for authenticated users
  if (!user) return null;

  // Filter out dismissed broadcasts
  const visible = broadcasts.filter((b) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  // Show the most recent broadcast only
  const broadcast = visible[0];

  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative w-full rounded-lg bg-gradient-to-r from-blue-600/90 to-indigo-600/90 px-4 py-3 text-white shadow-md backdrop-blur-sm"
    >
      <div className="flex items-start gap-3 pr-8">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden="true" />
        <p className="text-sm leading-relaxed">{broadcast.message}</p>
      </div>
      <button
        type="button"
        aria-label="Zavřít oznámení"
        onClick={() => handleDismiss(broadcast.id)}
        className="absolute right-3 top-3 rounded p-0.5 opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Clears React Query cache when user identity changes (logout or switch user).
 * Prevents stale data from a previous user leaking into the next session.
 *
 * Skips the initial Zustand persist hydration (null → stored user) to avoid
 * killing in-flight queries on public pages like booking tracking.
 */
function useAuthCacheClear(queryClient: QueryClient) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const prevUserId = useRef(userId);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      // First effect run — Zustand persist may have just hydrated from localStorage.
      // Record the hydrated userId but don't clear the cache.
      hydrated.current = true;
      prevUserId.current = userId;
      return;
    }

    if (prevUserId.current !== userId) {
      // Genuine user change (logout, or login as different user) — clear all cached queries
      queryClient.clear();
      prevUserId.current = userId;
    }
  }, [userId, queryClient]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  // Clear query cache when user identity changes
  useAuthCacheClear(queryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

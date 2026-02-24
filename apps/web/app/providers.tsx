'use client';

import { useState, useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Clears React Query cache when user identity changes (logout or switch user).
 * Prevents stale data from a previous user leaking into the next session.
 */
function useAuthCacheClear(queryClient: QueryClient) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const prevUserId = useRef(userId);

  useEffect(() => {
    if (prevUserId.current !== userId) {
      // User changed (logout, or login as different user) — clear all cached queries
      queryClient.clear();
      prevUserId.current = userId;
    }
  }, [userId, queryClient]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside useState to prevent sharing across requests
  const [queryClient] = useState(() => createQueryClient());

  // Clear query cache when user identity changes
  useAuthCacheClear(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

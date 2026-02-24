'use client';

import { useState, useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient, setOnLimitError } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import { UpgradeModal, useUpgradeModal } from '@/components/shared/upgrade-modal';

/**
 * Clears React Query cache when user identity changes (logout or switch user).
 * Prevents stale data from a previous user leaking into the next session.
 */
function useAuthCacheClear(queryClient: QueryClient) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const prevUserId = useRef(userId);

  useEffect(() => {
    if (prevUserId.current !== userId) {
      queryClient.clear();
      prevUserId.current = userId;
    }
  }, [userId, queryClient]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const upgradeModal = useUpgradeModal();

  // Clear query cache when user identity changes
  useAuthCacheClear(queryClient);

  // Register global 402 handler so MutationCache can trigger the upgrade modal
  useEffect(() => {
    setOnLimitError(upgradeModal.showUpgradeModal);
    return () => setOnLimitError(null);
  }, [upgradeModal.showUpgradeModal]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <UpgradeModal
        open={upgradeModal.open}
        onOpenChange={upgradeModal.onOpenChange}
        resource={upgradeModal.resource}
        current={upgradeModal.current}
        limit={upgradeModal.limit}
        plan={upgradeModal.plan}
      />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

import { MutationCache, QueryClient } from '@tanstack/react-query';
import { isLimitError } from '@/components/shared/upgrade-modal';

// Global callback for 402 limit errors — set by Providers at mount
let onLimitError:
  | ((details: { resource: string; current: number; limit: number; plan: string }) => void)
  | null = null;

export function getOnLimitError() {
  return onLimitError;
}

export function setOnLimitError(
  cb:
    | ((details: { resource: string; current: number; limit: number; plan: string }) => void)
    | null,
) {
  onLimitError = cb;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isLimitError(error) && onLimitError) {
          onLimitError(error.details);
        }
      },
    }),
  });
}

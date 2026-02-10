import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        onError: (error) => {
          // Log error to console for now
          // TODO: Add toast notification when sonner is integrated
          console.error('Mutation error:', error);
        },
      },
    },
  });
}

/**
 * TanStack Query provider configuration.
 * Configured for offline-first with local SQLite as the "server".
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Query client configured for offline-first local database usage:
 * - staleTime: Infinity — data doesn't go stale since it's local
 * - gcTime: 30 minutes — garbage collect unused queries after 30 min
 * - retry: false — local DB doesn't need retries
 * - refetchOnWindowFocus: false — no remote server to refetch from
 * - refetchOnReconnect: false — offline-first, no network dependency
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export { queryClient };

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

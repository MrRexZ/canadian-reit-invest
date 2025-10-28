import { QueryClient, QueryClientProvider, DefaultOptions } from '@tanstack/react-query'
import React from 'react'

const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 10 * 1000, // 10 seconds - data is fresh for 10 seconds
    refetchInterval: 10 * 1000, // 10 seconds - automatic polling for multi-user sync
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnReconnect: true, // Refetch when connection is restored
    retry: 2, // Retry failed requests twice
    gcTime: 5 * 60 * 1000, // 5 minutes - keep unused data in cache for 5 minutes
  },
}

const queryClient = new QueryClient({ defaultOptions: queryConfig })

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

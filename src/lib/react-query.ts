import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // With SSR, we usually want to set some default staleTime
      // above 0 to avoid refetching immediately on the client
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('4') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Disable refetch on window focus for better UX
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Health checks
  health: ['health'] as const,
  healthApi: () => [...queryKeys.health, 'api'] as const,
  
  // Organizations
  organizations: ['organizations'] as const,
  organization: (id: string) => [...queryKeys.organizations, id] as const,
  
  // Accounts
  accounts: ['accounts'] as const,
  accountsByOrg: (orgId: string) => [...queryKeys.accounts, 'organization', orgId] as const,
  account: (id: string) => [...queryKeys.accounts, id] as const,
  
  // Categories
  categories: ['categories'] as const,
  categoriesByOrg: (orgId: string) => [...queryKeys.categories, 'organization', orgId] as const,
  category: (id: string) => [...queryKeys.categories, id] as const,
  
  // Transactions
  transactions: ['transactions'] as const,
  transactionsByOrg: (orgId: string, filters?: Record<string, any>) => 
    [...queryKeys.transactions, 'organization', orgId, filters] as const,
  transaction: (id: string) => [...queryKeys.transactions, id] as const,
  
  // Metrics and reports
  metrics: ['metrics'] as const,
  metricsByOrg: (orgId: string, dateRange?: { from: string; to: string }) => 
    [...queryKeys.metrics, 'organization', orgId, dateRange] as const,
  
  // User and auth
  user: ['user'] as const,
  userProfile: () => [...queryKeys.user, 'profile'] as const,
  userOrganizations: () => [...queryKeys.user, 'organizations'] as const,
} as const;

// Helper function to create a new query client (useful for SSR)
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('4') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
              return false;
            }
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
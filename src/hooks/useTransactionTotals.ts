'use client';

import { useQuery } from '@tanstack/react-query';

interface TransactionTotals {
  income: number;
  expense: number;
  transfer: number;
  net: number;
  total: number;
  count: number;
}

interface UseTransactionTotalsOptions {
  organizationId: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Query key factory for transaction totals
const transactionTotalsKeys = {
  all: ['transaction-totals'] as const,
  byOrg: (orgId: string) => [...transactionTotalsKeys.all, 'organization', orgId] as const,
  filtered: (orgId: string, filters: Omit<UseTransactionTotalsOptions, 'organizationId'>) => 
    [...transactionTotalsKeys.byOrg(orgId), 'filtered', filters] as const,
};

// Fetch function for transaction totals
async function fetchTransactionTotals(options: UseTransactionTotalsOptions): Promise<TransactionTotals> {
  const {
    organizationId,
    type,
    accountId,
    categoryId,
    startDate,
    endDate,
    search,
  } = options;

  // Build query parameters
  const params = new URLSearchParams({
    organization_id: organizationId,
  });

  if (type) params.append('type', type);
  if (accountId) params.append('account_id', accountId);
  if (categoryId) params.append('category_id', categoryId);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (search && search.trim()) params.append('search', search.trim());

  const response = await fetch(`/api/transactions/totals?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Error al obtener los totales');
  }

  const data = await response.json();
  return data.totals;
}

export function useTransactionTotals(options: UseTransactionTotalsOptions) {
  const {
    organizationId,
    type,
    accountId,
    categoryId,
    startDate,
    endDate,
    search,
  } = options;

  const filters = {
    type,
    accountId,
    categoryId,
    startDate,
    endDate,
    search,
  };

  const query = useQuery({
    queryKey: transactionTotalsKeys.filtered(organizationId, filters),
    queryFn: () => fetchTransactionTotals(options),
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds - shorter than transactions for more frequent updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof Error && error.message.includes('4')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    totals: query.data || {
      income: 0,
      expense: 0,
      transfer: 0,
      net: 0,
      total: 0,
      count: 0,
    },
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

// Export the query keys for use in invalidation
export { transactionTotalsKeys };
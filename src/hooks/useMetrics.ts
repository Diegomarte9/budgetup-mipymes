import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { 
  DashboardMetrics, 
  MonthlyBalanceResponse, 
  TopCategoriesResponse, 
  KPIsResponse 
} from '@/types/metrics';

// Base fetch function with error handling
async function fetchMetrics<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Hook for all dashboard metrics (combined endpoint)
export function useDashboardMetrics(organizationId: string) {
  return useQuery({
    queryKey: ['metrics', 'dashboard', organizationId],
    queryFn: () => fetchMetrics<DashboardMetrics>(`/api/metrics?organizationId=${organizationId}`),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for monthly balance data with optional date range
export function useMonthlyBalance(
  organizationId: string, 
  options: { 
    months?: number; 
    startDate?: string; 
    endDate?: string; 
  } = {}
) {
  const { months = 12, startDate, endDate } = options;
  
  const queryParams = new URLSearchParams({
    organizationId,
    months: months.toString(),
  });
  
  if (startDate && endDate) {
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
  }

  return useQuery({
    queryKey: ['metrics', 'monthly', organizationId, months, startDate, endDate],
    queryFn: () => fetchMetrics<MonthlyBalanceResponse>(`/api/metrics/monthly?${queryParams.toString()}`),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for top expense categories with optional date range
export function useTopCategories(
  organizationId: string, 
  options: { 
    limit?: number; 
    month?: string; 
    startDate?: string; 
    endDate?: string; 
  } = {}
) {
  const { limit = 5, month, startDate, endDate } = options;
  
  const queryParams = new URLSearchParams({
    organizationId,
    limit: limit.toString(),
  });
  
  if (month) {
    queryParams.append('month', month);
  }
  
  if (startDate && endDate) {
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
  }

  return useQuery({
    queryKey: ['metrics', 'top-categories', organizationId, limit, month, startDate, endDate],
    queryFn: () => fetchMetrics<TopCategoriesResponse>(`/api/metrics/top-categories?${queryParams.toString()}`),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for top expense accounts
export function useTopAccounts(
  organizationId: string, 
  options: { 
    limit?: number; 
  } = {}
) {
  const { limit = 5 } = options;
  
  const queryParams = new URLSearchParams({
    organizationId,
    limit: limit.toString(),
  });

  return useQuery({
    queryKey: ['metrics', 'top-accounts', organizationId, limit],
    queryFn: () => fetchMetrics<any>(`/api/metrics/top-accounts?${queryParams.toString()}`),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for KPIs with optional date range
export function useKPIs(
  organizationId: string, 
  options: { 
    startDate?: string; 
    endDate?: string; 
  } = {}
) {
  const { startDate, endDate } = options;
  
  const queryParams = new URLSearchParams({
    organizationId,
  });
  
  if (startDate && endDate) {
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
  }

  return useQuery({
    queryKey: ['metrics', 'kpis', organizationId, startDate, endDate],
    queryFn: () => fetchMetrics<KPIsResponse>(`/api/metrics/kpis?${queryParams.toString()}`),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent updates for KPIs)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch KPIs when user returns to tab
  });
}

// Backward compatibility hook for current month KPIs
export function useCurrentMonthKPIs(organizationId: string) {
  return useKPIs(organizationId);
}

// Utility hook to invalidate all metrics queries (useful after creating transactions)
export function useInvalidateMetrics() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: (organizationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Also invalidate transactions
    },
    invalidateDashboard: (organizationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard', organizationId] });
    },
    invalidateKPIs: (organizationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['metrics', 'kpis', organizationId] });
    },
  };
}

// Hook for date range metrics (combines all metrics with date filtering)
export function useDateRangeMetrics(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const kpis = useKPIs(organizationId, { startDate, endDate });
  const monthlyBalance = useMonthlyBalance(organizationId, { startDate, endDate });
  const topCategories = useTopCategories(organizationId, { startDate, endDate });

  return {
    kpis,
    monthlyBalance,
    topCategories,
    isLoading: kpis.isLoading || monthlyBalance.isLoading || topCategories.isLoading,
    isError: kpis.isError || monthlyBalance.isError || topCategories.isError,
    error: kpis.error || monthlyBalance.error || topCategories.error,
  };
}

// Hook for real-time metrics updates (refetches every minute)
export function useRealTimeMetrics(organizationId: string, enabled: boolean = true) {
  const kpis = useCurrentMonthKPIs(organizationId);
  
  // Set up interval for real-time updates
  React.useEffect(() => {
    if (!enabled || !organizationId) return;
    
    const interval = setInterval(() => {
      kpis.refetch();
    }, 60 * 1000); // Refetch every minute
    
    return () => clearInterval(interval);
  }, [enabled, organizationId, kpis.refetch]);
  
  return kpis;
}
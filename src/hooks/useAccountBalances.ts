import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/types/supabase';

// Type for the account balance view
interface AccountBalance {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

// API function to fetch account balances
const fetchAccountBalances = async (organizationId: string): Promise<AccountBalance[]> => {
  try {
    const response = await fetch(`/api/accounts/balances?organization_id=${organizationId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No accounts found, return empty array
      }
      
      let errorMessage = 'Error al obtener los balances de las cuentas';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If we can't parse the error response, use default message
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return Array.isArray(data.balances) ? data.balances : [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de conexión al obtener los balances');
  }
};

// Hook to get account balances
export function useAccountBalances(organizationId: string) {
  return useQuery({
    queryKey: ['account-balances', organizationId],
    queryFn: () => fetchAccountBalances(organizationId),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter than accounts since balances change more frequently)
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Helper hook to get a single account balance
export function useAccountBalance(organizationId: string, accountId: string) {
  const { data: balances } = useAccountBalances(organizationId);
  return balances?.find(balance => balance.id === accountId);
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import type { AccountFormData } from '@/lib/validations/accounts';

// Types
type Account = Tables<'accounts'>;
type CreateAccountData = TablesInsert<'accounts'>;
type UpdateAccountData = TablesUpdate<'accounts'>;

interface CreateAccountResponse {
  account: Account;
  message: string;
}

interface UpdateAccountResponse {
  account: Account;
  message: string;
}

interface DeleteAccountResponse {
  message: string;
}

// API functions
const fetchAccounts = async (organizationId: string): Promise<Account[]> => {
  try {
    const response = await fetch(`/api/accounts?organization_id=${organizationId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No accounts found, return empty array
      }
      
      let errorMessage = 'Error al obtener las cuentas';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If we can't parse the error response, use default message
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de conexión al obtener las cuentas');
  }
};

const createAccount = async (accountData: AccountFormData & { organization_id: string }): Promise<Account> => {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(accountData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear la cuenta');
  }

  const data: CreateAccountResponse = await response.json();
  return data.account;
};

const updateAccount = async (id: string, accountData: Partial<AccountFormData>): Promise<Account> => {
  const response = await fetch(`/api/accounts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(accountData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar la cuenta');
  }

  const data: UpdateAccountResponse = await response.json();
  return data.account;
};

const deleteAccount = async (id: string): Promise<void> => {
  const response = await fetch(`/api/accounts/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar la cuenta');
  }
};

// Hooks
export function useAccounts(organizationId: string) {
  return useQuery({
    queryKey: ['accounts', organizationId],
    queryFn: () => fetchAccounts(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: (newAccount) => {
      // Update the accounts list in cache
      queryClient.setQueryData(
        ['accounts', newAccount.organization_id],
        (oldAccounts: Account[] | undefined) => {
          if (!oldAccounts) return [newAccount];
          return [newAccount, ...oldAccounts];
        }
      );
      
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['accounts', newAccount.organization_id] 
      });
      
      toast.success('Cuenta creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccountFormData> }) =>
      updateAccount(id, data),
    onSuccess: (updatedAccount) => {
      // Update the specific account in cache
      queryClient.setQueryData(
        ['accounts', updatedAccount.organization_id],
        (oldAccounts: Account[] | undefined) => {
          if (!oldAccounts) return [updatedAccount];
          return oldAccounts.map((account) =>
            account.id === updatedAccount.id ? updatedAccount : account
          );
        }
      );
      
      toast.success('Cuenta actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: (_, deletedId) => {
      // Remove the account from all organization caches
      queryClient.setQueriesData(
        { queryKey: ['accounts'] },
        (oldAccounts: Account[] | undefined) => {
          if (!oldAccounts) return [];
          return oldAccounts.filter((account) => account.id !== deletedId);
        }
      );
      
      toast.success('Cuenta eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Helper hook to get a single account
export function useAccount(organizationId: string, accountId: string) {
  const { data: accounts } = useAccounts(organizationId);
  return accounts?.find(account => account.id === accountId);
}
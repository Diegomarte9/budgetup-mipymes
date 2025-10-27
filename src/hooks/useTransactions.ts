'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { 
  TransactionFormData, 
  CreateTransactionData, 
  UpdateTransactionData 
} from '@/lib/validations/transactions';
import type { Tables } from '@/types/supabase';

type Transaction = Tables<'transactions'>;

// Query key factory
const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

export interface TransactionFilters {
  organizationId: string;
  type?: 'income' | 'expense' | 'transfer';
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Fetch transactions with filters
export const fetchTransactions = async (filters: TransactionFilters): Promise<Transaction[]> => {
  try {
    const params = new URLSearchParams({
      organization_id: filters.organizationId,
    });

    if (filters.type) params.append('type', filters.type);
    if (filters.accountId) params.append('account_id', filters.accountId);
    if (filters.categoryId) params.append('category_id', filters.categoryId);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`/api/transactions?${params.toString()}`);

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 404) {
        // Organization or endpoint not found - return empty array
        return [];
      }
      
      let errorMessage = 'Error al cargar transacciones';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If we can't parse the error response, use default message
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Ensure we always return an array
    if (!result || typeof result !== 'object') {
      return [];
    }
    
    return Array.isArray(result.transactions) ? result.transactions : [];
  } catch (error) {
    // If it's already an Error object, re-throw it
    if (error instanceof Error) {
      throw error;
    }
    
    // For any other type of error, wrap it
    throw new Error('Error de conexión al cargar transacciones');
  }
};

// Fetch single transaction
export const fetchTransaction = async (id: string): Promise<Transaction> => {
  const response = await fetch(`/api/transactions/${id}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al cargar transacción');
  }

  const result = await response.json();
  return result.transaction;
};

// Create transaction
export const createTransaction = async (data: CreateTransactionData): Promise<Transaction> => {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al crear transacción');
  }

  const result = await response.json();
  return result.transaction;
};

// Update transaction
export const updateTransaction = async ({ 
  id, 
  data 
}: { 
  id: string; 
  data: Partial<TransactionFormData> 
}): Promise<Transaction> => {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al actualizar transacción');
  }

  const result = await response.json();
  return result.transaction;
};

// Delete transaction
export const deleteTransaction = async (id: string): Promise<void> => {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al eliminar transacción');
  }
};

// Hooks
export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => fetchTransactions(filters),
    enabled: !!filters.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's a 404 or if organization doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => fetchTransaction(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: (data) => {
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      
      // Invalidate accounts (for balance updates)
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      // Invalidate metrics/dashboard data
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      
      toast.success('Transacción creada exitosamente');
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
      toast.error(error.message || 'Error al crear transacción');
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: (data) => {
      // Update the specific transaction in cache
      queryClient.setQueryData(transactionKeys.detail(data.id), data);
      
      // Invalidate transactions list
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      
      // Invalidate accounts (for balance updates)
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      // Invalidate metrics/dashboard data
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      
      toast.success('Transacción actualizada exitosamente');
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
      toast.error(error.message || 'Error al actualizar transacción');
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      
      // Invalidate accounts (for balance updates)
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      // Invalidate metrics/dashboard data
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      
      toast.success('Transacción eliminada exitosamente');
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
      toast.error(error.message || 'Error al eliminar transacción');
    },
  });
}
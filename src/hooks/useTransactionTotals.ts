'use client';

import { useState, useEffect } from 'react';

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

export function useTransactionTotals({
  organizationId,
  type,
  accountId,
  categoryId,
  startDate,
  endDate,
  search,
}: UseTransactionTotalsOptions) {
  const [totals, setTotals] = useState<TransactionTotals>({
    income: 0,
    expense: 0,
    transfer: 0,
    net: 0,
    total: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    const fetchTotals = async () => {
      try {
        setLoading(true);
        setError(null);

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
        setTotals(data.totals);
      } catch (err) {
        console.error('Error fetching transaction totals:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchTotals();
  }, [organizationId, type, accountId, categoryId, startDate, endDate, search]);

  return { totals, loading, error };
}
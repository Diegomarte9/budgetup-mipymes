import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notifications } from '@/components/ui/notification-toast';

export interface ReportHistoryEntry {
  id: string;
  report_type: 'csv' | 'pdf';
  file_name: string;
  filters: Record<string, any>;
  transaction_count: number;
  file_size_bytes?: number;
  generation_time_ms?: number;
  status: 'generating' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
  auth: {
    users: {
      email: string;
    } | null;
  } | null;
}

export interface ReportHistoryResponse {
  reports: ReportHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateReportHistoryData {
  organization_id: string;
  report_type: 'csv' | 'pdf';
  file_name: string;
  filters?: Record<string, any>;
  transaction_count?: number;
  file_size_bytes?: number;
  generation_time_ms?: number;
}

export interface UpdateReportHistoryData {
  status: 'generating' | 'completed' | 'failed';
  file_size_bytes?: number;
  generation_time_ms?: number;
  error_message?: string;
}

// Fetch report history
const fetchReportHistory = async (
  organizationId: string,
  limit = 50,
  offset = 0
): Promise<ReportHistoryResponse> => {
  const params = new URLSearchParams({
    organization_id: organizationId,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`/api/reports/history?${params}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al obtener historial de reportes');
  }

  return response.json();
};

// Create report history entry
const createReportHistory = async (data: CreateReportHistoryData) => {
  const response = await fetch('/api/reports/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al crear entrada de historial');
  }

  return response.json();
};

// Update report history entry
const updateReportHistory = async (id: string, data: UpdateReportHistoryData) => {
  const response = await fetch(`/api/reports/history/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al actualizar reporte');
  }

  return response.json();
};

// Delete report history entry
const deleteReportHistory = async (id: string) => {
  const response = await fetch(`/api/reports/history/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al eliminar reporte');
  }

  return response.json();
};

// Hook for report history
export function useReportHistory(organizationId: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['reportHistory', organizationId, limit, offset],
    queryFn: () => fetchReportHistory(organizationId, limit, offset),
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for creating report history entry
export function useCreateReportHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReportHistory,
    onSuccess: (data, variables) => {
      // Invalidate and refetch report history
      queryClient.invalidateQueries({ 
        queryKey: ['reportHistory', variables.organization_id] 
      });
      
      return data.report;
    },
    onError: (error) => {
      console.error('Error creating report history:', error);
      toast.error(error.message || 'Error al crear entrada de historial');
    },
  });
}

// Hook for updating report history entry
export function useUpdateReportHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReportHistoryData }) =>
      updateReportHistory(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch report history
      queryClient.invalidateQueries({ queryKey: ['reportHistory'] });
      
      // Success/error messages are handled by ExportButtons component
      // This hook only handles the data updates
      
      return data.report;
    },
    onError: (error) => {
      console.error('Error updating report history:', error);
      toast.error(error.message || 'Error al actualizar reporte');
    },
  });
}

// Hook for deleting report history entry
export function useDeleteReportHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReportHistory,
    onSuccess: () => {
      // Invalidate and refetch report history
      queryClient.invalidateQueries({ queryKey: ['reportHistory'] });
      
      notifications.success('Reporte eliminado exitosamente', {
        description: 'El registro del reporte ha sido eliminado del historial.',
      });
    },
    onError: (error) => {
      console.error('Error deleting report history:', error);
      notifications.error('Error al eliminar reporte', {
        description: error.message || 'No se pudo eliminar el registro del reporte.',
      });
    },
  });
}

// Hook for managing report history with pagination
export function useReportHistoryManager(organizationId: string) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20);

  const offset = currentPage * pageSize;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReportHistory(organizationId, pageSize, offset);

  const createMutation = useCreateReportHistory();
  const updateMutation = useUpdateReportHistory();
  const deleteMutation = useDeleteReportHistory();

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return {
    // Data
    reports: data?.reports || [],
    total: data?.total || 0,
    isLoading,
    error,
    
    // Pagination
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    
    // Actions
    createReport: createMutation.mutateAsync,
    updateReport: updateMutation.mutateAsync,
    deleteReport: deleteMutation.mutateAsync,
    refetch,
    
    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
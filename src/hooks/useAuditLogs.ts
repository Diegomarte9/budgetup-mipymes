import { useQuery } from '@tanstack/react-query';

export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  users: {
    email: string;
  } | null;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuditLogsFilters {
  organizationId: string;
  page?: number;
  limit?: number;
  action?: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'invite_sent' | 'role_changed';
  tableName?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

async function fetchAuditLogs(filters: AuditLogsFilters): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/audit-logs?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch audit logs');
  }
  
  return response.json();
}

export function useAuditLogs(filters: AuditLogsFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters),
    enabled: !!filters.organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Helper function to format action names for display
export function formatActionName(action: string): string {
  const actionMap: Record<string, string> = {
    create: 'Creado',
    update: 'Actualizado',
    delete: 'Eliminado',
    login: 'Inicio de sesión',
    logout: 'Cierre de sesión',
    invite_sent: 'Invitación enviada',
    role_changed: 'Rol cambiado',
  };
  
  return actionMap[action] || action;
}

// Helper function to format table names for display
export function formatTableName(tableName: string): string {
  const tableMap: Record<string, string> = {
    transactions: 'Transacciones',
    accounts: 'Cuentas',
    categories: 'Categorías',
    organizations: 'Organizaciones',
    memberships: 'Membresías',
    invitations: 'Invitaciones',
  };
  
  return tableMap[tableName] || tableName;
}

// Helper function to get action color for UI
export function getActionColor(action: string): string {
  const colorMap: Record<string, string> = {
    create: 'text-green-600',
    update: 'text-blue-600',
    delete: 'text-red-600',
    login: 'text-purple-600',
    logout: 'text-gray-600',
    invite_sent: 'text-orange-600',
    role_changed: 'text-indigo-600',
  };
  
  return colorMap[action] || 'text-gray-600';
}
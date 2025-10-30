import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface PermissionValidationOptions {
  organizationId?: string;
  actions?: string[];
  targetUserId?: string;
  action?: 'change_role' | 'remove' | 'invite';
  enabled?: boolean;
}

interface PermissionResult {
  permissions: Record<string, boolean>;
  userRole?: 'owner' | 'admin' | 'member';
  loading: boolean;
  error?: string;
  refetch: () => Promise<void>;
}

export function usePermissions({
  organizationId,
  actions = [],
  targetUserId,
  action,
  enabled = true,
}: PermissionValidationOptions): PermissionResult {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const validatePermissions = async () => {
    if (!user || !organizationId || !enabled) {
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      const response = await fetch('/api/permissions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          actions,
          targetUserId,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al validar permisos');
      }

      setPermissions(result.permissions);
      setUserRole(result.userRole);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error validating permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validatePermissions();
  }, [user, organizationId, JSON.stringify(actions), targetUserId, action, enabled]);

  return {
    permissions,
    userRole,
    loading,
    error,
    refetch: validatePermissions,
  };
}

// Convenience hooks for common permission checks
export function useCanManageMembers(organizationId?: string) {
  return usePermissions({
    organizationId,
    actions: ['manage_members'],
    enabled: !!organizationId,
  });
}

export function useCanManageAdmins(organizationId?: string) {
  return usePermissions({
    organizationId,
    actions: ['manage_admins'],
    enabled: !!organizationId,
  });
}

export function useCanInviteUsers(organizationId?: string) {
  return usePermissions({
    organizationId,
    actions: ['invite_users'],
    enabled: !!organizationId,
  });
}

export function useCanManageUser(
  organizationId?: string,
  targetUserId?: string,
  action?: 'change_role' | 'remove' | 'invite'
) {
  return usePermissions({
    organizationId,
    targetUserId,
    action,
    enabled: !!(organizationId && targetUserId && action),
  });
}
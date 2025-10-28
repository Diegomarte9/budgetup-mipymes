import { createClient } from '@/lib/supabase/client';

export type Role = 'owner' | 'admin' | 'member';

export interface RoleValidationResult {
  hasPermission: boolean;
  userRole?: Role;
  error?: string;
}

/**
 * Check if user has a specific role or higher in an organization (client-side)
 */
export async function validateUserRoleClient(
  userId: string,
  organizationId: string,
  requiredRole: Role
): Promise<RoleValidationResult> {
  try {
    const supabase = createClient();

    // Get user's membership in the organization
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !membership) {
      return {
        hasPermission: false,
        error: 'Usuario no es miembro de esta organización',
      };
    }

    const userRole = membership.role as Role;
    const hasPermission = checkRolePermission(userRole, requiredRole);

    return {
      hasPermission,
      userRole,
    };
  } catch (error) {
    console.error('Error validating user role:', error);
    return {
      hasPermission: false,
      error: 'Error al validar permisos',
    };
  }
}

/**
 * Check if a role has permission for a required role
 */
export function checkRolePermission(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    member: 1,
    admin: 2,
    owner: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Real-time permission validation for client-side use
 */
export async function validateRealTimePermissionsClient(
  userId: string,
  organizationId: string,
  actions: string[]
): Promise<Record<string, boolean>> {
  try {
    const supabase = createClient();

    // Get user's current role
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !membership) {
      return actions.reduce((acc, action) => ({ ...acc, [action]: false }), {});
    }

    const userRole = membership.role as Role;
    const permissions: Record<string, boolean> = {};

    // Define permission mappings
    const permissionMap: Record<string, Role> = {
      'manage_members': 'admin',
      'manage_admins': 'owner',
      'invite_users': 'admin',
      'remove_members': 'admin',
      'change_roles': 'admin',
      'view_audit_logs': 'admin',
      'manage_organization': 'owner',
    };

    // Check each requested action
    actions.forEach(action => {
      const requiredRole = permissionMap[action] || 'member';
      permissions[action] = checkRolePermission(userRole, requiredRole);
    });

    return permissions;
  } catch (error) {
    console.error('Error validating real-time permissions:', error);
    return actions.reduce((acc, action) => ({ ...acc, [action]: false }), {});
  }
}

/**
 * Check if user can perform specific action on target user (client-side)
 */
export async function canManageUserClient(
  currentUserId: string,
  targetUserId: string,
  organizationId: string,
  action: 'change_role' | 'remove' | 'invite'
): Promise<{ canManage: boolean; reason?: string }> {
  try {
    const supabase = createClient();

    // Get both users' memberships
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('user_id, role')
      .eq('organization_id', organizationId)
      .in('user_id', [currentUserId, targetUserId]);

    if (error || !memberships) {
      return { canManage: false, reason: 'Error al obtener membresías' };
    }

    const currentUserMembership = memberships.find(m => m.user_id === currentUserId);
    const targetUserMembership = memberships.find(m => m.user_id === targetUserId);

    if (!currentUserMembership) {
      return { canManage: false, reason: 'Usuario no es miembro de la organización' };
    }

    const currentUserRole = currentUserMembership.role as Role;

    // Owners can manage everyone except other owners
    if (currentUserRole === 'owner') {
      if (targetUserMembership?.role === 'owner' && action !== 'invite') {
        return { canManage: false, reason: 'No se puede gestionar a otros propietarios' };
      }
      return { canManage: true };
    }

    // Admins can manage members but not other admins or owners
    if (currentUserRole === 'admin') {
      if (!targetUserMembership && action === 'invite') {
        return { canManage: true };
      }
      if (targetUserMembership?.role === 'member') {
        return { canManage: true };
      }
      return { canManage: false, reason: 'Los administradores solo pueden gestionar miembros' };
    }

    // Members cannot manage anyone
    return { canManage: false, reason: 'Sin permisos de gestión' };
  } catch (error) {
    console.error('Error checking user management permissions:', error);
    return { canManage: false, reason: 'Error interno' };
  }
}

/**
 * Get user's role in an organization (client-side)
 */
export async function getUserRoleClient(
  userId: string,
  organizationId: string
): Promise<Role | null> {
  try {
    const supabase = createClient();

    const { data: membership, error } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !membership) {
      return null;
    }

    return membership.role as Role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}
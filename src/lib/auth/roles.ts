import { createClient } from '@/lib/supabase/server';

export type Role = 'owner' | 'admin' | 'member';

export interface RoleValidationResult {
  hasPermission: boolean;
  userRole?: Role;
  error?: string;
}

/**
 * Check if user has a specific role or higher in an organization
 */
export async function validateUserRole(
  userId: string,
  organizationId: string,
  requiredRole: Role
): Promise<RoleValidationResult> {
  try {
    const supabase = await createClient();

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
 * Get user's role in an organization
 */
export async function getUserRole(
  userId: string,
  organizationId: string
): Promise<Role | null> {
  try {
    const supabase = await createClient();

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

/**
 * Check if user is a member of an organization
 */
export async function isOrganizationMember(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: membership, error } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    return !error && !!membership;
  } catch (error) {
    console.error('Error checking organization membership:', error);
    return false;
  }
}

/**
 * Get all organizations where user has a specific role or higher
 */
export async function getUserOrganizations(
  userId: string,
  minRole?: Role
): Promise<Array<{ id: string; name: string; role: Role }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('memberships')
      .select(`
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    const { data: memberships, error } = await query;

    if (error || !memberships) {
      return [];
    }

    let filteredMemberships = memberships;

    // Filter by minimum role if specified
    if (minRole) {
      filteredMemberships = memberships.filter(membership =>
        checkRolePermission(membership.role as Role, minRole)
      );
    }

    return filteredMemberships
      .filter(membership => membership.organizations)
      .map(membership => ({
        id: (membership.organizations as any).id,
        name: (membership.organizations as any).name,
        role: membership.role as Role,
      }));
  } catch (error) {
    console.error('Error getting user organizations:', error);
    return [];
  }
}
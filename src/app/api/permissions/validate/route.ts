import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUserRole, canManageUser } from '@/lib/auth/roles';
import { z } from 'zod';

const validatePermissionsSchema = z.object({
  organizationId: z.string().uuid('ID de organización inválido'),
  actions: z.array(z.string()).optional(),
  targetUserId: z.string().uuid('ID de usuario objetivo inválido').optional(),
  action: z.enum(['change_role', 'remove', 'invite']).optional(),
});

// POST /api/permissions/validate - Validate user permissions in real-time
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validatePermissionsSchema.parse(body);

    const { organizationId, actions, targetUserId, action } = validatedData;

    // Validate user is member of organization
    const membershipValidation = await validateUserRole(user.id, organizationId, 'member');
    if (!membershipValidation.hasPermission) {
      return NextResponse.json(
        { error: 'No eres miembro de esta organización' },
        { status: 403 }
      );
    }

    const permissions: Record<string, boolean> = {};

    // If specific actions are requested, validate them
    if (actions && actions.length > 0) {
      const permissionMap: Record<string, 'owner' | 'admin' | 'member'> = {
        'manage_members': 'admin',
        'manage_admins': 'owner',
        'invite_users': 'admin',
        'remove_members': 'admin',
        'change_roles': 'admin',
        'view_audit_logs': 'admin',
        'manage_organization': 'owner',
      };

      for (const actionName of actions) {
        const requiredRole = permissionMap[actionName] || 'member';
        const validation = await validateUserRole(user.id, organizationId, requiredRole);
        permissions[actionName] = validation.hasPermission;
      }
    }

    // If target user and action are specified, validate specific user management
    if (targetUserId && action) {
      const canManage = await canManageUser(user.id, targetUserId, organizationId, action);
      permissions[`can_${action}_${targetUserId}`] = canManage.canManage;
    }

    const response: any = {
      permissions,
      userRole: membershipValidation.userRole,
    };

    // If target user and action are specified, include management result
    if (targetUserId && action) {
      const canManage = await canManageUser(user.id, targetUserId, organizationId, action);
      response.canManageTarget = canManage.canManage;
      if (canManage.reason) {
        response.managementReason = canManage.reason;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST /api/permissions/validate:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
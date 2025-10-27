import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateMembershipSchema = z.object({
  membershipId: z.string().uuid('ID de membresía inválido'),
  role: z
    .enum(['admin', 'member'])
    .refine((val) => ['admin', 'member'].includes(val), {
      message: 'Rol inválido',
    }),
});

// GET /api/memberships - List memberships for organization or user's memberships
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // If no organizationId, return user's own memberships with organizations
    if (!organizationId) {
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          created_at,
          organization:organizations(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user memberships:', error);
        return NextResponse.json(
          { error: 'Error al obtener las organizaciones' },
          { status: 500 }
        );
      }

      return NextResponse.json({ memberships });
    }

    // Check if user has admin role in organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver los miembros' },
        { status: 403 }
      );
    }

    // Get memberships for organization using the custom function
    const { data: memberships, error } = await supabase
      .rpc('get_organization_memberships', { org_id: organizationId });

    if (error) {
      console.error('Error fetching memberships:', error);
      return NextResponse.json(
        { error: 'Error al obtener los miembros' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const membershipsWithUsers = (memberships || []).map((membership: any) => ({
      id: membership.id,
      role: membership.role,
      created_at: membership.created_at,
      user_id: membership.user_id,
      users: {
        id: membership.user_id,
        email: membership.user_email,
        created_at: membership.created_at,
      },
    }));

    return NextResponse.json({ memberships: membershipsWithUsers });
  } catch (error) {
    console.error('Error in GET /api/memberships:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/memberships - Update membership role
export async function PUT(request: NextRequest) {
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
    const validatedData = updateMembershipSchema.parse(body);

    // Get membership to check permissions
    const { data: targetMembership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, user_id, organization_id, role')
      .eq('id', validatedData.membershipId)
      .single();

    if (membershipError || !targetMembership) {
      return NextResponse.json(
        { error: 'Membresía no encontrada' },
        { status: 404 }
      );
    }

    // Check if user has admin role in organization
    const { data: userMembership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', targetMembership.organization_id)
      .single();

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar roles' },
        { status: 403 }
      );
    }

    // Prevent changing owner role
    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: 'No se puede cambiar el rol del propietario' },
        { status: 409 }
      );
    }

    // Prevent non-owners from creating admins
    if (validatedData.role === 'admin' && userMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Solo el propietario puede asignar el rol de administrador' },
        { status: 403 }
      );
    }

    // Prevent users from changing their own role
    if (targetMembership.user_id === user.id) {
      return NextResponse.json(
        { error: 'No puedes cambiar tu propio rol' },
        { status: 409 }
      );
    }

    // Update membership role
    const { data: updatedMembership, error: updateError } = await supabase
      .from('memberships')
      .update({ role: validatedData.role })
      .eq('id', validatedData.membershipId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating membership:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el rol' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      membership: updatedMembership,
      message: 'Rol actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error in PUT /api/memberships:', error);

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
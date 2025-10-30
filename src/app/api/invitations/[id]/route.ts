import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateInvitationSchema } from '@/lib/validations/invitations';

// GET /api/invitations/[id] - Get specific invitation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        organization_id,
        email,
        role,
        code,
        expires_at,
        used_at,
        created_at,
        created_by,
        organizations (
          id,
          name,
          currency
        )
      `)
      .eq('id', id)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      );
    }

    // Check if user has admin role in organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver esta invitación' },
        { status: 403 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Error in GET /api/invitations/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/invitations/[id] - Update invitation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const validatedData = updateInvitationSchema.parse(body);

    // Get invitation to check permissions
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('id, organization_id, used_at')
      .eq('id', id)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      );
    }

    // Check if invitation has been used
    if (invitation.used_at) {
      return NextResponse.json(
        { error: 'No se puede modificar una invitación ya utilizada' },
        { status: 409 }
      );
    }

    // Check if user has admin role in organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar esta invitación' },
        { status: 403 }
      );
    }

    // Update invitation
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('invitations')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar la invitación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invitation: updatedInvitation,
      message: 'Invitación actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error in PUT /api/invitations/[id]:', error);

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

// DELETE /api/invitations/[id] - Delete invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get invitation to check permissions
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('id, organization_id')
      .eq('id', id)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      );
    }

    // Check if user has admin role in organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar esta invitación' },
        { status: 403 }
      );
    }

    // Delete invitation
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar la invitación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Invitación eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/invitations/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
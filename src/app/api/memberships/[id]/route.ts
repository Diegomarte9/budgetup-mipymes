import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/memberships/[id] - Remove member from organization
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

    // Get membership to check permissions
    const { data: targetMembership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, user_id, organization_id, role')
      .eq('id', id)
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
        { error: 'No tienes permisos para remover miembros' },
        { status: 403 }
      );
    }

    // Prevent removing owner
    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: 'No se puede remover al propietario de la organización' },
        { status: 409 }
      );
    }

    // Prevent non-owners from removing admins
    if (targetMembership.role === 'admin' && userMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Solo el propietario puede remover administradores' },
        { status: 403 }
      );
    }

    // Prevent users from removing themselves (they should leave instead)
    if (targetMembership.user_id === user.id) {
      return NextResponse.json(
        { error: 'No puedes removerte a ti mismo. Usa la opción de abandonar organización.' },
        { status: 409 }
      );
    }

    // Remove membership
    const { error: deleteError } = await supabase
      .from('memberships')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error removing membership:', deleteError);
      return NextResponse.json(
        { error: 'Error al remover el miembro' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Miembro removido exitosamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/memberships/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
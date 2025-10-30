import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { acceptInvitationSchema } from '@/lib/validations/invitations';

// POST /api/invitations/accept - Accept invitation by code
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
    const validatedData = acceptInvitationSchema.parse(body);

    // Find invitation by code
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        organization_id,
        email,
        role,
        expires_at,
        used_at,
        organizations (
          id,
          name,
          currency
        )
      `)
      .eq('code', validatedData.code)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Código de invitación inválido' },
        { status: 404 }
      );
    }

    // Check if invitation has already been used
    if (invitation.used_at) {
      return NextResponse.json(
        { error: 'Esta invitación ya ha sido utilizada' },
        { status: 409 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Esta invitación ha expirado' },
        { status: 410 }
      );
    }

    // Get user email from auth
    if (!user.email) {
      return NextResponse.json(
        { error: 'Email de usuario no disponible' },
        { status: 400 }
      );
    }

    // Check if invitation email matches user email
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Esta invitación no es para tu email' },
        { status: 403 }
      );
    }

    // Check if user is already a member of this organization
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Ya eres miembro de esta organización' },
        { status: 409 }
      );
    }

    // Create membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
      })
      .select()
      .single();

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      return NextResponse.json(
        { error: 'Error al crear la membresía' },
        { status: 500 }
      );
    }

    // Mark invitation as used
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail the request if we can't update the invitation
    }

    return NextResponse.json({
      organization: invitation.organizations?.[0],
      role: invitation.role,
      message: `Te has unido exitosamente a ${invitation.organizations?.[0]?.name}`,
    });
  } catch (error) {
    console.error('Error in POST /api/invitations/accept:', error);

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
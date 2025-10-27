import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { joinOrganizationSchema } from '@/lib/validations/onboarding';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication using getUser() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = joinOrganizationSchema.parse(body);

    // Find valid invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*, organizations(id, name)')
      .eq('code', validatedData.invitationCode)
      .eq('email', user.email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Código de invitación inválido o expirado' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Ya eres miembro de esta organización' },
        { status: 400 }
      );
    }

    // Create membership
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      return NextResponse.json(
        { error: 'Error al unirse a la organización' },
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
      organization: invitation.organizations,
      role: invitation.role,
      message: 'Te has unido exitosamente a la organización',
    });
  } catch (error) {
    console.error('Error in POST /api/organizations/join:', error);
    
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
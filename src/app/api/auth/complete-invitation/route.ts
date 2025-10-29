import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const completeInvitationSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  invitationCode: z.string().min(1, 'Código de invitación requerido'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, invitationCode } = completeInvitationSchema.parse(body);

    // Create admin client for all operations
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, verify the invitation is valid using admin client
    const { data: invitation, error: invitationError } = await supabaseAdmin
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
      .eq('code', invitationCode)
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

    // Check if invitation email matches
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'El email no coincide con la invitación' },
        { status: 403 }
      );
    }



    // Find the user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    let user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // If user doesn't exist, create them
    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'Error al crear el usuario' },
          { status: 500 }
        );
      }

      user = newUser.user;
    } else {
      // Update existing user password and confirm email
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          password,
          email_confirm: true,
        }
      );

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Error al actualizar la contraseña' },
          { status: 500 }
        );
      }
    }



    // Check if user is already a member of this organization
    const { data: existingMembership } = await supabaseAdmin
      .from('memberships')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (!existingMembership) {
      // Create membership
      const { error: membershipError } = await supabaseAdmin
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
        });

      if (membershipError) {
        console.error('Error creating membership:', membershipError);
        return NextResponse.json(
          { error: 'Error al crear la membresía' },
          { status: 500 }
        );
      }
    }

    // Mark invitation as used
    const usedAt = new Date().toISOString();
    console.log(`Marking invitation ${invitation.id} as used at ${usedAt}`);
    
    const { data: updatedInvitation, error: updateInvitationError } = await supabaseAdmin
      .from('invitations')
      .update({ used_at: usedAt })
      .eq('id', invitation.id)
      .select()
      .single();

    if (updateInvitationError) {
      console.error('Error updating invitation:', updateInvitationError);
      return NextResponse.json(
        { error: 'Error al marcar la invitación como usada' },
        { status: 500 }
      );
    }

    console.log('Invitation updated successfully:', updatedInvitation);

    // Create regular client for sign in
    const supabase = await createClient();
    
    // Sign in the user automatically
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Error signing in user:', signInError);
      return NextResponse.json(
        { error: 'Registro completado, pero error al iniciar sesión. Intenta iniciar sesión manualmente.' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: `¡Te has unido exitosamente a ${invitation.organizations?.name}!`,
      organization: invitation.organizations,
      user: signInData.user,
    });

  } catch (error) {
    console.error('Error in POST /api/auth/complete-invitation:', error);

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
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get the first organization for testing
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (!organizations || organizations.length === 0) {
      return NextResponse.json(
        { error: 'No hay organizaciones disponibles para prueba' },
        { status: 400 }
      );
    }

    const organization = organizations[0];

    // Generate test invitation
    const code = nanoid(12).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        organization_id: organization.id,
        email: 'test@example.com',
        role: 'member',
        code,
        expires_at: expiresAt.toISOString(),
        created_by: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test invitation:', error);
      return NextResponse.json(
        { error: 'Error al crear invitación de prueba', details: error.message },
        { status: 500 }
      );
    }

    const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/invitation?code=${code}`;

    return NextResponse.json({
      message: 'Invitación de prueba creada exitosamente',
      invitation,
      url: invitationUrl,
      testApiUrl: `/api/invitations/details?code=${code}`
    });

  } catch (error) {
    console.error('Error in POST /api/invitations/create-test:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
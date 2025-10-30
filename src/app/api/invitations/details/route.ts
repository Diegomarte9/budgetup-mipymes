import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/invitations/details - Get invitation details by code (public endpoint)
export async function GET(request: NextRequest) {
  try {
    // Use admin client to bypass RLS for public invitation details
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    console.log('API Details: Received code:', code);

    if (!code) {
      console.log('API Details: No code provided');
      return NextResponse.json(
        { error: 'Código de invitación requerido' },
        { status: 400 }
      );
    }

    // Debug: Check if there are any invitations in the table
    const { data: allInvitations, error: countError } = await supabase
      .from('invitations')
      .select('code, email, id')
      .limit(5);
    
    console.log('API Details: Sample invitations in DB:', allInvitations?.map(inv => ({ code: inv.code, email: inv.email })));
    console.log('API Details: Count query error:', countError);

    // First, try a simple query to see if the invitation exists
    const { data: simpleInvitation, error: simpleError } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', code);

    console.log('API Details: Simple query result:', { 
      count: simpleInvitation?.length, 
      error: simpleError,
      codes: simpleInvitation?.map(inv => inv.code)
    });

    if (simpleError) {
      console.log('API Details: Simple query failed:', simpleError);
      return NextResponse.json(
        { error: 'Error en consulta', details: simpleError.message },
        { status: 500 }
      );
    }

    if (!simpleInvitation || simpleInvitation.length === 0) {
      console.log('API Details: No invitation found with code:', code);
      return NextResponse.json(
        { error: 'Código de invitación no encontrado' },
        { status: 404 }
      );
    }

    if (simpleInvitation.length > 1) {
      console.log('API Details: Multiple invitations found:', simpleInvitation.length);
      return NextResponse.json(
        { error: 'Múltiples invitaciones encontradas' },
        { status: 500 }
      );
    }

    const invitation = simpleInvitation[0];

    // Get organization details separately
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, currency')
      .eq('id', invitation.organization_id)
      .single();

    if (orgError) {
      console.log('API Details: Organization query failed:', orgError);
    }

    // Combine the data
    const invitationWithOrg = {
      ...invitation,
      organizations: organization || { id: invitation.organization_id, name: 'Organización', currency: 'DOP' }
    };

    console.log('API Details: Returning invitation:', invitationWithOrg.id);
    return NextResponse.json({ invitation: invitationWithOrg });
  } catch (error) {
    console.error('Error in GET /api/invitations/details:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
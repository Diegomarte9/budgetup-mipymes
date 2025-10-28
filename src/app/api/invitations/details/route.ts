import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/invitations/details - Get invitation details by code (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Código de invitación requerido' },
        { status: 400 }
      );
    }

    // Get invitation details (no auth required for viewing invitation details)
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
        organizations (
          id,
          name,
          currency
        )
      `)
      .eq('code', code)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Código de invitación inválido' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Error in GET /api/invitations/details:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
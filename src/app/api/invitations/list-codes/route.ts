import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Use admin client to bypass RLS
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

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('code, email, created_at, used_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error listing invitations:', error);
      return NextResponse.json(
        { error: 'Error al listar invitaciones', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Invitaciones encontradas',
      count: invitations?.length || 0,
      invitations: invitations || []
    });

  } catch (error) {
    console.error('Error in GET /api/invitations/list-codes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
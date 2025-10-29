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

    // Check organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);

    // Check invitations
    const { data: invitations, error: invError } = await supabase
      .from('invitations')
      .select('id, code, email')
      .limit(5);

    // Check memberships
    const { data: memberships, error: memError } = await supabase
      .from('memberships')
      .select('id, user_id, organization_id')
      .limit(5);

    return NextResponse.json({
      organizations: {
        count: organizations?.length || 0,
        data: organizations || [],
        error: orgError?.message
      },
      invitations: {
        count: invitations?.length || 0,
        data: invitations || [],
        error: invError?.message
      },
      memberships: {
        count: memberships?.length || 0,
        data: memberships || [],
        error: memError?.message
      }
    });

  } catch (error) {
    console.error('Error in GET /api/debug/check-tables:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
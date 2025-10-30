import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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

    // Check if user has any memberships
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('id, organization_id, organizations(id, name)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error checking memberships:', error);
      return NextResponse.json(
        { error: 'Error al verificar membresías' },
        { status: 500 }
      );
    }

    const needsOnboarding = !memberships || memberships.length === 0;

    return NextResponse.json({
      needsOnboarding,
      organizations: memberships || [],
    });
  } catch (error) {
    console.error('Error in GET /api/user/onboarding-status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
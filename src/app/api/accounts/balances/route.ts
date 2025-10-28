import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Query the account balances view
    const { data: balances, error } = await supabase
      .from('v_account_balances')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      console.error('Error fetching account balances:', error);
      return NextResponse.json(
        { error: 'Error al obtener los balances de las cuentas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      balances: balances || [],
      message: 'Balances obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Unexpected error in account balances API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
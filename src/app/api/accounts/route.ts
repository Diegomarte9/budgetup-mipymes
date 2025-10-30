import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAccountSchema } from '@/lib/validations/accounts';
import { ZodError } from 'zod';

// GET /api/accounts - List accounts for current user's organization
export async function GET(request: NextRequest) {
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

    // Get organization_id from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    // Get accounts for the organization
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json(
        { error: 'Error al obtener las cuentas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error in GET /api/accounts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Create new account
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
    const validatedData = createAccountSchema.parse(body);

    // Verify user has admin access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear cuentas en esta organización' },
        { status: 403 }
      );
    }

    // Check if account name already exists in this organization
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('organization_id', validatedData.organization_id)
      .ilike('name', validatedData.name)
      .limit(1);

    if (existingAccount && existingAccount.length > 0) {
      return NextResponse.json(
        {
          error: 'Ya existe una cuenta con ese nombre en esta organización',
        },
        { status: 409 }
      );
    }

    // Create the account
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        organization_id: validatedData.organization_id,
        name: validatedData.name,
        type: validatedData.type,
        currency: validatedData.currency,
        initial_balance: validatedData.initial_balance,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);

      // Handle specific database errors
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: 'Ya existe una cuenta con ese nombre en esta organización',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Error al crear la cuenta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      account,
      message: 'Cuenta creada exitosamente',
    });
  } catch (error) {
    console.error('Error in POST /api/accounts:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
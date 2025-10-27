import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAccountSchema } from '@/lib/validations/accounts';
import { ZodError } from 'zod';

// PUT /api/accounts/[id] - Update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: accountId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateAccountSchema.parse({ ...body, id: accountId });

    // Get the existing account to verify ownership and get organization_id
    const { data: existingAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('*, organization_id')
      .eq('id', accountId)
      .single();

    if (fetchError || !existingAccount) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      );
    }

    // Verify user has admin access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', existingAccount.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar cuentas en esta organización' },
        { status: 403 }
      );
    }

    // If name is being updated, check for uniqueness
    if (validatedData.name && validatedData.name !== existingAccount.name) {
      const { data: duplicateAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('organization_id', existingAccount.organization_id)
        .ilike('name', validatedData.name)
        .neq('id', accountId)
        .limit(1);

      if (duplicateAccount && duplicateAccount.length > 0) {
        return NextResponse.json(
          {
            error: 'Ya existe una cuenta con ese nombre en esta organización',
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data (remove undefined values)
    const updateData = Object.fromEntries(
      Object.entries({
        name: validatedData.name,
        type: validatedData.type,
        currency: validatedData.currency,
        initial_balance: validatedData.initial_balance,
        updated_at: new Date().toISOString(),
      }).filter(([_, value]) => value !== undefined)
    );

    // Update the account
    const { data: account, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);

      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: 'Ya existe una cuenta con ese nombre en esta organización',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Error al actualizar la cuenta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      account,
      message: 'Cuenta actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error in PUT /api/accounts/[id]:', error);

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

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: accountId } = await params;

    // Get the existing account to verify ownership
    const { data: existingAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('*, organization_id')
      .eq('id', accountId)
      .single();

    if (fetchError || !existingAccount) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      );
    }

    // Verify user has admin access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', existingAccount.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar cuentas en esta organización' },
        { status: 403 }
      );
    }

    // Check if account has transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id')
      .or(`account_id.eq.${accountId},transfer_to_account_id.eq.${accountId}`)
      .limit(1);

    if (transactionError) {
      console.error('Error checking transactions:', transactionError);
      return NextResponse.json(
        { error: 'Error al verificar transacciones' },
        { status: 500 }
      );
    }

    if (transactions && transactions.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la cuenta porque tiene transacciones asociadas',
        },
        { status: 409 }
      );
    }

    // Delete the account
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      console.error('Error deleting account:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la cuenta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Cuenta eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/accounts/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
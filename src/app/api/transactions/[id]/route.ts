import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  updateTransactionSchema, 
  validateTransactionByType 
} from '@/lib/validations/transactions';
import { ZodError } from 'zod';

// GET /api/transactions/[id] - Get single transaction
export async function GET(
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

    const { id } = await params;

    // Get transaction with related data
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type, color),
        transfer_to_account:accounts!transactions_transfer_to_account_id_fkey(id, name, type)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Transacción no encontrada' },
          { status: 404 }
        );
      }

      console.error('Error fetching transaction:', error);
      return NextResponse.json(
        { error: 'Error al obtener la transacción' },
        { status: 500 }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', transaction.organization_id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta transacción' },
        { status: 403 }
      );
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Error in GET /api/transactions/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/transactions/[id] - Update transaction
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

    const { id } = await params;

    // Get existing transaction
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Transacción no encontrada' },
          { status: 404 }
        );
      }

      console.error('Error fetching transaction:', fetchError);
      return NextResponse.json(
        { error: 'Error al obtener la transacción' },
        { status: 500 }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', existingTransaction.organization_id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta transacción' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Merge with existing data for validation
    const mergedData = {
      ...existingTransaction,
      ...body,
      id, // Ensure ID is preserved
    };

    // Validate based on transaction type
    const validatedData = validateTransactionByType(mergedData);

    // Verify accounts belong to the organization (if changed)
    if (body.account_id || body.transfer_to_account_id) {
      const accountIds = [];
      if (validatedData.account_id) accountIds.push(validatedData.account_id);
      if (validatedData.transfer_to_account_id) accountIds.push(validatedData.transfer_to_account_id);

      if (accountIds.length > 0) {
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('id, organization_id')
          .in('id', accountIds);

        if (accountsError || !accounts || accounts.length !== accountIds.length) {
          return NextResponse.json(
            { error: 'Una o más cuentas no existen' },
            { status: 400 }
          );
        }

        // Verify all accounts belong to the organization
        const invalidAccounts = accounts.filter(
          account => account.organization_id !== existingTransaction.organization_id
        );

        if (invalidAccounts.length > 0) {
          return NextResponse.json(
            { error: 'Las cuentas no pertenecen a esta organización' },
            { status: 400 }
          );
        }
      }
    }

    // For transfers, validate that accounts are different
    if (validatedData.type === 'transfer') {
      if (validatedData.account_id === validatedData.transfer_to_account_id) {
        return NextResponse.json(
          { error: 'La cuenta origen y destino deben ser diferentes' },
          { status: 400 }
        );
      }
    }

    // Verify category belongs to organization (if changed)
    if (body.category_id !== undefined && validatedData.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id, organization_id, type')
        .eq('id', validatedData.category_id)
        .single();

      if (categoryError || !category) {
        return NextResponse.json(
          { error: 'La categoría no existe' },
          { status: 400 }
        );
      }

      if (category.organization_id !== existingTransaction.organization_id) {
        return NextResponse.json(
          { error: 'La categoría no pertenece a esta organización' },
          { status: 400 }
        );
      }

      // Verify category type matches transaction type
      if (category.type !== validatedData.type) {
        return NextResponse.json(
          { error: `La categoría debe ser de tipo ${validatedData.type}` },
          { status: 400 }
        );
      }
    }

    // Update the transaction
    const updateData = { ...body };
    delete updateData.id; // Remove ID from update data
    delete updateData.organization_id; // Don't allow changing organization
    delete updateData.created_by; // Don't allow changing creator

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type, color),
        transfer_to_account:accounts!transactions_transfer_to_account_id_fkey(id, name, type)
      `)
      .single();

    if (error) {
      console.error('Error updating transaction:', error);

      // Handle specific database errors
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Referencia inválida (cuenta o categoría no existe)' },
          { status: 400 }
        );
      }

      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Datos inválidos (violación de restricción)' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al actualizar la transacción' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transaction,
      message: 'Transacción actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error in PUT /api/transactions/[id]:', error);

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

// DELETE /api/transactions/[id] - Delete transaction
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

    const { id } = await params;

    // Get existing transaction to verify access
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Transacción no encontrada' },
          { status: 404 }
        );
      }

      console.error('Error fetching transaction:', fetchError);
      return NextResponse.json(
        { error: 'Error al obtener la transacción' },
        { status: 500 }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', existingTransaction.organization_id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta transacción' },
        { status: 403 }
      );
    }

    // Delete the transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la transacción' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Transacción eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/transactions/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
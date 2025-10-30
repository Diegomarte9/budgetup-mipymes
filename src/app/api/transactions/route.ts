import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createTransactionSchema, 
  validateTransactionByType,
  TransactionType 
} from '@/lib/validations/transactions';
import { ZodError } from 'zod';

// GET /api/transactions - List transactions for current user's organization
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const type = searchParams.get('type') as TransactionType | null;
    const accountId = searchParams.get('account_id');
    const categoryId = searchParams.get('category_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        account:accounts!transactions_account_id_fkey(id, name, type),
        category:categories(id, name, type, color),
        transfer_to_account:accounts!transactions_transfer_to_account_id_fkey(id, name, type)
      `)
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (accountId) {
      query = query.or(`account_id.eq.${accountId},transfer_to_account_id.eq.${accountId}`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (startDate) {
      query = query.gte('occurred_at', startDate);
    }

    if (endDate) {
      query = query.lte('occurred_at', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Error al obtener las transacciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error in GET /api/transactions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create new transaction
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
    
    // Add user ID and validate
    const dataWithUser = {
      ...body,
      created_by: user.id,
    };

    // Validate using the create schema first
    const validatedData = createTransactionSchema.parse(dataWithUser);
    
    // Then validate specific transaction type rules
    validateTransactionByType(validatedData);

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    // Verify accounts belong to the organization
    const accountIds = [validatedData.account_id];
    if (validatedData.transfer_to_account_id) {
      accountIds.push(validatedData.transfer_to_account_id);
    }

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
      account => account.organization_id !== validatedData.organization_id
    );

    if (invalidAccounts.length > 0) {
      return NextResponse.json(
        { error: 'Las cuentas no pertenecen a esta organización' },
        { status: 400 }
      );
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

    // Verify category belongs to organization (if provided)
    if (validatedData.category_id) {
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

      if (category.organization_id !== validatedData.organization_id) {
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

    // Create the transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        organization_id: validatedData.organization_id,
        type: validatedData.type,
        amount: validatedData.amount,
        currency: validatedData.currency,
        description: validatedData.description,
        occurred_at: validatedData.occurred_at,
        account_id: validatedData.account_id,
        category_id: validatedData.category_id,
        transfer_to_account_id: validatedData.transfer_to_account_id,
        itbis_pct: validatedData.itbis_pct,
        notes: validatedData.notes,
        attachment_url: validatedData.attachment_url,
        created_by: user.id,
      })
      .select(`
        *,
        account:accounts!transactions_account_id_fkey(id, name, type),
        category:categories(id, name, type, color),
        transfer_to_account:accounts!transactions_transfer_to_account_id_fkey(id, name, type)
      `)
      .single();

    if (error) {
      console.error('Error creating transaction:', error);

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
        { error: 'Error al crear la transacción' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transaction,
      message: 'Transacción creada exitosamente',
    });
  } catch (error) {
    console.error('Error in POST /api/transactions:', error);

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
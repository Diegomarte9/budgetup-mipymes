import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get query parameters
    const organizationId = searchParams.get('organization_id');
    const type = searchParams.get('type');
    const accountId = searchParams.get('account_id');
    const categoryId = searchParams.get('category_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Check if user has access to this organization
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

    // Build query with filters
    let query = supabase
      .from('transactions')
      .select('type, amount')
      .eq('organization_id', organizationId);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (accountId) {
      query = query.eq('account_id', accountId);
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

    // For search, we need to get all transactions and filter client-side
    // since Supabase doesn't support full-text search on multiple columns easily
    if (search) {
      query = query.select('type, amount, description, notes');
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transaction totals:', error);
      return NextResponse.json(
        { error: 'Error al obtener los totales' },
        { status: 500 }
      );
    }

    // Filter by search term if provided (client-side)
    let filteredTransactions = transactions || [];
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase();
      filteredTransactions = transactions.filter((transaction: any) =>
        transaction.description?.toLowerCase().includes(searchTerm) ||
        transaction.notes?.toLowerCase().includes(searchTerm)
      );
    }

    // Calculate totals
    const totals = filteredTransactions.reduce((acc: any, transaction: any) => {
      switch (transaction.type) {
        case 'income':
          acc.income += transaction.amount;
          break;
        case 'expense':
          acc.expense += transaction.amount;
          break;
        case 'transfer':
          acc.transfer += transaction.amount;
          break;
      }
      return acc;
    }, { income: 0, expense: 0, transfer: 0 });

    const net = totals.income - totals.expense;
    const total = totals.income + totals.expense + totals.transfer;

    return NextResponse.json({
      totals: {
        income: totals.income,
        expense: totals.expense,
        transfer: totals.transfer,
        net,
        total,
        count: filteredTransactions.length
      }
    });

  } catch (error) {
    console.error('Error in GET /api/transactions/totals:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
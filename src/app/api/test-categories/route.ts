import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Test 1: Get all transactions for this organization
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('id, type, amount, category_id, occurred_at')
      .eq('organization_id', organizationId)
      .limit(10);

    console.log('TEST: All transactions:', allTransactions?.length || 0);

    // Test 2: Get expense transactions
    const { data: expenseTransactions, error: expenseError } = await supabase
      .from('transactions')
      .select('id, amount, category_id, occurred_at')
      .eq('organization_id', organizationId)
      .eq('type', 'expense')
      .limit(10);

    console.log('TEST: Expense transactions:', expenseTransactions?.length || 0);

    // Test 3: Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, color')
      .eq('organization_id', organizationId)
      .limit(10);

    console.log('TEST: Categories:', categories?.length || 0);

    // Test 4: Get transactions with categories
    const { data: transactionsWithCategories, error: joinError } = await supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories(
          name,
          color
        )
      `)
      .eq('organization_id', organizationId)
      .eq('type', 'expense')
      .not('category_id', 'is', null)
      .limit(10);

    console.log('TEST: Transactions with categories:', transactionsWithCategories?.length || 0);

    return NextResponse.json({
      allTransactions: allTransactions?.length || 0,
      expenseTransactions: expenseTransactions?.length || 0,
      categories: categories?.length || 0,
      transactionsWithCategories: transactionsWithCategories?.length || 0,
      sampleData: {
        allTransactions: allTransactions?.slice(0, 2),
        expenseTransactions: expenseTransactions?.slice(0, 2),
        categories: categories?.slice(0, 2),
        transactionsWithCategories: transactionsWithCategories?.slice(0, 2)
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
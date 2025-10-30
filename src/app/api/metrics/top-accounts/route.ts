import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for query parameters
const topAccountsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val) : 5),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      organizationId: searchParams.get('organizationId'),
      limit: searchParams.get('limit'),
    };

    const validatedParams = topAccountsQuerySchema.parse(queryParams);

    // Verify user has access to the organization
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedParams.organizationId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get ALL expense transactions with accounts (no date filtering)
    // Use the specific relationship name to avoid ambiguity
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        amount,
        account_id,
        accounts!transactions_account_id_fkey(
          name,
          type
        )
      `)
      .eq('organization_id', validatedParams.organizationId)
      .eq('type', 'expense')
      .not('account_id', 'is', null);

    if (transactionError) {
      console.error('Error fetching transaction data:', transactionError);
      return NextResponse.json({ error: 'Failed to fetch transaction data' }, { status: 500 });
    }

    // Aggregate by account
    const accountMap = new Map();
    let totalExpenses = 0;

    transactionData?.forEach(transaction => {
      const accountId = transaction.account_id;
      const amount = parseFloat(transaction.amount);
      totalExpenses += amount;

      if (accountMap.has(accountId)) {
        const existing = accountMap.get(accountId);
        existing.total_amount += amount;
        existing.transaction_count += 1;
      } else {
        accountMap.set(accountId, {
          account_id: accountId,
          account_name: (transaction.accounts as any).name,
          account_type: (transaction.accounts as any).type,
          total_amount: amount,
          transaction_count: 1,
        });
      }
    });

    // Convert to array and calculate percentages
    const accountsData = Array.from(accountMap.values())
      .map(acc => ({
        ...acc,
        percentage: totalExpenses > 0 ? Math.round((acc.total_amount / totalExpenses) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, validatedParams.limit);

    const response = NextResponse.json({
      data: accountsData,
      totalExpenses,
      limit: validatedParams.limit,
      period: 'all-time',
    });

    // Add cache headers for optimization (5 minutes cache)
    const cacheKey = `${validatedParams.organizationId}-accounts-all-time`;
    
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    response.headers.set('ETag', `"top-accounts-${cacheKey}"`);
    
    return response;

  } catch (error) {
    console.error('Error in top accounts API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
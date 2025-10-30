import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for query parameters with date range support
const topCategoriesQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val) : 5),
  month: z.string().nullable().optional(), // YYYY-MM format
  startDate: z.string().nullable().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().nullable().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, 'Start date must be before or equal to end date');

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
      month: searchParams.get('month'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    const validatedParams = topCategoriesQuerySchema.parse(queryParams);

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

    let categoriesData;
    let totalExpenses = 0;
    let dateRange: { startDate?: string; endDate?: string; month?: string; period?: string } = {};

    // Get ALL expense transactions with categories (no date filtering)
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories(
          name,
          color
        )
      `)
      .eq('organization_id', validatedParams.organizationId)
      .eq('type', 'expense')
      .not('category_id', 'is', null);

    if (transactionError) {
      console.error('Error fetching transaction data:', transactionError);
      return NextResponse.json({ error: 'Failed to fetch transaction data' }, { status: 500 });
    }



    // Aggregate by category
    const categoryMap = new Map();
    totalExpenses = 0;

    transactionData?.forEach(transaction => {
      const categoryId = transaction.category_id;
      const amount = parseFloat(transaction.amount);
      totalExpenses += amount;

      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId);
        existing.total_amount += amount;
        existing.transaction_count += 1;
      } else {
        categoryMap.set(categoryId, {
          category_id: categoryId,
          category_name: (transaction.categories as any).name,
          category_color: (transaction.categories as any).color,
          total_amount: amount,
          transaction_count: 1,
        });
      }
    });



    // Convert to array and calculate percentages
    categoriesData = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: totalExpenses > 0 ? Math.round((cat.total_amount / totalExpenses) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, validatedParams.limit);



    dateRange = { period: 'all-time' };

    const response = NextResponse.json({
      data: categoriesData,
      totalExpenses,
      limit: validatedParams.limit,
      ...dateRange,
    });

    // Add cache headers for optimization (5 minutes cache)
    const cacheKey = `${validatedParams.organizationId}-all-time`;
    
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    response.headers.set('ETag', `"top-categories-${cacheKey}"`);
    
    return response;

  } catch (error) {
    console.error('Error in top categories API:', error);
    
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
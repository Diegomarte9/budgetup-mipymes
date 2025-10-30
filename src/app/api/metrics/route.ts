import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for query parameters
const metricsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      organizationId: searchParams.get('organizationId'),
    };

    const validatedParams = metricsQuerySchema.parse(queryParams);

    // Verify user has access to the organization
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('organization_id', validatedParams.organizationId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current month KPIs using the database function
    const { data: kpis, error: kpisError } = await supabase
      .rpc('get_current_month_kpis', {
        p_organization_id: validatedParams.organizationId
      });

    if (kpisError) {
      console.error('Error fetching KPIs:', kpisError);
      return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
    }

    // Get last 12 months balance data
    const { data: monthlyBalance, error: monthlyError } = await supabase
      .rpc('get_last_12_months_balance', {
        p_organization_id: validatedParams.organizationId
      });

    if (monthlyError) {
      console.error('Error fetching monthly balance:', monthlyError);
      return NextResponse.json({ error: 'Failed to fetch monthly balance' }, { status: 500 });
    }

    // Get top expense categories for current month
    const { data: topCategories, error: categoriesError } = await supabase
      .rpc('get_current_month_top_categories', {
        p_organization_id: validatedParams.organizationId,
        p_limit: 5
      });

    if (categoriesError) {
      console.error('Error fetching top categories:', categoriesError);
      return NextResponse.json({ error: 'Failed to fetch top categories' }, { status: 500 });
    }

    // Return combined metrics
    const response = NextResponse.json({
      kpis: kpis?.[0] || {
        current_month_income: 0,
        current_month_expense: 0,
        current_month_balance: 0,
        previous_month_income: 0,
        previous_month_expense: 0,
        previous_month_balance: 0,
        income_change_pct: 0,
        expense_change_pct: 0,
        balance_change_pct: 0,
      },
      monthlyBalance: monthlyBalance || [],
      topCategories: topCategories || [],
      lastUpdated: new Date().toISOString(),
      currency: 'DOP',
    });

    // Add cache headers for optimization (3 minutes cache for combined metrics)
    response.headers.set('Cache-Control', 'public, max-age=180, s-maxage=180');
    response.headers.set('ETag', `"dashboard-metrics-${validatedParams.organizationId}"`);
    
    return response;

  } catch (error) {
    console.error('Error in metrics API:', error);
    
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
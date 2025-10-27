import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for query parameters with date range support
const kpisQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
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
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    const validatedParams = kpisQuerySchema.parse(queryParams);

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

    let kpiData;
    let dateRange: { startDate?: string; endDate?: string; month?: string } = {};

    if (validatedParams.startDate && validatedParams.endDate) {
      // Custom date range KPIs - calculate manually
      const startDate = new Date(validatedParams.startDate);
      const endDate = new Date(validatedParams.endDate);
      
      // Calculate period length for comparison period
      const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const comparisonStartDate = new Date(startDate.getTime() - (periodLength * 24 * 60 * 60 * 1000));
      const comparisonEndDate = new Date(startDate.getTime() - (24 * 60 * 60 * 1000));

      // Get current period metrics
      const { data: currentPeriod, error: currentError } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('organization_id', validatedParams.organizationId)
        .in('type', ['income', 'expense'])
        .gte('occurred_at', validatedParams.startDate)
        .lte('occurred_at', validatedParams.endDate);

      if (currentError) {
        console.error('Error fetching current period data:', currentError);
        return NextResponse.json({ error: 'Failed to fetch current period data' }, { status: 500 });
      }

      // Get comparison period metrics
      const { data: comparisonPeriod, error: comparisonError } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('organization_id', validatedParams.organizationId)
        .in('type', ['income', 'expense'])
        .gte('occurred_at', comparisonStartDate.toISOString().split('T')[0])
        .lte('occurred_at', comparisonEndDate.toISOString().split('T')[0]);

      if (comparisonError) {
        console.error('Error fetching comparison period data:', comparisonError);
        return NextResponse.json({ error: 'Failed to fetch comparison period data' }, { status: 500 });
      }

      // Calculate metrics
      const currentIncome = currentPeriod?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const currentExpense = currentPeriod?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const currentBalance = currentIncome - currentExpense;

      const previousIncome = comparisonPeriod?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const previousExpense = comparisonPeriod?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const previousBalance = previousIncome - previousExpense;

      // Calculate percentage changes
      const incomeChangePct = previousIncome > 0 ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100 * 100) / 100 : (currentIncome > 0 ? 100 : 0);
      const expenseChangePct = previousExpense > 0 ? Math.round(((currentExpense - previousExpense) / previousExpense) * 100 * 100) / 100 : (currentExpense > 0 ? 100 : 0);
      const balanceChangePct = previousBalance !== 0 ? Math.round(((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100 * 100) / 100 : (currentBalance > 0 ? 100 : (currentBalance < 0 ? -100 : 0));

      kpiData = {
        current_month_income: currentIncome,
        current_month_expense: currentExpense,
        current_month_balance: currentBalance,
        previous_month_income: previousIncome,
        previous_month_expense: previousExpense,
        previous_month_balance: previousBalance,
        income_change_pct: incomeChangePct,
        expense_change_pct: expenseChangePct,
        balance_change_pct: balanceChangePct,
      };

      dateRange = { 
        startDate: validatedParams.startDate, 
        endDate: validatedParams.endDate 
      };
    } else {
      // Use current month KPIs - calculate manually since function doesn't exist
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().split('T')[0];
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).toISOString().split('T')[0];

      // Get current month metrics
      const { data: currentMonth, error: currentError } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('organization_id', validatedParams.organizationId)
        .in('type', ['income', 'expense'])
        .gte('occurred_at', currentMonthStart)
        .lte('occurred_at', currentMonthEnd);

      if (currentError) {
        console.error('Error fetching current month data:', currentError);
        return NextResponse.json({ error: 'Failed to fetch current month data' }, { status: 500 });
      }

      // Get previous month metrics
      const { data: previousMonth, error: previousError } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('organization_id', validatedParams.organizationId)
        .in('type', ['income', 'expense'])
        .gte('occurred_at', previousMonthStart)
        .lte('occurred_at', previousMonthEnd);

      if (previousError) {
        console.error('Error fetching previous month data:', previousError);
        return NextResponse.json({ error: 'Failed to fetch previous month data' }, { status: 500 });
      }

      // Calculate metrics
      const currentIncome = currentMonth?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const currentExpense = currentMonth?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const currentBalance = currentIncome - currentExpense;

      const previousIncome = previousMonth?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const previousExpense = previousMonth?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const previousBalance = previousIncome - previousExpense;

      // Calculate percentage changes
      const incomeChangePct = previousIncome > 0 ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100 * 100) / 100 : (currentIncome > 0 ? 100 : 0);
      const expenseChangePct = previousExpense > 0 ? Math.round(((currentExpense - previousExpense) / previousExpense) * 100 * 100) / 100 : (currentExpense > 0 ? 100 : 0);
      const balanceChangePct = previousBalance !== 0 ? Math.round(((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100 * 100) / 100 : (currentBalance > 0 ? 100 : (currentBalance < 0 ? -100 : 0));

      kpiData = {
        current_month_income: currentIncome,
        current_month_expense: currentExpense,
        current_month_balance: currentBalance,
        previous_month_income: previousIncome,
        previous_month_expense: previousExpense,
        previous_month_balance: previousBalance,
        income_change_pct: incomeChangePct,
        expense_change_pct: expenseChangePct,
        balance_change_pct: balanceChangePct,
      };

      dateRange = { month: currentDate.toISOString().slice(0, 7) };
    }

    const response = NextResponse.json({
      ...kpiData,
      currency: 'DOP', // Default currency for MiPymes
      lastUpdated: new Date().toISOString(),
      ...dateRange,
    });

    // Add cache headers for optimization (2 minutes cache for KPIs)
    const cacheKey = validatedParams.startDate && validatedParams.endDate 
      ? `${validatedParams.organizationId}-${validatedParams.startDate}-${validatedParams.endDate}`
      : `${validatedParams.organizationId}-${dateRange.month}`;
    
    response.headers.set('Cache-Control', 'public, max-age=120, s-maxage=120');
    response.headers.set('ETag', `"kpis-${cacheKey}"`);
    
    return response;

  } catch (error) {
    console.error('Error in KPIs API:', error);
    
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
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for query parameters with date range support
const monthlyQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  months: z.string().nullable().optional().transform(val => val ? parseInt(val) : 12),
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
      months: searchParams.get('months'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    const validatedParams = monthlyQuerySchema.parse(queryParams);

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

    // Determine date range
    let startDate: string;
    let endDate: string;

    if (validatedParams.startDate && validatedParams.endDate) {
      // Use custom date range
      startDate = new Date(validatedParams.startDate).toISOString().split('T')[0];
      endDate = new Date(validatedParams.endDate).toISOString().split('T')[0];
    } else {
      // Use months parameter (default behavior)
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - (validatedParams.months - 1));
      startDate = new Date(monthsAgo.getFullYear(), monthsAgo.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
    }

    // Get monthly balance data from the view with date range filter
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('v_monthly_balance')
      .select('*')
      .eq('organization_id', validatedParams.organizationId)
      .gte('month', startDate)
      .lte('month', endDate)
      .order('month', { ascending: true });

    if (monthlyError) {
      console.error('Error fetching monthly data:', monthlyError);
      return NextResponse.json({ error: 'Failed to fetch monthly data' }, { status: 500 });
    }

    const response = NextResponse.json({
      data: monthlyData || [],
      months: validatedParams.months,
      dateRange: {
        startDate,
        endDate,
      },
    });

    // Add cache headers for optimization (5 minutes cache)
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    response.headers.set('ETag', `"monthly-${validatedParams.organizationId}-${startDate}-${endDate}"`);
    
    return response;

  } catch (error) {
    console.error('Error in monthly metrics API:', error);
    
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
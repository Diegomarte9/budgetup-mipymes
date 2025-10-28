import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const auditLogsQuerySchema = z.object({
  organizationId: z.string().uuid(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  action: z.enum(['create', 'update', 'delete', 'login', 'logout', 'invite_sent', 'role_changed']).optional(),
  tableName: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = auditLogsQuerySchema.safeParse(queryParams);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedParams.error.issues },
        { status: 400 }
      );
    }

    const { 
      organizationId, 
      page, 
      limit, 
      action, 
      tableName, 
      userId, 
      startDate, 
      endDate 
    } = validatedParams.data;

    // Check if user is member of the organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        created_at,
        user_id,
        users:user_id (
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    
    if (tableName) {
      query = query.eq('table_name', tableName);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: auditLogs, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Apply same filters for count
    if (action) countQuery = countQuery.eq('action', action);
    if (tableName) countQuery = countQuery.eq('table_name', tableName);
    if (userId) countQuery = countQuery.eq('user_id', userId);
    if (startDate) countQuery = countQuery.gte('created_at', startDate);
    if (endDate) countQuery = countQuery.lte('created_at', endDate);

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting audit logs:', countError);
      return NextResponse.json({ error: 'Failed to count audit logs' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: auditLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Unexpected error in audit logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
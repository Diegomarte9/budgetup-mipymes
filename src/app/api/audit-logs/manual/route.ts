import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const manualAuditSchema = z.object({
  organizationId: z.string().uuid(),
  action: z.enum(['login', 'logout', 'invite_sent', 'role_changed']),
  tableName: z.string(),
  recordId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = manualAuditSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.issues },
        { status: 400 }
      );
    }

    const { organizationId, action, tableName, recordId, metadata } = validatedData.data;

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

    // Create audit log entry
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        action,
        table_name: tableName,
        record_id: recordId || null,
        old_values: null,
        new_values: metadata || null,
      });

    if (error) {
      console.error('Error creating manual audit log:', error);
      return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error in manual audit logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
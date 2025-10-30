import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export interface AuditLogData {
  organizationId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'invite_sent' | 'role_changed';
  tableName: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an audit log entry for user actions
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Attempted to create audit log without authenticated user');
      return;
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        organization_id: data.organizationId,
        user_id: user.id,
        action: data.action,
        table_name: data.tableName,
        record_id: data.recordId || null,
        old_values: data.oldValues || null,
        new_values: data.newValues || null,
      });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

/**
 * Middleware helper to extract request information for audit logging
 */
export function extractRequestInfo(request: NextRequest) {
  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || 'Unknown',
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'Unknown',
  };
}

/**
 * Creates audit log for API actions
 */
export async function auditApiAction(
  organizationId: string,
  action: AuditLogData['action'],
  tableName: string,
  recordId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
) {
  await createAuditLog({
    organizationId,
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
  });
}
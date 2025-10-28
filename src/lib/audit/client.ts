/**
 * Client-side audit logging utilities
 * Used for logging user actions that are not automatically captured by database triggers
 */

export interface ManualAuditData {
  organizationId: string;
  action: 'login' | 'logout' | 'invite_sent' | 'role_changed';
  tableName: string;
  recordId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a manual audit log entry via API
 */
export async function createManualAuditLog(data: ManualAuditData): Promise<void> {
  try {
    const response = await fetch('/api/audit-logs/manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create manual audit log:', error);
    }
  } catch (error) {
    console.error('Error creating manual audit log:', error);
  }
}

/**
 * Logs user login action
 */
export async function logUserLogin(organizationId: string): Promise<void> {
  await createManualAuditLog({
    organizationId,
    action: 'login',
    tableName: 'auth_sessions',
    metadata: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    },
  });
}

/**
 * Logs user logout action
 */
export async function logUserLogout(organizationId: string): Promise<void> {
  await createManualAuditLog({
    organizationId,
    action: 'logout',
    tableName: 'auth_sessions',
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Logs invitation sent action
 */
export async function logInvitationSent(
  organizationId: string,
  invitationId: string,
  invitedEmail: string,
  role: string
): Promise<void> {
  await createManualAuditLog({
    organizationId,
    action: 'invite_sent',
    tableName: 'invitations',
    recordId: invitationId,
    metadata: {
      invitedEmail,
      role,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Logs role change action
 */
export async function logRoleChanged(
  organizationId: string,
  membershipId: string,
  oldRole: string,
  newRole: string,
  targetUserEmail: string
): Promise<void> {
  await createManualAuditLog({
    organizationId,
    action: 'role_changed',
    tableName: 'memberships',
    recordId: membershipId,
    metadata: {
      oldRole,
      newRole,
      targetUserEmail,
      timestamp: new Date().toISOString(),
    },
  });
}
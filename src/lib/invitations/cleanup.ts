import { createClient } from '@/lib/supabase/server';

/**
 * Clean up expired invitations that are older than the specified number of days
 * @param daysOld - Number of days after expiration to delete invitations (default: 30)
 * @returns Number of invitations deleted
 */
export async function cleanupExpiredInvitations(daysOld: number = 30): Promise<number> {
  try {
    const supabase = await createClient();
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Delete expired invitations that are older than the cutoff date
    const { data, error } = await supabase
      .from('invitations')
      .delete()
      .is('used_at', null) // Only delete unused invitations
      .lt('expires_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      console.error('Error cleaning up expired invitations:', error);
      throw error;
    }
    
    const deletedCount = data?.length || 0;
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired invitations older than ${daysOld} days`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup expired invitations:', error);
    throw error;
  }
}

/**
 * Get statistics about invitations for monitoring
 */
export async function getInvitationStats() {
  try {
    const supabase = await createClient();
    
    const now = new Date().toISOString();
    
    // Get counts for different invitation states
    const { data, error } = await supabase
      .from('invitations')
      .select('used_at, expires_at');
    
    if (error) {
      console.error('Error getting invitation stats:', error);
      throw error;
    }
    
    const total = data?.length || 0;
    const accepted = data?.filter(inv => inv.used_at).length || 0;
    const pending = data?.filter(inv => !inv.used_at && inv.expires_at > now).length || 0;
    const expired = data?.filter(inv => !inv.used_at && inv.expires_at <= now).length || 0;
    
    const stats = {
      total,
      accepted,
      pending,
      expired,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0
    };
    
    return stats;
  } catch (error) {
    console.error('Failed to get invitation stats:', error);
    throw error;
  }
}

/**
 * Check if an invitation code is valid and not expired
 */
export async function validateInvitationCode(code: string): Promise<{
  valid: boolean;
  invitation?: any;
  reason?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        organization_id,
        email,
        role,
        code,
        expires_at,
        used_at,
        organizations (
          id,
          name,
          currency
        )
      `)
      .eq('code', code)
      .single();
    
    if (error || !invitation) {
      return { valid: false, reason: 'Código de invitación no encontrado' };
    }
    
    if (invitation.used_at) {
      return { valid: false, reason: 'Esta invitación ya ha sido utilizada' };
    }
    
    if (new Date(invitation.expires_at) < new Date()) {
      return { valid: false, reason: 'Esta invitación ha expirado' };
    }
    
    return { valid: true, invitation };
  } catch (error) {
    console.error('Error validating invitation code:', error);
    return { valid: false, reason: 'Error al validar la invitación' };
  }
}
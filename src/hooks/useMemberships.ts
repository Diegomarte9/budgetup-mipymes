import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Membership } from '@/lib/validations/invitations';

interface MembershipWithUser extends Membership {
  users: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface UseMemebershipsOptions {
  organizationId?: string;
}

export function useMemberships({ organizationId }: UseMemebershipsOptions = {}) {
  const [memberships, setMemberships] = useState<MembershipWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch memberships for organization
  const fetchMemberships = async (orgId?: string) => {
    if (!orgId && !organizationId) return;

    try {
      setLoading(true);
      const targetOrgId = orgId || organizationId;

      const response = await fetch(`/api/memberships?organizationId=${targetOrgId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener los miembros');
      }

      setMemberships(result.memberships);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Update membership role
  const updateMembershipRole = async (membershipId: string, role: 'admin' | 'member') => {
    try {
      setLoading(true);

      const response = await fetch('/api/memberships', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ membershipId, role }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el rol');
      }

      // Update membership in list
      setMemberships(prev =>
        prev.map(membership =>
          membership.id === membershipId
            ? { ...membership, role }
            : membership
        )
      );
      toast.success(result.message);

      return { data: result.membership, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Remove member
  const removeMember = async (membershipId: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/memberships/${membershipId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al remover el miembro');
      }

      // Remove membership from list
      setMemberships(prev => prev.filter(membership => membership.id !== membershipId));
      toast.success(result.message);

      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch memberships when organizationId changes
  useEffect(() => {
    if (organizationId) {
      fetchMemberships(organizationId);
    }
  }, [organizationId]);

  return {
    memberships,
    loading,
    initialized,
    fetchMemberships,
    updateMembershipRole,
    removeMember,
  };
}
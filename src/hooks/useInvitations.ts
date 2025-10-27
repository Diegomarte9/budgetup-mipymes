import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type {
  Invitation,
  CreateInvitationFormData,
  AcceptInvitationFormData,
  UpdateInvitationFormData,
} from '@/lib/validations/invitations';

interface UseInvitationsOptions {
  organizationId?: string;
}

export function useInvitations({ organizationId }: UseInvitationsOptions = {}) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch invitations for organization
  const fetchInvitations = async (orgId?: string) => {
    if (!orgId && !organizationId) return;

    try {
      setLoading(true);
      const targetOrgId = orgId || organizationId;

      const response = await fetch(`/api/invitations?organizationId=${targetOrgId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener las invitaciones');
      }

      setInvitations(result.invitations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Create invitation
  const createInvitation = async (data: CreateInvitationFormData) => {
    try {
      setLoading(true);

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la invitación');
      }

      // Add new invitation to list
      setInvitations(prev => [result.invitation, ...prev]);
      toast.success(result.message);

      return { data: result.invitation, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Accept invitation
  const acceptInvitation = async (data: AcceptInvitationFormData) => {
    try {
      setLoading(true);

      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al aceptar la invitación');
      }

      toast.success(result.message);
      return { data: result, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update invitation
  const updateInvitation = async (id: string, data: UpdateInvitationFormData) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/invitations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar la invitación');
      }

      // Update invitation in list
      setInvitations(prev =>
        prev.map(inv => (inv.id === id ? result.invitation : inv))
      );
      toast.success(result.message);

      return { data: result.invitation, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete invitation
  const deleteInvitation = async (id: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar la invitación');
      }

      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv.id !== id));
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

  // Auto-fetch invitations when organizationId changes
  useEffect(() => {
    if (organizationId) {
      fetchInvitations(organizationId);
    }
  }, [organizationId]);

  return {
    invitations,
    loading,
    initialized,
    fetchInvitations,
    createInvitation,
    acceptInvitation,
    updateInvitation,
    deleteInvitation,
  };
}
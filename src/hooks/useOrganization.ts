import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type {
  CreateOrganizationFormData,
  JoinOrganizationFormData,
} from '@/lib/validations/onboarding';

interface Organization {
  id: string;
  name: string;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateOrganizationResponse {
  organization: Organization;
  message: string;
}

interface JoinOrganizationResponse {
  organization: Organization;
  role: string;
  message: string;
}

interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  organization: Organization;
}

// API functions
const fetchUserMemberships = async (): Promise<Membership[]> => {
  const response = await fetch('/api/memberships');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener las organizaciones');
  }
  
  const data = await response.json();
  return data.memberships;
};

export function useOrganization() {
  const [loading, setLoading] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Get stored organization from localStorage
  const getStoredOrgId = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('currentOrganizationId');
  };

  // Store organization in localStorage
  const storeOrgId = (orgId: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('currentOrganizationId', orgId);
  };

  // Fetch user's organizations
  const { 
    data: memberships, 
    isLoading: isLoadingMemberships,
    error: membershipsError 
  } = useQuery({
    queryKey: ['memberships', user?.id],
    queryFn: fetchUserMemberships,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const organizations = memberships?.map(m => m.organization) || [];

  // Set current organization from URL params, localStorage, or default to first
  useEffect(() => {
    if (organizations.length === 0) return;

    const orgFromUrl = searchParams.get('org');
    const storedOrgId = getStoredOrgId();
    
    let targetOrgId: string | null = null;

    // Priority: URL param > localStorage > first organization
    if (orgFromUrl && organizations.some(org => org.id === orgFromUrl)) {
      targetOrgId = orgFromUrl;
    } else if (storedOrgId && organizations.some(org => org.id === storedOrgId)) {
      targetOrgId = storedOrgId;
    } else if (organizations.length > 0) {
      targetOrgId = organizations[0].id;
    }

    if (targetOrgId && targetOrgId !== currentOrgId) {
      setCurrentOrgId(targetOrgId);
      storeOrgId(targetOrgId);
      
      // Update URL without causing navigation if it's different
      const currentUrlOrgId = searchParams.get('org');
      if (currentUrlOrgId !== targetOrgId) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('org', targetOrgId);
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [organizations, searchParams, currentOrgId]);

  const currentOrganization = organizations.find(org => org.id === currentOrgId);
  const currentMembership = memberships?.find(m => m.organization_id === currentOrgId);

  const createOrganization = async (data: CreateOrganizationFormData) => {
    try {
      setLoading(true);

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la organización');
      }

      const { organization, message } = result as CreateOrganizationResponse;
      
      toast.success(message);
      // Redirect to dashboard with the new organization selected
      router.push(`/dashboard?org=${organization.id}`);
      
      return { data: organization, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const joinOrganization = async (data: JoinOrganizationFormData) => {
    try {
      setLoading(true);

      const response = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al unirse a la organización');
      }

      const { organization, role, message } = result as JoinOrganizationResponse;
      
      toast.success(message);
      // Redirect to dashboard with the joined organization selected
      router.push(`/dashboard?org=${organization.id}`);
      
      return { data: { organization, role }, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (organizationId: string) => {
    setCurrentOrgId(organizationId);
    storeOrgId(organizationId);
    
    // Update URL with the new organization without full navigation
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('org', organizationId);
    
    // Use replaceState to avoid navigation, just update the URL
    window.history.replaceState({}, '', newUrl.toString());
    
    // Force a re-render by updating the state
    // The URL change will be picked up by other components that depend on searchParams
  };

  return {
    // Organization management
    loading,
    createOrganization,
    joinOrganization,
    
    // Current organization state
    currentOrganization,
    currentMembership,
    organizations,
    isLoading: isLoadingMemberships,
    error: membershipsError,
    
    // Organization switching
    switchOrganization,
  };
}
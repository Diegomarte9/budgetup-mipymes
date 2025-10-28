'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MemberManagement } from '@/components/forms/MemberManagement';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoadingSkeleton } from '@/components/ui/skeleton-loaders';
import { Loader2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
}

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Miembros' }
  ];

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user) return;

      try {
        const supabase = createClient();
        const { data: memberships } = await supabase
          .from('memberships')
          .select(`
            role,
            organizations (
              id,
              name
            )
          `)
          .eq('user_id', user.id);

        const orgs = memberships?.map(m => ({
          id: (m.organizations as any).id,
          name: (m.organizations as any).name,
          role: m.role as 'owner' | 'admin' | 'member',
        })) || [];

        setOrganizations(orgs);

        // Set current organization from URL param or default to first
        const orgId = searchParams.get('org');
        const selectedOrg = orgId 
          ? orgs.find(o => o.id === orgId) 
          : orgs[0];
        
        setCurrentOrg(selectedOrg || null);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [user, searchParams]);

  if (authLoading || loading) {
    return <PageLoadingSkeleton />;
  }

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Gestión de Miembros"
          description="Administra los miembros de tu organización"
          breadcrumbs={breadcrumbs}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>No hay organizaciones disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No tienes acceso a ninguna organización o no se pudo cargar la información.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManageUsers = ['owner', 'admin'].includes(currentOrg.role);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestión de Miembros"
        description={`Organización: ${currentOrg.name} • Tu rol: ${
          currentOrg.role === 'owner' ? 'Propietario' :
          currentOrg.role === 'admin' ? 'Administrador' : 'Miembro'
        }`}
        breadcrumbs={breadcrumbs}
      />

      {!canManageUsers && (
        <Card className="dark-mode-transition">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-responsive-base font-semibold mb-2">Acceso Limitado</h3>
              <p className="text-muted-foreground text-responsive-sm">
                Solo los propietarios y administradores pueden gestionar miembros de la organización.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageUsers && (
        <MemberManagement
          organizationId={currentOrg.id}
          currentUserRole={currentOrg.role}
        />
      )}
    </div>
  );
}
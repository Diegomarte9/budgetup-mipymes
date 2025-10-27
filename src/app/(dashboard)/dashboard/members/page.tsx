'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MemberManagement } from '@/components/forms/MemberManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Gestión de Miembros</h1>
        </div>
        
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <div>
            <h1 className="text-3xl font-bold">Gestión de Miembros</h1>
            <p className="text-muted-foreground">
              Organización: {currentOrg.name} • Tu rol: {
                currentOrg.role === 'owner' ? 'Propietario' :
                currentOrg.role === 'admin' ? 'Administrador' : 'Miembro'
              }
            </p>
          </div>
        </div>
      </div>

      {!canManageUsers && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso Limitado</h3>
              <p className="text-muted-foreground">
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
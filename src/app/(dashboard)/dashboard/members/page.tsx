'use client';

import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { MemberManagement } from '@/components/forms/MemberManagement';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoadingSkeleton } from '@/components/ui/skeleton-loaders';
import { Users } from 'lucide-react';

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, currentMembership, isLoading: orgLoading, error: orgError } = useOrganization();

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Miembros' }
  ];

  if (authLoading || orgLoading) {
    return <PageLoadingSkeleton />;
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Gestión de Miembros"
          description="Administra los miembros de tu organización"
          breadcrumbs={breadcrumbs}
        />
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Error al cargar la organización</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {orgError instanceof Error ? orgError.message : 'Error desconocido'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentOrganization || !currentMembership) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Gestión de Miembros"
          description="Administra los miembros de tu organización"
          breadcrumbs={breadcrumbs}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>No hay organización seleccionada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Selecciona una organización para gestionar sus miembros.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManageUsers = ['owner', 'admin'].includes(currentMembership.role);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestión de Miembros"
        description={`Organización: ${currentOrganization.name} • Tu rol: ${
          currentMembership.role === 'owner' ? 'Propietario' :
          currentMembership.role === 'admin' ? 'Administrador' : 'Miembro'
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
          organizationId={currentOrganization.id}
          currentUserRole={currentMembership.role}
        />
      )}
    </div>
  );
}
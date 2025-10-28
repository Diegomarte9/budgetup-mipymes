'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { AdvancedMemberManagement } from '@/components/forms/AdvancedMemberManagement';
import { InviteUserForm } from '@/components/forms/InviteUserForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingSkeleton } from '@/components/ui/skeleton-loaders';
import { Users, Shield, UserPlus } from 'lucide-react';
import { validateUserRoleClient } from '@/lib/auth/client-roles';
import type { Invitation } from '@/lib/validations/invitations';

export default function SettingsMembersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, currentMembership, isLoading: orgLoading, error: orgError } = useOrganization();
  const [permissionValidated, setPermissionValidated] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Configuración', href: '/settings' },
    { label: 'Miembros' }
  ];

  useEffect(() => {
    const validatePermissions = async () => {
      if (currentOrganization && user && currentMembership) {
        // Owners automatically have permission, only validate for admins
        if (currentMembership.role === 'owner') {
          setPermissionValidated(true);
        } else if (currentMembership.role === 'admin') {
          const validation = await validateUserRoleClient(user.id, currentOrganization.id, 'admin');
          setPermissionValidated(validation.hasPermission);
        } else {
          setPermissionValidated(false);
        }
      }
    };

    validatePermissions();
  }, [user, currentOrganization, currentMembership]);

  const handleInviteSent = (invitation: Invitation) => {
    setShowInviteDialog(false);
    // Toast is already shown by InviteUserForm
  };

  if (authLoading || orgLoading) {
    return <PageLoadingSkeleton />;
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Gestión de Miembros"
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

  // Owners and admins can manage users, members cannot access this page at all
  const canManageUsers = ['owner', 'admin'].includes(currentMembership.role);
  
  // If user is just a member, redirect them away from this page
  if (currentMembership.role === 'member') {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Acceso Denegado"
          breadcrumbs={breadcrumbs}
        />
        
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
              <p className="text-muted-foreground mb-4">
                No tienes permisos para acceder a la gestión de miembros. Solo los propietarios y administradores pueden gestionar miembros de la organización.
              </p>
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestión Avanzada de Miembros"
        description={`Organización: ${currentOrganization.name} • Tu rol: ${
          currentMembership.role === 'owner' ? 'Propietario' :
          currentMembership.role === 'admin' ? 'Administrador' : 'Miembro'
        }`}
        breadcrumbs={breadcrumbs}
      >
        {canManageUsers && (
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invitar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <InviteUserForm
                organizationId={currentOrganization.id}
                onInviteSent={handleInviteSent}
                onCancel={() => setShowInviteDialog(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Show loading state while validating permissions for admins */}
      {currentMembership.role === 'admin' && !permissionValidated ? (
        <Card className="dark-mode-transition">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Validando permisos...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AdvancedMemberManagement
          organizationId={currentOrganization.id}
          currentUserRole={currentMembership.role}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}
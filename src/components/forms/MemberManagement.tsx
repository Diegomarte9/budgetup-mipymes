'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InviteUserForm } from './InviteUserForm';
import { useInvitations } from '@/hooks/useInvitations';
import { useMemberships } from '@/hooks/useMemberships';
import type { Invitation } from '@/lib/validations/invitations';

interface MemberManagementProps {
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
}

export function MemberManagement({
  organizationId,
  currentUserRole,
}: MemberManagementProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  
  const {
    invitations,
    loading: invitationsLoading,
    deleteInvitation,
  } = useInvitations({ organizationId });

  const {
    memberships,
    loading: membershipsLoading,
    updateMembershipRole,
    removeMember,
  } = useMemberships({ organizationId });

  const canManageUsers = ['owner', 'admin'].includes(currentUserRole);

  const handleInviteSent = (invitation: Invitation) => {
    setShowInviteDialog(false);
  };

  const handleRoleChange = async (membershipId: string, newRole: 'admin' | 'member') => {
    await updateMembershipRole(membershipId, newRole);
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (confirm('¿Estás seguro de que quieres remover este miembro?')) {
      await removeMember(membershipId);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (confirm('¿Estás seguro de que quieres cancelar esta invitación?')) {
      await deleteInvitation(invitationId);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.used_at) {
      return { text: 'Aceptada', variant: 'default' as const };
    }
    
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return { text: 'Expirada', variant: 'destructive' as const };
    }
    
    return { text: 'Pendiente', variant: 'secondary' as const };
  };

  if (membershipsLoading || invitationsLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with invite button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        {canManageUsers && (
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>Invitar Usuario</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <InviteUserForm
                organizationId={organizationId}
                onInviteSent={handleInviteSent}
                onCancel={() => setShowInviteDialog(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros Actuales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium">{membership.users.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Miembro desde {new Date(membership.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(membership.role)}>
                    {membership.role === 'owner' ? 'Propietario' :
                     membership.role === 'admin' ? 'Administrador' : 'Miembro'}
                  </Badge>
                </div>

                {canManageUsers && membership.role !== 'owner' && (
                  <div className="flex items-center space-x-2">
                    <Select
                      value={membership.role}
                      onValueChange={(value: 'admin' | 'member') =>
                        handleRoleChange(membership.id, value)
                      }
                      disabled={currentUserRole !== 'owner' && membership.role === 'admin'}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Miembro</SelectItem>
                        {currentUserRole === 'owner' && (
                          <SelectItem value="admin">Administrador</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(membership.id)}
                      disabled={
                        currentUserRole !== 'owner' && membership.role === 'admin'
                      }
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {memberships.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No hay miembros en esta organización.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => {
                const status = getInvitationStatus(invitation);
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invitado el {new Date(invitation.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Código: <code className="bg-muted px-1 rounded">{invitation.code}</code>
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                        </Badge>
                        <Badge variant={status.variant}>
                          {status.text}
                        </Badge>
                      </div>
                    </div>

                    {!invitation.used_at && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                );
              })}

              {invitations.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No hay invitaciones pendientes.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
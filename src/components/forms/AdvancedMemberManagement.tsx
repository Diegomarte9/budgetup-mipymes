'use client';

import { useState, useEffect } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvitations } from '@/hooks/useInvitations';
import { useMemberships } from '@/hooks/useMemberships';
import { usePermissions, useCanManageMembers } from '@/hooks/usePermissions';
import type { Invitation } from '@/lib/validations/invitations';
import { UserMinus, Edit, AlertTriangle, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface AdvancedMemberManagementProps {
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  userId: string;
}

interface ConfirmationDialog {
  isOpen: boolean;
  type: 'role_change' | 'remove_member' | 'cancel_invitation';
  title: string;
  description: string;
  action: () => void;
  memberName?: string;
  newRole?: string;
}

export function AdvancedMemberManagement({
  organizationId,
  currentUserRole,
  userId,
}: AdvancedMemberManagementProps) {

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog>({
    isOpen: false,
    type: 'role_change',
    title: '',
    description: '',
    action: () => {},
  });
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

  // Real-time permission validation
  const { permissions: memberPermissions, loading: permissionsLoading } = useCanManageMembers(organizationId);
  const { permissions: generalPermissions } = usePermissions({
    organizationId,
    actions: ['manage_members', 'manage_admins', 'invite_users', 'remove_members', 'change_roles'],
  });

  const canManageUsers = memberPermissions.manage_members;



  const handleRoleChange = (membershipId: string, newRole: 'admin' | 'member', memberName: string) => {
    const currentMember = memberships.find(m => m.id === membershipId);
    if (!currentMember) return;

    const roleNames = {
      owner: 'Propietario',
      admin: 'Administrador',
      member: 'Miembro'
    };

    setConfirmDialog({
      isOpen: true,
      type: 'role_change',
      title: 'Confirmar cambio de rol',
      description: `¿Estás seguro de que quieres cambiar el rol de ${memberName} de ${roleNames[currentMember.role as keyof typeof roleNames]} a ${roleNames[newRole]}?`,
      memberName,
      newRole,
      action: async () => {
        await updateMembershipRole(membershipId, newRole);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleRemoveMember = (membershipId: string, memberName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'remove_member',
      title: 'Confirmar eliminación de miembro',
      description: `¿Estás seguro de que quieres remover a ${memberName} de la organización? Esta acción no se puede deshacer.`,
      memberName,
      action: async () => {
        await removeMember(membershipId);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleCancelInvitation = (invitationId: string, email: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'cancel_invitation',
      title: 'Cancelar invitación',
      description: `¿Estás seguro de que quieres cancelar la invitación para ${email}?`,
      action: async () => {
        await deleteInvitation(invitationId);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
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

  // Filter memberships based on search and role filter
  const filteredMemberships = memberships.filter(membership => {
    const matchesSearch = membership.users.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || membership.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filter invitations based on search
  const filteredInvitations = invitations.filter(invitation =>
    invitation.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (membershipsLoading || invitationsLoading || permissionsLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar por email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Label htmlFor="role-filter">Filtrar por rol</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="owner">Propietarios</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="member">Miembros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros Actuales ({filteredMemberships.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMemberships.map((membership) => {
              const isCurrentUser = membership.user_id === userId;
              const canManageThisMember = membership.role === 'admin' 
                ? generalPermissions.manage_admins 
                : generalPermissions.manage_members;
              
              return (
                <div
                  key={membership.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium">
                        {membership.users.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {membership.users.email}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            Tú
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Miembro desde {new Date(membership.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <Badge variant={getRoleBadgeVariant(membership.role)}>
                      {membership.role === 'owner' ? 'Propietario' :
                       membership.role === 'admin' ? 'Administrador' : 'Miembro'}
                    </Badge>
                  </div>

                  {canManageUsers && !isCurrentUser && membership.role !== 'owner' && canManageThisMember && (
                    <div className="flex items-center space-x-2">
                      <Select
                        value={membership.role}
                        onValueChange={(value: 'admin' | 'member') =>
                          handleRoleChange(membership.id, value, membership.users.email)
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
                        onClick={() => handleRemoveMember(membership.id, membership.users.email)}
                        disabled={currentUserRole !== 'owner' && membership.role === 'admin'}
                        className="flex items-center gap-1"
                      >
                        <UserMinus className="h-3 w-3" />
                        Remover
                      </Button>
                    </div>
                  )}

                  {!canManageThisMember && !isCurrentUser && (
                    <Badge variant="outline" className="text-xs">
                      Sin permisos
                    </Badge>
                  )}
                </div>
              );
            })}

            {filteredMemberships.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                {searchTerm || roleFilter !== 'all' 
                  ? 'No se encontraron miembros que coincidan con los filtros.'
                  : 'No hay miembros en esta organización.'
                }
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones Pendientes ({filteredInvitations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredInvitations.map((invitation) => {
                const status = getInvitationStatus(invitation);
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                        <span className="text-sm font-medium">
                          {invitation.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invitado el {new Date(invitation.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Código: <code className="bg-muted px-1 rounded text-xs">{invitation.code}</code>
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
                        onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                        className="flex items-center gap-1"
                      >
                        <UserMinus className="h-3 w-3" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                );
              })}

              {filteredInvitations.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  {searchTerm 
                    ? 'No se encontraron invitaciones que coincidan con la búsqueda.'
                    : 'No hay invitaciones pendientes.'
                  }
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => 
        setConfirmDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.action}
              className={confirmDialog.type === 'remove_member' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog.type === 'remove_member' ? 'Remover' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
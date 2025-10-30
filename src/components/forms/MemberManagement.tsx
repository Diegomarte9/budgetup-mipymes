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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RefreshCw } from 'lucide-react';
import { InviteUserForm } from './InviteUserForm';
import { PendingInvitations } from './PendingInvitations';
import { useMemberships } from '@/hooks/useMemberships';
import { Skeleton } from '@/components/ui/skeleton';
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
    memberships,
    loading: membershipsLoading,
    updateMembershipRole,
    removeMember,
    fetchMemberships,
  } = useMemberships({ organizationId });

  const canManageUsers = ['owner', 'admin'].includes(currentUserRole);

  // Auto-refresh memberships every 30 seconds to check for new members
  useEffect(() => {
    if (!organizationId) return;
    
    const interval = setInterval(() => {
      fetchMemberships(organizationId);
    }, 30000);

    return () => clearInterval(interval);
  }, [organizationId, fetchMemberships]);

  const handleInviteSent = (invitation: Invitation) => {
    setShowInviteDialog(false);
    // Refresh memberships after sending invitation
    setTimeout(() => {
      fetchMemberships(organizationId);
    }, 1000);
  };

  const handleRoleChange = async (membershipId: string, newRole: 'admin' | 'member') => {
    await updateMembershipRole(membershipId, newRole);
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (confirm('¿Estás seguro de que quieres remover este miembro?')) {
      await removeMember(membershipId);
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

  if (membershipsLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Members card skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invitations skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-5" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <Skeleton className="h-4 w-48 mb-2" />
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-3 w-20" />
                          <span>•</span>
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with invite button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMemberships(organizationId)}
            disabled={membershipsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${membershipsLoading ? 'animate-spin' : ''}`} />
          </Button>
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
        <PendingInvitations organizationId={organizationId} />
      )}
    </div>
  );
}
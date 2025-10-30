'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Trash2, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useInvitations } from '@/hooks/useInvitations';
import { toast } from 'sonner';
import type { Invitation } from '@/lib/validations/invitations';

interface PendingInvitationsProps {
  organizationId: string;
}

export function PendingInvitations({ organizationId }: PendingInvitationsProps) {
  const { invitations, loading, fetchInvitations, deleteInvitation } = useInvitations({ organizationId });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auto-refresh invitations more frequently when there are pending invitations
  useEffect(() => {
    if (!organizationId) return;
    
    // Refresh more frequently if there are pending invitations
    const hasPendingInvitations = invitations.some(inv => !inv.used_at && new Date(inv.expires_at) >= new Date());
    const refreshInterval = hasPendingInvitations ? 10000 : 30000; // 10s if pending, 30s otherwise
    
    const interval = setInterval(() => {
      fetchInvitations(organizationId);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [organizationId, fetchInvitations, invitations]);

  const handleCopyInvitationLink = async (code: string) => {
    const invitationUrl = `${window.location.origin}/auth/invitation?code=${code}`;
    
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success('Enlace de invitación copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      setDeletingId(id);
      const result = await deleteInvitation(id);
      
      if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la invitación';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.used_at) {
      return { status: 'accepted', label: 'Aceptada', color: 'bg-green-100 text-green-800' };
    }
    
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return { status: 'expired', label: 'Expirada', color: 'bg-red-100 text-red-800' };
    }
    
    return { status: 'pending', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' };
  };

  const pendingInvitations = invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) >= new Date());
  const expiredInvitations = invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) < new Date());
  const acceptedInvitations = invitations.filter(inv => inv.used_at);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span>Invitaciones Pendientes</span>
              </div>
            </CardTitle>
            <CardDescription>
              Invitaciones que aún no han sido aceptadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span>Invitaciones Pendientes</span>
              {pendingInvitations.length > 0 && (
                <Badge variant="secondary">{pendingInvitations.length}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInvitations(organizationId)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            Invitaciones que aún no han sido aceptadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay invitaciones pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => {
                const status = getInvitationStatus(invitation);
                return (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span className="capitalize">
                              {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                            </span>
                            <span>•</span>
                            <span>
                              Expira: {format(new Date(invitation.expires_at), 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyInvitationLink(invitation.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === invitation.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar invitación?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará la invitación para <strong>{invitation.email}</strong>. 
                              El enlace de invitación dejará de funcionar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired Invitations */}
      {expiredInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Invitaciones Expiradas</span>
              <Badge variant="destructive">{expiredInvitations.length}</Badge>
            </CardTitle>
            <CardDescription>
              Invitaciones que han expirado y necesitan ser renovadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Las invitaciones expiradas no pueden ser aceptadas. Puedes eliminarlas y crear nuevas invitaciones.
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              {expiredInvitations.map((invitation) => {
                const status = getInvitationStatus(invitation);
                return (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span className="capitalize">
                              {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                            </span>
                            <span>•</span>
                            <span>
                              Expiró: {format(new Date(invitation.expires_at), 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === invitation.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar invitación expirada?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará la invitación expirada para <strong>{invitation.email}</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accepted Invitations */}
      {acceptedInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Invitaciones Aceptadas</span>
              <Badge variant="secondary">{acceptedInvitations.length}</Badge>
            </CardTitle>
            <CardDescription>
              Invitaciones que han sido aceptadas exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {acceptedInvitations.slice(0, 5).map((invitation) => {
                const status = getInvitationStatus(invitation);
                return (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span className="capitalize">
                              {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                            </span>
                            <span>•</span>
                            <span>
                              Aceptada: {format(new Date(invitation.used_at!), 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge className={status.color}>
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
              {acceptedInvitations.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  Y {acceptedInvitations.length - 5} más...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
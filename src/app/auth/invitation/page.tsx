'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInvitations } from '@/hooks/useInvitations';
import { toast } from 'sonner';

interface InvitationDetails {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'member';
  code: string;
  expires_at: string;
  used_at: string | null;
  organizations: {
    id: string;
    name: string;
    currency: string;
  };
}

function InvitationPageContent() {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { acceptInvitation } = useInvitations();
  
  const code = searchParams.get('code');

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!code) {
        setError('Código de invitación no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/invitations/details?code=${code}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al obtener los detalles de la invitación');
        }

        setInvitation(result.invitation);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [code]);

  // Handle invitation acceptance
  const handleAcceptInvitation = async () => {
    if (!code || !user) return;

    try {
      setAccepting(true);
      const result = await acceptInvitation({ code });
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('¡Te has unido exitosamente a la organización!');
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al aceptar la invitación';
      toast.error(errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(`/auth/invitation?code=${code}`)}`;
      router.push(loginUrl);
    }
  }, [user, authLoading, router, code]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando invitación...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Invitación no válida
          </CardTitle>
          <CardDescription className="text-gray-600">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => router.push('/auth/login')} 
            className="w-full"
            variant="outline"
          >
            Ir al inicio de sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Mail className="h-6 w-6 text-gray-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Invitación no encontrada
          </CardTitle>
          <CardDescription className="text-gray-600">
            No se pudo encontrar la invitación solicitada
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Check if invitation is expired
  const isExpired = new Date(invitation.expires_at) < new Date();
  const isUsed = !!invitation.used_at;

  // Check if email matches current user
  const emailMismatch = user?.email?.toLowerCase() !== invitation.email.toLowerCase();

  if (isUsed) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Invitación ya utilizada
          </CardTitle>
          <CardDescription className="text-gray-600">
            Esta invitación ya ha sido aceptada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => router.push('/dashboard')} 
            className="w-full"
          >
            Ir al dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Invitación expirada
          </CardTitle>
          <CardDescription className="text-gray-600">
            Esta invitación expiró el {new Date(invitation.expires_at).toLocaleDateString('es-DO')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Contacta al administrador de <strong>{invitation.organizations.name}</strong> para solicitar una nueva invitación.
          </p>
          <Button 
            onClick={() => router.push('/auth/login')} 
            className="w-full"
            variant="outline"
          >
            Ir al inicio de sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900">
          Invitación a organización
        </CardTitle>
        <CardDescription className="text-gray-600">
          Has sido invitado a unirte a una organización
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Organización:</span>
            <span className="text-sm text-gray-900">{invitation.organizations.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Rol:</span>
            <span className="text-sm text-gray-900 capitalize">
              {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Email:</span>
            <span className="text-sm text-gray-900">{invitation.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Expira:</span>
            <span className="text-sm text-gray-900">
              {new Date(invitation.expires_at).toLocaleDateString('es-DO')}
            </span>
          </div>
        </div>

        {emailMismatch && (
          <Alert>
            <AlertDescription>
              Esta invitación es para <strong>{invitation.email}</strong>, pero estás conectado como <strong>{user?.email}</strong>. 
              Debes iniciar sesión con la cuenta correcta para aceptar esta invitación.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button 
            onClick={handleAcceptInvitation}
            disabled={accepting || emailMismatch}
            className="w-full"
          >
            {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {accepting ? 'Aceptando...' : 'Aceptar invitación'}
          </Button>
          
          <Button 
            onClick={() => router.push('/auth/login')} 
            variant="outline"
            className="w-full"
            disabled={accepting}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }>
        <InvitationPageContent />
      </Suspense>
    </div>
  );
}
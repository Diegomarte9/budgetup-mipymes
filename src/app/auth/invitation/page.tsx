'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInvitations } from '@/hooks/useInvitations';
import { CompleteInvitationForm } from '@/components/forms/CompleteInvitationForm';
import { toast } from 'sonner';

interface InvitationDetails {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'member';
  code: string;
  expires_at: string;
  used_at: string | null;
  created_by: string;
  organizations: {
    id: string;
    name: string;
    currency: string;
  };
  inviter?: {
    email: string;
    name?: string;
  };
}

function InvitationPageContent() {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

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
          throw new Error(
            result.error || 'Error al obtener los detalles de la invitación'
          );
        }

        setInvitation(result.invitation);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido';
        console.error('Error fetching invitation details:', err);
        setError(`${errorMessage} (Código: ${code})`);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [code]);

  // Handle invitation acceptance
  const handleAcceptInvitation = async () => {
    if (!code || !invitation) return;

    try {
      setAccepting(true);

      // If user is authenticated, proceed with acceptance
      if (user) {
        const result = await acceptInvitation({ code });

        if (result.error) {
          throw new Error(result.error);
        }

        toast.success('¡Te has unido exitosamente a la organización!');
        router.push('/dashboard');
        return;
      }

      // User is not authenticated, always show complete registration form
      // This allows both existing and new users to set their password
      setShowCompleteForm(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al aceptar la invitación';
      toast.error(errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  // Handle invitation decline
  const handleDeclineInvitation = async () => {
    try {
      setDeclining(true);
      toast.info('Has declinado la invitación');

      // Redirect based on authentication status
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    } finally {
      setDeclining(false);
    }
  };

  // No automatic redirect - let user choose what to do

  if (authLoading || loading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='flex items-center space-x-2'>
          <Loader2 className='h-6 w-6 animate-spin' />
          <span>Cargando invitación...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className='mx-auto w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
            <XCircle className='h-6 w-6 text-red-600' />
          </div>
          <CardTitle className='text-xl font-semibold text-gray-900'>
            Invitación no válida
          </CardTitle>
          <CardDescription className='text-gray-600'>{error}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Button
            onClick={() => router.push('/auth/login')}
            className='w-full'
            variant='outline'
          >
            Ir al inicio de sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card className='mx-auto w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100'>
            <Mail className='h-6 w-6 text-gray-600' />
          </div>
          <CardTitle className='text-xl font-semibold text-gray-900'>
            Invitación no encontrada
          </CardTitle>
          <CardDescription className='text-gray-600'>
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
  const emailMismatch =
    user?.email?.toLowerCase() !== invitation.email.toLowerCase();

  // Show complete invitation form if user exists but needs to set password
  if (showCompleteForm && invitation) {
    return (
      <CompleteInvitationForm
        email={invitation.email}
        organizationName={invitation.organizations.name}
        role={invitation.role}
        invitationCode={code!}
      />
    );
  }

  if (isUsed) {
    return (
      <Card className='mx-auto w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
            <CheckCircle className='h-6 w-6 text-green-600' />
          </div>
          <CardTitle className='text-xl font-semibold text-gray-900'>
            Invitación ya utilizada
          </CardTitle>
          <CardDescription className='text-gray-600'>
            Esta invitación ya ha sido aceptada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/dashboard')} className='w-full'>
            Ir al dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isExpired) {
    return (
      <Card className='mx-auto w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100'>
            <Clock className='h-6 w-6 text-orange-600' />
          </div>
          <CardTitle className='text-xl font-semibold text-gray-900'>
            Invitación expirada
          </CardTitle>
          <CardDescription className='text-gray-600'>
            Esta invitación expiró el{' '}
            {new Date(invitation.expires_at).toLocaleDateString('es-DO')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className='mb-4 text-sm text-gray-600'>
            Contacta al administrador de{' '}
            <strong>{invitation.organizations.name}</strong> para solicitar una
            nueva invitación.
          </p>
          <Button
            onClick={() => router.push('/auth/login')}
            className='w-full'
            variant='outline'
          >
            Ir al inicio de sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-md border-none bg-transparent shadow-none'>
      <CardHeader className='space-y-1 pb-6'>
        <CardTitle className='text-center text-2xl font-bold text-white'>
          Invitación a Organización
        </CardTitle>
        <CardDescription className='text-center text-slate-300'>
          Has sido invitado a unirte a {invitation.organizations.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-6'>
          {/* Organization Info Card */}
          <div className='space-y-3 rounded-lg border border-gray-600 bg-gray-800/50 p-4'>
            <div className='flex items-center space-x-3'>
              <div className='shrink-0'>
                <Building2 className='h-8 w-8 text-blue-400' />
              </div>
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-white'>
                  {invitation.organizations.name}
                </h3>
                <p className='text-sm text-slate-400'>
                  Te invita como{' '}
                  {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                </p>
              </div>
            </div>

            <div className='space-y-2 border-t border-gray-700 pt-3'>
              <div className='flex justify-between text-sm'>
                <span className='text-slate-400'>Email invitado:</span>
                <span className='text-white'>{invitation.email}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-slate-400'>Válida hasta:</span>
                <span className='text-white'>
                  {new Date(invitation.expires_at).toLocaleDateString('es-DO')}
                </span>
              </div>
            </div>
          </div>

          {/* Current User Status */}
          {user && (
            <div className='rounded-lg border border-green-600/30 bg-green-800/20 p-3'>
              <div className='flex items-center space-x-2'>
                <UserCheck className='h-4 w-4 text-green-400' />
                <span className='text-sm text-green-300'>
                  Conectado como: {user.email}
                </span>
              </div>
            </div>
          )}

          {!user && (
            <div className='rounded-lg border border-blue-600/30 bg-blue-800/20 p-3'>
              <div className='flex items-center space-x-2'>
                <Mail className='h-4 w-4 text-blue-400' />
                <span className='text-sm text-blue-300'>
                  Invitación para: <strong>{invitation.email}</strong>
                </span>
              </div>
              <div className='mt-2 text-xs text-blue-200'>
                Al aceptar, podrás crear tu cuenta o iniciar sesión si ya tienes
                una
              </div>
            </div>
          )}

          {/* Email Mismatch Warning */}
          {user && emailMismatch && (
            <Alert className='border-yellow-600/30 bg-yellow-800/20'>
              <AlertDescription className='text-yellow-300'>
                Esta invitación es para <strong>{invitation.email}</strong>,
                pero estás conectado como <strong>{user.email}</strong>.
                Considera cerrar sesión e iniciar con la cuenta correcta.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className='space-y-3'>
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting || declining}
              className='w-full bg-white text-black hover:bg-gray-100'
            >
              {accepting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {accepting ? 'Aceptando...' : 'Aceptar Invitación'}
            </Button>

            <Button
              onClick={handleDeclineInvitation}
              variant='outline'
              className='w-full border-gray-500 bg-transparent text-slate-300 hover:bg-gray-800/50 hover:text-white'
              disabled={accepting || declining}
            >
              {declining && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {declining ? 'Declinando...' : 'Declinar Invitación'}
            </Button>
          </div>

          {/* Login/Register Links */}
          {!user && (
            <div className='space-y-2 text-center'>
              <div className='text-sm text-slate-400'>
                ¿Ya tienes una cuenta?{' '}
                <button
                  onClick={() =>
                    router.push(
                      `/auth/login?redirect=${encodeURIComponent(`/auth/invitation?code=${code}`)}`
                    )
                  }
                  className='text-red-400 transition-colors hover:text-red-300 hover:underline'
                >
                  Inicia sesión aquí
                </button>
              </div>
              <div className='text-xs text-slate-500'>
                Al aceptar la invitación sin cuenta, podrás registrarte
                automáticamente
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvitationPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center p-8'>
          <Loader2 className='h-6 w-6 animate-spin text-white' />
        </div>
      }
    >
      <InvitationPageContent />
    </Suspense>
  );
}

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, AuthError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  SignUpFormData,
  SignInFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
} from '@/lib/validations/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setAuthState({
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      });
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthState({
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      });

      // Handle auth events
      if (event === 'SIGNED_IN') {
        // Check for pending invitation after sign in
        const pendingInvitation = sessionStorage.getItem('pendingInvitation');
        if (pendingInvitation) {
          try {
            const invitationData = JSON.parse(pendingInvitation);
            // Accept the invitation automatically
            const response = await fetch('/api/invitations/accept', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code: invitationData.code }),
            });

            if (response.ok) {
              sessionStorage.removeItem('pendingInvitation');
              toast.success(`¡Te has unido exitosamente a ${invitationData.organizationName}!`);
            }
          } catch (error) {
            console.error('Error processing pending invitation:', error);
          }
        }
        
        // Let the dashboard page handle onboarding redirection
        router.push('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        // Don't redirect to login if user is on invitation page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/invitation')) {
          router.push('/auth/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  const signUp = async (data: SignUpFormData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/onboarding`,
        },
      });

      // Log the response for debugging (remove in production)
      console.log('SignUp response:', { authData, error });

      // Check for errors first, before showing success message
      if (error) {
        throw error;
      }

      // Enhanced detection for existing users
      if (authData.user) {
        // Method 1: Check if email is already confirmed (strong indicator of existing user)
        if (authData.user.email_confirmed_at) {
          toast.error('Ya existe una cuenta con este email', {
            description: 'Puedes iniciar sesión o usar la opción "¿Olvidaste tu contraseña?" si no recuerdas tu contraseña.',
            duration: 6000,
          });
          return { data: null, error: new Error('User already exists') as AuthError };
        }

        // Method 2: Check creation time - if user was created more than 10 seconds ago, likely existing
        const userCreatedAt = new Date(authData.user.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - userCreatedAt.getTime();
        const tenSeconds = 10 * 1000;
        
        if (timeDiff > tenSeconds) {
          toast.error('Ya existe una cuenta con este email', {
            description: 'Puedes iniciar sesión o usar la opción "¿Olvidaste tu contraseña?" si no recuerdas tu contraseña.',
            duration: 6000,
          });
          return { data: null, error: new Error('User already exists') as AuthError };
        }

        // Method 3: Check if user has identities (existing users usually have identities)
        if (authData.user.identities && authData.user.identities.length > 0) {
          const identity = authData.user.identities[0];
          if (identity.created_at) {
            const identityCreatedAt = new Date(identity.created_at);
            const identityTimeDiff = now.getTime() - identityCreatedAt.getTime();
            
            if (identityTimeDiff > tenSeconds) {
              toast.error('Ya existe una cuenta con este email', {
                description: 'Puedes iniciar sesión o usar la opción "¿Olvidaste tu contraseña?" si no recuerdas tu contraseña.',
                duration: 6000,
              });
              return { data: null, error: new Error('User already exists') as AuthError };
            }
          }
        }

        // If we get here, it's likely a new user
        toast.success(
          'Cuenta creada exitosamente. Por favor revisa tu email para verificar tu cuenta.'
        );
      } else {
        // No user returned - fallback message
        toast.success(
          'Si el email no está registrado, recibirás un correo de confirmación.'
        );
      }

      return { data: authData, error: null };
    } catch (error) {
      const authError = error as AuthError;
      
      // Handle specific error cases
      if (authError.message?.includes('User already registered') || 
          authError.message?.includes('already registered') ||
          authError.message?.includes('email address is already registered') ||
          authError.message?.includes('Ya existe una cuenta con este email') ||
          authError.message?.includes('User already exists')) {
        
        // Show a more helpful error message for existing users
        toast.error('Ya existe una cuenta con este email', {
          description: 'Puedes iniciar sesión o usar la opción "¿Olvidaste tu contraseña?" si no recuerdas tu contraseña.',
          duration: 6000,
        });
        return { data: null, error: authError };
      }
      
      // Generic error handling
      const errorMessage = authError.message || 'Error al crear la cuenta';
      toast.error(errorMessage);
      return { data: null, error: authError };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const signIn = async (data: SignInFormData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      toast.success('Sesión iniciada exitosamente');
      return { data: authData, error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al iniciar sesión');
      return { data: null, error: authError };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      toast.success('Sesión cerrada exitosamente');
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al cerrar sesión');
      return { error: authError };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const forgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('Se ha enviado un enlace de restablecimiento a tu email');
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al enviar el email');
      return { error: authError };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const resetPassword = async (data: ResetPasswordFormData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      toast.success('Contraseña actualizada exitosamente');
      router.push('/dashboard');
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al actualizar la contraseña');
      return { error: authError };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    initialized: authState.initialized,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    resetPassword,
  };
}

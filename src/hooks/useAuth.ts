import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from '@/components/providers/session-provider';
import type {
  SignUpFormData,
  SignInFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
} from '@/lib/validations/auth';

export function useAuth() {
  const { user, loading, initialized } = useSession();
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Session management is now handled by SessionProvider

  const signUp = async (data: SignUpFormData) => {
    try {
      setActionLoading(true);

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
      setActionLoading(false);
    }
  };

  const signIn = async (data: SignInFormData) => {
    try {
      setActionLoading(true);

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
      setActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setActionLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      toast.success('Sesión cerrada exitosamente');
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al cerrar sesión');
      return { error: authError };
    } finally {
      setActionLoading(false);
    }
  };

  const forgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      setActionLoading(true);

      // Use resetPasswordForEmail which sends a recovery link
      // We'll extract the token from the link for OTP-like experience
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password-callback`,
      });

      if (error) throw error;

      // Save email to localStorage for the reset process
      localStorage.setItem('reset_email', data.email);

      toast.success('Se ha enviado un enlace de restablecimiento a tu correo electrónico. Cópialo y pégalo aquí para obtener el código.');
      router.push('/auth/reset-password');
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al enviar el enlace de restablecimiento');
      return { error: authError };
    } finally {
      setActionLoading(false);
    }
  };

  const verifyResetLink = async (resetLink: string) => {
    try {
      setActionLoading(true);

      // Extract the code from the reset link
      const url = new URL(resetLink);
      const code = url.searchParams.get('code');
      
      if (!code) {
        throw new Error('Enlace inválido. No se encontró el código de verificación.');
      }

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) throw error;

      toast.success('Enlace verificado correctamente');
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Enlace inválido o expirado');
      return { error: authError };
    } finally {
      setActionLoading(false);
    }
  };

  const resetPassword = async (data: { password: string; confirmPassword: string }) => {
    try {
      setActionLoading(true);

      // Update password (user should already be authenticated after OTP verification)
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      // Clear stored email
      localStorage.removeItem('reset_email');

      toast.success('Contraseña actualizada exitosamente');
      router.push('/dashboard');
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al actualizar la contraseña');
      return { error: authError };
    } finally {
      setActionLoading(false);
    }
  };

  return {
    user,
    loading: loading || actionLoading,
    initialized,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    verifyResetLink,
    resetPassword,
  };
}
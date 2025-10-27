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
        // Let the dashboard page handle onboarding redirection
        router.push('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
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

      if (error) throw error;

      if (authData.user && !authData.user.email_confirmed_at) {
        toast.success(
          'Cuenta creada exitosamente. Por favor revisa tu email para verificar tu cuenta.'
        );
      }

      return { data: authData, error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Error al crear la cuenta');
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

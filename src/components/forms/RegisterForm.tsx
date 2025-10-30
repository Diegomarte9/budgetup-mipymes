'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { useAuth } from '@/hooks/useAuth';
import { signUpSchema, type SignUpFormData } from '@/lib/validations/auth';
import { toast } from 'sonner';

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<any>(null);
  const { signUp, loading } = useAuth();

  // Check for pending invitation on component mount
  useEffect(() => {
    const invitation = sessionStorage.getItem('pendingInvitation');
    if (invitation) {
      try {
        setPendingInvitation(JSON.parse(invitation));
      } catch (error) {
        console.error('Error parsing pending invitation:', error);
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: SignUpFormData) => {
    const result = await signUp(data);
    
    // If registration is successful and there's a pending invitation, handle it
    if (result.data && !result.error) {
      const pendingInvitation = sessionStorage.getItem('pendingInvitation');
      if (pendingInvitation) {
        try {
          const invitationData = JSON.parse(pendingInvitation);
          // Clear the stored invitation
          sessionStorage.removeItem('pendingInvitation');
          
          // Show success message about the invitation
          toast.success(`¡Registro exitoso! Te has unido a ${invitationData.organizationName}`);
        } catch (error) {
          console.error('Error processing pending invitation:', error);
        }
      }
    }
    
    // If there's an error related to existing user, we could show additional UI
    if (result.error && result.error.message?.includes('Ya existe una cuenta con este email')) {
      // The error toast is already shown by useAuth, but we could add additional logic here if needed
    }
  };

  return (
    <Card className="w-full max-w-md bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-white">
          {pendingInvitation ? 'Completa tu Registro' : 'Crear Cuenta'}
        </CardTitle>
        <CardDescription className="text-center text-slate-300">
          {pendingInvitation 
            ? `Te unirás a ${pendingInvitation.organizationName} después del registro`
            : 'Regístrate para comenzar a gestionar tus finanzas'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingInvitation && (
          <div className="mb-6 bg-blue-800/20 border border-blue-600/30 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Building2 className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-300">
                  Invitación Pendiente
                </h3>
                <p className="text-xs text-blue-200">
                  Te unirás a <strong>{pendingInvitation.organizationName}</strong> como {pendingInvitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register('email')}
              className={errors.email ? 'border-red-500 text-white placeholder:text-gray-400' : 'border-gray-500 text-white placeholder:text-gray-400'}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-red-500 pr-10 text-white placeholder:text-gray-400' : 'border-gray-500 pr-10 text-white placeholder:text-gray-400'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirmar Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500 pr-10 text-white placeholder:text-gray-400' : 'border-gray-500 pr-10 text-white placeholder:text-gray-400'}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <PasswordStrengthIndicator password={password || ''} />

          <Button type="submit" className="w-full bg-white text-black hover:bg-gray-100" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Cuenta
          </Button>

          <div className="text-center text-sm text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/auth/login" className="text-red-400 hover:text-red-300 hover:underline transition-colors">
              Inicia sesión aquí
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
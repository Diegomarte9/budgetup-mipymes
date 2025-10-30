'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { toast } from 'sonner';
import { useMembershipRefresh } from '@/contexts/MembershipContext';
import { z } from 'zod';

const completeInvitationSchema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type CompleteInvitationFormData = z.infer<typeof completeInvitationSchema>;

interface CompleteInvitationFormProps {
  email: string;
  organizationName: string;
  role: string;
  invitationCode: string;
}

export function CompleteInvitationForm({ 
  email, 
  organizationName, 
  role, 
  invitationCode 
}: CompleteInvitationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { triggerRefresh } = useMembershipRefresh();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CompleteInvitationFormData>({
    resolver: zodResolver(completeInvitationSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: CompleteInvitationFormData) => {
    try {
      setLoading(true);

      // Update the user's password using Supabase Auth
      const response = await fetch('/api/auth/complete-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: data.password,
          invitationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al completar el registro');
      }

      toast.success(`¡Bienvenido a ${organizationName}!`);
      
      // Trigger refresh of memberships
      triggerRefresh();
      
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-white">
          Completa tu Cuenta
        </CardTitle>
        <CardDescription className="text-center text-slate-300">
          Establece tu contraseña para acceder a {organizationName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Organization Info */}
        <div className="mb-6 bg-blue-800/20 border border-blue-600/30 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="shrink-0">
              <Building2 className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-300">
                Te unirás a {organizationName}
              </h3>
              <p className="text-xs text-blue-200">
                Como {role === 'admin' ? 'Administrador' : 'Miembro'} • {email}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <Button 
            type="submit" 
            className="w-full bg-white text-black hover:bg-gray-100" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Completar Registro
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
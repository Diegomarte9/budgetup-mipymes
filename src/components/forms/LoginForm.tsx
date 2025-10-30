'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { signInSchema, type SignInFormData } from '@/lib/validations/auth';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const { signIn, loading } = useAuth();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  // Check for invitation redirect and pre-fill email
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.includes('/auth/invitation')) {
      const url = new URL(redirect, window.location.origin);
      const code = url.searchParams.get('code');
      
      if (code) {
        // Fetch invitation details to get the email
        fetch(`/api/invitations/details?code=${code}`)
          .then(res => res.json())
          .then(data => {
            if (data.invitation?.email) {
              setInvitationEmail(data.invitation.email);
              setValue('email', data.invitation.email);
            }
          })
          .catch(() => {
            // Ignore errors, just don't pre-fill
          });
      }
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: SignInFormData) => {
    await signIn(data);
  };

  return (
    <Card className="w-full max-w-md bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-white">
          Iniciar Sesión
        </CardTitle>
        <CardDescription className="text-center text-slate-300">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitationEmail && (
          <Alert className="mb-4">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Tienes una invitación pendiente para <strong>{invitationEmail}</strong>. 
              Inicia sesión con esta cuenta para aceptar la invitación.
            </AlertDescription>
          </Alert>
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

          <div className="flex items-center justify-between">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-red-400 hover:text-red-300 hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type="submit" className="w-full bg-white text-black hover:bg-gray-100" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Sesión
          </Button>

          <div className="text-center text-sm text-slate-400">
            ¿No tienes una cuenta?{' '}
            <Link href="/auth/register" className="text-red-400 hover:text-red-300 hover:underline transition-colors">
              Regístrate aquí
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
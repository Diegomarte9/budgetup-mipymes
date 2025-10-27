'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';

export function ForgotPasswordForm() {
  const [emailSent, setEmailSent] = useState(false);
  const { forgotPassword, loading } = useAuth();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const result = await forgotPassword(data);
    if (!result.error) {
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md bg-transparent border-none shadow-none">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
            <Mail className="h-6 w-6 text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Email Enviado
          </CardTitle>
          <CardDescription className="text-slate-300">
            Hemos enviado un enlace de restablecimiento de contraseña a{' '}
            <strong className="text-red-400">{getValues('email')}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-800/50 border border-gray-600/30 p-4">
            <p className="text-sm text-gray-300">
              Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
              Si no ves el email, revisa tu carpeta de spam.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full"
            >
              Enviar otro email
            </Button>
            <Link href="/auth/login" className="block">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio de sesión
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-white">
          Restablecer Contraseña
        </CardTitle>
        <CardDescription className="text-center text-slate-300">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Enlace de Restablecimiento
          </Button>

          <Link href="/auth/login" className="block">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesión
            </Button>
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
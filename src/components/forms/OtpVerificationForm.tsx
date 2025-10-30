'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import Link from 'next/link';

const resetLinkSchema = z.object({
  resetLink: z.string().url('Debe ser un enlace válido').min(1, 'El enlace es requerido'),
});

type ResetLinkFormData = z.infer<typeof resetLinkSchema>;

interface OtpVerificationFormProps {
  onVerified: () => void;
}

export function OtpVerificationForm({ onVerified }: OtpVerificationFormProps) {
  const { verifyResetLink, loading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetLinkFormData>({
    resolver: zodResolver(resetLinkSchema),
  });

  const onSubmit = async (data: ResetLinkFormData) => {
    const result = await verifyResetLink(data.resetLink);
    if (!result.error) {
      onVerified();
    }
  };

  return (
    <Card className="w-full max-w-md bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-white">
          Verificar Enlace
        </CardTitle>
        <CardDescription className="text-center text-slate-300">
          Copia y pega el enlace de restablecimiento que recibiste en tu correo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resetLink" className="text-white">Enlace de Restablecimiento</Label>
            <div className="relative">
              <Input
                id="resetLink"
                type="url"
                placeholder="https://..."
                {...register('resetLink')}
                className={errors.resetLink ? 'border-red-500 pl-10 text-white placeholder:text-gray-400' : 'border-gray-500 pl-10 text-white placeholder:text-gray-400'}
              />
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {errors.resetLink && (
              <p className="text-sm text-red-500">{errors.resetLink.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-white text-black hover:bg-gray-100" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verificar Enlace
          </Button>

          <div className="text-center">
            <Link 
              href="/auth/forgot-password" 
              className="inline-flex items-center text-sm text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Solicitar nuevo enlace
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
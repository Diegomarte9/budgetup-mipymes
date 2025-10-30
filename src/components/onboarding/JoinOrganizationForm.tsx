'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { joinOrganizationSchema, type JoinOrganizationFormData } from '@/lib/validations/onboarding';

interface JoinOrganizationFormProps {
  onBack: () => void;
}

export function JoinOrganizationForm({ onBack }: JoinOrganizationFormProps) {
  const { joinOrganization, loading } = useOrganization();
  const { signOut } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinOrganizationFormData>({
    resolver: zodResolver(joinOrganizationSchema),
  });

  const onSubmit = async (data: JoinOrganizationFormData) => {
    await joinOrganization(data);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Card className="w-full bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-4 px-6">
        <CardTitle className="text-xl font-bold text-white flex items-center space-x-2">
          <Users className="h-5 w-5 text-blue-400" />
          <span>Unirse a Organización</span>
        </CardTitle>
        <CardDescription className="text-slate-300 text-sm">
          Ingresa el código de invitación que recibiste para unirte a una empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitationCode" className="text-white">Código de Invitación</Label>
            <Input
              id="invitationCode"
              type="text"
              placeholder="ABC123-DEF456"
              {...register('invitationCode')}
              className={errors.invitationCode ? 'border-red-500 text-white placeholder:text-gray-400' : 'border-gray-500 text-white placeholder:text-gray-400'}
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
            {errors.invitationCode && (
              <p className="text-xs text-red-500">{errors.invitationCode.message}</p>
            )}
            <p className="text-xs text-slate-400">
              El código de invitación debe coincidir con el email de tu cuenta
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button type="submit" className="w-full bg-white text-black hover:bg-gray-100" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unirse a Organización
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent border-gray-500 text-slate-300 hover:bg-gray-800/50 hover:text-white"
              onClick={onBack}
              disabled={loading}
            >
              Volver
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white hover:bg-gray-800/50"
              onClick={handleSignOut}
              disabled={loading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cambiar de cuenta
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
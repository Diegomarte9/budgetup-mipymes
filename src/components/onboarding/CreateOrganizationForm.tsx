'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { createOrganizationSchema, type CreateOrganizationFormData } from '@/lib/validations/onboarding';

interface CreateOrganizationFormProps {
  onBack: () => void;
}

export function CreateOrganizationForm({ onBack }: CreateOrganizationFormProps) {
  const { createOrganization, loading } = useOrganization();
  const { signOut } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      currency: 'DOP',
    },
  });

  const currency = watch('currency');

  const onSubmit = async (data: CreateOrganizationFormData) => {
    await createOrganization(data);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Card className="w-full bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-4 px-6">
        <CardTitle className="text-xl font-bold text-white flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-red-400" />
          <span>Crear Organización</span>
        </CardTitle>
        <CardDescription className="text-slate-300 text-sm">
          Configura tu empresa para comenzar a gestionar tus finanzas
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Nombre de la Empresa</Label>
            <Input
              id="name"
              type="text"
              placeholder="Ej: Mi Empresa S.R.L."
              {...register('name')}
              className={errors.name ? 'border-red-500 text-white placeholder:text-gray-400' : 'border-gray-500 text-white placeholder:text-gray-400'}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
            <p className="text-xs text-slate-400">
              El nombre debe ser único. No puede existir otra organización con el mismo nombre.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency" className="text-white">Moneda</Label>
            <Select
              value={currency}
              onValueChange={(value) => setValue('currency', value)}
            >
              <SelectTrigger className={errors.currency ? 'border-red-500 text-white' : 'border-gray-500 text-white'}>
                <SelectValue placeholder="Selecciona una moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOP">DOP - Peso Dominicano</SelectItem>
                <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-xs text-red-500">{errors.currency.message}</p>
            )}
          </div>

          <div className="pt-4 space-y-3">
            <Button type="submit" className="w-full bg-white text-black hover:bg-gray-100" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Organización
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
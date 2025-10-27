'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateAccount, useUpdateAccount } from '@/hooks/useAccounts';
import { accountFormSchema, accountTypeLabels, type AccountFormData, type AccountType } from '@/lib/validations/accounts';
import type { Tables } from '@/types/supabase';

type Account = Tables<'accounts'>;

interface AccountFormProps {
  organizationId: string;
  account?: Account;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AccountForm({ organizationId, account, onSuccess, onCancel }: AccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name || '',
      type: (account?.type as AccountType) || 'cash',
      currency: account?.currency || 'DOP',
      initial_balance: account?.initial_balance || 0,
    },
  });

  const watchedType = watch('type');

  const onSubmit = async (data: AccountFormData) => {
    try {
      setIsSubmitting(true);

      if (account) {
        // Update existing account
        await updateAccountMutation.mutateAsync({
          id: account.id,
          data,
        });
      } else {
        // Create new account
        await createAccountMutation.mutateAsync({
          ...data,
          organization_id: organizationId,
        });
      }

      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Error submitting account form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {account ? 'Editar Cuenta' : 'Nueva Cuenta'}
        </CardTitle>
        <CardDescription>
          {account 
            ? 'Modifica los detalles de la cuenta existente'
            : 'Crea una nueva cuenta para tu organización'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Cuenta</Label>
            <Input
              id="name"
              placeholder="Ej: Cuenta Corriente Banco Popular"
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Cuenta</Label>
            <Select
              value={watchedType}
              onValueChange={(value: AccountType) => setValue('type', value)}
            >
              <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona el tipo de cuenta" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(accountTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          {/* Currency (read-only for now, defaulted to DOP) */}
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <Input
              id="currency"
              value="DOP"
              readOnly
              className="bg-gray-50"
              {...register('currency')}
            />
            <p className="text-xs text-gray-500">
              Por ahora solo se soporta peso dominicano (DOP)
            </p>
          </div>

          {/* Initial Balance */}
          <div className="space-y-2">
            <Label htmlFor="initial_balance">Balance Inicial</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                RD$
              </span>
              <Input
                id="initial_balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={`pl-12 ${errors.initial_balance ? 'border-red-500' : ''}`}
                {...register('initial_balance', {
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.initial_balance && (
              <p className="text-sm text-red-500">{errors.initial_balance.message}</p>
            )}
            <p className="text-xs text-gray-500">
              El balance inicial de la cuenta (puede ser 0)
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting
                ? (account ? 'Actualizando...' : 'Creando...')
                : (account ? 'Actualizar Cuenta' : 'Crear Cuenta')
              }
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
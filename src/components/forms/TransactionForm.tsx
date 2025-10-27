'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { 
  transactionFormSchema,
  validateTransactionByType,
  transactionTypeLabels,
  formatCurrency,
  parseCurrencyInput,
  DEFAULT_ITBIS_PCT,
  type TransactionFormData,
  type TransactionType 
} from '@/lib/validations/transactions';
import type { Tables } from '@/types/supabase';

type Transaction = Tables<'transactions'>;
type Account = Tables<'accounts'>;
type Category = Tables<'categories'>;

interface TransactionFormProps {
  organizationId: string;
  transaction?: Transaction;
  defaultType?: TransactionType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TransactionForm({ 
  organizationId, 
  transaction, 
  defaultType = 'expense',
  onSuccess, 
  onCancel 
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  
  // Fetch accounts and categories
  const { data: accounts = [] } = useAccounts(organizationId);
  const { data: categories = [] } = useCategories(organizationId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<TransactionFormData>({
    defaultValues: {
      type: transaction?.type || defaultType,
      amount: transaction?.amount || 0,
      currency: transaction?.currency || 'DOP',
      description: transaction?.description || '',
      occurred_at: transaction?.occurred_at || new Date().toISOString().split('T')[0],
      account_id: transaction?.account_id || '',
      category_id: transaction?.category_id || '',
      transfer_to_account_id: transaction?.transfer_to_account_id || '',
      itbis_pct: transaction?.itbis_pct || DEFAULT_ITBIS_PCT,
      notes: transaction?.notes || '',
    },
  });

  const watchedType = watch('type');
  const watchedAccountId = watch('account_id');
  const watchedAmount = watch('amount');
  const watchedItbisPct = watch('itbis_pct');

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(category => {
    if (watchedType === 'transfer') return false;
    return category.type === watchedType;
  });

  // Filter accounts for transfer destination (exclude source account)
  const transferAccounts = accounts.filter(account => account.id !== watchedAccountId);

  // Calculate ITBIS amount
  const itbisAmount = watchedType === 'expense' && watchedItbisPct 
    ? (watchedAmount * watchedItbisPct) / 100 
    : 0;

  // Reset form when type changes
  useEffect(() => {
    if (watchedType !== (transaction?.type || defaultType)) {
      setValue('category_id', '');
      setValue('transfer_to_account_id', '');
      if (watchedType !== 'expense') {
        setValue('itbis_pct', undefined);
      } else {
        setValue('itbis_pct', DEFAULT_ITBIS_PCT);
      }
    }
  }, [watchedType, setValue, transaction?.type, defaultType]);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setIsSubmitting(true);
      clearErrors();

      // Validate based on transaction type
      const validatedData = validateTransactionByType(data);

      if (transaction) {
        // Update existing transaction
        await updateTransactionMutation.mutateAsync({
          id: transaction.id,
          data: validatedData,
        });
      } else {
        // Create new transaction
        await createTransactionMutation.mutateAsync({
          ...validatedData,
          organization_id: organizationId,
        });
      }

      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        // Handle validation errors
        if (error.message.includes('categoría')) {
          setError('category_id', { message: error.message });
        } else if (error.message.includes('cuenta')) {
          setError('transfer_to_account_id', { message: error.message });
        } else {
          setError('root', { message: error.message });
        }
      }
      console.error('Error submitting transaction form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseCurrencyInput(e.target.value);
    setValue('amount', value);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {transaction ? 'Editar Transacción' : 'Nueva Transacción'}
          <Badge variant={
            watchedType === 'income' ? 'default' : 
            watchedType === 'expense' ? 'destructive' : 
            'secondary'
          }>
            {transactionTypeLabels[watchedType]}
          </Badge>
        </CardTitle>
        <CardDescription>
          {transaction 
            ? 'Modifica los detalles de la transacción existente'
            : `Registra un nuevo ${transactionTypeLabels[watchedType].toLowerCase()}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Transacción</Label>
            <Select
              value={watchedType}
              onValueChange={(value: TransactionType) => setValue('type', value)}
            >
              <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona el tipo de transacción" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(transactionTypeLabels).map(([value, label]) => (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  RD$
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`pl-12 ${errors.amount ? 'border-red-500' : ''}`}
                  {...register('amount', {
                    valueAsNumber: true,
                  })}
                  onChange={handleAmountChange}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
              {watchedAmount > 0 && (
                <p className="text-sm text-gray-500">
                  {formatCurrency(watchedAmount)}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="occurred_at">Fecha</Label>
              <Input
                id="occurred_at"
                type="date"
                className={errors.occurred_at ? 'border-red-500' : ''}
                {...register('occurred_at')}
              />
              {errors.occurred_at && (
                <p className="text-sm text-red-500">{errors.occurred_at.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              placeholder={
                watchedType === 'income' ? 'Ej: Venta de productos' :
                watchedType === 'expense' ? 'Ej: Pago de renta' :
                'Ej: Transferencia a cuenta de ahorros'
              }
              className={errors.description ? 'border-red-500' : ''}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="account_id">
                {watchedType === 'transfer' ? 'Cuenta Origen' : 'Cuenta'}
              </Label>
              <Select
                value={watchedAccountId}
                onValueChange={(value) => setValue('account_id', value)}
              >
                <SelectTrigger className={errors.account_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_id && (
                <p className="text-sm text-red-500">{errors.account_id.message}</p>
              )}
            </div>

            {/* Category or Transfer Account */}
            {watchedType === 'transfer' ? (
              <div className="space-y-2">
                <Label htmlFor="transfer_to_account_id">Cuenta Destino</Label>
                <Select
                  value={watch('transfer_to_account_id') || ''}
                  onValueChange={(value) => setValue('transfer_to_account_id', value)}
                >
                  <SelectTrigger className={errors.transfer_to_account_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecciona cuenta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.transfer_to_account_id && (
                  <p className="text-sm text-red-500">{errors.transfer_to_account_id.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="category_id">Categoría</Label>
                <Select
                  value={watch('category_id') || ''}
                  onValueChange={(value) => setValue('category_id', value)}
                >
                  <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color || '#gray' }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-sm text-red-500">{errors.category_id.message}</p>
                )}
              </div>
            )}
          </div>

          {/* ITBIS for expenses */}
          {watchedType === 'expense' && (
            <div className="space-y-2">
              <Label htmlFor="itbis_pct">ITBIS (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="itbis_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="18.00"
                  className={`flex-1 ${errors.itbis_pct ? 'border-red-500' : ''}`}
                  {...register('itbis_pct', {
                    valueAsNumber: true,
                  })}
                />
                <div className="flex items-center px-3 bg-gray-50 border rounded-md">
                  <span className="text-sm text-gray-600">
                    {formatCurrency(itbisAmount)}
                  </span>
                </div>
              </div>
              {errors.itbis_pct && (
                <p className="text-sm text-red-500">{errors.itbis_pct.message}</p>
              )}
              <p className="text-xs text-gray-500">
                ITBIS calculado sobre el monto base
              </p>
            </div>
          )}

          {/* Advanced Options Toggle */}
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'} opciones avanzadas
            </Button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Información adicional sobre la transacción..."
                  className={errors.notes ? 'border-red-500' : ''}
                  {...register('notes')}
                />
                {errors.notes && (
                  <p className="text-sm text-red-500">{errors.notes.message}</p>
                )}
              </div>

              {/* Attachment URL (for future implementation) */}
              <div className="space-y-2">
                <Label htmlFor="attachment_url">URL de Adjunto (Opcional)</Label>
                <Input
                  id="attachment_url"
                  type="url"
                  placeholder="https://..."
                  className={errors.attachment_url ? 'border-red-500' : ''}
                  {...register('attachment_url')}
                />
                {errors.attachment_url && (
                  <p className="text-sm text-red-500">{errors.attachment_url.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  URL del archivo adjunto (recibo, factura, etc.)
                </p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting
                ? (transaction ? 'Actualizando...' : 'Creando...')
                : (transaction ? 'Actualizar Transacción' : 'Crear Transacción')
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
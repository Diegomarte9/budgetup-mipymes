'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { 
  transactionFormSchema,
  validateTransactionByType,
  transactionTypeLabels,
  formatCurrency,
  parseCurrencyInput,
  type TransactionFormData,
  type TransactionType 
} from '@/lib/validations/transactions';
import { formatDateForInput, getTodayForInput, dateInputToISO } from '@/lib/utils/date';
import { capitalizeWords } from '@/lib/utils/text';
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
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      type: transaction?.type || defaultType,
      amount: transaction?.amount || 0,
      currency: transaction?.currency || 'DOP',
      description: transaction?.description || '',
      occurred_at: transaction?.occurred_at ? formatDateForInput(transaction.occurred_at) : getTodayForInput(),
      account_id: transaction?.account_id || '',
      category_id: transaction?.category_id || '',
      transfer_to_account_id: transaction?.transfer_to_account_id || '',
      notes: transaction?.notes || '',
      attachment_url: transaction?.attachment_url || '',
    },
  });

  const watchedType = watch('type');
  const watchedAccountId = watch('account_id');
  const watchedAmount = watch('amount');
  const watchedDescription = watch('description');
  const watchedCategoryId = watch('category_id');
  const watchedTransferToAccountId = watch('transfer_to_account_id');
  const watchedOccurredAt = watch('occurred_at');
  const watchedAttachmentUrl = watch('attachment_url');

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(category => {
    if (watchedType === 'transfer') return false;
    return category.type === watchedType;
  });

  // Filter accounts for transfer destination (exclude source account)
  const transferAccounts = accounts.filter(account => account.id !== watchedAccountId);



  // Reset form when type changes
  useEffect(() => {
    if (watchedType !== (transaction?.type || defaultType)) {
      setValue('category_id', '');
      setValue('transfer_to_account_id', '');
    }
  }, [watchedType, setValue, transaction?.type, defaultType]);

  // Clear errors when fields are corrected
  useEffect(() => {
    if (watchedDescription && watchedDescription.trim()) {
      clearErrors('description');
      clearErrors('root'); // Clear general error when any field is corrected
    }
  }, [watchedDescription, clearErrors]);

  useEffect(() => {
    if (watchedAccountId) {
      clearErrors('account_id');
      clearErrors('root');
    }
  }, [watchedAccountId, clearErrors]);

  useEffect(() => {
    if (watchedCategoryId && watchedType !== 'transfer') {
      clearErrors('category_id');
      clearErrors('root');
    }
  }, [watchedCategoryId, watchedType, clearErrors]);

  useEffect(() => {
    if (watchedTransferToAccountId && watchedType === 'transfer') {
      clearErrors('transfer_to_account_id');
      clearErrors('root');
      // Also clear error if accounts are now different
      if (watchedAccountId && watchedTransferToAccountId !== watchedAccountId) {
        clearErrors('transfer_to_account_id');
      }
    }
  }, [watchedTransferToAccountId, watchedType, watchedAccountId, clearErrors]);

  useEffect(() => {
    if (watchedAmount && watchedAmount > 0) {
      clearErrors('amount');
      clearErrors('root');
    }
  }, [watchedAmount, clearErrors]);

  useEffect(() => {
    if (watchedOccurredAt) {
      clearErrors('occurred_at');
      clearErrors('root');
    }
  }, [watchedOccurredAt, clearErrors]);

  useEffect(() => {
    if (watchedAttachmentUrl !== undefined) {
      clearErrors('attachment_url');
      clearErrors('root');
    }
  }, [watchedAttachmentUrl, clearErrors]);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setIsSubmitting(true);
      clearErrors();

      // Final validations before submission
      let hasErrors = false;

      if (!data.description?.trim()) {
        setError('description', { message: 'El concepto es requerido' });
        hasErrors = true;
      }

      if (!data.account_id) {
        setError('account_id', { message: 'Debes seleccionar una cuenta' });
        hasErrors = true;
      }

      if (data.type !== 'transfer' && !data.category_id) {
        setError('category_id', { message: 'Debes seleccionar una categoría' });
        hasErrors = true;
      }

      if (data.type === 'transfer' && !data.transfer_to_account_id) {
        setError('transfer_to_account_id', { message: 'Debes seleccionar una cuenta destino' });
        hasErrors = true;
      }

      if (data.type === 'transfer' && data.account_id === data.transfer_to_account_id) {
        setError('transfer_to_account_id', { message: 'La cuenta origen y destino deben ser diferentes' });
        hasErrors = true;
      }

      if (!data.amount || data.amount <= 0) {
        setError('amount', { message: 'El monto debe ser mayor a cero' });
        hasErrors = true;
      }

      if (!data.occurred_at) {
        setError('occurred_at', { message: 'La fecha es requerida' });
        hasErrors = true;
      }

      // Validate attachment URL if provided
      if (data.attachment_url && data.attachment_url.trim()) {
        try {
          new URL(data.attachment_url);
        } catch {
          setError('attachment_url', { message: 'La URL del adjunto no es válida' });
          hasErrors = true;
        }
      }

      if (hasErrors) {
        return;
      }

      // Validate based on transaction type (date is already in correct format)
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
        // Handle API validation errors
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('categoría')) {
          setError('category_id', { message: error.message });
        } else if (errorMessage.includes('cuenta destino') || errorMessage.includes('transfer')) {
          setError('transfer_to_account_id', { message: error.message });
        } else if (errorMessage.includes('cuenta')) {
          setError('account_id', { message: error.message });
        } else if (errorMessage.includes('monto') || errorMessage.includes('amount')) {
          setError('amount', { message: error.message });
        } else if (errorMessage.includes('fecha') || errorMessage.includes('date')) {
          setError('occurred_at', { message: error.message });
        } else if (errorMessage.includes('descripción') || errorMessage.includes('concepto')) {
          setError('description', { message: error.message });
        } else if (errorMessage.includes('url') || errorMessage.includes('adjunto')) {
          setError('attachment_url', { message: error.message });
        } else {
          setError('root', { message: error.message });
        }
      } else {
        setError('root', { message: 'Error desconocido al procesar la transacción' });
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

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const capitalizedValue = capitalizeWords(e.target.value);
    setValue('description', capitalizedValue);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 1. Fecha y Tipo de Transacción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="occurred_at">Fecha <span className="text-red-500">*</span></Label>
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

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Transacción <span className="text-red-500">*</span></Label>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 3. Cuenta */}
          <div className="space-y-2">
            <Label htmlFor="account_id">
              {watchedType === 'transfer' ? 'Cuenta Origen' : 'Cuenta'} <span className="text-red-500">*</span>
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

          {/* 4. Categoría o Cuenta Destino */}
          {watchedType === 'transfer' ? (
            <div className="space-y-2">
              <Label htmlFor="transfer_to_account_id">Cuenta Destino <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="category_id">Categoría <span className="text-red-500">*</span></Label>
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
                      {category.name}
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

        {/* 5. Concepto */}
        <div className="space-y-2">
          <Label htmlFor="description">Concepto <span className="text-red-500">*</span></Label>
          <Input
            id="description"
            placeholder={
              watchedType === 'income' ? 'Ej: Venta De Productos' :
              watchedType === 'expense' ? 'Ej: Pago De Renta' :
              'Ej: Transferencia A Cuenta De Ahorros'
            }
            className={errors.description ? 'border-red-500' : ''}
            {...register('description')}
            onChange={handleDescriptionChange}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* 6. Monto */}
        <div className="space-y-2">
          <Label htmlFor="amount">Monto <span className="text-red-500">*</span></Label>
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
        </div>

        {/* Monto Total */}
        {watchedAmount > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total:</span>
              <span className="text-lg font-bold">
                {formatCurrency(watchedAmount)}
              </span>
            </div>
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

        {/* General Error Message */}
        {errors.root && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{errors.root.message}</p>
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
    </div>
  );
}
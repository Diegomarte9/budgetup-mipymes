import { z } from 'zod';

// Transaction type enum
export const transactionTypes = ['income', 'expense', 'transfer'] as const;

// Base transaction validation schema
export const transactionSchema = z.object({
  type: z.enum(transactionTypes).refine(
    (val) => transactionTypes.includes(val),
    { message: 'Tipo de transacción inválido' }
  ),
  amount: z
    .number({
      message: 'El monto debe ser un número'
    })
    .positive('El monto debe ser mayor a cero')
    .min(0.01, 'El monto mínimo es RD$0.01')
    .max(999999999999.99, 'El monto es demasiado grande')
    .refine(
      (val) => {
        // Check for maximum 2 decimal places
        const decimalPlaces = (val.toString().split('.')[1] || '').length;
        return decimalPlaces <= 2;
      },
      { message: 'El monto no puede tener más de 2 decimales' }
    )
    .refine(
      (val) => !isNaN(val) && isFinite(val),
      { message: 'El monto debe ser un número válido' }
    ),
  currency: z.string().min(1, 'La moneda es requerida').default('DOP'),
  description: z
    .string({
      message: 'El concepto debe ser texto'
    })
    .min(1, 'El concepto no puede estar vacío')
    .max(500, 'El concepto no puede exceder 500 caracteres')
    .trim()
    .refine((val) => val.length > 0, {
      message: 'El concepto es requerido'
    }),
  occurred_at: z
    .string({
      message: 'La fecha debe ser una cadena de texto'
    })
    .min(1, 'La fecha es requerida')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'La fecha no es válida' }
    )
    .refine(
      (val) => {
        const date = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      { message: 'La fecha no puede ser futura' }
    ),
  account_id: z
    .string({
      message: 'El ID de cuenta debe ser texto'
    })
    .uuid('Selecciona una cuenta válida')
    .min(1, 'Debes seleccionar una cuenta'),
  category_id: z.string().uuid('ID de categoría inválido').optional(),
  transfer_to_account_id: z.string().uuid('ID de cuenta destino inválido').optional().nullable(),
  itbis_pct: z
    .number()
    .min(0, 'El porcentaje de ITBIS no puede ser negativo')
    .max(100, 'El porcentaje de ITBIS no puede ser mayor a 100')
    .default(18.00)
    .optional(),
  notes: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional(),
  attachment_url: z.string().url('URL de adjunto inválida').optional().nullable().or(z.literal('')),
});

// Form-specific schemas for different transaction types
export const incomeTransactionSchema = transactionSchema.extend({
  type: z.literal('income'),
  currency: z.string().min(1, 'La moneda es requerida'),
  category_id: z.string().uuid('ID de categoría inválido'),
  transfer_to_account_id: z.string().optional().nullable().or(z.literal('')),
}).refine(
  (data) => data.category_id !== undefined && data.category_id !== '',
  { message: 'La categoría es requerida para ingresos', path: ['category_id'] }
).transform((data) => ({
  ...data,
  transfer_to_account_id: undefined, // Remove for income transactions
  attachment_url: data.attachment_url === '' || data.attachment_url === null ? undefined : data.attachment_url,
}));

export const expenseTransactionSchema = transactionSchema.extend({
  type: z.literal('expense'),
  currency: z.string().min(1, 'La moneda es requerida'),
  category_id: z.string().uuid('ID de categoría inválido'),
  transfer_to_account_id: z.string().optional().nullable().or(z.literal('')),
}).refine(
  (data) => data.category_id !== undefined && data.category_id !== '',
  { message: 'La categoría es requerida para gastos', path: ['category_id'] }
).transform((data) => ({
  ...data,
  transfer_to_account_id: undefined, // Remove for expense transactions
  attachment_url: data.attachment_url === '' || data.attachment_url === null ? undefined : data.attachment_url,
}));

export const transferTransactionSchema = transactionSchema.extend({
  type: z.literal('transfer'),
  currency: z.string().min(1, 'La moneda es requerida'),
  category_id: z.string().optional().nullable().or(z.literal('')),
  transfer_to_account_id: z.string().uuid('ID de cuenta destino inválido'),
  itbis_pct: z.number().optional(),
}).refine(
  (data) => data.account_id !== data.transfer_to_account_id,
  { 
    message: 'La cuenta origen y destino deben ser diferentes', 
    path: ['transfer_to_account_id'] 
  }
).transform((data) => ({
  ...data,
  category_id: undefined, // Remove for transfer transactions
  itbis_pct: undefined, // Remove for transfer transactions
  attachment_url: data.attachment_url === '' || data.attachment_url === null ? undefined : data.attachment_url,
}));

// Base form schema (for form state management)
export const transactionFormSchema = transactionSchema.extend({
  currency: z.string().min(1, 'La moneda es requerida'),
});

// Validation function for different transaction types
export const validateTransactionByType = (data: any) => {
  switch (data.type) {
    case 'income':
      return incomeTransactionSchema.parse(data);
    case 'expense':
      return expenseTransactionSchema.parse(data);
    case 'transfer':
      return transferTransactionSchema.parse(data);
    default:
      throw new Error('Tipo de transacción inválido');
  }
};

// Create transaction schema (includes organization_id)
export const createTransactionSchema = transactionFormSchema.extend({
  organization_id: z.string().uuid('ID de organización inválido'),
});

// Update transaction schema (all fields optional except id)
export const updateTransactionSchema = transactionFormSchema.partial().extend({
  id: z.string().uuid('ID de transacción inválido'),
});

// Transaction type labels for UI
export const transactionTypeLabels = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
} as const;

// Default ITBIS percentage for Dominican Republic
export const DEFAULT_ITBIS_PCT = 18.00;

// Helper function to format currency
export const formatCurrency = (amount: number, currency = 'DOP'): string => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper function to parse currency input
export const parseCurrencyInput = (value: string): number => {
  // Remove currency symbols and spaces, replace comma with dot
  const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Type exports
export type TransactionFormData = z.infer<typeof transactionFormSchema>;
export type IncomeTransactionData = z.infer<typeof incomeTransactionSchema>;
export type ExpenseTransactionData = z.infer<typeof expenseTransactionSchema>;
export type TransferTransactionData = z.infer<typeof transferTransactionSchema>;
export type CreateTransactionData = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionData = z.infer<typeof updateTransactionSchema>;
export type TransactionType = (typeof transactionTypes)[number];
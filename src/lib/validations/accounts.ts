import { z } from 'zod';

// Account type enum
export const accountTypes = ['cash', 'bank', 'credit_card'] as const;

// Account validation schema
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la cuenta es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .trim(),
  type: z.enum(accountTypes).refine(
    (val) => accountTypes.includes(val),
    { message: 'Tipo de cuenta inválido' }
  ),
  currency: z.string(),
  initial_balance: z
    .number()
    .min(0, 'El balance inicial no puede ser negativo')
    .max(999999999999.99, 'El balance inicial es demasiado grande'),
  account_number: z
    .string()
    .max(50, 'El número de cuenta no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
});

// Account form schema with defaults
export const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la cuenta es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .trim(),
  type: z.enum(accountTypes).refine(
    (val) => accountTypes.includes(val),
    { message: 'Tipo de cuenta inválido' }
  ),
  currency: z.string(),
  initial_balance: z
    .number()
    .min(0, 'El balance inicial no puede ser negativo')
    .max(999999999999.99, 'El balance inicial es demasiado grande'),
  account_number: z
    .string()
    .max(50, 'El número de cuenta no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
});

// Create account schema (includes organization_id)
export const createAccountSchema = accountFormSchema.extend({
  organization_id: z.string().uuid('ID de organización inválido'),
});

// Update account schema (all fields optional except id)
export const updateAccountSchema = accountFormSchema.partial().extend({
  id: z.string().uuid('ID de cuenta inválido'),
});

// Account type labels for UI
export const accountTypeLabels = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de Crédito',
} as const;

// Type exports
export type AccountFormData = z.infer<typeof accountFormSchema>;
export type CreateAccountData = z.infer<typeof createAccountSchema>;
export type UpdateAccountData = z.infer<typeof updateAccountSchema>;
export type AccountType = (typeof accountTypes)[number];
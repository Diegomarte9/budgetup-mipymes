import { z } from 'zod';

// Create organization schema
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-Z0-9\s\-_.áéíóúñÁÉÍÓÚÑ]+$/, 'El nombre contiene caracteres no válidos')
    .transform((name) => name.trim()), // Remove leading/trailing spaces
  currency: z.string().min(1, 'La moneda es requerida'),
});

// Join organization schema
export const joinOrganizationSchema = z.object({
  invitationCode: z
    .string()
    .min(6, 'El código de invitación debe tener al menos 6 caracteres')
    .max(50, 'El código de invitación no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9\-]+$/, 'El código de invitación contiene caracteres no válidos'),
});

// Type exports
export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;
export type JoinOrganizationFormData = z.infer<typeof joinOrganizationSchema>;
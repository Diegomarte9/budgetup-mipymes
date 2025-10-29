import { z } from 'zod';

// Create invitation schema
export const createInvitationSchema = z.object({
  email: z
    .string({
      message: 'El email es requerido'
    })
    .min(1, 'El email no puede estar vacío')
    .max(255, 'El email no puede exceder 255 caracteres')
    .email('Ingresa un email válido (ejemplo: usuario@dominio.com)')
    .toLowerCase()
    .trim()
    .refine((email) => {
      // Additional email validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(email);
    }, {
      message: 'El formato del email no es válido'
    }),
  role: z
    .enum(['admin', 'member'], {
      message: 'Selecciona un rol válido'
    })
    .refine((val) => ['admin', 'member'].includes(val), {
      message: 'El rol debe ser "admin" o "member"',
    }),
  organizationId: z
    .string({
      message: 'El ID de organización es requerido'
    })
    .uuid('El ID de organización debe ser un UUID válido')
    .min(1, 'El ID de organización no puede estar vacío'),
});

// Accept invitation schema
export const acceptInvitationSchema = z.object({
  code: z
    .string()
    .min(6, 'El código de invitación debe tener al menos 6 caracteres')
    .max(50, 'El código de invitación no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9\-]+$/, 'El código de invitación contiene caracteres no válidos'),
});

// Update invitation schema
export const updateInvitationSchema = z.object({
  role: z
    .enum(['admin', 'member'])
    .refine((val) => ['admin', 'member'].includes(val), {
      message: 'Rol inválido',
    })
    .optional(),
});

// Type exports
export type CreateInvitationFormData = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;
export type UpdateInvitationFormData = z.infer<typeof updateInvitationSchema>;

// Invitation interface
export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'member';
  code: string;
  expires_at: string;
  used_at: string | null;
  created_by: string;
  created_at: string;
}

// Membership interface
export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}
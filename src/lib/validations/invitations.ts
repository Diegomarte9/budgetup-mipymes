import { z } from 'zod';

// Create invitation schema
export const createInvitationSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'El email es requerido'),
  role: z
    .enum(['admin', 'member'])
    .refine((val) => ['admin', 'member'].includes(val), {
      message: 'Rol inválido',
    }),
  organizationId: z
    .string()
    .uuid('ID de organización inválido'),
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
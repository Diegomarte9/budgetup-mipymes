import { z } from 'zod';

// Category type enum
export const categoryTypes = ['income', 'expense'] as const;

// Category validation schema
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la categoría es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .trim(),
  type: z.enum(categoryTypes).refine(
    (val) => categoryTypes.includes(val),
    { message: 'Tipo de categoría inválido' }
  ),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser un código hexadecimal válido')
    .optional(),
});

// Create category schema (includes organization_id)
export const createCategorySchema = categorySchema.extend({
  organization_id: z.string().uuid('ID de organización inválido'),
});

// Update category schema (all fields optional except id)
export const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().uuid('ID de categoría inválido'),
});

// Category type labels for UI
export const categoryTypeLabels = {
  income: 'Ingreso',
  expense: 'Gasto',
} as const;

// Default colors for categories
export const defaultCategoryColors = {
  income: [
    '#10B981', // emerald-500
    '#059669', // emerald-600
    '#047857', // emerald-700
    '#065F46', // emerald-800
    '#064E3B', // emerald-900
  ],
  expense: [
    '#EF4444', // red-500
    '#DC2626', // red-600
    '#B91C1C', // red-700
    '#991B1B', // red-800
    '#7F1D1D', // red-900
    '#F97316', // orange-500
    '#EA580C', // orange-600
    '#C2410C', // orange-700
    '#9A3412', // orange-800
    '#7C2D12', // orange-900
    '#8B5CF6', // violet-500
    '#7C3AED', // violet-600
    '#6D28D9', // violet-700
    '#5B21B6', // violet-800
    '#4C1D95', // violet-900
  ],
} as const;

// Function to get a random default color for a category type
export const getRandomCategoryColor = (type: CategoryType): string => {
  const colors = defaultCategoryColors[type];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Type exports
export type CategoryFormData = z.infer<typeof categorySchema>;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>;
export type CategoryType = (typeof categoryTypes)[number];
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { 
  categorySchema, 
  categoryTypeLabels, 
  getRandomCategoryColor,
  type CategoryFormData, 
  type CategoryType 
} from '@/lib/validations/categories';
import type { Tables } from '@/types/supabase';

type Category = Tables<'categories'>;

interface CategoryFormProps {
  organizationId: string;
  category?: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Color picker component
const ColorPicker = ({ 
  value, 
  onChange, 
  type 
}: { 
  value?: string; 
  onChange: (color: string) => void;
  type: CategoryType;
}) => {
  const incomeColors = [
    '#10B981', '#059669', '#047857', '#065F46', '#064E3B',
    '#22C55E', '#16A34A', '#15803D', '#166534', '#14532D',
  ];
  
  const expenseColors = [
    '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
    '#F97316', '#EA580C', '#C2410C', '#9A3412', '#7C2D12',
    '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95',
    '#EC4899', '#DB2777', '#BE185D', '#9D174D', '#831843',
  ];

  const colors = type === 'income' ? incomeColors : expenseColors;

  return (
    <div className="space-y-2">
      <Label>Color</Label>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === color 
                ? 'border-gray-900 scale-110' 
                : 'border-gray-300 hover:border-gray-500'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="#000000"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 text-xs"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
        <div 
          className="w-8 h-8 rounded border border-gray-300"
          style={{ backgroundColor: value || '#000000' }}
        />
      </div>
    </div>
  );
};

export function CategoryForm({ organizationId, category, onSuccess, onCancel }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      type: category?.type || 'expense',
      color: category?.color || undefined,
    },
  });

  const watchedType = watch('type');
  const watchedColor = watch('color');

  // Set a random color when type changes and no color is set
  const handleTypeChange = (newType: CategoryType) => {
    setValue('type', newType);
    if (!watchedColor) {
      setValue('color', getRandomCategoryColor(newType));
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setIsSubmitting(true);

      // Set a default color if none is provided
      if (!data.color) {
        data.color = getRandomCategoryColor(data.type);
      }

      if (category) {
        // Update existing category
        await updateCategoryMutation.mutateAsync({
          id: category.id,
          data,
        });
      } else {
        // Create new category
        await createCategoryMutation.mutateAsync({
          ...data,
          organization_id: organizationId,
        });
      }

      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Error submitting category form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {category ? 'Editar Categoría' : 'Nueva Categoría'}
        </CardTitle>
        <CardDescription>
          {category 
            ? 'Modifica los detalles de la categoría existente'
            : 'Crea una nueva categoría para clasificar tus transacciones'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Categoría</Label>
            <Input
              id="name"
              placeholder="Ej: Ventas, Nómina, Renta"
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Category Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Categoría</Label>
            <Select
              value={watchedType}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona el tipo de categoría" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
            <p className="text-xs text-gray-500">
              {watchedType === 'income' 
                ? 'Para dinero que entra a tu negocio' 
                : 'Para dinero que sale de tu negocio'
              }
            </p>
          </div>

          {/* Color Picker */}
          <ColorPicker
            value={watchedColor}
            onChange={(color) => setValue('color', color)}
            type={watchedType}
          />
          {errors.color && (
            <p className="text-sm text-red-500">{errors.color.message}</p>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting
                ? (category ? 'Actualizando...' : 'Creando...')
                : (category ? 'Actualizar Categoría' : 'Crear Categoría')
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
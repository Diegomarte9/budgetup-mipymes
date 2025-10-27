import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import type { CategoryFormData, CategoryType } from '@/lib/validations/categories';

// Types
type Category = Tables<'categories'>;
type CreateCategoryData = TablesInsert<'categories'>;
type UpdateCategoryData = TablesUpdate<'categories'>;

interface CreateCategoryResponse {
  category: Category;
  message: string;
}

interface UpdateCategoryResponse {
  category: Category;
  message: string;
}

interface DeleteCategoryResponse {
  message: string;
}

// API functions
const fetchCategories = async (organizationId: string, type?: CategoryType): Promise<Category[]> => {
  try {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (type) {
      params.append('type', type);
    }
    
    const response = await fetch(`/api/categories?${params.toString()}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No categories found, return empty array
      }
      
      let errorMessage = 'Error al obtener las categorías';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If we can't parse the error response, use default message
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return Array.isArray(data.categories) ? data.categories : [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de conexión al obtener las categorías');
  }
};

const createCategory = async (categoryData: CategoryFormData & { organization_id: string }): Promise<Category> => {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear la categoría');
  }

  const data: CreateCategoryResponse = await response.json();
  return data.category;
};

const updateCategory = async (id: string, categoryData: Partial<CategoryFormData>): Promise<Category> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar la categoría');
  }

  const data: UpdateCategoryResponse = await response.json();
  return data.category;
};

const deleteCategory = async (id: string): Promise<void> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar la categoría');
  }
};

// Hooks
export function useCategories(organizationId: string, type?: CategoryType) {
  return useQuery({
    queryKey: ['categories', organizationId, type],
    queryFn: () => fetchCategories(organizationId, type),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: (newCategory) => {
      // Update the categories list in cache
      queryClient.setQueryData(
        ['categories', newCategory.organization_id],
        (oldCategories: Category[] | undefined) => {
          if (!oldCategories) return [newCategory];
          return [...oldCategories, newCategory].sort((a, b) => {
            // Sort by type first, then by name
            if (a.type !== b.type) {
              return a.type === 'income' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
        }
      );

      // Also update type-specific caches
      queryClient.setQueryData(
        ['categories', newCategory.organization_id, newCategory.type],
        (oldCategories: Category[] | undefined) => {
          if (!oldCategories) return [newCategory];
          return [...oldCategories, newCategory].sort((a, b) => a.name.localeCompare(b.name));
        }
      );
      
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['categories', newCategory.organization_id] 
      });
      
      toast.success('Categoría creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryFormData> }) =>
      updateCategory(id, data),
    onSuccess: (updatedCategory) => {
      // Update the specific category in cache
      queryClient.setQueryData(
        ['categories', updatedCategory.organization_id],
        (oldCategories: Category[] | undefined) => {
          if (!oldCategories) return [updatedCategory];
          return oldCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category
          ).sort((a, b) => {
            // Sort by type first, then by name
            if (a.type !== b.type) {
              return a.type === 'income' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
        }
      );

      // Update type-specific caches
      queryClient.setQueryData(
        ['categories', updatedCategory.organization_id, updatedCategory.type],
        (oldCategories: Category[] | undefined) => {
          if (!oldCategories) return [updatedCategory];
          return oldCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category
          ).sort((a, b) => a.name.localeCompare(b.name));
        }
      );
      
      toast.success('Categoría actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_, deletedId) => {
      // Remove the category from all organization caches
      queryClient.setQueriesData(
        { queryKey: ['categories'] },
        (oldCategories: Category[] | undefined) => {
          if (!oldCategories) return [];
          return oldCategories.filter((category) => category.id !== deletedId);
        }
      );
      
      toast.success('Categoría eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Helper hook to get a single category
export function useCategory(organizationId: string, categoryId: string) {
  const { data: categories } = useCategories(organizationId);
  return categories?.find(category => category.id === categoryId);
}

// Helper hook to get categories by type
export function useIncomeCategories(organizationId: string) {
  return useCategories(organizationId, 'income');
}

export function useExpenseCategories(organizationId: string) {
  return useCategories(organizationId, 'expense');
}
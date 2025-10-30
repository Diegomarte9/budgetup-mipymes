'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { CategoryForm } from '@/components/forms/CategoryForm';
import { categoryTypeLabels, type CategoryType } from '@/lib/validations/categories';
import { CategoryListSkeleton } from '@/components/ui/skeleton-loaders';
import type { Tables } from '@/types/supabase';
import { MoreHorizontal, Edit, Trash2, Plus, Tag } from 'lucide-react';


type Category = Tables<'categories'>;

interface CategoryListProps {
  organizationId: string;
  type?: CategoryType;
  showCreateButton?: boolean;
  canManage?: boolean;
}

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  canManage?: boolean;
}

const CategoryCard = ({ category, onEdit, onDelete, canManage = true }: CategoryCardProps) => {
  return (
    <Card className="relative group">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full border border-gray-200"
              style={{ backgroundColor: category.color || '#6B7280' }}
            />
            <div>
              <h3 className="font-medium text-sm">{category.name}</h3>
              <Badge 
                variant={category.type === 'income' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {categoryTypeLabels[category.type]}
              </Badge>
            </div>
          </div>
          
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(category)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(category)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export function CategoryList({ organizationId, type, showCreateButton = true, canManage = true }: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: categories, isLoading, error } = useCategories(organizationId, type);
  const deleteCategoryMutation = useDeleteCategory();

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
      try {
        await deleteCategoryMutation.mutateAsync(category.id);
      } catch (error) {
        // Error is handled by the mutation hook
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingCategory(null);
  };

  if (isLoading) {
    return <CategoryListSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-end">
          {showCreateButton && canManage && (
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          )}
        </div>
        
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-2">Error al cargar las categorías</p>
            <p className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const incomeCategories = categories?.filter(cat => cat.type === 'income') || [];
  const expenseCategories = categories?.filter(cat => cat.type === 'expense') || [];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        {showCreateButton && canManage && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Categoría</DialogTitle>
                <DialogDescription>
                  Crea una nueva categoría para clasificar tus transacciones
                </DialogDescription>
              </DialogHeader>
              <CategoryForm
                organizationId={organizationId}
                onSuccess={handleCreateSuccess}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Categories Display */}
      {!type ? (
        // Show both income and expense categories
        <div className="space-y-6">
          {/* Income Categories */}
          {incomeCategories.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-3 text-green-700">
                Categorías de Ingreso ({incomeCategories.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {incomeCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expense Categories */}
          {expenseCategories.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-3 text-red-700">
                Categorías de Gasto ({expenseCategories.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {expenseCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Show only categories of the specified type
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {(!categories || categories.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Tag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay categorías</h3>
            <p className="text-gray-500 mb-4">
              {type 
                ? `No tienes categorías de ${categoryTypeLabels[type]} creadas aún.`
                : 'No tienes categorías creadas aún.'
              }
            </p>
            {showCreateButton && canManage && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Categoría
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Categoría</DialogTitle>
                    <DialogDescription>
                      Crea una nueva categoría para clasificar tus transacciones
                    </DialogDescription>
                  </DialogHeader>
                  <CategoryForm
                    organizationId={organizationId}
                    onSuccess={handleCreateSuccess}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la categoría
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              organizationId={organizationId}
              category={editingCategory}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
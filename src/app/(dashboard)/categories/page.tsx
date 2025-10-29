'use client';

import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { CategoryList } from '@/components/categories/CategoryList';
import { CategoryForm } from '@/components/forms/CategoryForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/error-boundary';
import { CategoryListSkeleton } from '@/components/ui/skeleton-loaders';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export default function CategoriesPage() {
  const { currentOrganization, currentMembership, isLoading, error } = useOrganization();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Categorías' }
  ];

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  if (isLoading) {
    return <CategoryListSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Categorías" 
          breadcrumbs={breadcrumbs}
        />
        <ErrorState 
          title="Error al cargar la organización"
          message={error instanceof Error ? error.message : 'Error desconocido'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!currentOrganization || !currentMembership) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Categorías" 
          breadcrumbs={breadcrumbs}
        />
        <ErrorState 
          title="Organización no encontrada"
          message="Selecciona una organización para ver las categorías"
          showRetry={false}
        />
      </div>
    );
  }

  const canManage = ['owner', 'admin'].includes(currentMembership.role);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Categorías" 
        description="Gestiona las categorías para clasificar tus ingresos y gastos"
        breadcrumbs={breadcrumbs}
      >
        {canManage && (
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
                organizationId={currentOrganization.id}
                onSuccess={handleCreateSuccess}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>
      
      <CategoryList 
        organizationId={currentOrganization.id} 
        canManage={canManage}
        showCreateButton={false}
      />
    </div>
  );
}
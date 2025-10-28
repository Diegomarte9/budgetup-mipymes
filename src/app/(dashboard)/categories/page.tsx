'use client';

import { useOrganization } from '@/hooks/useOrganization';
import { CategoryList } from '@/components/categories/CategoryList';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/error-boundary';
import { CategoryListSkeleton } from '@/components/ui/skeleton-loaders';

export default function CategoriesPage() {
  const { currentOrganization, currentMembership, isLoading, error } = useOrganization();

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Categorías' }
  ];

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
      />
      
      <CategoryList 
        organizationId={currentOrganization.id} 
        canManage={canManage}
      />
    </div>
  );
}
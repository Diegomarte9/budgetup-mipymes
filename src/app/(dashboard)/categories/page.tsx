'use client';

import { useOrganization } from '@/hooks/useOrganization';
import { CategoryList } from '@/components/categories/CategoryList';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function CategoriesPage() {
  const { currentOrganization, currentMembership, isLoading, error } = useOrganization();

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Categorías' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Breadcrumb skeleton */}
          <Skeleton className="h-4 w-48" />
          
          {/* Header skeleton */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-6">
          {/* Income categories skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-4 h-4 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Expense categories skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-4 h-4 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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
'use client';

import { useOrganization } from '@/hooks/useOrganization';
import { AccountList } from '@/components/accounts/AccountList';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function AccountsPage() {
  const { currentOrganization, currentMembership, isLoading, error } = useOrganization();

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Cuentas' }
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
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Cuentas" 
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
          title="Cuentas" 
          breadcrumbs={breadcrumbs}
        />
        <ErrorState 
          title="Organización no encontrada"
          message="Selecciona una organización para ver las cuentas"
          showRetry={false}
        />
      </div>
    );
  }

  const canManage = ['owner', 'admin'].includes(currentMembership.role);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cuentas" 
        description="Gestiona las cuentas financieras de tu organización"
        breadcrumbs={breadcrumbs}
      />
      
      <AccountList 
        organizationId={currentOrganization.id}
        canManage={canManage}
      />
    </div>
  );
}
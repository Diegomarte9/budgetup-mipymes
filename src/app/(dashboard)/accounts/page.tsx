'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { AccountList } from '@/components/accounts/AccountList';
import { AccountBalanceSummary } from '@/components/accounts/AccountBalanceSummary';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/error-boundary';
import { AccountListSkeleton } from '@/components/ui/skeleton-loaders';
import { Button } from '@/components/ui/button';

export default function AccountsPage() {
  const { currentOrganization, currentMembership, isLoading, error } = useOrganization();
  const [triggerCreateAccount, setTriggerCreateAccount] = useState(0);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Cuentas' }
  ];

  const handleCreateAccount = () => {
    setTriggerCreateAccount(prev => prev + 1);
  };

  if (isLoading) {
    return <AccountListSkeleton />;
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
      >
        {canManage && (
          <Button onClick={handleCreateAccount}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cuenta
          </Button>
        )}
      </PageHeader>
      
      {/* Balance Summary */}
      <AccountBalanceSummary organizationId={currentOrganization.id} />
      
      {/* Account List */}
      <AccountList 
        organizationId={currentOrganization.id}
        canManage={canManage}
        hideCreateButton={true}
        triggerCreate={triggerCreateAccount}
      />
    </div>
  );
}
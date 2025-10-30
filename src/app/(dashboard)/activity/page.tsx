'use client';

import { useOrganization } from '@/hooks/useOrganization';
import { AuditLogsList } from '@/components/audit/AuditLogsList';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingSkeleton } from '@/components/ui/skeleton-loaders';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity } from 'lucide-react';

export default function ActivityPage() {
  const { currentOrganization, isLoading, error } = useOrganization();

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Actividad' }
  ];

  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  if (error || !currentOrganization) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Actividad Reciente"
          description="Registro de todas las acciones realizadas"
          breadcrumbs={breadcrumbs}
        />
        <Alert variant="destructive" className="dark-mode-transition">
          <AlertDescription className="text-responsive-sm">
            Error al cargar la organización. Por favor, intenta de nuevo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Actividad Reciente"
        description={`Registro de todas las acciones realizadas en ${currentOrganization.name}`}
        breadcrumbs={breadcrumbs}
      />

      <AuditLogsList organizationId={currentOrganization.id} />
    </div>
  );
}
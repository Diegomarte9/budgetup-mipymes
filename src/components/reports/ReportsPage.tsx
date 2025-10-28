'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportFilters as ReportFiltersComponent } from './ReportFilters';
import { ReportPreview } from './ReportPreview';
import { ExportButtons } from './ExportButtons';
import { ReportHistory } from './ReportHistory';
import { PageLoadingSkeleton } from '@/components/ui/skeleton-loaders';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import type { DateRange } from 'react-day-picker';

export interface ReportFiltersData {
  dateRange?: DateRange;
  accountId?: string;
  categoryId?: string;
  transactionType?: 'income' | 'expense' | 'transfer' | 'all';
}

interface ReportsPageProps {
  organizationId: string;
}

export function ReportsPage({ organizationId }: ReportsPageProps) {
  const [filters, setFilters] = useState<ReportFiltersData>({
    dateRange: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
      to: new Date(), // Today
    },
    accountId: 'all',
    categoryId: 'all',
    transactionType: 'all',
  });

  // Build transaction filters for API
  const transactionFilters = {
    organizationId,
    ...(filters.transactionType && filters.transactionType !== 'all' && { type: filters.transactionType }),
    ...(filters.accountId && filters.accountId !== 'all' && { accountId: filters.accountId }),
    ...(filters.categoryId && filters.categoryId !== 'all' && { categoryId: filters.categoryId }),
    ...(filters.dateRange?.from && { 
      startDate: filters.dateRange.from.toISOString().split('T')[0] 
    }),
    ...(filters.dateRange?.to && { 
      endDate: filters.dateRange.to.toISOString().split('T')[0] 
    }),
  };

  // Fetch data for filters and preview
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useAccounts(organizationId);
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories(organizationId);
  const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError } = useTransactions(transactionFilters);

  // Combined loading state
  const isLoading = transactionsLoading;
  const hasError = transactionsError;

  const handleFiltersChange = (newFilters: ReportFiltersData) => {
    setFilters(newFilters);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reportes' }
  ];

  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Reportes"
        description="Genera y exporta reportes financieros personalizados"
        breadcrumbs={breadcrumbs}
      />

      {/* Main Content with Tabs */}
      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 dark-mode-transition">
          <TabsTrigger value="generate" className="text-responsive-sm">Generar Reporte</TabsTrigger>
          <TabsTrigger value="history" className="text-responsive-sm">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Filters Section */}
          <Card className="dark-mode-transition">
            <CardHeader>
              <CardTitle className="text-responsive-base">Filtros de Reporte</CardTitle>
              <CardDescription className="text-responsive-sm">
                Configura los criterios para generar tu reporte personalizado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportFiltersComponent
                filters={filters}
                accounts={accounts}
                categories={categories}
                onFiltersChange={handleFiltersChange}
              />
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa de Datos</CardTitle>
              <CardDescription>
                Revisa los datos que se incluirán en tu reporte antes de exportar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportPreview
                transactions={transactions}
                isLoading={isLoading}
                error={hasError}
                filters={filters}
              />
            </CardContent>
          </Card>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Exportar Reporte</CardTitle>
              <CardDescription>
                Descarga tu reporte en el formato que prefieras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportButtons
                organizationId={organizationId}
                filters={filters}
                transactionCount={transactions.length}
                disabled={transactions.length === 0}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <ReportHistory organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
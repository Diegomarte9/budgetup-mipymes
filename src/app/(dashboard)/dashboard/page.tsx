'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useDateRangeMetrics } from '@/hooks/useMetrics';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  Building2,
  BarChart3,
  PieChart,
  Target,
  Receipt,
  CreditCard,
  Wallet,
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  variant: 'default' | 'secondary' | 'outline';
  shortcut?: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { 
    currentOrganization, 
    organizations, 
    switchOrganization, 
    isLoading: orgLoading 
  } = useOrganization();

  // Date range state for filtering
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Metrics with date filtering
  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
  
  const {
    kpis,
    monthlyBalance,
    topCategories,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useDateRangeMetrics(
    currentOrganization?.id || '',
    startDate || '',
    endDate || ''
  );

  // Quick actions for financial management
  const quickActions: QuickAction[] = [
    {
      title: 'Registrar Ingreso',
      description: 'Añade un nuevo ingreso a tu organización',
      icon: TrendingUp,
      href: '/transactions?type=income',
      variant: 'default',
      shortcut: 'I',
    },
    {
      title: 'Registrar Gasto',
      description: 'Registra un nuevo gasto o compra',
      icon: TrendingDown,
      href: '/transactions?type=expense',
      variant: 'secondary',
      shortcut: 'E',
    },
    {
      title: 'Transferencia',
      description: 'Transfiere dinero entre cuentas',
      icon: Receipt,
      href: '/transactions?type=transfer',
      variant: 'outline',
      shortcut: 'T',
    },
    {
      title: 'Ver Cuentas',
      description: 'Administra tus cuentas bancarias y de efectivo',
      icon: Wallet,
      href: '/accounts',
      variant: 'outline',
    },
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!currentOrganization) return;
      
      // Only trigger if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'i':
          window.location.href = '/transactions?type=income';
          break;
        case 'e':
          window.location.href = '/transactions?type=expense';
          break;
        case 't':
          window.location.href = '/transactions?type=transfer';
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentOrganization]);

  // Reset filters
  const handleResetFilters = () => {
    setDateRange(undefined);
  };

  // Show loading while checking auth and organization status
  if (authLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  // No organizations state
  if (!orgLoading && organizations.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Dashboard Financiero"
          description="Bienvenido a BudgetUp para MiPymes"
        />
        
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No tienes organizaciones"
          description="Para comenzar a usar BudgetUp, necesitas crear una organización o unirte a una existente."
          action={{
            label: "Crear Organización",
            href: "/auth/onboarding"
          }}
        />
      </div>
    );
  }

  // No current organization selected
  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Dashboard Financiero"
          description="Selecciona una organización para ver el dashboard"
        />
        
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Selecciona una organización"
          description="Tienes organizaciones disponibles. Selecciona una para ver el dashboard financiero."
          action={{
            label: "Ver Organizaciones",
            href: "/dashboard/settings"
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Dashboard Financiero"
        description={`Resumen financiero de ${currentOrganization.name}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: currentOrganization.name }
        ]}
      >
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </PageHeader>

      {/* Filters */}
      <DashboardFilters
        organizations={organizations.map(org => ({
          id: org.id,
          name: org.name,
        }))}
        currentOrganization={currentOrganization ? {
          id: currentOrganization.id,
          name: currentOrganization.name,
        } : undefined}
        onOrganizationChange={switchOrganization}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onResetFilters={handleResetFilters}
        isLoading={metricsLoading}
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{action.title}</h3>
                        {action.shortcut && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Tecla {action.shortcut}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {action.description}
                    </p>
                    <Button 
                      asChild 
                      variant={action.variant} 
                      size="sm" 
                      className="w-full"
                    >
                      <Link href={action.href}>
                        <Plus className="mr-2 h-4 w-4" />
                        Comenzar
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Error State */}
      {metricsError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar métricas</h3>
              <p className="text-muted-foreground mb-4">
                No se pudieron cargar los datos del dashboard. Por favor, intenta de nuevo.
              </p>
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Charts and KPIs */}
      {!metricsError && (
        <>
          {metricsLoading ? (
            <div className="space-y-6">
              {/* KPI Skeletons */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Chart Skeletons */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="lg:col-span-2">
                  <CardContent className="pt-6">
                    <Skeleton className="h-[350px] w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <Skeleton className="h-[300px] w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <DashboardCharts
              organizationId={currentOrganization.id}
              currency={currentOrganization.currency || 'DOP'}
            />
          )}
        </>
      )}

      {/* Empty State for New Organizations */}
      {!metricsLoading && !metricsError && 
       kpis.data?.current_month_income === 0 && 
       kpis.data?.current_month_expense === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center space-x-2 mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <PieChart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">¡Comienza a registrar transacciones!</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Tu dashboard se verá increíble una vez que comiences a registrar ingresos y gastos. 
                Usa las acciones rápidas de arriba para empezar.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild>
                  <Link href="/transactions?type=income">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Registrar Primer Ingreso
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/accounts">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Configurar Cuentas
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
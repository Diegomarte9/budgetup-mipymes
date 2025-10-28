'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { CardGrid } from '@/components/ui/responsive-grid';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';
import { 
  Loader2, 
  Plus,

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
  const { loading: authLoading } = useAuth();
  const { 
    currentOrganization, 
    organizations, 
    isLoading: orgLoading 
  } = useOrganization();



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
          <span className="text-responsive-xs text-muted-foreground">
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </PageHeader>





      {/* Dashboard Charts and KPIs */}
      <DashboardCharts
        organizationId={currentOrganization.id}
        currency={currentOrganization.currency || 'DOP'}
      />
    </div>
  );
}
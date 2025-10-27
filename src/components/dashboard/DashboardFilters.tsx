'use client';

import React from 'react';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { Card, CardContent } from '@/components/ui/card';

interface Organization {
  id: string;
  name: string;
  role?: string;
}

interface DashboardFiltersProps {
  organizations: Organization[];
  currentOrganization?: Organization;
  onOrganizationChange: (organizationId: string) => void;
  dateRange?: DateRange;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export function DashboardFilters({
  organizations,
  currentOrganization,
  onOrganizationChange,
  dateRange,
  onDateRangeChange,
  onResetFilters,
  isLoading = false,
}: DashboardFiltersProps) {
  const hasActiveFilters = dateRange?.from || dateRange?.to;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Organization Switcher */}
          <div className="w-full sm:w-auto sm:min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">
              Organización
            </label>
            <OrganizationSwitcher
              organizations={organizations}
              currentOrganization={currentOrganization}
              onOrganizationChange={onOrganizationChange}
              disabled={isLoading}
            />
          </div>

          {/* Date Range Picker */}
          <div className="w-full sm:w-auto sm:min-w-[300px]">
            <label className="text-sm font-medium mb-2 block">
              Rango de fechas
            </label>
            <DateRangePicker
              date={dateRange}
              onDateChange={onDateRangeChange}
              placeholder="Todos los períodos"
              disabled={isLoading || !currentOrganization}
            />
          </div>

          {/* Reset Filters */}
          <div className="w-full sm:w-auto">
            <label className="text-sm font-medium mb-2 block opacity-0">
              Acciones
            </label>
            <Button
              variant="outline"
              onClick={onResetFilters}
              disabled={!hasActiveFilters || isLoading}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                Filtros activos: {dateRange?.from && dateRange?.to 
                  ? `${dateRange.from.toLocaleDateString('es-ES')} - ${dateRange.to.toLocaleDateString('es-ES')}`
                  : dateRange?.from 
                    ? `Desde ${dateRange.from.toLocaleDateString('es-ES')}`
                    : 'Filtros personalizados'
                }
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
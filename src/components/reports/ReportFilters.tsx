'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { X, Calendar, Building2, Tag, ArrowUpDown } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import type { Tables } from '@/types/supabase';

type Account = Tables<'accounts'>;
type Category = Tables<'categories'>;

export interface ReportFiltersData {
  dateRange?: DateRange;
  accountId?: string;
  categoryId?: string;
  transactionType?: 'income' | 'expense' | 'transfer' | 'all';
}

interface ReportFiltersProps {
  filters: ReportFiltersData;
  accounts: Account[];
  categories: Category[];
  onFiltersChange: (filters: ReportFiltersData) => void;
}

const transactionTypeOptions = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'transfer', label: 'Transferencias' },
];

const quickDateRanges = [
  {
    label: 'Este mes',
    getValue: () => ({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    }),
  },
  {
    label: 'Mes anterior',
    getValue: () => {
      const now = new Date();
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: firstDayLastMonth, to: lastDayLastMonth };
    },
  },
  {
    label: 'Últimos 3 meses',
    getValue: () => ({
      from: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1),
      to: new Date(),
    }),
  },
  {
    label: 'Este año',
    getValue: () => ({
      from: new Date(new Date().getFullYear(), 0, 1),
      to: new Date(),
    }),
  },
];

export function ReportFilters({
  filters,
  accounts,
  categories,
  onFiltersChange,
}: ReportFiltersProps) {
  const updateFilter = (key: keyof ReportFiltersData, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof ReportFiltersData) => {
    onFiltersChange({
      ...filters,
      [key]: key === 'dateRange' ? undefined : key === 'transactionType' ? 'all' : 'all',
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
      accountId: 'all',
      categoryId: 'all',
      transactionType: 'all',
    });
  };

  const getSelectedAccount = () => {
    return accounts.find(account => account.id === filters.accountId);
  };

  const getSelectedCategory = () => {
    return categories.find(category => category.id === filters.categoryId);
  };

  const getSelectedTransactionType = () => {
    return transactionTypeOptions.find(option => option.value === filters.transactionType);
  };

  const hasActiveFilters = () => {
    return (filters.accountId && filters.accountId !== 'all') || 
           (filters.categoryId && filters.categoryId !== 'all') || 
           (filters.transactionType && filters.transactionType !== 'all');
  };

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Rango de Fechas</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <DateRangePicker
              date={filters.dateRange}
              onDateChange={(dateRange) => updateFilter('dateRange', dateRange)}
              placeholder="Seleccionar rango de fechas"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {quickDateRanges.map((range) => (
              <Button
                key={range.label}
                variant="outline"
                size="sm"
                onClick={() => updateFilter('dateRange', range.getValue())}
                className="text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Transaction Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="transaction-type">Tipo de Transacción</Label>
          <Select
            value={filters.transactionType || 'all'}
            onValueChange={(value) => updateFilter('transactionType', value)}
          >
            <SelectTrigger id="transaction-type">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              {transactionTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Account Filter */}
        <div className="space-y-2">
          <Label htmlFor="account">Cuenta</Label>
          <Select
            value={filters.accountId || 'all'}
            onValueChange={(value) => updateFilter('accountId', value)}
          >
            <SelectTrigger id="account">
              <SelectValue placeholder={accounts.length === 0 ? "No hay cuentas disponibles" : "Todas las cuentas"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Todas las cuentas
                </div>
              </SelectItem>
              {accounts.length === 0 ? (
                <SelectItem value="no-accounts" disabled>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    No hay cuentas disponibles
                  </div>
                </SelectItem>
              ) : (
                accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {account.name} ({account.type})
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Select
            value={filters.categoryId || 'all'}
            onValueChange={(value) => updateFilter('categoryId', value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder={categories.length === 0 ? "No hay categorías disponibles" : "Todas las categorías"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Todas las categorías
                </div>
              </SelectItem>
              {categories.length === 0 ? (
                <SelectItem value="no-categories" disabled>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    No hay categorías disponibles
                  </div>
                </SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color || '#gray' }}
                      />
                      {category.name} ({category.type === 'income' ? 'Ingreso' : 'Gasto'})
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters() && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Filtros Activos</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Limpiar todos
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.transactionType && filters.transactionType !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                {getSelectedTransactionType()?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => clearFilter('transactionType')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.accountId && filters.accountId !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {getSelectedAccount()?.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => clearFilter('accountId')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.categoryId && filters.categoryId !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getSelectedCategory()?.color || '#gray' }}
                />
                {getSelectedCategory()?.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => clearFilter('categoryId')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Date Range Display */}
      {filters.dateRange?.from && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {filters.dateRange.from.toLocaleDateString('es-DO')}
            {filters.dateRange.to && (
              <> - {filters.dateRange.to.toLocaleDateString('es-DO')}</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
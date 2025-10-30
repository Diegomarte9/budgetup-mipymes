'use client';

import React from 'react';
import { KPICards } from './KPICards';
import { MonthlyBalanceChart } from './MonthlyBalanceChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { AccountDonutChart } from './AccountDonutChart';
import { useKPIs, useMonthlyBalance, useTopCategories, useTopAccounts } from '@/hooks/useMetrics';
import type { DashboardMetrics } from '@/types/metrics';

interface DashboardChartsProps {
  organizationId: string;
  currency?: string;
}

interface DashboardChartsWithDataProps {
  data: DashboardMetrics;
  currency?: string;
  isLoading?: boolean;
}

// Component that fetches its own data
export function DashboardCharts({ organizationId, currency = 'DOP' }: DashboardChartsProps) {
  const kpis = useKPIs(organizationId);
  const monthlyBalance = useMonthlyBalance(organizationId, { months: 12 });
  const topCategories = useTopCategories(organizationId, { limit: 5 });
  const topAccounts = useTopAccounts(organizationId, { limit: 5 });



  const isLoading = kpis.isLoading || monthlyBalance.isLoading || topCategories.isLoading || topAccounts.isLoading;
  const hasError = kpis.isError || monthlyBalance.isError || topCategories.isError || topAccounts.isError;

  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Error al cargar los datos del dashboard. Por favor, intenta de nuevo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards 
        data={kpis.data || {
          current_month_income: 0,
          current_month_expense: 0,
          current_month_balance: 0,
          previous_month_income: 0,
          previous_month_expense: 0,
          previous_month_balance: 0,
          income_change_pct: 0,
          expense_change_pct: 0,
          balance_change_pct: 0,
        }}
        currency={currency}
        isLoading={isLoading}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Balance Chart */}
        <div className="lg:col-span-2">
          <MonthlyBalanceChart
            data={monthlyBalance.data?.data || []}
            currency={currency}
            isLoading={isLoading}
            height={350}
          />
        </div>

        {/* Category Donut Chart */}
        <div className="lg:col-span-1">
          <CategoryDonutChart
            data={topCategories.data?.data || []}
            totalExpenses={topCategories.data?.totalExpenses || 0}
            currency={currency}
            isLoading={isLoading}
            height={300}
          />
        </div>

        {/* Account Donut Chart */}
        <div className="lg:col-span-1">
          <AccountDonutChart
            data={topAccounts.data?.data || []}
            totalExpenses={topAccounts.data?.totalExpenses || 0}
            currency={currency}
            isLoading={isLoading}
            height={300}
          />
        </div>
      </div>
    </div>
  );
}

// Component that receives data as props (useful for server components)
export function DashboardChartsWithData({ 
  data, 
  currency = 'DOP', 
  isLoading = false 
}: DashboardChartsWithDataProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards 
        data={data.kpis}
        currency={currency}
        isLoading={isLoading}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Balance Chart */}
        <div className="lg:col-span-2">
          <MonthlyBalanceChart
            data={data.monthlyBalance}
            currency={currency}
            isLoading={isLoading}
            height={350}
          />
        </div>

        {/* Category Donut Chart */}
        <div className="lg:col-span-1">
          <CategoryDonutChart
            data={data.topCategories}
            totalExpenses={data.topCategories.reduce((sum, cat) => sum + cat.total_amount, 0)}
            currency={currency}
            isLoading={isLoading}
            height={300}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;
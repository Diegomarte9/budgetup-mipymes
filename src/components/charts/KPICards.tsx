'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatChangePercentage } from '@/lib/utils/currency';
import { TrendingUp, TrendingDown, DollarSign, Minus } from 'lucide-react';
import type { CurrentMonthKPIs } from '@/types/metrics';

interface KPICardsProps {
  data: CurrentMonthKPIs;
  currency?: string;
  isLoading?: boolean;
}

interface KPICardProps {
  title: string;
  value: number;
  change: number;
  currency: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function KPICard({ title, value, change, currency, icon, isLoading }: KPICardProps) {
  const changeData = formatChangePercentage(change);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="h-4 w-4 animate-pulse bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 animate-pulse bg-muted rounded mb-1" />
          <div className="h-4 w-16 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(value, currency)}
        </div>
        <div className={`flex items-center text-xs ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="ml-1">
            {changeData.symbol}{changeData.formatted} vs mes anterior
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICards({ data, currency = 'DOP', isLoading }: KPICardsProps) {
  const kpis = [
    {
      title: 'Ingresos del Mes',
      value: data.current_month_income,
      change: data.income_change_pct,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: 'Gastos del Mes',
      value: data.current_month_expense,
      change: data.expense_change_pct,
      icon: <TrendingDown className="h-4 w-4" />,
    },
    {
      title: 'Balance Neto',
      value: data.current_month_balance,
      change: data.balance_change_pct,
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi, index) => (
        <KPICard
          key={index}
          title={kpi.title}
          value={kpi.value}
          change={kpi.change}
          currency={currency}
          icon={kpi.icon}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}

export default KPICards;
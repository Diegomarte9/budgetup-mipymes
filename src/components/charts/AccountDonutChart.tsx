'use client';

import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/utils/currency';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface TopExpenseAccount {
  account_id: string;
  account_name: string;
  account_type: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

interface AccountDonutChartProps {
  data: TopExpenseAccount[];
  totalExpenses: number;
  currency?: string;
  isLoading?: boolean;
  height?: number;
}

// Colors based on account types
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  'checking': '#3b82f6', // blue-500
  'savings': '#10b981', // emerald-500
  'credit_card': '#ef4444', // red-500
  'cash': '#f59e0b', // amber-500
  'investment': '#8b5cf6', // violet-500
  'loan': '#f97316', // orange-500
};

// Default colors for accounts (fallback)
const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#64748b', // slate-500
];

export function AccountDonutChart({ 
  data, 
  totalExpenses, 
  currency = 'DOP', 
  isLoading, 
  height = 300 
}: AccountDonutChartProps) {
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Cuenta (Histórico)</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="animate-pulse bg-muted rounded-full mx-auto"
            style={{ 
              height: `${height}px`, 
              width: `${height}px`,
              maxWidth: '100%'
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Cuenta (Histórico)</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: `${height}px` }}
          >
            No hay gastos registrados
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const labels = data.map(item => item.account_name);
  const amounts = data.map(item => item.total_amount);
  const colors = data.map((item, index) => 
    ACCOUNT_TYPE_COLORS[item.account_type] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  );

  const chartData = {
    labels,
    datasets: [
      {
        data: amounts,
        backgroundColor: colors,
        borderColor: colors.map(color => color),
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const amount = data.datasets[0].data[i];
                const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = ((value / totalExpenses) * 100).toFixed(1);
            const formattedValue = formatCurrency(value, currency);
            return `${label}: ${formattedValue} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '60%', // Makes it a donut chart
    elements: {
      arc: {
        borderWidth: 2,
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gastos por Cuenta (Histórico)</span>
          <span className="text-sm font-normal text-muted-foreground">
            Total: {formatCurrency(totalExpenses, currency)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <Doughnut data={chartData} options={options} />
        </div>
        
        {/* Account breakdown list */}
        <div className="mt-4 space-y-2">
          {data.map((account, index) => (
            <div key={account.account_id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: ACCOUNT_TYPE_COLORS[account.account_type] || DEFAULT_COLORS[index % DEFAULT_COLORS.length] 
                  }}
                />
                <span className="font-medium">{account.account_name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  ({account.account_type.replace('_', ' ')})
                </span>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(account.total_amount, currency)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatPercentage(account.percentage)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AccountDonutChart;
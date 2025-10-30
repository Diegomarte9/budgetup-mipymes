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
import type { TopExpenseCategory } from '@/types/metrics';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryDonutChartProps {
  data: TopExpenseCategory[];
  totalExpenses: number;
  currency?: string;
  isLoading?: boolean;
  height?: number;
}

// Default colors for categories (will be used if category doesn't have a color)
const DEFAULT_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f59e0b', // amber-500
];

export function CategoryDonutChart({ 
  data, 
  totalExpenses, 
  currency = 'DOP', 
  isLoading, 
  height = 300 
}: CategoryDonutChartProps) {
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría (Histórico)</CardTitle>
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
          <CardTitle>Gastos por Categoría (Histórico)</CardTitle>
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
  const labels = data.map(item => item.category_name);
  const amounts = data.map(item => item.total_amount);
  const colors = data.map((item, index) => 
    item.category_color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
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
          <span>Gastos por Categoría (Histórico)</span>
          <span className="text-sm font-normal text-muted-foreground">
            Total: {formatCurrency(totalExpenses, currency)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <Doughnut data={chartData} options={options} />
        </div>
        
        {/* Category breakdown list */}
        <div className="mt-4 space-y-2">
          {data.map((category, index) => (
            <div key={category.category_id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: category.category_color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] 
                  }}
                />
                <span className="font-medium">{category.category_name}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(category.total_amount, currency)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatPercentage(category.percentage)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default CategoryDonutChart;
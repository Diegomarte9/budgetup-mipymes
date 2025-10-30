'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import type { MonthlyBalance } from '@/types/metrics';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyBalanceChartProps {
  data: MonthlyBalance[];
  currency?: string;
  isLoading?: boolean;
  height?: number;
}

export function MonthlyBalanceChart({ 
  data, 
  currency = 'DOP', 
  isLoading, 
  height = 300 
}: MonthlyBalanceChartProps) {
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="animate-pulse bg-muted rounded"
            style={{ height: `${height}px` }}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: `${height}px` }}
          >
            No hay datos disponibles para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug: Log all data first to see what we're getting
  if (process.env.NODE_ENV === 'development') {
    console.log('DEBUG MonthlyBalanceChart - Raw data received:', data);
    console.log('DEBUG MonthlyBalanceChart - Data length:', data.length);
    console.log('DEBUG MonthlyBalanceChart - Sample data structure:', data[0]);
  }

  // Filter out any invalid data entries
  const validData = data.filter(item => {
    if (!item || !item.month) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Filtering out item with no month:', item);
      }
      return false;
    }
    
    if (typeof item.month !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Month is not a string:', item.month, typeof item.month);
      }
      return false;
    }
    
    // Validate that it looks like a date string
    if (!item.month.includes('-')) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Month does not contain date separator:', item.month);
      }
      return false;
    }
    
    return true;
  });

  if (validData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: `${height}px` }}
          >
            Los datos de fecha no son válidos
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort data by month to ensure proper chronological order
  const sortedData = [...validData].sort((a, b) => {
    try {
      // Validate month strings
      if (!a.month || !b.month || typeof a.month !== 'string' || typeof b.month !== 'string') {
        return 0; // Keep original order if invalid
      }
      
      // Parse dates correctly to avoid timezone issues
      const partsA = a.month.split('-');
      const partsB = b.month.split('-');
      
      if (partsA.length !== 3 || partsB.length !== 3) {
        return 0; // Keep original order if invalid format
      }
      
      const [yearA, monthA, dayA] = partsA.map(Number);
      const [yearB, monthB, dayB] = partsB.map(Number);
      
      // Validate parsed numbers
      if (isNaN(yearA) || isNaN(monthA) || isNaN(dayA) || 
          isNaN(yearB) || isNaN(monthB) || isNaN(dayB)) {
        return 0; // Keep original order if invalid numbers
      }
      
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      
      // Validate dates
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0; // Keep original order if invalid dates
      }
      
      return dateA.getTime() - dateB.getTime();
    } catch (error) {
      console.error('Error sorting dates:', error);
      return 0; // Keep original order if any error
    }
  });

  // Debug: Log the data to see what we're getting (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('DEBUG MonthlyBalanceChart - Raw data:', data.slice(0, 3));
    console.log('DEBUG MonthlyBalanceChart - Valid data:', validData.slice(0, 3));
    console.log('DEBUG MonthlyBalanceChart - Sorted data:', sortedData.slice(0, 3));
    console.log('DEBUG MonthlyBalanceChart - All month values:', data.map(item => item.month));
    console.log('DEBUG MonthlyBalanceChart - Valid month values:', validData.map(item => item.month));
  }

  // Format month labels
  const labels = sortedData.map(item => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing label for month:', item.month);
    }
    
    try {
      // Use ONLY manual parsing to avoid timezone issues
      if (typeof item.month === 'string') {
        // Handle different date formats
        let parts;
        
        if (item.month.includes('T')) {
          // Handle ISO format like "2024-01-01T00:00:00.000Z"
          parts = item.month.split('T')[0].split('-');
        } else if (item.month.includes('-')) {
          // Handle simple format like "2024-01-01"
          parts = item.month.split('-');
        }
        
        if (parts && parts.length >= 3) {
          const [year, month, day] = parts.map(Number);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            // Create date using manual parsing (month - 1 because Date constructor expects 0-based month)
            const date = new Date(year, month - 1, day);
            
            if (!isNaN(date.getTime())) {
              const formatted = date.toLocaleDateString('es-DO', { 
                month: 'short', 
                year: 'numeric' 
              });
              
              if (process.env.NODE_ENV === 'development') {
                console.log('Successfully formatted:', item.month, '->', formatted);
              }
              
              return formatted;
            }
          }
        }
      }
      
      // If manual parsing failed, try to extract year and month from string
      const match = item.month.match(/(\d{4})-(\d{1,2})/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        if (!isNaN(year) && !isNaN(month)) {
          const date = new Date(year, month - 1, 1);
          return date.toLocaleDateString('es-DO', { 
            month: 'short', 
            year: 'numeric' 
          });
        }
      }
      
      // Final fallback - return a generic label
      console.warn('Could not parse date:', item.month);
      return 'Fecha inválida';
      
    } catch (error) {
      console.error('Error parsing date:', item.month, error);
      return 'Fecha inválida';
    }
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: sortedData.map(item => item.income),
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Gastos',
        data: sortedData.map(item => item.expense),
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Balance Neto',
        data: sortedData.map(item => item.net_balance),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = formatCurrency(context.parsed.y, currency);
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          maxRotation: 45,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return formatCurrency(value, currency);
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    elements: {
      line: {
        borderWidth: 2,
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Mensual - Últimos 12 Meses</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

export default MonthlyBalanceChart;
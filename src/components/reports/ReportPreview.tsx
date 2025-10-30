'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { TrendingUp, TrendingDown, ArrowRightLeft, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import type { Tables } from '@/types/supabase';
import type { ReportFiltersData } from './ReportFilters';

type Transaction = Tables<'transactions'>;

interface ReportPreviewProps {
  transactions: Transaction[];
  isLoading: boolean;
  error?: Error | null;
  filters: ReportFiltersData;
}

interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  netBalance: number;
  transactionCount: number;
}

const getTransactionTypeIcon = (type: string) => {
  switch (type) {
    case 'income':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'expense':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    case 'transfer':
      return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getTransactionTypeLabel = (type: string) => {
  switch (type) {
    case 'income':
      return 'Ingreso';
    case 'expense':
      return 'Gasto';
    case 'transfer':
      return 'Transferencia';
    default:
      return type;
  }
};

const getTransactionTypeBadgeVariant = (type: string) => {
  switch (type) {
    case 'income':
      return 'default' as const;
    case 'expense':
      return 'destructive' as const;
    case 'transfer':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
};

export function ReportPreview({ transactions, isLoading, error, filters }: ReportPreviewProps) {
  const summary = useMemo((): TransactionSummary => {
    if (!transactions.length) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfers: 0,
        netBalance: 0,
        transactionCount: 0,
      };
    }

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalTransfers = transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      totalTransfers,
      netBalance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  const formatDate = (dateString: string) => {
    // Parse the date string as YYYY-MM-DD to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="border rounded-lg">
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        {/* Empty Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {formatCurrency(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {formatCurrency(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {formatCurrency(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                0
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Error al cargar datos</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              No se pudieron cargar las transacciones. Esto puede deberse a un problema de conexión 
              o que aún no hay datos disponibles en tu organización.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(summary.netBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.transactionCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Transacciones Incluidas</h3>
          {transactions.length > 0 && (
            <Badge variant="outline">
              {transactions.length} transacción{transactions.length !== 1 ? 'es' : ''}
            </Badge>
          )}
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay transacciones</h3>
              <p className="text-muted-foreground text-center max-w-md">
                No se encontraron transacciones que coincidan con los filtros seleccionados. 
                Intenta ajustar los criterios de búsqueda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.occurred_at)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {transaction.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getTransactionTypeBadgeVariant(transaction.type)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getTransactionTypeIcon(transaction.type)}
                        {getTransactionTypeLabel(transaction.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {/* This would need account name lookup */}
                        Cuenta
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={
                        transaction.type === 'income' ? 'text-green-600' :
                        transaction.type === 'expense' ? 'text-red-600' :
                        'text-blue-600'
                      }>
                        {transaction.type === 'expense' ? '-' : ''}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {transactions.length > 10 && (
              <div className="border-t p-4 text-center text-sm text-muted-foreground">
                Mostrando las primeras 10 transacciones de {transactions.length} total.
                El reporte completo incluirá todas las transacciones.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
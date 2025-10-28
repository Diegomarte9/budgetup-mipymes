'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { AccountBalanceSummarySkeleton } from '@/components/ui/skeleton-loaders';

interface AccountBalanceSummaryProps {
  organizationId: string;
}

export function AccountBalanceSummary({ organizationId }: AccountBalanceSummaryProps) {
  const { data: balances, isLoading, error } = useAccountBalances(organizationId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return <AccountBalanceSummarySkeleton />;
  }

  if (error || !balances) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-600">Error al cargar el resumen de balances</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalCurrentBalance = balances.reduce((sum, account) => sum + account.current_balance, 0);
  const totalInitialBalance = balances.reduce((sum, account) => sum + account.initial_balance, 0);
  const totalChange = totalCurrentBalance - totalInitialBalance;
  const hasPositiveChange = totalChange > 0;
  const hasNegativeChange = totalChange < 0;

  // Group by account type
  const accountsByType = balances.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = { count: 0, balance: 0 };
    }
    acc[account.type].count += 1;
    acc[account.type].balance += account.current_balance;
    return acc;
  }, {} as Record<string, { count: number; balance: number }>);

  const typeLabels = {
    cash: 'Efectivo',
    bank: 'Banco',
    credit_card: 'Tarjeta de Crédito'
  };

  const typeIcons = {
    cash: DollarSign,
    bank: Wallet,
    credit_card: TrendingDown
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCurrentBalance)}</div>
          {totalChange !== 0 && (
            <div className="flex items-center space-x-1 text-xs">
              {hasPositiveChange ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={hasPositiveChange ? 'text-green-600' : 'text-red-600'}>
                {hasPositiveChange ? '+' : ''}{formatCurrency(totalChange)}
              </span>
              <span className="text-muted-foreground">desde inicial</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Types */}
      {Object.entries(accountsByType).map(([type, data]) => {
        const IconComponent = typeIcons[type as keyof typeof typeIcons] || Wallet;
        const label = typeLabels[type as keyof typeof typeLabels] || type;
        
        return (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.balance)}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {data.count} cuenta{data.count !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
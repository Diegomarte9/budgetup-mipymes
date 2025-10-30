'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { TransactionModal } from '@/components/forms/TransactionModal';
import { TransactionImport } from '@/components/forms/TransactionImport';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useOrganization } from '@/hooks/useOrganization';
import { useTransactionShortcuts } from '@/hooks/useKeyboardShortcuts';
import { transactionTypeLabels, type TransactionType } from '@/lib/validations/transactions';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateForDisplay, formatDateForInput } from '@/lib/utils/date';
import { useTransactionTotals } from '@/hooks/useTransactionTotals';
import { TransactionListSkeleton } from '@/components/ui/skeleton-loaders';
import { MobileButton } from '@/components/ui/mobile-button';
import { Pencil, Trash2, Filter, X, ChevronLeft, ChevronRight, Upload, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/types/supabase';

type Transaction = Tables<'transactions'>;

interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  month?: string;
  year?: string;
  search?: string;
}

const ITEMS_PER_PAGE = 20;

export default function TransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [createTransactionType, setCreateTransactionType] = useState<TransactionType>('expense');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({});
  
  // Get current organization
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';

  // Fetch data
  const { data: accounts = [] } = useAccounts(organizationId);
  const { data: categories = [] } = useCategories(organizationId);
  
  // Calculate pagination
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  
  // Calculate date range from month/year filters
  const getDateRangeFromFilters = () => {
    if (!filters.month || !filters.year) return { startDate: undefined, endDate: undefined };
    
    const year = parseInt(filters.year);
    const month = parseInt(filters.month);
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRangeFromFilters();

  // Fetch transactions with filters
  const { data: transactions = [], isLoading, refetch } = useTransactions({
    organizationId,
    type: filters.type,
    accountId: filters.accountId,
    categoryId: filters.categoryId,
    startDate,
    endDate,
    limit: ITEMS_PER_PAGE,
    offset,
  });

  // Get totals for all filtered transactions (not just current page)
  const { totals: transactionTotals, loading: totalsLoading } = useTransactionTotals({
    organizationId,
    type: filters.type || undefined,
    accountId: filters.accountId || undefined,
    categoryId: filters.categoryId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: filters.search || undefined,
  });

  // Delete mutation
  const deleteTransactionMutation = useDeleteTransaction();

  // Filter transactions by search term (client-side)
  const filteredTransactions = useMemo(() => {
    if (!filters.search) return transactions;
    
    const searchTerm = filters.search.toLowerCase();
    return transactions.filter(transaction =>
      transaction.description.toLowerCase().includes(searchTerm) ||
      transaction.notes?.toLowerCase().includes(searchTerm)
    );
  }, [transactions, filters.search]);



  // Calculate total pages (approximate, since we don't have total count)
  const hasNextPage = transactions.length === ITEMS_PER_PAGE;
  const hasPrevPage = currentPage > 1;

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    try {
      await deleteTransactionMutation.mutateAsync(transaction.id);
      refetch();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedTransaction(undefined);
    refetch();
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    refetch();
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  const openCreateModal = (type: TransactionType) => {
    setCreateTransactionType(type);
    setIsCreateModalOpen(true);
  };

  // Keyboard shortcuts for creating transactions
  useTransactionShortcuts({
    onCreateIncome: () => openCreateModal('income'),
    onCreateExpense: () => openCreateModal('expense'),
    onCreateTransfer: () => openCreateModal('transfer'),
  });

  if (!organizationId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">
              Selecciona una organización para ver las transacciones
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Transacciones' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Transacciones"
        description="Gestiona los ingresos, gastos y transferencias de tu organización"
        breadcrumbs={breadcrumbs}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {Object.values(filters).filter(v => v).length}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          
          <Button
            size="sm"
            onClick={() => openCreateModal('expense')}
            className="flex items-center gap-2"
          >
            + Nueva Transacción
          </Button>
        </div>
      </PageHeader>



      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Filtros</CardTitle>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Limpiar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Descripción o notas..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(value) => handleFilterChange('type', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {Object.entries(transactionTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
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
                  onValueChange={(value) => handleFilterChange('accountId', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las cuentas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={filters.categoryId || 'all'}
                  onValueChange={(value) => handleFilterChange('categoryId', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color || '#gray' }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month and Year Filter */}
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={filters.month || 'all'}
                  onValueChange={(value) => handleFilterChange('month', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    <SelectItem value="1">Enero</SelectItem>
                    <SelectItem value="2">Febrero</SelectItem>
                    <SelectItem value="3">Marzo</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Mayo</SelectItem>
                    <SelectItem value="6">Junio</SelectItem>
                    <SelectItem value="7">Julio</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Septiembre</SelectItem>
                    <SelectItem value="10">Octubre</SelectItem>
                    <SelectItem value="11">Noviembre</SelectItem>
                    <SelectItem value="12">Diciembre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="space-y-2">
                <Label>Año</Label>
                <Select
                  value={filters.year || 'all'}
                  onValueChange={(value) => handleFilterChange('year', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los años" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Totals Summary */}
      {filteredTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen Financiero</CardTitle>
            <CardDescription>
              {hasActiveFilters 
                ? 'Totales basados en los filtros aplicados'
                : 'Totales de todas las transacciones'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid-mobile-1 gap-mobile">
              {/* Income Card */}
              <Card className="hover:shadow-md transition-shadow dark-mode-transition">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-responsive-xs font-medium text-muted-foreground">
                    Ingresos {hasActiveFilters ? '(Filtrados)' : ''}
                  </CardTitle>
                  <div className="h-4 w-4 text-muted-foreground shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-responsive-xl font-bold text-green-600">
                    {totalsLoading ? 'Calculando...' : formatCurrency(transactionTotals.income)}
                  </div>
                  <div className="flex items-center text-responsive-xs text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="ml-1 truncate">
                      Entradas de dinero
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Card */}
              <Card className="hover:shadow-md transition-shadow dark-mode-transition">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-responsive-xs font-medium text-muted-foreground">
                    Gastos {hasActiveFilters ? '(Filtrados)' : ''}
                  </CardTitle>
                  <div className="h-4 w-4 text-muted-foreground shrink-0">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-responsive-xl font-bold text-red-600">
                    {totalsLoading ? 'Calculando...' : formatCurrency(transactionTotals.expense)}
                  </div>
                  <div className="flex items-center text-responsive-xs text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="ml-1 truncate">
                      Salidas de dinero
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Net Balance Card */}
              <Card className="hover:shadow-md transition-shadow dark-mode-transition">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-responsive-xs font-medium text-muted-foreground">
                    Balance Neto {hasActiveFilters ? '(Filtrado)' : ''}
                  </CardTitle>
                  <div className="h-4 w-4 text-muted-foreground shrink-0">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-responsive-xl font-bold ${
                    transactionTotals.net >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {totalsLoading ? 'Calculando...' : `${transactionTotals.net >= 0 ? '+' : ''}${formatCurrency(transactionTotals.net)}`}
                  </div>
                  <div className={`flex items-center text-responsive-xs ${
                    transactionTotals.net >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transactionTotals.net >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="ml-1 truncate">
                      {transactionTotals.net >= 0 ? 'Ganancia' : 'Pérdida'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional info */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <span>
                  {totalsLoading ? 'Calculando...' : `${transactionTotals.count} transacciones`}
                  {hasActiveFilters && ' (filtradas)'}
                </span>
                <span>
                  Volumen total: {totalsLoading ? 'Calculando...' : formatCurrency(transactionTotals.total)}
                </span>
              </div>
              
              {/* Show filter impact if filters are active */}
              {hasActiveFilters && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  💡 Los totales mostrados reflejan únicamente las transacciones que coinciden con tus filtros
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lista de Transacciones</CardTitle>
              <CardDescription>
                {totalsLoading ? 'Calculando...' : `${transactionTotals.count} transacciones`}
                {hasActiveFilters ? ' encontradas con los filtros aplicados' : ' en total'}
              </CardDescription>
            </div>
            
            {/* Pagination Info */}
            <div className="text-sm text-gray-500">
              Página {currentPage}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TransactionListSkeleton />
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                {hasActiveFilters 
                  ? 'No se encontraron transacciones con los filtros aplicados'
                  : 'No hay transacciones registradas'
                }
              </p>
              {!hasActiveFilters && (
                <Button onClick={() => openCreateModal('expense')}>
                  Crear Primera Transacción
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {transactionTypeLabels[transaction.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            {transaction.notes && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {transaction.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{(transaction as any).account?.name || 'N/A'}</p>
                            {transaction.type === 'transfer' && (transaction as any).transfer_to_account && (
                              <p className="text-gray-500">
                                → {(transaction as any).transfer_to_account.name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(transaction as any).category ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: (transaction as any).category.color || '#gray' }}
                              />
                              <span className="text-sm">{(transaction as any).category.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDateForDisplay(transaction.occurred_at)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className={`font-medium ${
                            transaction.type === 'income' ? 'text-green-600' :
                            transaction.type === 'expense' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {transaction.type === 'expense' ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente la transacción "{transaction.description}" por {formatCurrency(transaction.amount)}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTransaction(transaction)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Mostrando {filteredTransactions.length} de {totalsLoading ? '...' : transactionTotals.count} transacciones
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={!hasPrevPage}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!hasNextPage}
                    className="flex items-center gap-2"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      <TransactionModal
        organizationId={organizationId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        transaction={selectedTransaction}
        onSuccess={handleEditSuccess}
      />

      {/* Create Transaction Modal */}
      <TransactionModal
        organizationId={organizationId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultType={createTransactionType}
        onSuccess={handleCreateSuccess}
      />

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <TransactionImport
                organizationId={organizationId}
                onSuccess={handleImportSuccess}
                onClose={() => setIsImportModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
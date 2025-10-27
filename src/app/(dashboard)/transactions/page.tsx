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
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useOrganization } from '@/hooks/useOrganization';
import { useTransactionShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatCurrency, transactionTypeLabels, type TransactionType } from '@/lib/validations/transactions';
import { Pencil, Trash2, Filter, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/types/supabase';

type Transaction = Tables<'transactions'>;

interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
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
  
  // Fetch transactions with filters
  const { data: transactions = [], isLoading, refetch } = useTransactions({
    organizationId,
    type: filters.type,
    accountId: filters.accountId,
    categoryId: filters.categoryId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit: ITEMS_PER_PAGE,
    offset,
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transacciones</h1>
          <p className="text-gray-600">
            Gestiona los ingresos, gastos y transferencias de tu organización
          </p>
        </div>
        
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
            onClick={() => openCreateModal('expense')}
            className="flex items-center gap-2"
          >
            + Nueva Transacción
          </Button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          <CardDescription>
            Usa estos botones o atajos de teclado (I/E/T) para crear transacciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => openCreateModal('income')}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              + Ingreso (I)
            </Button>
            <Button
              onClick={() => openCreateModal('expense')}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              + Gasto (E)
            </Button>
            <Button
              onClick={() => openCreateModal('transfer')}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              + Transferencia (T)
            </Button>
          </div>
        </CardContent>
      </Card>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
                  value={filters.type || ''}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los tipos</SelectItem>
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
                  value={filters.accountId || ''}
                  onValueChange={(value) => handleFilterChange('accountId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las cuentas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las cuentas</SelectItem>
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
                  value={filters.categoryId || ''}
                  onValueChange={(value) => handleFilterChange('categoryId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
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

              {/* Date Range */}
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <Label>Rango de Fechas</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Desde"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Hasta"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>
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
                {filteredTransactions.length} transacciones encontradas
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
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando transacciones...</p>
            </div>
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
                          <Badge
                            variant={
                              transaction.type === 'income' ? 'default' :
                              transaction.type === 'expense' ? 'destructive' :
                              'secondary'
                            }
                          >
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
                            <p>{new Date(transaction.occurred_at).toLocaleDateString('es-DO')}</p>
                            {transaction.itbis_pct && transaction.itbis_pct > 0 && (
                              <p className="text-xs text-gray-500">
                                ITBIS: {transaction.itbis_pct}%
                              </p>
                            )}
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
                  Mostrando {filteredTransactions.length} transacciones
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
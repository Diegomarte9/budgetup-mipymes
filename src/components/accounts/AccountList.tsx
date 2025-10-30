'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { AccountCard } from './AccountCard';
import { AccountForm } from '@/components/forms/AccountForm';
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { accountTypeLabels, type AccountType } from '@/lib/validations/accounts';
import { AccountListSkeleton } from '@/components/ui/skeleton-loaders';
import type { Tables } from '@/types/supabase';

type Account = Tables<'accounts'>;

interface AccountListProps {
  organizationId: string;
  canManage?: boolean;
  hideCreateButton?: boolean;
  triggerCreate?: number;
}

export function AccountList({ 
  organizationId, 
  canManage = false, 
  hideCreateButton = false,
  triggerCreate = 0
}: AccountListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const { data: accounts, isLoading, error } = useAccounts(organizationId);
  const { data: balances, isLoading: balancesLoading } = useAccountBalances(organizationId);

  // Filter accounts based on search term and type
  const filteredAccounts = accounts?.filter((account) => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || account.type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditingAccount(null);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
  };

  // Handle external trigger to create account
  useEffect(() => {
    if (triggerCreate > 0) {
      setIsCreateDialogOpen(true);
    }
  }, [triggerCreate]);

  if (isLoading || balancesLoading) {
    return <AccountListSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Header Actions - Only show if not hidden */}
        {!hideCreateButton && (
          <div className="flex justify-end">
            {canManage && (
              <Button disabled>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Cuenta
              </Button>
            )}
          </div>
        )}
        
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error al cargar las cuentas</p>
          <p className="text-sm text-gray-500 mb-4">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions - Only show if not hidden */}
      {!hideCreateButton && (
        <div className="flex justify-end">
          {canManage && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cuenta
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar cuentas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(value: AccountType | 'all') => setTypeFilter(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Accounts Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-12">
          {accounts?.length === 0 ? (
            <div>
              <p className="text-gray-500 mb-4">
                No tienes cuentas creadas aún
              </p>
              {canManage && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Cuenta
                </Button>
              )}
            </div>
          ) : (
            <p className="text-gray-500">
              No se encontraron cuentas que coincidan con los filtros
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEdit}
              canEdit={canManage}
            />
          ))}
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta</DialogTitle>
          </DialogHeader>
          <AccountForm
            organizationId={organizationId}
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cuenta</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <AccountForm
              organizationId={organizationId}
              account={editingAccount}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingAccount(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
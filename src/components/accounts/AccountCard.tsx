'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, CreditCard, Banknote, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useDeleteAccount } from '@/hooks/useAccounts';
import { accountTypeLabels, type AccountType } from '@/lib/validations/accounts';
import type { Tables } from '@/types/supabase';

type Account = Tables<'accounts'>;

interface AccountCardProps {
  account: Account;
  onEdit?: (account: Account) => void;
  canEdit?: boolean;
}

// Account type icons
const accountTypeIcons = {
  cash: Banknote,
  bank: Building2,
  credit_card: CreditCard,
} as const;

// Account type colors
const accountTypeColors = {
  cash: 'bg-green-100 text-green-800 border-green-200',
  bank: 'bg-blue-100 text-blue-800 border-blue-200',
  credit_card: 'bg-purple-100 text-purple-800 border-purple-200',
} as const;

export function AccountCard({ account, onEdit, canEdit = false }: AccountCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccountMutation = useDeleteAccount();

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cuenta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccountMutation.mutateAsync(account.id);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Error deleting account:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const IconComponent = accountTypeIcons[account.type as AccountType];
  const typeColor = accountTypeColors[account.type as AccountType];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${typeColor}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{account.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {accountTypeLabels[account.type as AccountType]}
            </Badge>
          </div>
        </div>
        
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(account)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Balance Inicial:</span>
            <span className="font-semibold">
              {formatCurrency(account.initial_balance)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Moneda:</span>
            <span className="text-sm font-medium">{account.currency}</span>
          </div>
          
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Creada:</span>
              <span>
                {new Date(account.created_at).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
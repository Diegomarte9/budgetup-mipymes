'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransactionForm } from './TransactionForm';
import { type TransactionType } from '@/lib/validations/transactions';
import type { Tables } from '@/types/supabase';

type Transaction = Tables<'transactions'>;

interface TransactionModalProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction;
  defaultType?: TransactionType;
  onSuccess?: () => void;
}

export function TransactionModal({
  organizationId,
  isOpen,
  onClose,
  transaction,
  defaultType = 'expense',
  onSuccess
}: TransactionModalProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </DialogTitle>
        </DialogHeader>
        
        <TransactionForm
          organizationId={organizationId}
          transaction={transaction}
          defaultType={transaction?.type || defaultType}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

// Quick action buttons component
interface QuickTransactionButtonsProps {
  organizationId: string;
  onTransactionCreated?: () => void;
}

export function QuickTransactionButtons({ 
  organizationId, 
  onTransactionCreated 
}: QuickTransactionButtonsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<TransactionType>('expense');

  const openModal = (type: TransactionType) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    onTransactionCreated?.();
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => openModal('income')}
          variant="outline"
          size="sm"
          className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
        >
          + Ingreso
        </Button>
        <Button
          onClick={() => openModal('expense')}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          + Gasto
        </Button>
        <Button
          onClick={() => openModal('transfer')}
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
        >
          + Transferencia
        </Button>
      </div>

      <TransactionModal
        organizationId={organizationId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultType={selectedType}
        onSuccess={handleSuccess}
      />
    </>
  );
}
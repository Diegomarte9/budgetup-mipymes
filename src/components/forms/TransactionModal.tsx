'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TransactionForm } from './TransactionForm';
import { useTransactionShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { transactionTypeLabels, type TransactionType } from '@/lib/validations/transactions';
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
  const [currentType, setCurrentType] = useState<TransactionType>(
    transaction?.type || defaultType
  );

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const handleTypeChange = (type: TransactionType) => {
    setCurrentType(type);
  };

  // Keyboard shortcuts for creating different transaction types
  const shortcuts = useTransactionShortcuts(
    {
      onCreateIncome: () => handleTypeChange('income'),
      onCreateExpense: () => handleTypeChange('expense'),
      onCreateTransfer: () => handleTypeChange('transfer'),
    },
    isOpen && !transaction // Only enable shortcuts for new transactions
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </DialogTitle>
        </DialogHeader>
        
        {!transaction ? (
          /* New Transaction with Tabs */
          <Tabs value={currentType} onValueChange={(value) => handleTypeChange(value as TransactionType)}>
            <div className="flex justify-between items-center mb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="income" className="text-green-600 data-[state=active]:text-green-700">
                  {transactionTypeLabels.income}
                </TabsTrigger>
                <TabsTrigger value="expense" className="text-red-600 data-[state=active]:text-red-700">
                  {transactionTypeLabels.expense}
                </TabsTrigger>
                <TabsTrigger value="transfer" className="text-blue-600 data-[state=active]:text-blue-700">
                  {transactionTypeLabels.transfer}
                </TabsTrigger>
              </TabsList>
              
              {/* Keyboard shortcuts help */}
              <div className="shrink-0 ml-4">
                <KeyboardShortcutsHelp shortcuts={shortcuts} />
              </div>
            </div>

            <TabsContent value="income">
              <TransactionForm
                organizationId={organizationId}
                defaultType="income"
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </TabsContent>

            <TabsContent value="expense">
              <TransactionForm
                organizationId={organizationId}
                defaultType="expense"
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </TabsContent>

            <TabsContent value="transfer">
              <TransactionForm
                organizationId={organizationId}
                defaultType="transfer"
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </TabsContent>
          </Tabs>
        ) : (
          /* Edit Existing Transaction */
          <TransactionForm
            organizationId={organizationId}
            transaction={transaction}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        )}
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

  // Keyboard shortcuts
  useTransactionShortcuts({
    onCreateIncome: () => openModal('income'),
    onCreateExpense: () => openModal('expense'),
    onCreateTransfer: () => openModal('transfer'),
  });

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => openModal('income')}
          variant="outline"
          size="sm"
          className="text-green-600 border-green-600 hover:bg-green-50"
        >
          + Ingreso (I)
        </Button>
        <Button
          onClick={() => openModal('expense')}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          + Gasto (E)
        </Button>
        <Button
          onClick={() => openModal('transfer')}
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          + Transferencia (T)
        </Button>
      </div>

      <TransactionModal
        organizationId={organizationId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultType={selectedType}
      />
    </>
  );
}
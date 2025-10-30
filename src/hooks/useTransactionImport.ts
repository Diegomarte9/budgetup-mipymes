import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: ImportError[];
  skipped: number;
}

interface ImportTransactionsParams {
  file: File;
  organizationId: string;
}

const importTransactions = async ({ file, organizationId }: ImportTransactionsParams): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('organization_id', organizationId);

  const response = await fetch('/api/transactions/import', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error en la importación');
  }

  return data.result;
};

export function useImportTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importTransactions,
    onSuccess: (result) => {
      // Invalidate transactions queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      
      if (result.success && result.imported > 0) {
        toast.success(`Importación exitosa: ${result.imported} transacciones importadas`);
      } else if (result.errors.length > 0) {
        toast.warning(`Importación con errores: ${result.errors.length} filas con problemas`);
      }
    },
    onError: (error: Error) => {
      console.error('Error importing transactions:', error);
      toast.error(error.message || 'Error al importar transacciones');
    },
  });
}

// Helper function to validate CSV format before upload
export const validateCSVFormat = (content: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    errors.push('El archivo debe contener al menos una fila de datos');
    return { isValid: false, errors };
  }

  // Check header
  const header = lines[0].split(',').map(col => col.trim().replace(/"/g, '').toLowerCase());
  const requiredColumns = ['type', 'amount', 'description', 'occurred_at', 'account_name'];
  
  const missingColumns = requiredColumns.filter(col => !header.includes(col));
  if (missingColumns.length > 0) {
    errors.push(`Columnas requeridas faltantes: ${missingColumns.join(', ')}`);
  }

  // Basic validation of first few rows
  const sampleRows = lines.slice(1, Math.min(6, lines.length));
  
  for (let i = 0; i < sampleRows.length; i++) {
    const rowNumber = i + 2; // +2 because we start from line 1 and skip header
    const values = sampleRows[i].split(',').map(val => val.trim().replace(/^"|"$/g, ''));
    
    if (values.length !== header.length) {
      errors.push(`Fila ${rowNumber}: Número incorrecto de columnas (esperado: ${header.length}, encontrado: ${values.length})`);
      continue;
    }

    // Check required fields
    const typeIndex = header.indexOf('type');
    const amountIndex = header.indexOf('amount');
    const descriptionIndex = header.indexOf('description');
    const dateIndex = header.indexOf('occurred_at');
    const accountIndex = header.indexOf('account_name');

    if (typeIndex >= 0 && !['income', 'expense', 'transfer'].includes(values[typeIndex])) {
      errors.push(`Fila ${rowNumber}: Tipo inválido "${values[typeIndex]}" (debe ser: income, expense, o transfer)`);
    }

    if (amountIndex >= 0) {
      const amount = parseFloat(values[amountIndex].replace(/[^\d.-]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Fila ${rowNumber}: Monto inválido "${values[amountIndex]}"`);
      }
    }

    if (descriptionIndex >= 0 && !values[descriptionIndex].trim()) {
      errors.push(`Fila ${rowNumber}: Descripción requerida`);
    }

    if (dateIndex >= 0) {
      const date = new Date(values[dateIndex]);
      if (isNaN(date.getTime())) {
        errors.push(`Fila ${rowNumber}: Fecha inválida "${values[dateIndex]}" (formato esperado: YYYY-MM-DD)`);
      }
    }

    if (accountIndex >= 0 && !values[accountIndex].trim()) {
      errors.push(`Fila ${rowNumber}: Nombre de cuenta requerido`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.slice(0, 10) // Limit to first 10 errors for preview
  };
};

// Helper function to generate CSV template
export const generateCSVTemplate = (): string => {
  const headers = [
    'type',
    'amount', 
    'description',
    'occurred_at',
    'account_name',
    'category_name',
    'transfer_to_account_name',
    'itbis_pct',
    'notes',
    'currency'
  ];

  const examples = [
    [
      'income',
      '1500.00',
      'Venta de productos',
      '2024-01-15',
      'Efectivo',
      'Ventas',
      '',
      '',
      'Venta del día',
      'DOP'
    ],
    [
      'expense',
      '500.00',
      'Pago de renta',
      '2024-01-15',
      'Banco',
      'Renta',
      '',
      '18.00',
      'Renta mensual',
      'DOP'
    ],
    [
      'transfer',
      '1000.00',
      'Transferencia a ahorros',
      '2024-01-15',
      'Efectivo',
      '',
      'Banco',
      '',
      'Ahorro mensual',
      'DOP'
    ]
  ];

  const csvContent = [
    headers.join(','),
    ...examples.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};

// Helper function to download CSV template
export const downloadCSVTemplate = () => {
  const template = generateCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_transacciones.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  toast.success('Plantilla CSV descargada');
};
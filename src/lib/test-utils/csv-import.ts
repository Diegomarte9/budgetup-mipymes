// Test utilities for CSV import functionality

export const createTestCSV = (rows: Array<Record<string, string>>): string => {
  if (rows.length === 0) return '';
  
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV values
        return value.includes(',') || value.includes('"') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    )
  ];
  
  return csvLines.join('\n');
};

export const validTransactionRows = [
  {
    type: 'income',
    amount: '1500.00',
    description: 'Venta de productos',
    occurred_at: '2024-01-15',
    account_name: 'Efectivo',
    category_name: 'Ventas',
    transfer_to_account_name: '',
    itbis_pct: '',
    notes: 'Venta del día',
    currency: 'DOP'
  },
  {
    type: 'expense',
    amount: '500.00',
    description: 'Pago de renta',
    occurred_at: '2024-01-15',
    account_name: 'Banco',
    category_name: 'Renta',
    transfer_to_account_name: '',
    itbis_pct: '18.00',
    notes: 'Renta mensual',
    currency: 'DOP'
  },
  {
    type: 'transfer',
    amount: '1000.00',
    description: 'Transferencia a ahorros',
    occurred_at: '2024-01-15',
    account_name: 'Efectivo',
    category_name: '',
    transfer_to_account_name: 'Banco',
    itbis_pct: '',
    notes: 'Ahorro mensual',
    currency: 'DOP'
  }
];

export const invalidTransactionRows = [
  {
    type: 'invalid_type',
    amount: '1500.00',
    description: 'Invalid transaction type',
    occurred_at: '2024-01-15',
    account_name: 'Efectivo',
    category_name: 'Ventas',
    transfer_to_account_name: '',
    itbis_pct: '',
    notes: '',
    currency: 'DOP'
  },
  {
    type: 'income',
    amount: 'invalid_amount',
    description: 'Invalid amount',
    occurred_at: '2024-01-15',
    account_name: 'Efectivo',
    category_name: 'Ventas',
    transfer_to_account_name: '',
    itbis_pct: '',
    notes: '',
    currency: 'DOP'
  },
  {
    type: 'expense',
    amount: '500.00',
    description: '', // Missing description
    occurred_at: '2024-01-15',
    account_name: 'Banco',
    category_name: 'Renta',
    transfer_to_account_name: '',
    itbis_pct: '18.00',
    notes: '',
    currency: 'DOP'
  }
];

export const createTestFile = (csvContent: string, filename = 'test.csv'): File => {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
};

// Helper to validate CSV format
export const validateCSVHeaders = (csvContent: string): { isValid: boolean; missingHeaders: string[] } => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { isValid: false, missingHeaders: [] };
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  const requiredHeaders = ['type', 'amount', 'description', 'occurred_at', 'account_name'];
  
  const missingHeaders = requiredHeaders.filter(required => !headers.includes(required));
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders
  };
};
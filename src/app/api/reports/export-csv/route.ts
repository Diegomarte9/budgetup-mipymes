import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyValue } from '@/lib/utils/currency';

// Type for transaction with joined data
interface TransactionWithDetails {
  id: string;
  organization_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  occurred_at: string;
  account_id: string | null;
  category_id: string | null;
  transfer_to_account_id: string | null;
  itbis_pct: number;
  notes: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
  category: {
    id: string;
    name: string;
    type: string;
    color: string | null;
  } | null;
  transfer_to_account: {
    id: string;
    name: string;
    type: string;
  } | null;
}

// CSV headers in Spanish for MiPymes
const CSV_HEADERS = [
  'Fecha',
  'Tipo',
  'Descripción',
  'Monto',
  'Moneda',
  'Cuenta',
  'Tipo de Cuenta',
  'Categoría',
  'Cuenta Destino',
  'ITBIS %',
  'ITBIS Monto',
  'Notas',
  'Adjunto',
  'Fecha Creación'
];

// Helper function to escape CSV values
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Helper function to format transaction type in Spanish
function formatTransactionType(type: string): string {
  const typeMap: Record<string, string> = {
    income: 'Ingreso',
    expense: 'Gasto',
    transfer: 'Transferencia'
  };
  return typeMap[type] || type;
}

// Helper function to format account type in Spanish
function formatAccountType(type: string): string {
  const typeMap: Record<string, string> = {
    cash: 'Efectivo',
    bank: 'Banco',
    credit_card: 'Tarjeta de Crédito'
  };
  return typeMap[type] || type;
}

// Helper function to format date for CSV
function formatDateForCsv(dateString: string): string {
  // Parse the date string as YYYY-MM-DD to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-DO');
}

// Helper function to calculate ITBIS amount
function calculateItbisAmount(amount: number, itbisPct: number): string {
  if (itbisPct <= 0) return '0.00';
  const itbisAmount = (amount * itbisPct) / 100;
  return formatCurrencyValue(itbisAmount);
}

// Convert transaction to CSV row
function transactionToCsvRow(transaction: TransactionWithDetails): string {
  const row = [
    formatDateForCsv(transaction.occurred_at),
    formatTransactionType(transaction.type),
    escapeCsvValue(transaction.description),
    formatCurrencyValue(transaction.amount),
    transaction.currency,
    escapeCsvValue(transaction.account?.name || ''),
    transaction.account ? formatAccountType(transaction.account.type) : '',
    escapeCsvValue(transaction.category?.name || ''),
    escapeCsvValue(transaction.transfer_to_account?.name || ''),
    transaction.itbis_pct.toString(),
    calculateItbisAmount(transaction.amount, transaction.itbis_pct),
    escapeCsvValue(transaction.notes),
    transaction.attachment_url ? 'Sí' : 'No',
    formatDateForCsv(transaction.created_at)
  ];
  
  return row.join(',');
}

// GET /api/reports/export-csv - Export transactions as CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const type = searchParams.get('type');
    const accountId = searchParams.get('account_id');
    const categoryId = searchParams.get('category_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    // Build query for transactions with all related data
    let query = supabase
      .from('transactions')
      .select(`
        *,
        account:accounts!transactions_account_id_fkey(id, name, type),
        category:categories(id, name, type, color),
        transfer_to_account:accounts!transactions_transfer_to_account_id_fkey(id, name, type)
      `)
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (type && type !== '') {
      query = query.eq('type', type);
    }

    if (accountId && accountId !== '') {
      query = query.or(`account_id.eq.${accountId},transfer_to_account_id.eq.${accountId}`);
    }

    if (categoryId && categoryId !== '') {
      query = query.eq('category_id', categoryId);
    }

    if (startDate) {
      query = query.gte('occurred_at', startDate);
    }

    if (endDate) {
      query = query.lte('occurred_at', endDate);
    }

    // Execute query
    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transactions for CSV export:', error);
      return NextResponse.json(
        { error: 'Error al obtener las transacciones' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      // Return empty CSV with headers for consistency
      const BOM = '\uFEFF';
      const csvHeader = BOM + CSV_HEADERS.join(',') + '\n';
      const filename = `reporte_transacciones_vacio_${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csvHeader, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Total-Records': '0',
        },
      });
    }

    // Create CSV content using streaming approach for large datasets
    // Add BOM for better Excel compatibility with UTF-8
    const BOM = '\uFEFF';
    const csvHeader = BOM + CSV_HEADERS.join(',') + '\n';
    
    // For large datasets, we could implement streaming, but for MiPymes
    // the transaction volume is typically manageable in memory
    const csvRows = transactions.map((transaction: TransactionWithDetails) => 
      transactionToCsvRow(transaction)
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;

    // Generate filename with date range if provided, otherwise current date
    let filename = 'reporte_transacciones';
    if (startDate && endDate) {
      filename += `_${startDate}_${endDate}`;
    } else if (startDate) {
      filename += `_desde_${startDate}`;
    } else if (endDate) {
      filename += `_hasta_${endDate}`;
    } else {
      const currentDate = new Date().toISOString().split('T')[0];
      filename += `_${currentDate}`;
    }
    filename += '.csv';

    // Return CSV response with appropriate headers for download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Total-Records': transactions.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/reports/export-csv:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
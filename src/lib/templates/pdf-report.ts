import { formatCurrencyValue } from '@/lib/utils/currency';

// Type for transaction with joined data (same as CSV export)
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

interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  dateRange: {
    from?: string;
    to?: string;
  };
}

interface Organization {
  id: string;
  name: string;
  currency: string;
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

// Helper function to format date for display
function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Helper function to calculate ITBIS amount
function calculateItbisAmount(amount: number, itbisPct: number): number {
  if (itbisPct <= 0) return 0;
  return (amount * itbisPct) / 100;
}

// Generate the complete HTML template for PDF
export function generatePdfReportHtml(
  organization: Organization,
  transactions: TransactionWithDetails[],
  summary: ReportSummary
): string {
  const currentDate = new Date().toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const dateRangeText = summary.dateRange.from && summary.dateRange.to
    ? `${formatDateForDisplay(summary.dateRange.from)} - ${formatDateForDisplay(summary.dateRange.to)}`
    : summary.dateRange.from
    ? `Desde ${formatDateForDisplay(summary.dateRange.from)}`
    : summary.dateRange.to
    ? `Hasta ${formatDateForDisplay(summary.dateRange.to)}`
    : 'Todas las fechas';

  return `
<!DOCTYPE html>
<html lang="es-DO">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Financiero - ${organization.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }
        
        .company-name {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
        }
        
        .report-info {
            text-align: right;
            flex: 1;
        }
        
        .report-title {
            font-size: 20px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 5px;
        }
        
        .report-date {
            color: #6b7280;
            font-size: 11px;
        }
        
        /* Summary Cards */
        .summary-section {
            margin-bottom: 30px;
        }
        
        .summary-title {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 15px;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .summary-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .summary-card.income {
            border-left: 4px solid #10b981;
        }
        
        .summary-card.expense {
            border-left: 4px solid #ef4444;
        }
        
        .summary-card.balance {
            border-left: 4px solid #3b82f6;
        }
        
        .summary-card-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 500;
            margin-bottom: 5px;
        }
        
        .summary-card-value {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
        }
        
        .summary-card.income .summary-card-value {
            color: #059669;
        }
        
        .summary-card.expense .summary-card-value {
            color: #dc2626;
        }
        
        .summary-card.balance .summary-card-value {
            color: #2563eb;
        }
        
        /* Filter Info */
        .filter-info {
            background: #f3f4f6;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 20px;
        }
        
        .filter-info-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 5px;
        }
        
        .filter-info-text {
            color: #6b7280;
            font-size: 11px;
        }
        
        /* Transactions Table */
        .transactions-section {
            margin-bottom: 30px;
        }
        
        .transactions-title {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 15px;
        }
        
        .transactions-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 10px;
        }
        
        .transactions-table th {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            color: #374151;
        }
        
        .transactions-table td {
            border: 1px solid #e5e7eb;
            padding: 6px;
            vertical-align: top;
        }
        
        .transactions-table tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .transaction-type {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .transaction-type.income {
            background: #d1fae5;
            color: #065f46;
        }
        
        .transaction-type.expense {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .transaction-type.transfer {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .amount {
            text-align: right;
            font-weight: 600;
        }
        
        .amount.income {
            color: #059669;
        }
        
        .amount.expense {
            color: #dc2626;
        }
        
        .amount.transfer {
            color: #2563eb;
        }
        
        /* Footer */
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
        }
        
        /* Page break handling */
        @media print {
            .page-break {
                page-break-before: always;
            }
            
            .transactions-table {
                page-break-inside: auto;
            }
            
            .transactions-table tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            
            .transactions-table thead {
                display: table-header-group;
            }
            
            .transactions-table tfoot {
                display: table-footer-group;
            }
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        
        .empty-state-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 5px;
            color: #374151;
        }
        
        .empty-state-text {
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <div class="logo">BudgetUp</div>
                <div class="company-name">${organization.name}</div>
            </div>
            <div class="report-info">
                <div class="report-title">Reporte Financiero</div>
                <div class="report-date">Generado el ${currentDate}</div>
            </div>
        </div>

        <!-- Summary Section -->
        <div class="summary-section">
            <div class="summary-title">Resumen Ejecutivo</div>
            
            <div class="summary-cards">
                <div class="summary-card income">
                    <div class="summary-card-label">Ingresos Totales</div>
                    <div class="summary-card-value">${formatCurrencyValue(summary.totalIncome)}</div>
                </div>
                <div class="summary-card expense">
                    <div class="summary-card-label">Gastos Totales</div>
                    <div class="summary-card-value">${formatCurrencyValue(summary.totalExpenses)}</div>
                </div>
                <div class="summary-card balance">
                    <div class="summary-card-label">Balance Neto</div>
                    <div class="summary-card-value">${formatCurrencyValue(summary.netBalance)}</div>
                </div>
            </div>
            
            <div class="filter-info">
                <div class="filter-info-title">Información del Reporte</div>
                <div class="filter-info-text">
                    <strong>Período:</strong> ${dateRangeText}<br>
                    <strong>Total de Transacciones:</strong> ${summary.transactionCount}<br>
                    <strong>Moneda:</strong> ${organization.currency}
                </div>
            </div>
        </div>

        <!-- Transactions Section -->
        <div class="transactions-section">
            <div class="transactions-title">Detalle de Transacciones</div>
            
            ${transactions.length > 0 ? `
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th style="width: 80px;">Fecha</th>
                            <th style="width: 70px;">Tipo</th>
                            <th style="width: 200px;">Descripción</th>
                            <th style="width: 80px;">Monto</th>
                            <th style="width: 100px;">Cuenta</th>
                            <th style="width: 100px;">Categoría</th>
                            <th style="width: 60px;">ITBIS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(transaction => `
                            <tr>
                                <td>${transaction.occurred_at}</td>
                                <td>
                                    <span class="transaction-type ${transaction.type}">
                                        ${formatTransactionType(transaction.type)}
                                    </span>
                                </td>
                                <td>
                                    ${transaction.description}
                                    ${transaction.notes ? `<br><small style="color: #6b7280;">${transaction.notes}</small>` : ''}
                                </td>
                                <td class="amount ${transaction.type}">
                                    ${formatCurrencyValue(transaction.amount)}
                                </td>
                                <td>
                                    ${transaction.account?.name || ''}
                                    ${transaction.transfer_to_account ? `<br>→ ${transaction.transfer_to_account.name}` : ''}
                                    ${transaction.account ? `<br><small style="color: #6b7280;">${formatAccountType(transaction.account.type)}</small>` : ''}
                                </td>
                                <td>${transaction.category?.name || ''}</td>
                                <td>
                                    ${transaction.itbis_pct > 0 ? `${transaction.itbis_pct}%<br>${formatCurrencyValue(calculateItbisAmount(transaction.amount, transaction.itbis_pct))}` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-title">No hay transacciones</div>
                    <div class="empty-state-text">
                        No se encontraron transacciones para el período y filtros seleccionados.
                    </div>
                </div>
            `}
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Este reporte fue generado automáticamente por BudgetUp</p>
            <p>Plataforma de gestión financiera para MiPymes • República Dominicana</p>
        </div>
    </div>
</body>
</html>
  `;
}
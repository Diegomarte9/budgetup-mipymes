import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createTransactionSchema, 
  validateTransactionByType,
  TransactionType 
} from '@/lib/validations/transactions';
import { ZodError } from 'zod';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: any;
  }>;
  skipped: number;
}

interface CSVRow {
  type: string;
  amount: string;
  description: string;
  occurred_at: string;
  account_name: string;
  category_name?: string;
  transfer_to_account_name?: string;
  itbis_pct?: string;
  notes?: string;
  currency?: string;
}

// POST /api/transactions/import - Bulk import transactions from CSV
export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const organizationId = formData.get('organization_id') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo CSV requerido' },
        { status: 400 }
      );
    }

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

    // Check if user has admin permissions for bulk import
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Permisos insuficientes para importar transacciones' },
        { status: 403 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos CSV' },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // Read and parse CSV content
    const csvContent = await file.text();
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'El archivo CSV debe contener al menos una fila de datos' },
        { status: 400 }
      );
    }

    // Parse CSV header
    const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
    const expectedColumns = [
      'type', 'amount', 'description', 'occurred_at', 'account_name'
    ];

    // Validate required columns
    const missingColumns = expectedColumns.filter(col => !header.includes(col));
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { 
          error: `Columnas requeridas faltantes: ${missingColumns.join(', ')}`,
          details: `Columnas esperadas: ${expectedColumns.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Get accounts and categories for this organization
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, organization_id')
      .eq('organization_id', organizationId);

    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, type, organization_id')
      .eq('organization_id', organizationId);

    if (!accounts || !categories) {
      return NextResponse.json(
        { error: 'Error al obtener cuentas y categorías' },
        { status: 500 }
      );
    }

    // Create lookup maps
    const accountMap = new Map(accounts.map(acc => [acc.name.toLowerCase(), acc]));
    const categoryMap = new Map(categories.map(cat => [`${cat.name.toLowerCase()}_${cat.type}`, cat]));

    // Process CSV rows
    const result: ImportResult = {
      success: true,
      imported: 0,
      errors: [],
      skipped: 0
    };

    const transactionsToInsert = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1;
      const line = lines[i].trim();
      
      if (!line) {
        result.skipped++;
        continue;
      }

      try {
        // Parse CSV row (simple CSV parsing - handles basic cases)
        const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
        const rowData: Record<string, string> = {};
        
        header.forEach((col, index) => {
          rowData[col] = values[index] || '';
        });

        // Validate and transform row data
        const csvRow: CSVRow = {
          type: rowData.type || '',
          amount: rowData.amount || '',
          description: rowData.description || '',
          occurred_at: rowData.occurred_at || '',
          account_name: rowData.account_name || '',
          category_name: rowData.category_name,
          transfer_to_account_name: rowData.transfer_to_account_name,
          itbis_pct: rowData.itbis_pct,
          notes: rowData.notes,
          currency: rowData.currency,
        };

        // Validate transaction type
        if (!['income', 'expense', 'transfer'].includes(csvRow.type)) {
          result.errors.push({
            row: rowNumber,
            field: 'type',
            message: `Tipo de transacción inválido: ${csvRow.type}. Debe ser: income, expense, o transfer`,
            data: csvRow
          });
          continue;
        }

        // Validate and parse amount
        const amount = parseFloat(csvRow.amount.replace(/[^\d.-]/g, ''));
        if (isNaN(amount) || amount <= 0) {
          result.errors.push({
            row: rowNumber,
            field: 'amount',
            message: `Monto inválido: ${csvRow.amount}. Debe ser un número positivo`,
            data: csvRow
          });
          continue;
        }

        // Validate description
        if (!csvRow.description || csvRow.description.trim().length === 0) {
          result.errors.push({
            row: rowNumber,
            field: 'description',
            message: 'La descripción es requerida',
            data: csvRow
          });
          continue;
        }

        // Validate and parse date
        const occurredAt = new Date(csvRow.occurred_at);
        if (isNaN(occurredAt.getTime())) {
          result.errors.push({
            row: rowNumber,
            field: 'occurred_at',
            message: `Fecha inválida: ${csvRow.occurred_at}. Formato esperado: YYYY-MM-DD`,
            data: csvRow
          });
          continue;
        }

        // Find account
        const account = accountMap.get(csvRow.account_name.toLowerCase());
        if (!account) {
          result.errors.push({
            row: rowNumber,
            field: 'account_name',
            message: `Cuenta no encontrada: ${csvRow.account_name}`,
            data: csvRow
          });
          continue;
        }

        // Prepare transaction data
        const transactionData: any = {
          organization_id: organizationId,
          type: csvRow.type as TransactionType,
          amount,
          currency: csvRow.currency || 'DOP',
          description: csvRow.description.trim(),
          occurred_at: occurredAt.toISOString().split('T')[0],
          account_id: account.id,
          notes: csvRow.notes?.trim() || null,
          created_by: user.id,
        };

        // Handle type-specific validations
        if (csvRow.type === 'transfer') {
          // Find transfer destination account
          if (!csvRow.transfer_to_account_name) {
            result.errors.push({
              row: rowNumber,
              field: 'transfer_to_account_name',
              message: 'Cuenta destino requerida para transferencias',
              data: csvRow
            });
            continue;
          }

          const transferAccount = accountMap.get(csvRow.transfer_to_account_name.toLowerCase());
          if (!transferAccount) {
            result.errors.push({
              row: rowNumber,
              field: 'transfer_to_account_name',
              message: `Cuenta destino no encontrada: ${csvRow.transfer_to_account_name}`,
              data: csvRow
            });
            continue;
          }

          if (account.id === transferAccount.id) {
            result.errors.push({
              row: rowNumber,
              field: 'transfer_to_account_name',
              message: 'La cuenta origen y destino deben ser diferentes',
              data: csvRow
            });
            continue;
          }

          transactionData.transfer_to_account_id = transferAccount.id;
        } else {
          // Income or expense - find category
          if (!csvRow.category_name) {
            result.errors.push({
              row: rowNumber,
              field: 'category_name',
              message: `Categoría requerida para ${csvRow.type === 'income' ? 'ingresos' : 'gastos'}`,
              data: csvRow
            });
            continue;
          }

          const categoryKey = `${csvRow.category_name.toLowerCase()}_${csvRow.type}`;
          const category = categoryMap.get(categoryKey);
          if (!category) {
            result.errors.push({
              row: rowNumber,
              field: 'category_name',
              message: `Categoría no encontrada: ${csvRow.category_name} (tipo: ${csvRow.type})`,
              data: csvRow
            });
            continue;
          }

          transactionData.category_id = category.id;

          // Handle ITBIS for expenses
          if (csvRow.type === 'expense' && csvRow.itbis_pct) {
            const itbisPct = parseFloat(csvRow.itbis_pct);
            if (!isNaN(itbisPct) && itbisPct >= 0 && itbisPct <= 100) {
              transactionData.itbis_pct = itbisPct;
            }
          }
        }

        // Validate using Zod schema
        try {
          const validatedData = createTransactionSchema.parse(transactionData);
          validateTransactionByType(validatedData);
          transactionsToInsert.push(validatedData);
        } catch (validationError) {
          if (validationError instanceof ZodError) {
            result.errors.push({
              row: rowNumber,
              message: `Error de validación: ${validationError.issues.map(i => i.message).join(', ')}`,
              data: csvRow
            });
          } else {
            result.errors.push({
              row: rowNumber,
              message: `Error de validación: ${(validationError as Error).message}`,
              data: csvRow
            });
          }
          continue;
        }

      } catch (error) {
        result.errors.push({
          row: rowNumber,
          message: `Error procesando fila: ${(error as Error).message}`,
          data: line
        });
      }
    }

    // Insert valid transactions in batches
    if (transactionsToInsert.length > 0) {
      try {
        const { data: insertedTransactions, error: insertError } = await supabase
          .from('transactions')
          .insert(transactionsToInsert)
          .select('id');

        if (insertError) {
          console.error('Error inserting transactions:', insertError);
          return NextResponse.json(
            { error: 'Error al insertar transacciones en la base de datos' },
            { status: 500 }
          );
        }

        result.imported = insertedTransactions?.length || 0;
      } catch (error) {
        console.error('Error in bulk insert:', error);
        return NextResponse.json(
          { error: 'Error al procesar la importación masiva' },
          { status: 500 }
        );
      }
    }

    // Determine overall success
    result.success = result.imported > 0 || result.errors.length === 0;

    return NextResponse.json({
      result,
      message: `Importación completada: ${result.imported} transacciones importadas, ${result.errors.length} errores, ${result.skipped} filas omitidas`
    });

  } catch (error) {
    console.error('Error in POST /api/transactions/import:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
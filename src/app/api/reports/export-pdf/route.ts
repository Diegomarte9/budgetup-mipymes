import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePdfReportHtml } from '@/lib/templates/pdf-report';
import puppeteer, { type Browser } from 'puppeteer';

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

interface Organization {
  id: string;
  name: string;
  currency: string;
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

// Helper function to calculate summary from transactions
function calculateSummary(
  transactions: TransactionWithDetails[],
  startDate?: string,
  endDate?: string
): ReportSummary {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netBalance,
    transactionCount: transactions.length,
    dateRange: {
      from: startDate,
      to: endDate,
    },
  };
}

// GET /api/reports/export-pdf - Export transactions as PDF
export async function GET(request: NextRequest) {
  let browser: Browser | null = null;

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

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, currency')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
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
      console.error('Error fetching transactions for PDF export:', error);
      return NextResponse.json(
        { error: 'Error al obtener las transacciones' },
        { status: 500 }
      );
    }

    // Calculate summary
    const summary = calculateSummary(
      transactions || [],
      startDate || undefined,
      endDate || undefined
    );

    // Generate HTML content
    const htmlContent = generatePdfReportHtml(
      organization as Organization,
      (transactions || []) as TransactionWithDetails[],
      summary
    );

    // Launch Puppeteer with optimized settings for Vercel
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF with professional settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = null;

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
    filename += '.pdf';

    // Return PDF response with appropriate headers for download
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Total-Records': (transactions || []).length.toString(),
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/reports/export-pdf:', error);

    // Ensure browser is closed in case of error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al generar PDF' },
      { status: 500 }
    );
  }
}
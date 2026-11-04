import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

const ACCOUNT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de Crédito',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
};

// Prevent spreadsheet formula injection from user-provided text
function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function toDate(value: unknown): Date | string {
  if (!value) return '';
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? String(value) : d;
}

interface Column {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Column[],
  rows: Row[]
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  columns.forEach((col, i) => {
    if (col.numFmt) sheet.getColumn(i + 1).numFmt = col.numFmt;
  });
  rows.forEach((r) => sheet.addRow(r));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  header.alignment = { vertical: 'middle' };
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }
  return sheet;
}

// GET /api/export/excel?organization_id=... - Export all user + organization data as .xlsx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const requestedOrgId = new URL(request.url).searchParams.get('organization_id');

    // Resolve the membership (explicit organization or the user's first one)
    let membershipQuery = supabase
      .from('memberships')
      .select('role, created_at, organization_id, organization:organizations(*)')
      .eq('user_id', user.id);

    if (requestedOrgId) {
      membershipQuery = membershipQuery.eq('organization_id', requestedOrgId);
    }

    const { data: memberships, error: membershipError } = await membershipQuery
      .order('created_at', { ascending: true })
      .limit(1);

    if (membershipError) {
      console.error('Error fetching membership for Excel export:', membershipError);
      return NextResponse.json({ error: 'Error al obtener la organización' }, { status: 500 });
    }

    const membership = memberships?.[0] as
      | { role: string; created_at: string; organization_id: string; organization: Row | Row[] | null }
      | undefined;

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    const organizationId = membership.organization_id;
    const organization = (
      Array.isArray(membership.organization) ? membership.organization[0] : membership.organization
    ) as Row | null;
    const isAdmin = ['owner', 'admin'].includes(membership.role);

    // Fetch organization data in parallel
    const [accountsRes, categoriesRes, transactionsRes, membersRes, invitationsRes] =
      await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name'),
        supabase
          .from('categories')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name'),
        supabase
          .from('transactions')
          .select(
            `*,
            account:accounts!transactions_account_id_fkey(name, type),
            category:categories(name),
            transfer_to_account:accounts!transactions_transfer_to_account_id_fkey(name)`
          )
          .eq('organization_id', organizationId)
          .order('occurred_at', { ascending: false })
          .order('created_at', { ascending: false }),
        isAdmin
          ? supabase
              .from('memberships')
              .select('user_id, role, created_at')
              .eq('organization_id', organizationId)
              .order('created_at')
          : Promise.resolve({ data: null, error: null }),
        isAdmin
          ? supabase
              .from('invitations')
              .select('email, role, expires_at, used_at, created_at')
              .eq('organization_id', organizationId)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null, error: null }),
      ]);

    const failed = [accountsRes, categoriesRes, transactionsRes, membersRes, invitationsRes].find(
      (r) => r.error
    );
    if (failed?.error) {
      console.error('Error fetching data for Excel export:', failed.error);
      return NextResponse.json({ error: 'Error al obtener los datos' }, { status: 500 });
    }

    const accounts = (accountsRes.data ?? []) as Row[];
    const categories = (categoriesRes.data ?? []) as Row[];
    const transactions = (transactionsRes.data ?? []) as Row[];
    const members = (membersRes.data ?? []) as Row[];
    const invitations = (invitationsRes.data ?? []) as Row[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BudgetUp';
    workbook.created = new Date();

    // --- Resumen: user + organization ---
    const summary = workbook.addWorksheet('Resumen');
    summary.columns = [
      { header: 'Campo', key: 'field', width: 30 },
      { header: 'Valor', key: 'value', width: 50 },
    ];
    const summaryRows: [string, unknown][] = [
      ['USUARIO', ''],
      ['Email', safeText(user.email)],
      ['ID de usuario', user.id],
      ['Email verificado', user.email_confirmed_at ? 'Sí' : 'No'],
      ['Fecha de registro', toDate(user.created_at)],
      ['Rol en la empresa', ROLE_LABELS[membership.role] ?? membership.role],
      ['Miembro desde', toDate(membership.created_at)],
      ['', ''],
      ['EMPRESA', ''],
      ['Nombre', safeText(organization?.name)],
      ['ID de empresa', organizationId],
      ['Moneda', safeText(organization?.currency)],
      ['Fecha de creación', toDate(organization?.created_at)],
      ['', ''],
      ['CONTENIDO DEL ARCHIVO', ''],
      ['Cuentas', accounts.length],
      ['Categorías', categories.length],
      ['Transacciones', transactions.length],
      ...(isAdmin
        ? ([
            ['Miembros', members.length],
            ['Invitaciones', invitations.length],
          ] as [string, unknown][])
        : []),
      ['Fecha de exportación', new Date()],
    ];
    summaryRows.forEach(([field, value]) => {
      const row = summary.addRow({ field, value });
      if (value === '' && field) row.font = { bold: true };
      if (value instanceof Date) row.getCell(2).numFmt = 'dd/mm/yyyy hh:mm';
    });
    summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summary.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    summary.getColumn(2).alignment = { horizontal: 'left' };

    // --- Cuentas ---
    addSheet(
      workbook,
      'Cuentas',
      [
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Tipo', key: 'type', width: 20 },
        { header: 'Número de cuenta', key: 'account_number', width: 22 },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Balance inicial', key: 'initial_balance', width: 18, numFmt: '#,##0.00' },
        { header: 'Fecha creación', key: 'created_at', width: 18, numFmt: 'dd/mm/yyyy' },
      ],
      accounts.map((a) => ({
        name: safeText(a.name),
        type: ACCOUNT_LABELS[a.type as string] ?? a.type,
        account_number: safeText(a.account_number),
        currency: a.currency,
        initial_balance: Number(a.initial_balance ?? 0),
        created_at: toDate(a.created_at),
      }))
    );

    // --- Categorías ---
    addSheet(
      workbook,
      'Categorías',
      [
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Color', key: 'color', width: 12 },
        { header: 'Fecha creación', key: 'created_at', width: 18, numFmt: 'dd/mm/yyyy' },
      ],
      categories.map((c) => ({
        name: safeText(c.name),
        type: TYPE_LABELS[c.type as string] ?? c.type,
        color: c.color ?? '',
        created_at: toDate(c.created_at),
      }))
    );

    // --- Transacciones ---
    addSheet(
      workbook,
      'Transacciones',
      [
        { header: 'Fecha', key: 'occurred_at', width: 14, numFmt: 'dd/mm/yyyy' },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Descripción', key: 'description', width: 40 },
        { header: 'Monto', key: 'amount', width: 16, numFmt: '#,##0.00' },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Cuenta', key: 'account', width: 25 },
        { header: 'Tipo de cuenta', key: 'account_type', width: 20 },
        { header: 'Categoría', key: 'category', width: 25 },
        { header: 'Cuenta destino', key: 'transfer_to', width: 25 },
        { header: 'ITBIS %', key: 'itbis_pct', width: 10 },
        { header: 'ITBIS monto', key: 'itbis_amount', width: 16, numFmt: '#,##0.00' },
        { header: 'Notas', key: 'notes', width: 40 },
        { header: 'Tiene adjunto', key: 'attachment', width: 14 },
        { header: 'Fecha creación', key: 'created_at', width: 18, numFmt: 'dd/mm/yyyy' },
      ],
      transactions.map((t) => {
        const account = t.account as { name?: string; type?: string } | null;
        const category = t.category as { name?: string } | null;
        const transferTo = t.transfer_to_account as { name?: string } | null;
        const amount = Number(t.amount ?? 0);
        const itbisPct = Number(t.itbis_pct ?? 0);
        return {
          occurred_at: toDate(t.occurred_at),
          type: TYPE_LABELS[t.type as string] ?? t.type,
          description: safeText(t.description),
          amount,
          currency: t.currency,
          account: safeText(account?.name),
          account_type: account?.type ? (ACCOUNT_LABELS[account.type] ?? account.type) : '',
          category: safeText(category?.name),
          transfer_to: safeText(transferTo?.name),
          itbis_pct: itbisPct,
          itbis_amount: itbisPct > 0 ? Math.round(amount * itbisPct) / 100 : 0,
          notes: safeText(t.notes),
          attachment: t.attachment_url ? 'Sí' : 'No',
          created_at: toDate(t.created_at),
        };
      })
    );

    // --- Miembros e invitaciones (solo owner/admin) ---
    if (isAdmin) {
      addSheet(
        workbook,
        'Miembros',
        [
          { header: 'ID de usuario', key: 'user_id', width: 40 },
          { header: 'Rol', key: 'role', width: 18 },
          { header: 'Miembro desde', key: 'created_at', width: 18, numFmt: 'dd/mm/yyyy' },
        ],
        members.map((m) => ({
          user_id: m.user_id,
          role: ROLE_LABELS[m.role as string] ?? m.role,
          created_at: toDate(m.created_at),
        }))
      );

      addSheet(
        workbook,
        'Invitaciones',
        [
          { header: 'Email', key: 'email', width: 35 },
          { header: 'Rol', key: 'role', width: 18 },
          { header: 'Estado', key: 'status', width: 14 },
          { header: 'Expira', key: 'expires_at', width: 18, numFmt: 'dd/mm/yyyy' },
          { header: 'Fecha creación', key: 'created_at', width: 18, numFmt: 'dd/mm/yyyy' },
        ],
        invitations.map((i) => ({
          email: safeText(i.email),
          role: ROLE_LABELS[i.role as string] ?? i.role,
          status: i.used_at
            ? 'Usada'
            : new Date(String(i.expires_at)) < new Date()
              ? 'Expirada'
              : 'Pendiente',
          expires_at: toDate(i.expires_at),
          created_at: toDate(i.created_at),
        }))
      );
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const orgSlug =
      String(organization?.name ?? 'empresa')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'empresa';
    const filename = `budgetup_${orgSlug}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Filename': filename,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/export/excel:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
